require('dotenv').config();
const express = require('express');
const multer = require('multer');
const { parseJotFormWebhook } = require('./utils/jotformParser');
const { mapJotFormToGHL } = require('./utils/dataMapper');
const { parseJotFormIntakeWebhook } = require('./utils/jotformIntakeParser');
const { mapIntakeToGHL } = require('./utils/intakeDataMapper');
const { createGHLContact, createGHLOpportunity, upsertGHLOpportunity } = require('./services/ghlService');
const { handlePdfUpload } = require('./services/pdfService');
const { processOpportunityStageChange, processTaskCompletion, checkAppointmentsWithRetry, searchOpportunitiesByContact, updateOpportunityStage, checkOpportunityStageWithRetry, getOpportunityById } = require('./services/ghlOpportunityService');
const { processTaskCreation } = require('./services/ghlTaskService');
const { processAppointmentCreated } = require('./services/appointmentService');
const { main: createWorkshopEvent } = require('./automations/create-workshop-event');
const { main: associateContactToWorkshop } = require('./automations/associate-contact-to-workshop');
const { processInboundSms } = require('./services/smsConfirmationService');

const app = express();
const PORT = process.env.PORT || 3000;

// Multer for parsing multipart/form-data
const upload = multer();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Redirect middleware for testing - forwards all requests to another server when enabled
// Set REDIRECT_ENABLED env var to 'false' to disable, or change default below
const REDIRECT_ENABLED = process.env.REDIRECT_ENABLED !== 'false'; // Default: ENABLED for testing
const REDIRECT_TARGET_URL = process.env.REDIRECT_TARGET_URL || 'https://shlf-ghl-monorepo-erzeg.ondigitalocean.app';

if (REDIRECT_ENABLED) {
  console.log(`⚠️  REDIRECT MODE ENABLED - All requests will be forwarded to: ${REDIRECT_TARGET_URL}`);

  const axios = require('axios');

  app.use(async (req, res, next) => {
    // Skip health check so we can still verify this server is running
    if (req.path === '/health') {
      return next();
    }

    const targetUrl = `${REDIRECT_TARGET_URL}${req.originalUrl}`;
    console.log(`[REDIRECT] ${req.method} ${req.originalUrl} -> ${targetUrl}`);

    try {
      const response = await axios({
        method: req.method,
        url: targetUrl,
        headers: {
          ...req.headers,
          host: new URL(REDIRECT_TARGET_URL).host,
        },
        data: req.body,
        timeout: 30000,
        validateStatus: () => true, // Accept any status code
      });

      // Forward the response back to the original caller
      res.status(response.status);
      Object.entries(response.headers).forEach(([key, value]) => {
        // Skip certain headers that shouldn't be forwarded
        if (!['transfer-encoding', 'connection', 'content-encoding'].includes(key.toLowerCase())) {
          res.set(key, value);
        }
      });
      res.send(response.data);

      console.log(`[REDIRECT] Response: ${response.status}`);
    } catch (error) {
      console.error(`[REDIRECT] Error forwarding request:`, error.message);
      res.status(502).json({
        error: 'Redirect failed',
        message: error.message,
        targetUrl: targetUrl,
      });
    }
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'JotForm to GHL automation service running',
    redirectEnabled: REDIRECT_ENABLED,
    redirectTarget: REDIRECT_ENABLED ? REDIRECT_TARGET_URL : null,
  });
});

// JotForm webhook endpoint
app.post('/webhook/jotform', upload.none(), async (req, res) => {
  try {
    console.log('Received JotForm webhook');
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Request body keys:', Object.keys(req.body || {}));
    console.log('rawRequest field exists:', !!req.body.rawRequest);

    // Parse the webhook data from the rawRequest field
    const parsedData = parseJotFormWebhook(req.body.rawRequest);
    console.log('Parsed data:', JSON.stringify(parsedData, null, 2));

    // Map to GHL format
    const ghlContactData = mapJotFormToGHL(parsedData);
    console.log('Mapped GHL contact data:', JSON.stringify(ghlContactData, null, 2));

    // Create or update contact in GHL
    const ghlResponse = await createGHLContact(ghlContactData);
    console.log('GHL response:', ghlResponse);

    // Extract GHL contact ID
    const ghlContactId = ghlResponse.contact?.id || ghlResponse.id;
    const isDuplicate = ghlResponse.isDuplicate || false;

    // Create or update opportunity in "Pending Contact" stage
    let opportunityResult = null;
    const pipelineId = process.env.GHL_PIPELINE_ID || 'LFxLIUP3LCVES60i9iwN'; // Default pipeline ID
    const pendingContactStageId = 'f0241e66-85b6-477e-9754-393aeedaef20'; // Pending Contact stage ID
    const contactName = `${parsedData.yourFirstName} ${parsedData.yourLastName}`.trim();

    try {
      console.log(`Upserting opportunity for contact ${ghlContactId} in Pending Contact stage`);
      opportunityResult = await upsertGHLOpportunity(
        ghlContactId,
        pipelineId,
        pendingContactStageId,
        contactName
      );
      console.log(opportunityResult.isNew ? 'Opportunity created:' : 'Opportunity updated:', opportunityResult);
    } catch (opportunityError) {
      console.error('Error upserting opportunity:', opportunityError.message);
      // Don't fail the whole request if opportunity upsert fails
      opportunityResult = { success: false, error: opportunityError.message };
    }

    // Check if PDF should be saved and upload directly
    let pdfUploadResult = null;
    const shouldSavePdf = parsedData.savePdf && parsedData.savePdf.trim() !== '';

    if (shouldSavePdf) {
      console.log(`PDF save requested (savePdf="${parsedData.savePdf}"), proceeding with PDF upload`);

      try {
        // Get submission ID and form ID from webhook body (not parsed data)
        const submissionId = req.body.submissionID || '';
        const formId = req.body.formID || '252972444974066';
        const contactName = `${parsedData.yourFirstName} ${parsedData.yourLastName}`.trim();

        console.log(`Downloading and uploading PDF - Submission: ${submissionId}, Form: ${formId}, Contact: ${ghlContactId}`);

        pdfUploadResult = await handlePdfUpload(submissionId, formId, ghlContactId, contactName);
        console.log('PDF upload completed:', pdfUploadResult);
      } catch (pdfError) {
        console.error('Error uploading PDF:', pdfError.message);
        // Don't fail the whole request if PDF upload fails
        pdfUploadResult = { success: false, error: pdfError.message };
      }
    } else {
      console.log('PDF save not requested, skipping PDF upload');
    }

    // Send success response
    const opportunityId = opportunityResult?.opportunity?.id || opportunityResult?.id;
    const isNewOpportunity = opportunityResult?.isNew ?? true;

    res.json({
      success: true,
      message: isDuplicate ? 'Contact updated successfully' : 'Contact created successfully',
      ghlContactId: ghlContactId,
      isDuplicate: isDuplicate,
      opportunityCreated: isNewOpportunity && opportunityId ? true : false,
      opportunityUpdated: !isNewOpportunity && opportunityId ? true : false,
      opportunityId: opportunityId,
      pdfUploaded: pdfUploadResult?.success || false,
      pdfDetails: pdfUploadResult
    });

  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing webhook',
      error: error.message
    });
  }
});

// GHL Opportunity Stage Changed webhook endpoint
app.post('/webhooks/ghl/opportunity-stage-changed', async (req, res) => {
  try {
    console.log('=== GHL OPPORTUNITY STAGE CHANGE WEBHOOK RECEIVED ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Full Request Body:', JSON.stringify(req.body, null, 2));

    // Log custom data if it exists
    if (req.body.customData) {
      console.log('Custom Data:', JSON.stringify(req.body.customData, null, 2));
    }

    // Extract data from GHL webhook - handle both direct fields and custom data
    const webhookData = {
      opportunityId: req.body['opportunity-id'] ||
                     req.body.opportunityId ||
                     req.body.opportunity_id ||
                     req.body.customData?.['opportunity-id'],
      stageName: req.body['opportunity-stage-name'] ||
                 req.body.stageName ||
                 req.body.stage_name ||
                 req.body.customData?.['opportunity-stage-name'],
      stageId: req.body.stage_id || req.body.stageId || req.body.customData?.stageId,
      contactId: req.body.contact_id || req.body.contactId || req.body.customData?.contactId,
      pipelineId: req.body.pipeline_id || req.body.pipelineId || req.body.customData?.pipelineId
    };

    console.log('Extracted webhook data:', JSON.stringify(webhookData, null, 2));

    // Validate required fields
    if (!webhookData.opportunityId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: opportunityId'
      });
    }

    if (!webhookData.stageName) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: stageName'
      });
    }

    // Process the opportunity stage change and create tasks
    const result = await processOpportunityStageChange(webhookData);

    res.json({
      success: true,
      message: result.message,
      tasksCreated: result.tasksCreated,
      details: result
    });

  } catch (error) {
    console.error('Error processing GHL opportunity webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing webhook',
      error: error.message
    });
  }
});

// GHL Task Created webhook endpoint - Syncs tasks to Supabase
app.post('/webhooks/ghl/task-created', async (req, res) => {
  try {
    console.log('=== GHL TASK CREATED WEBHOOK RECEIVED ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Full Request Body:', JSON.stringify(req.body, null, 2));

    // Process the task creation and sync to Supabase
    const result = await processTaskCreation(req.body);

    res.json({
      success: true,
      message: result.message,
      taskId: result.taskId
    });

  } catch (error) {
    console.error('Error processing GHL task created webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing webhook',
      error: error.message
    });
  }
});

// GHL Task Completed webhook endpoint
app.post('/webhooks/ghl/task-completed', async (req, res) => {
  try {
    console.log('=== GHL TASK COMPLETED WEBHOOK RECEIVED ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Full Request Body:', JSON.stringify(req.body, null, 2));

    // Extract task data from GHL webhook
    const taskData = {
      taskId: req.body.task?.id || req.body.id || req.body.task_id || req.body.taskId,
      contactId: req.body['contact-id'] ||
                 req.body.contact_id ||
                 req.body.contactId ||
                 req.body.customData?.['contact-id'],
      opportunityId: req.body['opportunity-id'] ||
                     req.body.opportunityId ||
                     req.body.opportunity_id ||
                     req.body.customData?.['opportunity-id'],
      title: req.body.task?.title || req.body.title,
      completed: true, // Webhook fires on task completion, so always true
      assignedTo: req.body.task?.assignedTo || req.body.assignedTo || req.body.assigned_to,
      dueDate: req.body.task?.dueDate
    };

    console.log('Extracted task data:', JSON.stringify(taskData, null, 2));

    // Validate required fields
    if (!taskData.contactId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: contactId'
      });
    }

    if (!taskData.title) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: task title'
      });
    }

    // Check if task is actually completed
    if (!taskData.completed) {
      return res.json({
        success: true,
        message: 'Task not completed, no action taken'
      });
    }

    // Process the task completion
    const result = await processTaskCompletion(taskData);

    res.json({
      success: true,
      message: result.message,
      details: result
    });

  } catch (error) {
    console.error('Error processing GHL task completion webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing webhook',
      error: error.message
    });
  }
});

