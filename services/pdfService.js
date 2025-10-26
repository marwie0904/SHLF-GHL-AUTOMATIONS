const axios = require('axios');
const FormData = require('form-data');

/**
 * Downloads PDF from JotForm
 * @param {string} submissionId - JotForm submission ID
 * @param {string} formId - JotForm form ID
 * @returns {Promise<Buffer>} PDF file buffer
 */
async function downloadPdfFromJotForm(submissionId, formId) {
  const jotformApiKey = process.env.JOTFORM_API_KEY;

  if (!jotformApiKey) {
    throw new Error('JOTFORM_API_KEY not configured in environment variables');
  }

  const downloadUrl = `https://www.jotform.com/server.php?action=getSubmissionPDF&sid=${submissionId}&formID=${formId}&apiKey=${jotformApiKey}`;

  try {
    console.log('Downloading PDF from JotForm...');
    const response = await axios.get(downloadUrl, {
      responseType: 'arraybuffer'
    });

    console.log('PDF downloaded successfully from JotForm');
    return Buffer.from(response.data);
  } catch (error) {
    console.error('Error downloading PDF from JotForm:', error.message);
    throw error;
  }
}

/**
 * Uploads PDF to GHL custom field
 * @param {string} contactId - GHL contact ID
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @param {string} fileName - File name for the PDF
 * @returns {Promise<Object>} Upload response
 */
async function uploadPdfToGHL(contactId, pdfBuffer, fileName) {
  const apiKey = process.env.GHL_API_KEY;
  const locationId = process.env.GHL_LOCATION_ID;
  const customFieldId = process.env.GHL_PDF_FIELD_ID || 'UvlnLTzwo1TQe2KXDfzW';

  if (!apiKey) {
    throw new Error('GHL_API_KEY not configured in environment variables');
  }

  if (!locationId) {
    throw new Error('GHL_LOCATION_ID not configured in environment variables');
  }

  try {
    const timestamp = Date.now();
    const fieldKey = `${customFieldId}_${timestamp}`;

    // Create form data
    const formData = new FormData();
    formData.append(fieldKey, pdfBuffer, {
      filename: fileName,
      contentType: 'application/pdf'
    });

    const uploadUrl = `https://services.leadconnectorhq.com/forms/upload-custom-files?contactId=${contactId}&locationId=${locationId}`;

    console.log('Uploading PDF to GHL custom field...');
    const response = await axios.post(uploadUrl, formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${apiKey}`,
        'Version': '2021-07-28'
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    });

    console.log('PDF uploaded successfully to GHL');
    return response.data;
  } catch (error) {
    console.error('Error uploading PDF to GHL:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Gets contact details including custom fields
 * @param {string} contactId - GHL contact ID
 * @returns {Promise<Object>} Contact data
 */
async function getContactDetails(contactId) {
  const apiKey = process.env.GHL_API_KEY;

  if (!apiKey) {
    throw new Error('GHL_API_KEY not configured in environment variables');
  }

  try {
    const response = await axios.get(
      `https://services.leadconnectorhq.com/contacts/${contactId}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Version': '2021-07-28'
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error getting contact details:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Checks if PDF custom field has existing file
 * @param {string} contactId - GHL contact ID
 * @returns {Promise<boolean>} True if field has file
 */
async function hasExistingPdf(contactId) {
  const customFieldId = process.env.GHL_PDF_FIELD_ID || 'UvlnLTzwo1TQe2KXDfzW';

  try {
    const contactData = await getContactDetails(contactId);
    const customFields = contactData.contact?.customFields || [];

    const pdfField = customFields.find(field => field.id === customFieldId);

    if (pdfField && pdfField.value && pdfField.value.trim() !== '') {
      console.log('Existing PDF found in custom field:', pdfField.value);
      return true;
    }

    console.log('No existing PDF in custom field');
    return false;
  } catch (error) {
    console.error('Error checking existing PDF:', error.message);
    return false;
  }
}

/**
 * Main function to handle PDF download and upload
 * @param {string} submissionId - JotForm submission ID
 * @param {string} formId - JotForm form ID
 * @param {string} contactId - GHL contact ID
 * @param {string} contactName - Contact name for file naming
 * @returns {Promise<Object>} Result object
 */
async function handlePdfUpload(submissionId, formId, contactId, contactName) {
  try {
    console.log('Starting PDF upload process...');

    // Check if existing PDF exists
    const hasExisting = await hasExistingPdf(contactId);
    if (hasExisting) {
      console.log('Existing PDF detected. Will replace with new PDF.');
    }

    // Download PDF from JotForm
    const pdfBuffer = await downloadPdfFromJotForm(submissionId, formId);

    // Generate filename
    const sanitizedName = contactName.replace(/[^a-z0-9]/gi, '_');
    const fileName = `Form_${sanitizedName}.pdf`;

    // Upload to GHL (this will replace existing if present)
    const uploadResult = await uploadPdfToGHL(contactId, pdfBuffer, fileName);

    console.log('PDF upload process completed successfully');
    return {
      success: true,
      fileName: fileName,
      hadExisting: hasExisting,
      uploadResult: uploadResult
    };
  } catch (error) {
    console.error('Error in PDF upload process:', error.message);
    throw error;
  }
}

module.exports = {
  downloadPdfFromJotForm,
  uploadPdfToGHL,
  hasExistingPdf,
  handlePdfUpload
};
