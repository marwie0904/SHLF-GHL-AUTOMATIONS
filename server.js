require('dotenv').config();
const express = require('express');
const multer = require('multer');
const { parseJotFormWebhook } = require('./utils/jotformParser');
const { mapJotFormToGHL } = require('./utils/dataMapper');
const { createGHLContact, createGHLOpportunity } = require('./services/ghlService');
const { handlePdfUpload } = require('./services/pdfService');
const { processOpportunityStageChange, processTaskCompletion, checkAppointmentsWithRetry, searchOpportunitiesByContact, updateOpportunityStage, checkOpportunityStageWithRetry } = require('./services/ghlOpportunityService');
const { processTaskCreation } = require('./services/ghlTaskService');
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

    // Parse rawRequest JSON string
    let parsedData;
    try {
      parsedData = typeof rawRequest === 'string' ? JSON.parse(rawRequest) : rawRequest;
    } catch (parseError) {
      console.error('Error parsing rawRequest:', parseError);
      return res.status(400).json({
        success: false,
        message: 'Invalid rawRequest JSON format',
        error: parseError.message
      });
    }

    // Extract contact information
    const firstName = parsedData.q3_name?.first || '';
    const lastName = parsedData.q3_name?.last || '';
    const email = parsedData.q12_email || '';
    const phoneNumber = parsedData.q13_phoneNumber?.full || '';

    // Build Jotform submission URL with /edit
    const jotformLink = `https://www.jotform.com/inbox/252965467838072/${submissionID}/edit`;

    console.log('Extracted data:', { firstName, lastName, email, phoneNumber, jotformLink });

    // Validate required fields
    if (!firstName || !lastName || !email || !phoneNumber) {
      console.warn('Missing required contact fields:', { firstName, lastName, email, phoneNumber });
      return res.status(400).json({
        success: false,
        message: 'Missing required contact fields',
        missingFields: {
          firstName: !firstName,
          lastName: !lastName,
          email: !email,
          phoneNumber: !phoneNumber
        }
      });
    }

    // Prepare GHL contact data with jotform_link custom field
    const ghlContactData = {
      firstName: firstName,
      lastName: lastName,
      email: email,
      phone: phoneNumber,
      customFields: [
        {
          key: 'contact.jotform_link',
          field_value: jotformLink
        }
      ]
    };

    console.log('Creating GHL contact with data:', JSON.stringify(ghlContactData, null, 2));

    // Create or update contact in GHL
    const ghlResponse = await createGHLContact(ghlContactData);
    const ghlContactId = ghlResponse.contact?.id || ghlResponse.id;
    const isDuplicate = ghlResponse.isDuplicate || false;

    console.log(`GHL contact ${isDuplicate ? 'updated' : 'created'} successfully:`, ghlContactId);

    // Create opportunity in specified pipeline/stage
    const pipelineId = 'LFxLIUP3LCVES60i9iwN';
    const stageId = 'f0241e66-85b6-477e-9754-393aeedaef20';
    const opportunityName = `${firstName} ${lastName}`;

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

    // Send success response
    res.json({
      success: true,
      message: isDuplicate ? 'Contact updated and opportunity created' : 'Contact and opportunity created successfully',
      contactId: ghlContactId,
      isDuplicate: isDuplicate,
      jotformLink: jotformLink,
      opportunityCreated: opportunityResult?.id ? true : false,
      opportunityId: opportunityResult?.id,
      data: {
        firstName,
        lastName,
        email,
        phoneNumber
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

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Webhook endpoint: http://localhost:${PORT}/webhook/jotform`);
});

module.exports = app;
