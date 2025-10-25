require('dotenv').config();
const express = require('express');
const { parseJotFormWebhook } = require('./utils/jotformParser');
const { mapJotFormToGHL } = require('./utils/dataMapper');
const { createGHLContact } = require('./services/ghlService');
const { triggerPdfWebhook } = require('./services/webhookService');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'JotForm to GHL automation service running' });
});

// JotForm webhook endpoint
app.post('/webhook/jotform', async (req, res) => {
  try {
    console.log('Received JotForm webhook');

    // Parse the webhook data
    const parsedData = parseJotFormWebhook(req.body.rawRequest || req.body);
    console.log('Parsed data:', JSON.stringify(parsedData, null, 2));

    // Map to GHL format
    const ghlContactData = mapJotFormToGHL(parsedData);
    console.log('Mapped GHL contact data:', JSON.stringify(ghlContactData, null, 2));

    // Create contact in GHL
    const ghlResponse = await createGHLContact(ghlContactData);
    console.log('GHL contact created:', ghlResponse);

    // Check if PDF should be saved and trigger webhook
    let pdfWebhookResponse = null;
    if (parsedData.savePdf && parsedData.savePdf.trim() !== '') {
      console.log('Triggering PDF webhook');
      pdfWebhookResponse = await triggerPdfWebhook(parsedData);
    }

    // Send success response
    res.json({
      success: true,
      message: 'Contact created successfully',
      ghlContactId: ghlResponse.contact?.id || ghlResponse.id,
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