// GHL Appointment Created webhook endpoint
// Updates appointment title with: Calendar Name - Meeting Type - Meeting - Contact Name
app.post('/webhooks/ghl/appointment-created', async (req, res) => {
  try {
    console.log('=== GHL APPOINTMENT CREATED WEBHOOK RECEIVED ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Full Request Body:', JSON.stringify(req.body, null, 2));

    // Extract appointment data from GHL webhook
    // Handle multiple possible field names for flexibility
    // NOTE: The correct appointmentId is in calendar.appointmentId or customData.appointmentId
    // The root-level "id" is NOT the appointment ID
    const webhookData = {
      appointmentId: req.body.calendar?.appointmentId ||
                     req.body.customData?.appointmentId ||
                     req.body.appointment_id ||
                     req.body.appointmentId ||
                     req.body['appointment-id'],
      contactId: req.body.contact_id ||
                 req.body.contactId ||
                 req.body['contact-id'] ||
                 req.body.customData?.contactId,
      contactPhone: req.body.contact_phone ||
                    req.body.contactPhone ||
                    req.body['contact-phone'] ||
                    req.body.phone ||
                    req.body.customData?.contactPhone,
      contactEmail: req.body.contact_email ||
                    req.body.contactEmail ||
                    req.body['contact-email'] ||
                    req.body.email ||
                    req.body.customData?.contactEmail,
      contactName: req.body.contact_name ||
                   req.body.contactName ||
                   req.body['contact-name'] ||
                   req.body.full_name ||
                   req.body.customData?.contactName,
      calendarId: req.body.calendar?.id ||
                  req.body.calendar_id ||
                  req.body.calendarId ||
                  req.body['calendar-id'] ||
                  req.body.customData?.calendarId,
      calendarName: req.body.calendar?.calendarName ||
                    req.body.calendar_name ||
                    req.body.calendarName ||
                    req.body['calendar-name'] ||
                    req.body.customData?.calendarName,
      opportunityId: req.body.customData?.opportunityId ||
                     req.body.opportunity_id ||
                     req.body.opportunityId ||
                     req.body['opportunity-id']
    };

    console.log('Extracted webhook data:', JSON.stringify(webhookData, null, 2));

    // Validate required fields
    if (!webhookData.appointmentId) {
      console.error('❌ Missing appointmentId in webhook payload');
      return res.status(400).json({
        success: false,
        message: 'Missing required field: appointmentId',
        receivedFields: Object.keys(req.body)
      });
    }

    // Process the appointment and update title
    const result = await processAppointmentCreated(webhookData);

    res.json({
      success: true,
      message: 'Appointment title updated successfully',
      appointmentId: result.appointmentId,
      newTitle: result.title,
      usedFallback: result.usedFallback,
      meetingData: result.meetingData,
      stageUpdate: result.stageUpdate,
      emailSent: result.emailSent
    });

  } catch (error) {
    console.error('Error processing GHL appointment webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing webhook',
      error: error.message
    });
  }
});

// Intake Survey webhook endpoint
app.post('/webhooks/intakeSurvey', async (req, res) => {
  try {
    console.log('=== INTAKE SURVEY WEBHOOK RECEIVED ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Full Request Body:', JSON.stringify(req.body, null, 2));

    // Extract contactId from webhook (handle multiple possible field names)
    const contactId = req.body['contact-id'] ||
                      req.body.contact_id ||
                      req.body.contactId ||
                      req.body.customData?.['contact-id'];

    // Validate required field
    if (!contactId) {
      console.error('❌ Missing contactId in webhook payload');
      return res.status(400).json({
        success: false,
        message: 'Missing required field: contactId',
        receivedFields: Object.keys(req.body)
      });
    }

    console.log(`✅ Processing intake survey for contact: ${contactId}`);

    // Find opportunity for this contact
    const locationId = process.env.GHL_LOCATION_ID;
    console.log(`🔍 Searching for opportunities for contact ${contactId}...`);
    const opportunities = await searchOpportunitiesByContact(contactId, locationId);

    if (!opportunities || opportunities.length === 0) {
      console.error('❌ No opportunity found for contact');
      return res.status(404).json({
        success: false,
        message: 'No opportunity found for contact',
        contactId: contactId
      });
    }

    // Get the first open opportunity (or first one if none are open)
    const openOpp = opportunities.find(opp => opp.status === 'open');
    const opportunity = openOpp || opportunities[0];
    const opportunityId = opportunity.id;

    console.log(`✅ Found opportunity: ${opportunityId} (status: ${opportunity.status || 'unknown'})`);

    // Define the expected pipeline and stage to check
    const EXPECTED_PIPELINE_ID = '6cYEonzedT5vf2Lt8rcl';
    const EXPECTED_STAGE_ID = '042cb50b-6ef1-448e-9f64-a7455e1395b5';

    console.log('🔍 Checking if opportunity is still in original stage...');
    console.log(`   Expected Pipeline: ${EXPECTED_PIPELINE_ID}`);
    console.log(`   Expected Stage: ${EXPECTED_STAGE_ID}`);

    // Check if opportunity has moved from the original stage with retry logic (30s, 60s)
    const hasMoved = await checkOpportunityStageWithRetry(opportunityId, EXPECTED_PIPELINE_ID, EXPECTED_STAGE_ID);
    console.log(`📊 Stage check result: ${hasMoved ? 'OPPORTUNITY HAS MOVED' : 'STILL IN SAME STAGE'}`);

    // Determine target stage based on whether opportunity moved
    const pipelineId = process.env.GHL_PIPELINE_ID || 'LFxLIUP3LCVES60i9iwN';
    let targetStageId;
    let stageName;

    if (hasMoved) {
      // Opportunity has moved to a different stage - do nothing
      console.log('✅ Opportunity already moved to a different stage, no action needed');

      return res.json({
        success: true,
        message: 'Opportunity already moved to a different stage',
        contactId: contactId,
        opportunityId: opportunityId,
        hasMoved: true,
        action: 'none'
      });
    } else {
      // Opportunity is still in the same stage - move to "Pending I/V"
      targetStageId = '624feffa-eab0-4aeb-b186-ee921e5e6eb7'; // Pending I/V
      stageName = 'Pending I/V';

      console.log(`📍 Moving opportunity to: ${stageName}`);
      console.log(`   Pipeline ID: ${pipelineId}`);
      console.log(`   Stage ID: ${targetStageId}`);

      // Update opportunity stage
      await updateOpportunityStage(opportunityId, pipelineId, targetStageId);

      console.log(`✅ Successfully moved opportunity to ${stageName}`);

      res.json({
        success: true,
        message: `Opportunity moved to ${stageName}`,
        contactId: contactId,
        opportunityId: opportunityId,
        hasMoved: false,
        movedToStage: stageName,
        pipelineId: pipelineId,
        stageId: targetStageId
      });
    }

  } catch (error) {
    console.error('❌ Error processing intake survey webhook:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error processing webhook',
      error: error.message
    });
  }
});

// Workshop creation endpoint - Jotform webhook
app.post('/workshop', upload.none(), async (req, res) => {
  try {
    console.log('=== WORKSHOP CREATION WEBHOOK RECEIVED ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Request body keys:', Object.keys(req.body || {}));
    console.log('rawRequest field exists:', !!req.body.rawRequest);

    // Get raw data from Jotform webhook
    const rawData = req.body.rawRequest;

    if (!rawData) {
      return res.status(400).json({
        success: false,
        message: 'Missing rawRequest data from Jotform webhook'
      });
    }

    // Process the workshop event creation
    const result = await createWorkshopEvent(rawData);

    res.json({
      success: true,
      message: 'Workshop created successfully',
      workshopName: result.workshopData.workshopName,
      filesDownloaded: result.filesDownloaded,
      ghlRecordId: result.ghlResponse?.id,
      details: result
    });

  } catch (error) {
    console.error('Error processing workshop webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating workshop',
      error: error.message
    });
  }
});

// JotForm Intake webhook endpoint
app.post('/webhook/jotform-intake', upload.none(), async (req, res) => {
  try {
    console.log('=== JOTFORM INTAKE WEBHOOK RECEIVED ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Request body keys:', Object.keys(req.body || {}));
    console.log('rawRequest field exists:', !!req.body.rawRequest);

    // Parse the intake webhook data from the rawRequest field
    const parsedData = parseJotFormIntakeWebhook(req.body.rawRequest);
    console.log('Parsed intake data:', JSON.stringify(parsedData, null, 2));

    // Map to GHL format
    const ghlContactData = mapIntakeToGHL(parsedData);
    console.log('Mapped GHL contact data:', JSON.stringify(ghlContactData, null, 2));

    // Create or update contact in GHL
    const ghlResponse = await createGHLContact(ghlContactData);
    console.log('GHL response:', ghlResponse);

    // Extract GHL contact ID
    const ghlContactId = ghlResponse.contact?.id || ghlResponse.id;
    const isDuplicate = ghlResponse.isDuplicate || false;

    // Create opportunity in "Pending Contact" stage
    let opportunityResult = null;
    const pipelineId = process.env.GHL_PIPELINE_ID || 'LFxLIUP3LCVES60i9iwN';
    const pendingContactStageId = 'f0241e66-85b6-477e-9754-393aeedaef20'; // Pending Contact stage ID
    const contactName = parsedData.name || `${parsedData.firstName} ${parsedData.lastName}`.trim();

    try {
      console.log(`Creating opportunity for contact ${ghlContactId} in Pending Contact stage`);
      opportunityResult = await createGHLOpportunity(
        ghlContactId,
        pipelineId,
        pendingContactStageId,
        contactName
      );
      console.log('Opportunity created:', opportunityResult);
    } catch (opportunityError) {
      console.error('Error creating opportunity:', opportunityError.message);
      // Don't fail the whole request if opportunity creation fails
      opportunityResult = { success: false, error: opportunityError.message };
    }

    // Check if PDF should be saved and upload directly
    let pdfUploadResult = null;
    const shouldSavePdf = parsedData.createPdf && parsedData.createPdf.trim() !== '';

    if (shouldSavePdf) {
      console.log(`PDF save requested (createPdf="${parsedData.createPdf}"), proceeding with PDF upload`);

      try {
        // Get submission ID and form ID from webhook body (not parsed data)
        const submissionId = req.body.submissionID || '';
        const formId = req.body.formID || '252965467838072'; // Intake form ID

        console.log(`Downloading and uploading PDF - Submission: ${submissionId}, Form: ${formId}, Contact: ${ghlContactId}`);

        pdfUploadResult = await handlePdfUpload(submissionId, formId, ghlContactId, contactName);
        console.log('PDF upload completed:', pdfUploadResult);
      } catch (pdfError) {
        console.error('Error uploading PDF:', pdfError.message);
        // Don't fail the whole request if PDF upload fails
        pdfUploadResult = { success: false, error: pdfError.message };
      }
    } else {
      console.log('PDF save not requested, skipping PDF upload');
    }

    // Send success response
    res.json({
      success: true,
      message: isDuplicate ? 'Contact updated successfully' : 'Contact created successfully',
      ghlContactId: ghlContactId,
      isDuplicate: isDuplicate,
      opportunityCreated: opportunityResult?.id ? true : false,
      opportunityId: opportunityResult?.id,
      pdfUploaded: pdfUploadResult?.success || false,
      pdfDetails: pdfUploadResult
    });

  } catch (error) {
    console.error('Error processing intake webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing webhook',
      error: error.message
    });
  }
});

