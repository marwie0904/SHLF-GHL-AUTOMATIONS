require('dotenv').config();
const express = require('express');
const multer = require('multer');
const { parseJotFormWebhook } = require('./utils/jotformParser');
const { mapJotFormToGHL } = require('./utils/dataMapper');
const { parseJotFormIntakeWebhook } = require('./utils/jotformIntakeParser');
const { mapIntakeToGHL } = require('./utils/intakeDataMapper');
const { createGHLContact, createGHLOpportunity } = require('./services/ghlService');
const { handlePdfUpload } = require('./services/pdfService');
const { processOpportunityStageChange, processTaskCompletion, checkAppointmentsWithRetry, searchOpportunitiesByContact, updateOpportunityStage, checkOpportunityStageWithRetry } = require('./services/ghlOpportunityService');
const { processTaskCreation } = require('./services/ghlTaskService');
const { processAppointmentCreated } = require('./services/appointmentService');
const { main: createWorkshopEvent } = require('./automations/create-workshop-event');
const { main: associateContactToWorkshop } = require('./automations/associate-contact-to-workshop');

const app = express();
const PORT = process.env.PORT || 3000;

// Multer for parsing multipart/form-data
const upload = multer();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'JotForm to GHL automation service running' });
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

    // Create opportunity in "Pending Contact" stage
    let opportunityResult = null;
    const pipelineId = process.env.GHL_PIPELINE_ID || 'LFxLIUP3LCVES60i9iwN'; // Default pipeline ID
    const pendingContactStageId = 'f0241e66-85b6-477e-9754-393aeedaef20'; // Pending Contact stage ID
    const contactName = `${parsedData.yourFirstName} ${parsedData.yourLastName}`.trim();

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
      stageUpdate: result.stageUpdate
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
    }

    res.json({
      success: true,
      message: 'Payment processed successfully',
      paymentId: paymentRecord.data?.id,
      confidoPaymentId: paymentData.confidoPaymentId,
      invoiceId: invoice.id,
      ghlInvoiceId: invoice.ghl_invoice_id,
      amount: paymentData.amount,
      invoiceStatus: 'paid'
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

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Webhook endpoint: http://localhost:${PORT}/webhook/jotform`);
});

module.exports = app;
