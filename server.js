require('dotenv').config();
const express = require('express');
const multer = require('multer');
const { parseJotFormWebhook } = require('./utils/jotformParser');
const { mapJotFormToGHL } = require('./utils/dataMapper');
const { createGHLContact } = require('./services/ghlService');
const { triggerPdfWebhook } = require('./services/webhookService');

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

    // Check if PDF should be saved and trigger webhook
    let pdfWebhookResponse = null;
    const shouldSavePdf = parsedData.savePdf && parsedData.savePdf.trim() !== '';

    if (shouldSavePdf) {
      console.log(`PDF save requested (savePdf="${parsedData.savePdf}"), proceeding with webhook trigger`);
      pdfWebhookResponse = await triggerPdfWebhook(parsedData, ghlContactId);
    } else {
      console.log('PDF save not requested, skipping webhook trigger');
    }

    // Send success response
    res.json({
      success: true,
      message: isDuplicate ? 'Contact updated successfully' : 'Contact created successfully',
      ghlContactId: ghlContactId,
      isDuplicate: isDuplicate,
      pdfTriggered: !!pdfWebhookResponse
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

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Webhook endpoint: http://localhost:${PORT}/webhook/jotform`);
});

module.exports = app;