// Associate contact to workshop endpoint
app.post('/associate-contact-workshop', async (req, res) => {
  try {
    console.log('=== ASSOCIATE CONTACT TO WORKSHOP REQUEST RECEIVED ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    // Extract required fields from request body
    const { contactId, eventTitle, eventDate, eventTime, eventType } = req.body;

    // Validate required fields
    if (!contactId || !eventTitle || !eventDate || !eventTime || !eventType) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        required: ['contactId', 'eventTitle', 'eventDate', 'eventTime', 'eventType'],
        received: { contactId, eventTitle, eventDate, eventTime, eventType }
      });
    }

    // Process the association
    const result = await associateContactToWorkshop({
      contactId,
      eventTitle,
      eventDate,
      eventTime,
      eventType
    });

    res.json({
      success: true,
      message: 'Contact associated to workshop successfully',
      contactId: result.contactId,
      workshopRecordId: result.workshopRecordId,
      details: result
    });

  } catch (error) {
    console.error('Error associating contact to workshop:', error);
    res.status(500).json({
      success: false,
      message: 'Error associating contact to workshop',
      error: error.message
    });
  }
});

// Intake Form webhook endpoint - Jotform webhook
app.post('/webhooks/intakeForm', upload.none(), async (req, res) => {
  try {
    console.log('=== INTAKE FORM WEBHOOK RECEIVED ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Request body keys:', Object.keys(req.body || {}));
    console.log('rawRequest exists:', !!req.body.rawRequest);
    console.log('submissionID:', req.body.submissionID);

    // Extract rawRequest and submissionID
    const rawRequest = req.body.rawRequest;
    const submissionID = req.body.submissionID;

    if (!rawRequest) {
      return res.status(400).json({
        success: false,
        message: 'Missing rawRequest field in webhook payload'
      });
    }

    if (!submissionID) {
      return res.status(400).json({
        success: false,
        message: 'Missing submissionID field in webhook payload'
      });
    }

    // Parse JotForm intake webhook using the intake parser
    console.log('Parsing JotForm intake data...');
    const parsedData = parseJotFormIntakeWebhook(rawRequest);

    console.log('Parsed intake data:', {
      name: parsedData.name,
      firstName: parsedData.firstName,
      lastName: parsedData.lastName,
      email: parsedData.email,
      phoneNumber: parsedData.phoneNumber,
      practiceArea: parsedData.practiceArea,
      callDetails: parsedData.callDetails,
      estatePlan: parsedData.estatePlan
    });

    // Validate required fields
    if (!parsedData.firstName || !parsedData.lastName || !parsedData.email || !parsedData.phoneNumber) {
      console.warn('Missing required contact fields:', {
        firstName: parsedData.firstName,
        lastName: parsedData.lastName,
        email: parsedData.email,
        phoneNumber: parsedData.phoneNumber
      });
      return res.status(400).json({
        success: false,
        message: 'Missing required contact fields',
        missingFields: {
          firstName: !parsedData.firstName,
          lastName: !parsedData.lastName,
          email: !parsedData.email,
          phoneNumber: !parsedData.phoneNumber
        }
      });
    }

    // Map to GHL format using the intake data mapper
    console.log('Mapping to GHL contact format...');
    const ghlContactData = mapIntakeToGHL(parsedData);

    // Add Jotform Link field
    const jotformLink = `https://www.jotform.com/inbox/252965467838072/${submissionID}/edit`;
    if (!ghlContactData.customFields) {
      ghlContactData.customFields = [];
    }
    ghlContactData.customFields.push({
      id: 'BJKwhr1OUaStUYVo6poh', // Jotform Link field ID
      field_value: jotformLink
    });

    console.log('Creating GHL contact with data:', JSON.stringify(ghlContactData, null, 2));

    // Create or update contact in GHL
    const ghlResponse = await createGHLContact(ghlContactData);
    const ghlContactId = ghlResponse.contact?.id || ghlResponse.id;
    const isDuplicate = ghlResponse.isDuplicate || false;

    console.log(`GHL contact ${isDuplicate ? 'updated' : 'created'} successfully:`, ghlContactId);
    console.log('GHL response customFields:', JSON.stringify(ghlResponse.contact?.customFields || ghlResponse.customFields, null, 2));

    // Create opportunity in specified pipeline/stage
    const pipelineId = 'LFxLIUP3LCVES60i9iwN';
    const stageId = 'f0241e66-85b6-477e-9754-393aeedaef20';
    const opportunityName = parsedData.name || `${parsedData.firstName} ${parsedData.lastName}`.trim();

    console.log(`Creating opportunity: ${opportunityName} in pipeline ${pipelineId}, stage ${stageId}`);

    let opportunityResult = null;
    try {
      opportunityResult = await createGHLOpportunity(
        ghlContactId,
        pipelineId,
        stageId,
        opportunityName
      );
      console.log('Opportunity created successfully:', opportunityResult);
    } catch (opportunityError) {
      console.error('Error creating opportunity:', opportunityError.message);
      opportunityResult = { success: false, error: opportunityError.message };
    }

    // Handle PDF upload if requested
    let pdfUploadResult = null;
    if (parsedData.createPdf && parsedData.createPdf.trim() !== '') {
      console.log(`PDF creation requested (createPdf="${parsedData.createPdf}"), proceeding with PDF upload`);
      try {
        const formId = req.body.formID || '252965467838072';
        pdfUploadResult = await handlePdfUpload(submissionID, formId, ghlContactId, opportunityName);
        console.log('PDF upload completed:', pdfUploadResult);
      } catch (pdfError) {
        console.error('Error uploading PDF:', pdfError.message);
        pdfUploadResult = { success: false, error: pdfError.message };
      }
    }

    // Send success response
    res.json({
      success: true,
      message: isDuplicate ? 'Contact updated and opportunity created' : 'Contact and opportunity created successfully',
      contactId: ghlContactId,
      isDuplicate: isDuplicate,
      jotformLink: jotformLink,
      opportunityCreated: opportunityResult?.id ? true : false,
      opportunityId: opportunityResult?.id,
      pdfUploaded: pdfUploadResult?.success || false,
      pdfDetails: pdfUploadResult,
      data: {
        firstName: parsedData.firstName,
        lastName: parsedData.lastName,
        email: parsedData.email,
        phoneNumber: parsedData.phoneNumber,
        practiceArea: parsedData.practiceArea
      }
    });

  } catch (error) {
    console.error('Error processing intake form webhook:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error processing webhook',
      error: error.message
    });
  }
});

// GHL Invoice Created webhook endpoint
app.post('/webhooks/ghl/invoice-created', async (req, res) => {
  try {
    console.log('=== GHL INVOICE CREATED WEBHOOK RECEIVED ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Full Request Body:', JSON.stringify(req.body, null, 2));

    const confidoService = require('./services/confidoService');
    const invoiceService = require('./services/invoiceService');
    const ghlService = require('./services/ghlService');

    // Extract invoice data from GHL webhook
    // GHL sends invoice nested in invoice._data
    const invoice = req.body.invoice?._data || req.body.invoice || req.body;
    const contactDetails = invoice.contactDetails || {};
    const opportunityDetails = invoice.opportunityDetails || {};

    const webhookData = {
      ghlInvoiceId: invoice._id || invoice.id || req.body.invoice?._id,
      opportunityId: opportunityDetails.opportunityId || req.body.opportunity_id,
      contactId: contactDetails.id || req.body.contact_id,
      opportunityName: opportunityDetails.opportunityName || req.body.opportunity_name,
      primaryContactName: contactDetails.name || req.body.full_name || `${req.body.first_name || ''} ${req.body.last_name || ''}`.trim(),
      contactEmail: contactDetails.email || req.body.email,
      contactPhone: contactDetails.phoneNo || req.body.phone,
      invoiceNumber: invoice.invoiceNumber || invoice.invoice_number,
      amountDue: parseFloat(invoice.amountDue || invoice.total || 0),
      invoiceDate: invoice.issueDate || invoice.createdAt || new Date().toISOString(),
      dueDate: invoice.dueDate || invoice.due_date,
      status: invoice.status || 'pending',
      lineItems: invoice.invoiceItems || invoice.line_items || [],
    };

    console.log('Extracted webhook data:', JSON.stringify(webhookData, null, 2));

    // Validate required fields
    if (!webhookData.ghlInvoiceId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: invoice ID'
      });
    }

    if (!webhookData.amountDue || webhookData.amountDue <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing or invalid amount due'
      });
    }

    // Get contact details if we have contactId but not contact name
    if (webhookData.contactId && !webhookData.primaryContactName) {
      console.log('Fetching contact details from GHL...');
      try {
        const contactResponse = await ghlService.getContact(webhookData.contactId);
        if (contactResponse && contactResponse.contact) {
          webhookData.primaryContactName = `${contactResponse.contact.firstName || ''} ${contactResponse.contact.lastName || ''}`.trim();
          console.log('Contact name retrieved:', webhookData.primaryContactName);
        }
      } catch (error) {
        console.warn('Could not fetch contact details:', error.message);
      }
    }

    // Save invoice to Supabase first (without Confido ID yet)
    console.log('Saving invoice to Supabase...');
    const supabaseResult = await invoiceService.saveInvoiceToSupabase({
      ghlInvoiceId: webhookData.ghlInvoiceId,
      opportunityId: webhookData.opportunityId,
      contactId: webhookData.contactId,
      opportunityName: webhookData.opportunityName,
      primaryContactName: webhookData.primaryContactName,
      invoiceNumber: webhookData.invoiceNumber,
      amountDue: webhookData.amountDue,
      amountPaid: 0,
      status: webhookData.status,
      invoiceDate: webhookData.invoiceDate,
      dueDate: webhookData.dueDate,
    });

    if (!supabaseResult.success) {
      console.error('Failed to save invoice to Supabase:', supabaseResult.error);
      return res.status(500).json({
        success: false,
        message: 'Failed to save invoice to database',
        error: supabaseResult.error
      });
    }

    console.log('✅ Invoice saved to Supabase');

    // Create invoice in Confido (3-step flow: Client → Matter → PaymentLink)
    console.log('Creating invoice in Confido...');
    const confidoResult = await confidoService.createInvoice({
      ghlInvoiceId: webhookData.ghlInvoiceId,
      opportunityId: webhookData.opportunityId,
      opportunityName: webhookData.opportunityName,
      contactId: webhookData.contactId,
      contactName: webhookData.primaryContactName,
      contactEmail: webhookData.contactEmail,
      contactPhone: webhookData.contactPhone,
      invoiceNumber: webhookData.invoiceNumber,
      amountDue: webhookData.amountDue,
      dueDate: webhookData.dueDate,
      memo: `Invoice #${webhookData.invoiceNumber || 'N/A'} - ${webhookData.opportunityName || ''}`,
      lineItems: webhookData.lineItems,
    });

    if (!confidoResult.success) {
      console.error('Failed to create invoice in Confido:', confidoResult.error);
      // Don't fail the request - invoice is saved in Supabase
      return res.json({
        success: true,
        message: 'Invoice saved but Confido creation failed',
        invoiceId: supabaseResult.data.id,
        ghlInvoiceId: webhookData.ghlInvoiceId,
        confidoCreated: false,
        confidoError: confidoResult.error
      });
    }

    console.log('✅ Invoice created in Confido');
    console.log('   - Client ID:', confidoResult.confidoClientId);
    console.log('   - Matter ID:', confidoResult.confidoMatterId);
    console.log('   - PaymentLink ID:', confidoResult.confidoInvoiceId);
    console.log('   - Status:', confidoResult.status);
    console.log('   - Total:', confidoResult.total);
    console.log('   - Payment URL:', confidoResult.paymentUrl);

    // Update Supabase record with all Confido IDs
    const updateResult = await invoiceService.saveInvoiceToSupabase({
      ghlInvoiceId: webhookData.ghlInvoiceId,
      opportunityId: webhookData.opportunityId,
      contactId: webhookData.contactId,
      opportunityName: webhookData.opportunityName,
      primaryContactName: webhookData.primaryContactName,
      confidoInvoiceId: confidoResult.confidoInvoiceId,
      confidoClientId: confidoResult.confidoClientId,
      confidoMatterId: confidoResult.confidoMatterId,
      invoiceNumber: webhookData.invoiceNumber,
      amountDue: webhookData.amountDue,
      amountPaid: confidoResult.paid || 0,
      status: confidoResult.status || 'unpaid',
      invoiceDate: webhookData.invoiceDate,
      dueDate: webhookData.dueDate,
    });

    console.log('✅ Invoice record updated with Confido ID');

    res.json({
      success: true,
      message: 'Invoice created successfully in both systems',
      invoiceId: supabaseResult.data.id,
      ghlInvoiceId: webhookData.ghlInvoiceId,
      confido: {
        invoiceId: confidoResult.confidoInvoiceId,
        clientId: confidoResult.confidoClientId,
        matterId: confidoResult.confidoMatterId,
        paymentUrl: confidoResult.paymentUrl,
        status: confidoResult.status,
        total: confidoResult.total,
        paid: confidoResult.paid,
        outstanding: confidoResult.outstanding
      },
      amountDue: webhookData.amountDue
    });

  } catch (error) {
    console.error('Error processing GHL invoice webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing invoice webhook',
      error: error.message
    });
  }
});

