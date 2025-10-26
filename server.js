require('dotenv').config();
const express = require('express');
const multer = require('multer');
const { parseJotFormWebhook } = require('./utils/jotformParser');
const { mapJotFormToGHL } = require('./utils/dataMapper');
const { createGHLContact, createGHLOpportunity } = require('./services/ghlService');
const { handlePdfUpload } = require('./services/pdfService');
const { processOpportunityStageChange, processTaskCompletion } = require('./services/ghlOpportunityService');

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

// GHL Task Completed webhook endpoint
app.post('/webhooks/ghl/task-completed', async (req, res) => {
  try {
    console.log('=== GHL TASK COMPLETED WEBHOOK RECEIVED ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Full Request Body:', JSON.stringify(req.body, null, 2));

    // Extract task data from GHL webhook
    const taskData = {
      taskId: req.body.id || req.body.task_id || req.body.taskId,
      contactId: req.body.contactId || req.body.contact_id,
      opportunityId: req.body.opportunityId || req.body.opportunity_id,
      title: req.body.title,
      completed: req.body.completed,
      assignedTo: req.body.assignedTo || req.body.assigned_to
    };

    console.log('Extracted task data:', JSON.stringify(taskData, null, 2));

    // Validate required fields
    if (!taskData.taskId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: taskId'
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

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Webhook endpoint: http://localhost:${PORT}/webhook/jotform`);
});

module.exports = app;
