const axios = require('axios');

/**
 * Triggers PDF webhook if savePdf flag is true
 * @param {Object} submissionData - JotForm submission data
 * @returns {Promise<Object|null>} Webhook response or null if not triggered
 */
async function triggerPdfWebhook(submissionData) {
  const pdfWebhookUrl = process.env.PDF_WEBHOOK_URL;

  // Check if savePdf is true/truthy
  const shouldSavePdf = submissionData.savePdf && submissionData.savePdf.trim() !== '';

  if (!shouldSavePdf) {
    console.log('PDF save not requested, skipping webhook trigger');
    return null;
  }

  if (!pdfWebhookUrl) {
    console.warn('PDF_WEBHOOK_URL not configured, skipping webhook trigger');
    return null;
  }

  try {
    const payload = {
      submissionId: submissionData.eventId || submissionData.submitDate,
      firstName: submissionData.yourFirstName,
      lastName: submissionData.yourLastName,
      formTitle: submissionData.formTitle || 'Personal Information Form',
      submitDate: submissionData.submitDate,
      savePdf: submissionData.savePdf
    };

    const response = await axios.post(pdfWebhookUrl, payload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('PDF webhook triggered successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error triggering PDF webhook:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = { triggerPdfWebhook };