// Confido Payment Received webhook endpoint
app.post('/webhooks/confido/payment-received', async (req, res) => {
  try {
    console.log('=== CONFIDO PAYMENT WEBHOOK RECEIVED ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Full Request Body:', JSON.stringify(req.body, null, 2));

    const confidoService = require('./services/confidoService');
    const invoiceService = require('./services/invoiceService');
    const ghlService = require('./services/ghlService');

    // Verify webhook signature if provided
    const signature = req.headers['x-confido-signature'] || req.headers['x-webhook-signature'];
    if (signature) {
      const isValid = confidoService.verifyWebhookSignature(req.body, signature);
      if (!isValid) {
        console.error('❌ Invalid webhook signature');
        return res.status(401).json({
          success: false,
          message: 'Invalid webhook signature'
        });
      }
      console.log('✅ Webhook signature verified');
    }

    // Extract payment data from Confido webhook
    // NOTE: Update field names based on actual Confido webhook payload
    const paymentData = {
      confidoPaymentId: req.body.payment_id || req.body.paymentId || req.body.id,
      confidoInvoiceId: req.body.invoice_id || req.body.invoiceId,
      amount: parseFloat(req.body.amount || req.body.payment_amount || 0),
      paymentMethod: req.body.payment_method || req.body.paymentMethod,
      status: req.body.status || 'completed',
      transactionDate: req.body.transaction_date || req.body.transactionDate || new Date().toISOString(),
    };

    console.log('Extracted payment data:', JSON.stringify(paymentData, null, 2));

    // Validate required fields
    if (!paymentData.confidoPaymentId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: payment ID'
      });
    }

    if (!paymentData.confidoInvoiceId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: invoice ID'
      });
    }

    if (!paymentData.amount || paymentData.amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing or invalid payment amount'
      });
    }

    // Find the invoice in our database by Confido invoice ID
    console.log('Looking up invoice by Confido ID...');
    const invoiceResult = await invoiceService.getInvoiceByconfidoId(paymentData.confidoInvoiceId);

    if (!invoiceResult.success || !invoiceResult.data) {
      console.error('Invoice not found for Confido ID:', paymentData.confidoInvoiceId);
      return res.status(404).json({
        success: false,
        message: 'Invoice not found in database',
        confidoInvoiceId: paymentData.confidoInvoiceId
      });
    }

    const invoice = invoiceResult.data;
    console.log('✅ Invoice found:', {
      id: invoice.id,
      ghlInvoiceId: invoice.ghl_invoice_id,
      opportunityId: invoice.ghl_opportunity_id,
      amountDue: invoice.amount_due
    });

    // Update invoice payment status in Supabase
    console.log('Updating invoice payment status...');
    const updateResult = await invoiceService.updateInvoicePaymentStatus(
      paymentData.confidoInvoiceId,
      {
        amount: paymentData.amount,
        transactionDate: paymentData.transactionDate
      }
    );

    if (!updateResult.success) {
      console.error('Failed to update invoice:', updateResult.error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update invoice status',
        error: updateResult.error
      });
    }

    console.log('✅ Invoice updated to paid status');

    // Save payment transaction record
    console.log('Saving payment transaction...');
    const paymentRecord = await invoiceService.savePaymentToSupabase({
      confidoPaymentId: paymentData.confidoPaymentId,
      confidoInvoiceId: paymentData.confidoInvoiceId,
      ghlInvoiceId: invoice.ghl_invoice_id,
      ghlContactId: invoice.ghl_contact_id,
      ghlOpportunityId: invoice.ghl_opportunity_id,
      amount: paymentData.amount,
      paymentMethod: paymentData.paymentMethod,
      status: paymentData.status,
      transactionDate: paymentData.transactionDate,
      rawWebhookData: req.body, // Store full payload for debugging
    });

    console.log('✅ Payment transaction saved');

    // Record payment in GHL invoice
    if (invoice.ghl_invoice_id) {
      console.log('Recording payment in GHL invoice...');
      try {
        await ghlService.recordInvoicePayment(invoice.ghl_invoice_id, {
          amount: paymentData.amount,
          paymentMethod: paymentData.paymentMethod || 'other',
          transactionId: paymentData.confidoPaymentId,
          note: `Payment processed via Confido Legal on ${new Date(paymentData.transactionDate).toLocaleDateString()}`
        });

        console.log('✅ Payment recorded in GHL invoice');
      } catch (ghlError) {
        console.error('Failed to record payment in GHL invoice:', ghlError.message);
        // Don't fail the request - payment is already recorded in Supabase
      }

      // Update GHL custom object status to 'paid'
      try {
        console.log('Updating GHL custom object status to paid...');
        await ghlService.updateCustomObject(
          'custom_objects.invoices',
          invoice.ghl_invoice_id,
          process.env.GHL_LOCATION_ID,
          {
            status: 'paid'
          }
        );
        console.log('✅ GHL custom object status updated to paid');
      } catch (statusError) {
        console.error('Failed to update GHL custom object status:', statusError.message);
        // Don't fail the request - payment is already recorded
      }
    }

    // Create task/note in GHL to notify about payment
    if (invoice.ghl_opportunity_id) {
      console.log('Creating notification task in GHL...');
      try {
        const taskTitle = `Payment Received: $${paymentData.amount.toFixed(2)}`;
        const taskBody = `Payment of $${paymentData.amount.toFixed(2)} was received via ${paymentData.paymentMethod || 'Confido'} on ${new Date(paymentData.transactionDate).toLocaleDateString()}.\n\nConfido Payment ID: ${paymentData.confidoPaymentId}\nInvoice Number: ${invoice.invoice_number || 'N/A'}`;

        // Create task on the opportunity
        await ghlService.createTask(
          invoice.ghl_contact_id,
          taskTitle,
          taskBody,
          new Date().toISOString(), // Due today
          null, // No assigned user
          invoice.ghl_opportunity_id
        );

        console.log('✅ Notification task created in GHL');
      } catch (taskError) {
        console.error('Failed to create GHL task:', taskError.message);
        // Don't fail the request - payment is already recorded
      }

      // Move opportunity to "Engaged" stage after Confido payment received
      console.log('Moving opportunity to Engaged stage...');
      try {
        const ENGAGED_STAGE_ID = '26243231-7b09-48dd-a8a1-18489bab69e3';

        // Get current opportunity to find its pipeline ID
        const opportunity = await getOpportunityById(invoice.ghl_opportunity_id);
        const currentPipelineId = opportunity.pipelineId;

        console.log(`   Current Pipeline: ${currentPipelineId}`);
        console.log(`   Target Stage (Engaged): ${ENGAGED_STAGE_ID}`);

        await updateOpportunityStage(invoice.ghl_opportunity_id, currentPipelineId, ENGAGED_STAGE_ID);
        console.log('✅ Opportunity moved to Engaged stage');
      } catch (stageError) {
        console.error('Failed to move opportunity to Engaged stage:', stageError.message);
        // Don't fail the request - payment is already recorded
      }
    }

    // Send paid invoice email to client
    let emailSent = false;
    if (invoice.ghl_contact_id) {
      try {
        // Get contact email from GHL
        const contactResponse = await ghlService.getContact(invoice.ghl_contact_id);
        const contactEmail = contactResponse?.contact?.email;

        if (contactEmail) {
          console.log('Sending paid invoice email to:', contactEmail);
          const { sendPaidInvoiceEmail } = require('./services/invoiceEmailService');

          const paidInvoiceData = {
            billedTo: invoice.primary_contact_name || contactResponse?.contact?.name || 'Valued Client',
            invoiceNumber: invoice.invoice_number,
            issueDate: invoice.invoice_date ? new Date(invoice.invoice_date) : new Date(),
            dueDate: invoice.due_date ? new Date(invoice.due_date) : new Date(),
            lineItems: (invoice.service_items || []).map(item => ({
              name: item.name,
              price: item.price,
              quantity: item.quantity || 1,
              tax: '-',
              subtotal: item.price * (item.quantity || 1)
            })),
            subtotal: parseFloat(invoice.amount_due),
            amountDue: parseFloat(invoice.amount_due),
            paymentsReceived: paymentData.amount
          };

          await sendPaidInvoiceEmail(paidInvoiceData, contactEmail);
          console.log('✅ Paid invoice email sent successfully');
          emailSent = true;
        } else {
          console.warn('⚠️ No contact email found, skipping paid invoice email');
        }
      } catch (emailError) {
        console.error('Failed to send paid invoice email (non-blocking):', emailError.message);
      }
    }

    res.json({
      success: true,
      message: 'Payment processed successfully',
      paymentId: paymentRecord.data?.id,
      confidoPaymentId: paymentData.confidoPaymentId,
      invoiceId: invoice.id,
      ghlInvoiceId: invoice.ghl_invoice_id,
      amount: paymentData.amount,
      invoiceStatus: 'paid',
      emailSent: emailSent
    });

  } catch (error) {
    console.error('Error processing Confido payment webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing payment webhook',
      error: error.message
    });
  }
});

// GHL Association Created webhook endpoint
app.post('/webhooks/ghl/association-created', async (req, res) => {
  try {
    console.log('=== GHL ASSOCIATION CREATED WEBHOOK RECEIVED ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Full Request Body:', JSON.stringify(req.body, null, 2));

    const ghlService = require('./services/ghlService');
    const confidoService = require('./services/confidoService');
    const invoiceService = require('./services/invoiceService');

    // Extract association data from GHL webhook
    const associationData = {
      id: req.body.id,
      associationType: req.body.associationType,
      firstObjectKey: req.body.firstObjectKey,
      firstObjectLabel: req.body.firstObjectLabel,
      secondObjectKey: req.body.secondObjectKey,
      secondObjectLabel: req.body.secondObjectLabel,
      key: req.body.key,
      locationId: req.body.locationId
    };

    console.log('Association Data:', JSON.stringify(associationData, null, 2));

    // Check if this is an invoice → opportunity association
    const isInvoiceOpportunityAssociation =
      (associationData.firstObjectKey === 'custom_objects.invoices' && associationData.secondObjectKey === 'opportunity') ||
      (associationData.firstObjectKey === 'opportunity' && associationData.secondObjectKey === 'custom_objects.invoices');

    if (!isInvoiceOpportunityAssociation) {
      console.log('ℹ️ Not an invoice-opportunity association, skipping...');
      return res.json({
        success: true,
        message: 'Association received but not processed (not invoice-opportunity)'
      });
    }

    console.log('✅ Invoice-Opportunity association detected');
    console.log('Association ID:', associationData.id);

    // Note: This webhook only tells us the association schema was created
    // We need to wait for actual record associations or use a different trigger
    // For now, just log and acknowledge

    res.json({
      success: true,
      message: 'Invoice-Opportunity association webhook received',
      associationId: associationData.id,
      associationType: associationData.associationType
    });

  } catch (error) {
    console.error('Error processing GHL association webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing association webhook',
      error: error.message
    });
  }
});

// GHL Custom Object (Invoice) Created webhook endpoint
// Note: GHL may send all custom object events (Create, Update, Delete) to this endpoint
// We route based on the 'type' field in the payload
app.post('/webhooks/ghl/custom-object-created', async (req, res) => {
  try {
    console.log('=== GHL CUSTOM OBJECT WEBHOOK RECEIVED ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Full Request Body:', JSON.stringify(req.body, null, 2));

    const eventType = req.body.type || 'RecordCreate';

    // Route to appropriate handler based on event type
    if (eventType === 'RecordDelete') {
      console.log('📍 Routing to DELETE handler...');
      // Forward to delete endpoint internally
      const axios = require('axios');
      try {
        const deleteResponse = await axios.post(
          'http://localhost:' + (process.env.PORT || 3000) + '/webhooks/ghl/custom-object-deleted',
          req.body,
          { headers: { 'Content-Type': 'application/json' } }
        );
        return res.json(deleteResponse.data);
      } catch (deleteError) {
        console.error('Error forwarding to delete handler:', deleteError.message);
        return res.status(500).json({
          success: false,
          message: 'Error processing delete webhook',
          error: deleteError.message
        });
      }
    }

    if (eventType === 'RecordUpdate') {
      console.log('📍 Routing to UPDATE handler...');
      // Forward to update endpoint internally
      const axios = require('axios');
      try {
        const updateResponse = await axios.post(
          'http://localhost:' + (process.env.PORT || 3000) + '/webhooks/ghl/custom-object-updated',
          req.body,
          { headers: { 'Content-Type': 'application/json' } }
        );
        return res.json(updateResponse.data);
      } catch (updateError) {
        console.error('Error forwarding to update handler:', updateError.message);
        return res.status(500).json({
          success: false,
          message: 'Error processing update webhook',
          error: updateError.message
        });
      }
    }

    // Continue with RecordCreate handling
    console.log('📍 Processing as CREATE event...');

    const ghlService = require('./services/ghlService');
    const confidoService = require('./services/confidoService');
    const invoiceService = require('./services/invoiceService');

    // Extract custom object data
    const objectData = {
      recordId: req.body.id || req.body.recordId,
      objectKey: req.body.objectKey || req.body.schemaKey,
      locationId: req.body.locationId,
      type: eventType
    };

    console.log('Custom Object Data:', JSON.stringify(objectData, null, 2));

    // Check if this is an invoice object
    if (objectData.objectKey !== 'custom_objects.invoices') {
      console.log('ℹ️ Not an invoice object, skipping...');
      return res.json({
        success: true,
        message: 'Custom object received but not processed (not invoice)'
      });
    }

    console.log('✅ Invoice custom object detected');
    console.log('Invoice Record ID:', objectData.recordId);

    // Retry logic: Wait and check for opportunity association (up to 6 attempts)
    // Note: We only wait for the association - fields will come via RecordUpdate webhook
    let invoiceRecord = null;
    let relationsResponse = null;
    let attemptCount = 0;
    const maxAttempts = 6;
    const delayMs = 10000; // 10 seconds

    while (attemptCount < maxAttempts) {
      attemptCount++;
      console.log(`\n⏳ Attempt ${attemptCount}/${maxAttempts} - Checking for opportunity association...`);

      if (attemptCount > 1) {
        console.log(`Waiting ${delayMs / 1000} seconds before retry...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }

      // Get custom object details
      const customObjectResponse = await ghlService.getCustomObject(objectData.objectKey, objectData.recordId);
      invoiceRecord = customObjectResponse.record;
      console.log('Invoice Record:', JSON.stringify(invoiceRecord, null, 2));

      // Get relations
      relationsResponse = await ghlService.getRelations(objectData.recordId, objectData.locationId);
      const hasRelations = relationsResponse.relations && relationsResponse.relations.length > 0;
      console.log('Has Relations:', hasRelations);

      // Find opportunity relation
      const opportunityRelation = hasRelations
        ? relationsResponse.relations.find(rel => rel.secondObjectKey === 'opportunity' || rel.firstObjectKey === 'opportunity')
        : null;
      const hasOpportunity = !!opportunityRelation;
      console.log('Has Opportunity:', hasOpportunity);

      // Check if we have the opportunity association
      if (hasOpportunity) {
        console.log(`✅ Opportunity association found on attempt ${attemptCount}`);
        break;
      }

      console.log(`⚠️ Missing opportunity association on attempt ${attemptCount}`);

      if (attemptCount === maxAttempts) {
        console.log('❌ Max attempts reached - no opportunity association found');
        return res.json({
          success: false,
          message: 'Invoice missing opportunity association after 6 attempts',
          invoiceId: objectData.recordId,
          hasOpportunity: hasOpportunity,
          attempts: attemptCount
        });
      }
    }

    // Extract service items from properties
    const serviceItems = invoiceRecord.properties.serviceproduct || [];
    console.log('Service Items:', serviceItems);

    // Calculate total from service items
    const calculationResult = await invoiceService.calculateInvoiceTotal(serviceItems);
    if (!calculationResult.success) {
      console.error('Failed to calculate invoice total:', calculationResult.error);
      return res.status(500).json({
        success: false,
        message: 'Failed to calculate invoice total',
        error: calculationResult.error
      });
    }

    const { total, lineItems, missingItems } = calculationResult;
    console.log(`Calculated Total: $${total}`);
    if (missingItems.length > 0) {
      console.warn('Missing service items:', missingItems.join(', '));
    }

    // Find opportunity relation (we already verified it exists)
    const opportunityRelation = relationsResponse.relations.find(
      rel => rel.secondObjectKey === 'opportunity' || rel.firstObjectKey === 'opportunity'
    );

    const opportunityId = opportunityRelation.secondObjectKey === 'opportunity'
      ? opportunityRelation.secondRecordId
      : opportunityRelation.firstRecordId;

    console.log('✅ Found opportunity:', opportunityId);

    // Get opportunity details
    const opportunityResponse = await ghlService.getOpportunity(opportunityId);
    const opportunity = opportunityResponse.opportunity;
    console.log('Opportunity Details:', JSON.stringify(opportunity, null, 2));

    // Create invoice in Confido
    console.log('Creating invoice in Confido...');
    const confidoResult = await confidoService.createInvoice({
      ghlInvoiceId: objectData.recordId,
      opportunityId: opportunity.id,
      opportunityName: opportunity.name,
      contactId: opportunity.contactId,
      contactName: opportunity.contact?.name || '',
      contactEmail: opportunity.contact?.email || '',
      contactPhone: opportunity.contact?.phone || '',
      invoiceNumber: invoiceRecord.properties.invoice || objectData.recordId,
      amountDue: total,
      dueDate: invoiceRecord.properties.due_date || null,
      memo: `Invoice for ${lineItems.map(item => item.name).join(', ')}`,
      lineItems: lineItems
    });

    if (!confidoResult.success) {
      // Check if this is a duplicate PaymentLink error
      if (confidoResult.error === 'DUPLICATE_PAYMENTLINK') {
        console.log('⚠️ PaymentLink already exists in Confido');
        console.log('Checking Supabase for existing invoice record...');

        // Get existing invoice from Supabase
        const existingInvoice = await invoiceService.getInvoiceByGHLId(objectData.recordId);

        if (existingInvoice.success && existingInvoice.data) {
          console.log('✅ Found existing invoice in Supabase');
          console.log('Payment URL:', existingInvoice.data.payment_url);

          // Use the existing invoice data instead
          return res.json({
            success: true,
            message: 'Invoice already exists (duplicate webhook)',
            invoiceId: objectData.recordId,
            opportunityId: opportunity.id,
            paymentUrl: existingInvoice.data.payment_url,
            isDuplicate: true
          });
        } else {
          console.error('⚠️ PaymentLink exists in Confido but not in Supabase');
          return res.json({
            success: false,
            message: 'Data inconsistency - PaymentLink exists in Confido but not in Supabase',
            invoiceId: objectData.recordId,
            confidoError: confidoResult.error
          });
        }
      }

      // Other errors
      console.error('Failed to create invoice in Confido:', confidoResult.error);
      return res.json({
        success: true,
        message: 'Invoice processed but Confido creation failed',
        invoiceId: objectData.recordId,
        opportunityId: opportunity.id,
        confidoError: confidoResult.error
      });
    }

    console.log('✅ Invoice created in Confido');
    console.log('Confido PaymentLink ID:', confidoResult.confidoInvoiceId);
    console.log('Payment URL:', confidoResult.paymentUrl);

    // Generate invoice number (INV-YYYYMMDD-XXXX format)
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    const invoiceNumber = `INV-${dateStr}-${randomStr}`;

    console.log('Generated Invoice Number:', invoiceNumber);

    // Save to Supabase
    console.log('Saving to Supabase...');
    await invoiceService.saveInvoiceToSupabase({
      ghlInvoiceId: objectData.recordId,
      opportunityId: opportunity.id,
      contactId: opportunity.contactId,
      opportunityName: opportunity.name,
      primaryContactName: opportunity.contact?.name,
      confidoInvoiceId: confidoResult.confidoInvoiceId,
      confidoClientId: confidoResult.confidoClientId,
      confidoMatterId: confidoResult.confidoMatterId,
      paymentUrl: confidoResult.paymentUrl,
      serviceItems: lineItems,
      invoiceNumber: invoiceNumber,
      amountDue: total,
      status: 'unpaid',
      invoiceDate: new Date().toISOString(),
      dueDate: invoiceRecord.properties.due_date || null
    });

    console.log('✅ Invoice saved to Supabase');

    // Calculate subtotal (same as total for now, can be adjusted if taxes/fees added later)
    const subtotal = total;

    // Update GHL custom object with payment link, invoice number, subtotal, and total
    try {
      console.log('Updating GHL custom object with payment link and invoice details...');

      // First verify the object still exists
      console.log('Verifying custom object still exists...');
      const verifyResponse = await ghlService.getCustomObject(objectData.objectKey, objectData.recordId);

      if (verifyResponse && verifyResponse.record) {
        console.log('✅ Custom object verified, proceeding with update');
        // Use short field names and pass properties as an object
        // locationId is required as query parameter for PUT requests
        // MONETORY fields require format: { value: number, currency: 'default' }
        await ghlService.updateCustomObject(
          objectData.objectKey,
          objectData.recordId,
          objectData.locationId,
          {
            payment_link: confidoResult.paymentUrl,
            invoice_number: invoiceNumber,
            subtotal: { value: subtotal, currency: 'default' },
            total: { value: total, currency: 'default' }
          }
        );
        console.log('✅ GHL custom object updated with payment link, invoice number, subtotal, and total');
      } else {
        console.warn('⚠️ Custom object no longer exists in GHL, skipping update');
      }
    } catch (updateError) {
      console.error('Failed to update GHL custom object (non-blocking):', updateError.message);
      if (updateError.response?.data) {
        console.error('GHL Error Details:', JSON.stringify(updateError.response.data, null, 2));
      }
      console.error('This is OK - invoice still created in Confido and Supabase');
      console.error('Payment link can be retrieved from Supabase if needed');
    }

    // Send invoice email to client
    let emailSent = false;
    const contactEmail = opportunity.contact?.email;
    if (contactEmail) {
      try {
        console.log('Sending invoice email to:', contactEmail);
        const { sendInvoiceEmail } = require('./services/invoiceEmailService');

        const invoiceEmailData = {
          billedTo: opportunity.contact?.name || opportunity.name,
          invoiceNumber: invoiceNumber,
          issueDate: new Date(),
          dueDate: invoiceRecord.properties.due_date ? new Date(invoiceRecord.properties.due_date) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          lineItems: lineItems.map(item => ({
            name: item.name,
            price: item.price,
            quantity: item.quantity || 1,
            tax: '-',
            subtotal: item.price * (item.quantity || 1)
          })),
          subtotal: total,
          amountDue: total,
          paymentLink: confidoResult.paymentUrl
        };

        await sendInvoiceEmail(invoiceEmailData, contactEmail);
        console.log('✅ Invoice email sent successfully');
        emailSent = true;
      } catch (emailError) {
        console.error('Failed to send invoice email (non-blocking):', emailError.message);
      }
    } else {
      console.warn('⚠️ No contact email found, skipping invoice email');
    }

    res.json({
      success: true,
      message: 'Custom invoice processed successfully',
      invoiceId: objectData.recordId,
      opportunityId: opportunity.id,
      total: total,
      lineItems: lineItems,
      missingItems: missingItems,
      emailSent: emailSent,
      confido: {
        invoiceId: confidoResult.confidoInvoiceId,
        paymentUrl: confidoResult.paymentUrl,
        status: confidoResult.status
      }
    });

  } catch (error) {
    console.error('Error processing custom object webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing custom object webhook',
      error: error.message
    });
  }
});

// GHL Custom Object (Invoice) Updated webhook endpoint
// This fires when fields are added/updated on the invoice
// Logic: Update Supabase, then create in Confido if no payment_link exists, otherwise update payment_link
app.post('/webhooks/ghl/custom-object-updated', async (req, res) => {
  try {
    console.log('=== GHL CUSTOM OBJECT UPDATED WEBHOOK RECEIVED ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Full Request Body:', JSON.stringify(req.body, null, 2));

    const ghlService = require('./services/ghlService');
    const confidoService = require('./services/confidoService');
    const invoiceService = require('./services/invoiceService');

    // Extract custom object data
    const objectData = {
      recordId: req.body.id || req.body.recordId,
      objectKey: req.body.objectKey || req.body.schemaKey,
      locationId: req.body.locationId
    };

    console.log('Custom Object Data:', JSON.stringify(objectData, null, 2));

    // Check if this is an invoice object
    if (objectData.objectKey !== 'custom_objects.invoices') {
      console.log('ℹ️ Not an invoice object, skipping...');
      return res.json({
        success: true,
        message: 'Custom object received but not processed (not invoice)'
      });
    }

    console.log('✅ Invoice update detected');
    console.log('Invoice Record ID:', objectData.recordId);

    // Get updated custom object details from GHL
    const customObjectResponse = await ghlService.getCustomObject(objectData.objectKey, objectData.recordId);
    const invoiceRecord = customObjectResponse.record;
    console.log('Updated Invoice Record:', JSON.stringify(invoiceRecord, null, 2));

    // Check if payment_link already exists on this invoice
    const existingPaymentLink = invoiceRecord.properties.payment_link || null;
    console.log('Existing Payment Link:', existingPaymentLink);

    // Extract and calculate from service items
    const serviceItems = invoiceRecord.properties.serviceproduct || [];
    console.log('Service Items:', serviceItems);

    // If no service items, just acknowledge the webhook
    if (serviceItems.length === 0) {
      console.log('ℹ️ No service items yet, waiting for more updates...');
      return res.json({
        success: true,
        message: 'Invoice update received, waiting for service items',
        invoiceId: objectData.recordId,
        hasPaymentLink: !!existingPaymentLink
      });
    }

    const calculationResult = await invoiceService.calculateInvoiceTotal(serviceItems);

    if (!calculationResult.success) {
      console.error('Failed to calculate invoice total:', calculationResult.error);
      return res.status(500).json({
        success: false,
        message: 'Failed to calculate invoice total',
        error: calculationResult.error
      });
    }

    const { total, lineItems, missingItems } = calculationResult;
    console.log(`Calculated Total: $${total}`);

    // Get relations to find the associated opportunity
    const relationsResponse = await ghlService.getRelations(objectData.recordId, objectData.locationId);
    const hasRelations = relationsResponse.relations && relationsResponse.relations.length > 0;

    const opportunityRelation = hasRelations
      ? relationsResponse.relations.find(rel => rel.secondObjectKey === 'opportunity' || rel.firstObjectKey === 'opportunity')
      : null;

    if (!opportunityRelation) {
      console.log('⚠️ No opportunity association yet, waiting for association...');
      return res.json({
        success: true,
        message: 'Invoice update received, waiting for opportunity association',
        invoiceId: objectData.recordId,
        hasPaymentLink: !!existingPaymentLink
      });
    }

    const opportunityId = opportunityRelation.secondObjectKey === 'opportunity'
      ? opportunityRelation.secondRecordId
      : opportunityRelation.firstRecordId;

    console.log('Found Opportunity ID:', opportunityId);

    // Get opportunity details
    const opportunityResponse = await ghlService.getOpportunity(opportunityId);
    const opportunity = opportunityResponse.opportunity;
    console.log('Opportunity Details:', JSON.stringify(opportunity, null, 2));

    // Get existing invoice from Supabase (if any)
    const existingInvoice = await invoiceService.getInvoiceByGHLId(objectData.recordId);
    const hasExistingRecord = existingInvoice.success && existingInvoice.data;

    // Check if payment link exists
    if (!existingPaymentLink) {
      // NO PAYMENT LINK - Create in Confido
      console.log('📝 No payment link exists - Creating invoice in Confido...');

      const confidoResult = await confidoService.createInvoice({
        ghlInvoiceId: objectData.recordId,
        opportunityId: opportunity.id,
        opportunityName: opportunity.name,
        contactId: opportunity.contactId,
        contactName: opportunity.contact?.name || '',
        contactEmail: opportunity.contact?.email || '',
        contactPhone: opportunity.contact?.phone || '',
        invoiceNumber: invoiceRecord.properties.invoice || objectData.recordId,
        amountDue: total,
        dueDate: invoiceRecord.properties.due_date || null,
        memo: `Invoice for ${lineItems.map(item => item.name).join(', ')}`,
        lineItems: lineItems
      });

      if (!confidoResult.success) {
        // Check if this is a duplicate PaymentLink error
        if (confidoResult.error === 'DUPLICATE_PAYMENTLINK') {
          console.log('⚠️ PaymentLink already exists in Confido');

          if (hasExistingRecord && existingInvoice.data.payment_url) {
            console.log('✅ Found existing invoice in Supabase with payment URL');
            return res.json({
              success: true,
              message: 'Invoice already exists (duplicate)',
              invoiceId: objectData.recordId,
              paymentUrl: existingInvoice.data.payment_url,
              isDuplicate: true
            });
          }
        }

        console.error('Failed to create invoice in Confido:', confidoResult.error);
        return res.json({
          success: false,
          message: 'Failed to create invoice in Confido',
          invoiceId: objectData.recordId,
          confidoError: confidoResult.error
        });
      }

      console.log('✅ Invoice created in Confido');
      console.log('Confido PaymentLink ID:', confidoResult.confidoInvoiceId);
      console.log('Payment URL:', confidoResult.paymentUrl);

      // Generate invoice number
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
      const invoiceNumber = `INV-${dateStr}-${randomStr}`;
      console.log('Generated Invoice Number:', invoiceNumber);

      // Save/Update Supabase
      console.log('Saving to Supabase...');
      await invoiceService.saveInvoiceToSupabase({
        ghlInvoiceId: objectData.recordId,
        opportunityId: opportunity.id,
        contactId: opportunity.contactId,
        opportunityName: opportunity.name,
        primaryContactName: opportunity.contact?.name,
        confidoInvoiceId: confidoResult.confidoInvoiceId,
        confidoClientId: confidoResult.confidoClientId,
        confidoMatterId: confidoResult.confidoMatterId,
        paymentUrl: confidoResult.paymentUrl,
        serviceItems: lineItems,
        invoiceNumber: invoiceNumber,
        amountDue: total,
        status: 'unpaid',
        invoiceDate: new Date().toISOString(),
        dueDate: invoiceRecord.properties.due_date || null
      });
      console.log('✅ Invoice saved to Supabase');

      // Update GHL custom object with payment link, invoice number, subtotal, total, and status
      const subtotal = total;
      try {
        console.log('Updating GHL custom object with payment link and invoice details...');
        await ghlService.updateCustomObject(
          objectData.objectKey,
          objectData.recordId,
          objectData.locationId,
          {
            payment_link: confidoResult.paymentUrl,
            invoice_number: invoiceNumber,
            subtotal: { value: subtotal, currency: 'default' },
            total: { value: total, currency: 'default' },
            status: 'unpaid'
          }
        );
        console.log('✅ GHL custom object updated with payment link, invoice number, subtotal, total, and status');
      } catch (updateError) {
        console.error('Failed to update GHL custom object (non-blocking):', updateError.message);
      }

      // Send invoice email to client
      const contactEmail = opportunity.contact?.email;
      if (contactEmail) {
        try {
          console.log('Sending invoice email to:', contactEmail);
          const { sendInvoiceEmail } = require('./services/invoiceEmailService');

          const invoiceEmailData = {
            billedTo: opportunity.contact?.name || opportunity.name,
            invoiceNumber: invoiceNumber,
            issueDate: new Date(),
            dueDate: invoiceRecord.properties.due_date ? new Date(invoiceRecord.properties.due_date) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            lineItems: lineItems.map(item => ({
              name: item.name,
              price: item.price,
              quantity: item.quantity || 1,
              tax: '-',
              subtotal: item.price * (item.quantity || 1)
            })),
            subtotal: total,
            amountDue: total,
            paymentLink: confidoResult.paymentUrl
          };

          await sendInvoiceEmail(invoiceEmailData, contactEmail);
          console.log('✅ Invoice email sent successfully');
        } catch (emailError) {
          console.error('Failed to send invoice email (non-blocking):', emailError.message);
        }
      } else {
        console.warn('⚠️ No contact email found, skipping invoice email');
      }

      return res.json({
        success: true,
        message: 'Invoice created in Confido and saved to Supabase',
        invoiceId: objectData.recordId,
        opportunityId: opportunity.id,
        total: total,
        lineItems: lineItems,
        emailSent: !!contactEmail,
        confido: {
          invoiceId: confidoResult.confidoInvoiceId,
          paymentUrl: confidoResult.paymentUrl,
          status: confidoResult.status
        }
      });

    } else {
      // PAYMENT LINK EXISTS - Check if update is needed
      console.log('📝 Payment link exists - Checking if update needed...');

      // Get current values from GHL record to compare
      const currentSubtotal = invoiceRecord.properties.subtotal?.value || invoiceRecord.properties.subtotal || 0;
      const currentTotal = invoiceRecord.properties.total?.value || invoiceRecord.properties.total || 0;
      const currentStatus = invoiceRecord.properties.status || [];

      console.log('Current GHL values:', { subtotal: currentSubtotal, total: currentTotal, status: currentStatus });
      console.log('Calculated values:', { subtotal: total, total: total });

      // Check if GHL update is needed (compare values)
      const subtotal = total;
      const needsGHLUpdate = currentSubtotal !== subtotal || currentTotal !== total;

      if (!needsGHLUpdate) {
        console.log('ℹ️ No GHL update needed - values already match');
        return res.json({
          success: true,
          message: 'Invoice already up to date - no changes needed',
          invoiceId: objectData.recordId,
          opportunityId: opportunity.id,
          total: total,
          existingPaymentLink: existingPaymentLink,
          skippedUpdate: true
        });
      }

      // Update Supabase with new values
      await invoiceService.updateInvoiceInSupabase(objectData.recordId, {
        amount_due: total,
        service_items: lineItems,
        invoice_number: invoiceRecord.properties.invoice || objectData.recordId,
        due_date: invoiceRecord.properties.due_date || null
      });
      console.log('✅ Invoice updated in Supabase');

      // Update GHL custom object with new totals
      try {
        console.log('Updating GHL custom object with new totals...');
        await ghlService.updateCustomObject(
          objectData.objectKey,
          objectData.recordId,
          objectData.locationId,
          {
            subtotal: { value: subtotal, currency: 'default' },
            total: { value: total, currency: 'default' }
          }
        );
        console.log('✅ GHL custom object updated with new totals');
      } catch (updateError) {
        console.error('Failed to update GHL custom object (non-blocking):', updateError.message);
      }

      // Note: Confido PaymentLink amount cannot be changed after creation
      // Log warning if amount changed
      if (hasExistingRecord && total !== parseFloat(existingInvoice.data.amount_due)) {
        console.warn('⚠️ Invoice amount changed - Confido PaymentLink may need manual adjustment');
        console.warn(`Old: $${existingInvoice.data.amount_due}, New: $${total}`);
      }

      return res.json({
        success: true,
        message: 'Invoice updated in Supabase',
        invoiceId: objectData.recordId,
        opportunityId: opportunity.id,
        total: total,
        lineItems: lineItems,
        existingPaymentLink: existingPaymentLink,
        missingItems: missingItems
      });
    }

  } catch (error) {
    console.error('Error processing custom object update webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing custom object update webhook',
      error: error.message
    });
  }
});

// GHL Custom Object (Invoice) Deleted webhook endpoint
// Deletes PaymentLink from Confido and marks invoice as deleted in Supabase
app.post('/webhooks/ghl/custom-object-deleted', async (req, res) => {
  try {
    console.log('=== GHL CUSTOM OBJECT DELETED WEBHOOK RECEIVED ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Full Request Body:', JSON.stringify(req.body, null, 2));

    const invoiceService = require('./services/invoiceService');
    const confidoService = require('./services/confidoService');

    // Extract custom object data
    const objectData = {
      recordId: req.body.id || req.body.recordId,
      objectKey: req.body.objectKey || req.body.schemaKey,
      locationId: req.body.locationId
    };

    console.log('Custom Object Data:', JSON.stringify(objectData, null, 2));

    // Check if this is an invoice object
    if (objectData.objectKey !== 'custom_objects.invoices') {
      console.log('ℹ️ Not an invoice object, skipping...');
      return res.json({
        success: true,
        message: 'Custom object received but not processed (not invoice)'
      });
    }

    console.log('✅ Invoice deletion detected');
    console.log('Invoice Record ID:', objectData.recordId);

    // Get existing invoice from Supabase
    const existingInvoice = await invoiceService.getInvoiceByGHLId(objectData.recordId);

    if (!existingInvoice.success || !existingInvoice.data) {
      console.log('ℹ️ Invoice not found in Supabase - already deleted or never created');
      console.log('Nothing to do, returning success');
      return res.json({
        success: true,
        message: 'Invoice not found (already deleted or never created) - no action needed',
        invoiceId: objectData.recordId
      });
    }

    const confidoInvoiceId = existingInvoice.data.confido_invoice_id;

    // Delete PaymentLink from Confido if it exists
    let confidoDeleteResult = null;
    if (confidoInvoiceId) {
      console.log('Deleting PaymentLink from Confido...');
      console.log('Confido PaymentLink ID:', confidoInvoiceId);

      confidoDeleteResult = await confidoService.deletePaymentLink(confidoInvoiceId);

      if (confidoDeleteResult.success) {
        console.log('✅ PaymentLink deleted from Confido');
      } else {
        console.error('⚠️ Failed to delete PaymentLink from Confido:', confidoDeleteResult.error);
        // Continue anyway - still mark as deleted in Supabase
      }
    } else {
      console.log('ℹ️ No Confido PaymentLink ID found - skipping Confido deletion');
    }

    // Update status to deleted in Supabase (keep record for audit trail)
    await invoiceService.updateInvoiceInSupabase(objectData.recordId, {
      status: 'deleted'
    });

    console.log('✅ Invoice marked as deleted in Supabase');

    res.json({
      success: true,
      message: 'Invoice deleted successfully',
      invoiceId: objectData.recordId,
      confidoInvoiceId: confidoInvoiceId,
      confidoDeleted: confidoDeleteResult?.success || false,
      confidoError: confidoDeleteResult?.error || null
    });

  } catch (error) {
    console.error('Error processing custom object delete webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing custom object delete webhook',
      error: error.message
    });
  }
});

// Invoice Viewer Page - Public page for viewing and paying invoices
app.get('/invoice/:invoiceNumber', async (req, res) => {
  try {
    const { invoiceNumber } = req.params;
    console.log('=== INVOICE VIEWER REQUEST ===');
    console.log('Invoice Number:', invoiceNumber);

    const invoiceService = require('./services/invoiceService');
    const { formatCurrency, formatDate } = require('./services/invoicePdfService');

    // Get invoice from Supabase by invoice number
    const invoiceResult = await invoiceService.getInvoiceByInvoiceNumber(invoiceNumber);

    if (!invoiceResult.success || !invoiceResult.data) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invoice Not Found</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
            .container { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #1a365d; }
            p { color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Invoice Not Found</h1>
            <p>The invoice you're looking for could not be found.</p>
            <p>Please check the invoice number and try again.</p>
          </div>
        </body>
        </html>
      `);
    }

    const invoice = invoiceResult.data;
    const isPaid = invoice.status === 'paid';

    // Parse service items
    const serviceItems = invoice.service_items || [];
    const lineItemsHTML = serviceItems.map(item => `
      <tr>
        <td style="padding: 12px 15px; border-bottom: 1px solid #e2e8f0;">${item.name || '-'}</td>
        <td style="padding: 12px 15px; border-bottom: 1px solid #e2e8f0; text-align: center;">${formatCurrency(item.price || 0)}</td>
        <td style="padding: 12px 15px; border-bottom: 1px solid #e2e8f0; text-align: center;">${item.quantity || 1}</td>
        <td style="padding: 12px 15px; border-bottom: 1px solid #e2e8f0; text-align: right;">${formatCurrency((item.price || 0) * (item.quantity || 1))}</td>
      </tr>
    `).join('');

    const LOGO_URL = 'https://storage.googleapis.com/msgsndr/afYLuZPi37CZR1IpJlfn/media/68f107369d906785d9458314.png';

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoice.invoice_number} - Safe Harbor Law Firm</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 14px; color: #333; background: #e8f4fc; min-height: 100vh; padding: 20px; }
    .invoice-container { max-width: 800px; margin: 0 auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 20px rgba(0,0,0,0.1); padding: 40px 50px; }
    .header { border-bottom: 3px solid #1a365d; padding-bottom: 10px; margin-bottom: 30px; }
    .header-title { text-align: right; font-size: 36px; font-weight: bold; color: #1a365d; letter-spacing: 2px; }
    .company-section { display: flex; justify-content: space-between; margin-bottom: 40px; flex-wrap: wrap; }
    .logo-section { width: 45%; min-width: 250px; }
    .logo { max-width: 280px; height: auto; }
    .company-details { width: 50%; text-align: right; font-size: 13px; line-height: 1.6; color: #444; min-width: 200px; }
    .company-name { font-weight: 600; color: #1a365d; }
    .company-website { color: #2b6cb0; text-decoration: none; }
    .billing-section { display: flex; justify-content: space-between; margin-bottom: 40px; flex-wrap: wrap; gap: 20px; }
    .billed-to, .invoice-info, .date-info { min-width: 150px; }
    .section-label { font-weight: 600; color: #1a365d; margin-bottom: 8px; font-size: 14px; }
    .section-value { color: #555; font-size: 14px; }
    .date-label { font-weight: 600; color: #1a365d; margin-top: 15px; margin-bottom: 5px; }
    .date-label:first-child { margin-top: 0; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    .items-table thead { background: #f8f9fa; }
    .items-table th { text-align: left; padding: 12px 15px; font-weight: 600; color: #1a365d; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #3182ce; }
    .items-table th:nth-child(2), .items-table th:nth-child(3) { text-align: center; }
    .items-table th:last-child { text-align: right; }
    .totals-section { display: flex; justify-content: ${isPaid ? 'space-between' : 'flex-end'}; align-items: flex-end; margin-bottom: 30px; flex-wrap: wrap; gap: 20px; }
    .totals-table { width: 280px; }
    .totals-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
    .totals-row.amount-due { border-bottom: none; border-top: 2px solid #1a365d; margin-top: 5px; padding-top: 12px; }
    .totals-label { font-weight: 600; color: #555; }
    .totals-row.amount-due .totals-label, .totals-row.amount-due .totals-value { font-weight: 700; color: #1a365d; font-size: 18px; }
    .totals-value { color: #333; }
    .paid-badge { display: inline-block; background: #48bb78; color: #fff; padding: 12px 30px; font-weight: 700; font-size: 18px; border-radius: 6px; text-transform: uppercase; letter-spacing: 2px; }
    .action-buttons { display: flex; gap: 15px; justify-content: center; margin-top: 40px; flex-wrap: wrap; }
    .btn { display: inline-block; padding: 14px 30px; font-size: 16px; font-weight: bold; text-decoration: none; border-radius: 6px; cursor: pointer; border: none; transition: all 0.2s; }
    .btn-pay { background: #e07c5a; color: #fff; }
    .btn-pay:hover { background: #c9684a; }
    .btn-download { background: #1a365d; color: #fff; }
    .btn-download:hover { background: #2c5282; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #888; font-size: 12px; }
    @media (max-width: 600px) {
      .invoice-container { padding: 20px; }
      .company-section, .billing-section { flex-direction: column; }
      .logo-section, .company-details { width: 100%; text-align: center; }
      .company-details { margin-top: 20px; text-align: center; }
      .header-title { font-size: 28px; }
      .totals-section { justify-content: center; }
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="header">
      <div class="header-title">INVOICE</div>
    </div>

    <div class="company-section">
      <div class="logo-section">
        <img src="${LOGO_URL}" alt="Safe Harbor Law Firm" class="logo">
      </div>
      <div class="company-details">
        <div class="company-name">Safe Harbor Law Firm</div>
        <div>+12393173116</div>
        <div>4500 Executive Drive Suite 100</div>
        <div>Naples, Florida</div>
        <div>34119</div>
        <div>US</div>
        <div><a href="https://safeharborlawfirm.com/" class="company-website">https://safeharborlawfirm.com/</a></div>
      </div>
    </div>

    <div class="billing-section">
      <div class="billed-to">
        <div class="section-label">Billed to</div>
        <div class="section-value">${invoice.primary_contact_name || '-'}</div>
      </div>
      <div class="invoice-info">
        <div class="section-label">Invoice Number</div>
        <div class="section-value">${invoice.invoice_number || '-'}</div>
      </div>
      <div class="date-info">
        <div class="section-label">Issue Date</div>
        <div class="section-value">${formatDate(invoice.invoice_date)}</div>
        <div class="date-label">Due Date</div>
        <div class="section-value">${formatDate(invoice.due_date)}</div>
      </div>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th>ITEM NAME</th>
          <th>PRICE</th>
          <th>QUANTITY</th>
          <th>SUBTOTAL</th>
        </tr>
      </thead>
      <tbody>
        ${lineItemsHTML}
      </tbody>
    </table>

    <div class="totals-section">
      ${isPaid ? '<div class="paid-badge">PAID</div>' : ''}
      <div class="totals-table">
        <div class="totals-row">
          <span class="totals-label">Subtotal</span>
          <span class="totals-value">${formatCurrency(invoice.amount_due)}</span>
        </div>
        <div class="totals-row amount-due">
          <span class="totals-label">${isPaid ? 'Amount Paid' : 'Amount Due'} (USD)</span>
          <span class="totals-value">${formatCurrency(invoice.amount_due)}</span>
        </div>
      </div>
    </div>

    <div class="action-buttons">
      ${!isPaid && invoice.payment_url ? `<a href="${invoice.payment_url}" class="btn btn-pay">Pay Now</a>` : ''}
      <a href="/invoice/${invoice.invoice_number}/download" class="btn btn-download">Download PDF</a>
    </div>

    <div class="footer">
      <p>${isPaid ? 'Thank you for your payment!' : 'Thank you for your business!'}</p>
      <p>Safe Harbor Law Firm</p>
    </div>
  </div>
</body>
</html>
    `;

    res.send(html);

  } catch (error) {
    console.error('Error rendering invoice page:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Error</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
          .container { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; }
          h1 { color: #c53030; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Error</h1>
          <p>An error occurred while loading the invoice. Please try again later.</p>
        </div>
      </body>
      </html>
    `);
  }
});

// Invoice PDF Download endpoint
app.get('/invoice/:invoiceNumber/download', async (req, res) => {
  try {
    const { invoiceNumber } = req.params;
    console.log('=== INVOICE PDF DOWNLOAD REQUEST ===');
    console.log('Invoice Number:', invoiceNumber);

    const invoiceService = require('./services/invoiceService');
    const { generateInvoicePDF, generatePaidInvoicePDF } = require('./services/invoicePdfService');

    // Get invoice from Supabase
    const invoiceResult = await invoiceService.getInvoiceByInvoiceNumber(invoiceNumber);

    if (!invoiceResult.success || !invoiceResult.data) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const invoice = invoiceResult.data;
    const isPaid = invoice.status === 'paid';

    // Prepare invoice data for PDF generation
    const invoiceData = {
      billedTo: invoice.primary_contact_name,
      invoiceNumber: invoice.invoice_number,
      issueDate: invoice.invoice_date,
      dueDate: invoice.due_date,
      lineItems: (invoice.service_items || []).map(item => ({
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        tax: '-',
        subtotal: (item.price || 0) * (item.quantity || 1)
      })),
      subtotal: parseFloat(invoice.amount_due),
      amountDue: parseFloat(invoice.amount_due),
      paymentLink: invoice.payment_url,
      paymentsReceived: isPaid ? parseFloat(invoice.amount_due) : 0
    };

    // Generate appropriate PDF
    let pdfBuffer;
    if (isPaid) {
      pdfBuffer = await generatePaidInvoicePDF(invoiceData);
    } else {
      pdfBuffer = await generateInvoicePDF(invoiceData);
    }

    // Convert to proper Buffer if needed
    const properBuffer = Buffer.from(pdfBuffer);

    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Invoice-${invoiceNumber}.pdf"`);
    res.setHeader('Content-Length', properBuffer.length);

    res.send(properBuffer);

  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// ============================================
// CRON JOB ENDPOINTS
// ============================================

const { processScheduledReminders } = require('./services/appointmentSmsService');

/**
 * Cron endpoint to process scheduled SMS reminders
 * Should be called every 15-30 minutes during business hours (8am-4pm EST)
 *
 * Example cron setup (every 15 minutes, 8am-4pm EST):
 * 0,15,30,45 8-15 * * * curl -X POST https://your-server.com/cron/process-sms-reminders
 */
app.post('/cron/process-sms-reminders', async (req, res) => {
  console.log('\n========================================');
  console.log('📱 CRON: Process SMS Reminders');
  console.log('========================================');
  console.log('Time:', new Date().toISOString());

  try {
    const result = await processScheduledReminders();

    console.log('CRON Result:', JSON.stringify(result, null, 2));

    res.json({
      success: true,
      message: 'SMS reminders processed',
      result
    });

  } catch (error) {
    console.error('❌ CRON Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GHL Inbound SMS webhook endpoint
// Detects "Y"/"y" confirmation replies and adds "Confirmed [meeting_type]" tag
app.post('/webhooks/ghl/inbound-sms', async (req, res) => {
  try {
    console.log('=== GHL INBOUND SMS WEBHOOK RECEIVED ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Full Request Body:', JSON.stringify(req.body, null, 2));

    // Extract SMS data from GHL webhook
    // GHL InboundMessage webhook format
    const smsData = {
      type: req.body.type,
      body: req.body.body,
      contactId: req.body.contactId,
      messageType: req.body.messageType,
      direction: req.body.direction,
      conversationId: req.body.conversationId,
      locationId: req.body.locationId,
      dateAdded: req.body.dateAdded,
      attachments: req.body.attachments
    };

    console.log('Extracted SMS data:', JSON.stringify(smsData, null, 2));

    // Process the inbound SMS
    const result = await processInboundSms(smsData);

    res.json({
      success: true,
      message: result.action === 'tagged' ? 'Confirmation tag added' : 'Message processed',
      action: result.action,
      tagAdded: result.tagAdded,
      meetingType: result.meetingType,
      reason: result.reason
    });

  } catch (error) {
    console.error('Error processing GHL inbound SMS webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing webhook',
      error: error.message
    });
  }
});

// Call Transcript webhook endpoint
// Receives call transcript, summarizes via OpenRouter, saves both to GHL contact custom fields
app.post('/webhooks/ghl/call-transcript', async (req, res) => {
  try {
    console.log('=== CALL TRANSCRIPT WEBHOOK RECEIVED ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Full Request Body:', JSON.stringify(req.body, null, 2));

    // Extract contact ID and transcript from request
    const contactId = req.body.contactId || req.body.contact_id || req.body['contact-id'];
    const transcript = req.body.transcript || req.body.call_transcript || req.body['call-transcript'];

    // Validate required fields
    if (!contactId) {
      console.error('Missing contactId in request');
      return res.status(400).json({
        success: false,
        message: 'Missing required field: contactId'
      });
    }

    if (!transcript) {
      console.error('Missing transcript in request');
      return res.status(400).json({
        success: false,
        message: 'Missing required field: transcript'
      });
    }

    // Process the call transcript
    const { processCallTranscript } = require('./services/callTranscriptService');
    const result = await processCallTranscript(contactId, transcript);

    console.log('Call transcript processed successfully');
    console.log('Summary:', result.summary);

    res.json({
      success: true,
      message: 'Call transcript processed and saved',
      contactId: result.contactId,
      transcriptLength: result.transcriptLength,
      summaryLength: result.summaryLength,
      summary: result.summary
    });

  } catch (error) {
    console.error('Error processing call transcript webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing call transcript',
      error: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Webhook endpoint: http://localhost:${PORT}/webhook/jotform`);
});

module.exports = app;
