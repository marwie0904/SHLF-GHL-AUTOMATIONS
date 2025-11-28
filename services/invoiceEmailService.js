/**
 * Invoice Email Service
 *
 * Sends invoice emails via Make.com webhook with PDF attachment.
 * Supports both unpaid invoice emails (with payment link) and paid invoice emails.
 */

const axios = require('axios');
const { generateInvoicePDF, generatePaidInvoicePDF, formatCurrency, formatDate } = require('./invoicePdfService');

const MAKE_WEBHOOK_URL = process.env.MAKE_INVOICE_EMAIL_WEBHOOK;

// Logo URL - hosted on GHL
const LOGO_URL = 'https://storage.googleapis.com/msgsndr/afYLuZPi37CZR1IpJlfn/media/68f107369d906785d9458314.png';

// Invoice viewer base URL (Digital Ocean server)
const INVOICE_VIEWER_BASE_URL = process.env.INVOICE_VIEWER_URL || 'https://shlf-ghl-automations-zsl6v.ondigitalocean.app';

/**
 * Generates the HTML email body for an unpaid invoice
 * @param {Object} data - Email data
 * @returns {string} HTML email body
 */
function generateInvoiceEmailHTML(data) {
  const invoiceViewerUrl = `${INVOICE_VIEWER_BASE_URL}/invoice/${data.invoiceNumber}`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #e8f4fc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #e8f4fc; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px;">
          <tr>
            <td align="center" style="padding: 40px 40px 20px 40px;">
              <img src="${LOGO_URL}" alt="Safe Harbor Law Firm" width="400" style="max-width: 100%;">
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px;">
              <h2 style="color: #1a365d; margin: 0 0 20px 0; font-size: 24px;">Invoice for ${data.recipientName}</h2>
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 10px 0;">Hi ${data.recipientName},</p>
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">Safe Harbor Law Firm sent you invoice# ${data.invoiceNumber} for ${data.amount} that's due on ${data.dueDate}</p>
              <a href="${invoiceViewerUrl}" style="display: inline-block; background-color: #e07c5a; color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 4px; font-size: 16px; font-weight: bold;">View Invoice</a>
              <p style="color: #333; font-size: 14px; margin: 20px 0 30px 0;">Unable to see the invoice button? <a href="${invoiceViewerUrl}" style="color: #2b6cb0;">View Invoice</a></p>
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0;">Regards,<br><strong>Safe Harbor Law Firm</strong></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Generates the HTML email body for a paid invoice
 * @param {Object} data - Email data
 * @returns {string} HTML email body
 */
function generatePaidInvoiceEmailHTML(data) {
  const invoiceViewerUrl = `${INVOICE_VIEWER_BASE_URL}/invoice/${data.invoiceNumber}`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #e8f4fc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #e8f4fc; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px;">
          <tr>
            <td align="center" style="padding: 40px 40px 20px 40px;">
              <img src="${LOGO_URL}" alt="Safe Harbor Law Firm" width="400" style="max-width: 100%;">
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px;">
              <h2 style="color: #1a365d; margin: 0 0 20px 0; font-size: 24px;">Payment Received - Thank You!</h2>
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 10px 0;">Hi ${data.recipientName},</p>
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Thank you for your payment of ${data.amount} for invoice# ${data.invoiceNumber}.</p>
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">You can view your paid invoice receipt anytime by clicking the button below.</p>
              <a href="${invoiceViewerUrl}" style="display: inline-block; background-color: #48bb78; color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 4px; font-size: 16px; font-weight: bold;">View Receipt</a>
              <p style="color: #333; font-size: 14px; margin: 20px 0 30px 0;">Unable to see the button? <a href="${invoiceViewerUrl}" style="color: #2b6cb0;">View Receipt</a></p>
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0;">Regards,<br><strong>Safe Harbor Law Firm</strong></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Sends an unpaid invoice email via Make.com webhook
 * @param {Object} invoiceData - Invoice data from Supabase
 * @param {string} recipientEmail - Recipient email address
 * @param {string} senderName - Sender name (default: "Safe Harbor Law Firm")
 * @returns {Promise<Object>} Webhook response
 */
async function sendInvoiceEmail(invoiceData, recipientEmail, senderName = 'Safe Harbor Law Firm') {
  if (!MAKE_WEBHOOK_URL) {
    throw new Error('MAKE_INVOICE_EMAIL_WEBHOOK environment variable not set');
  }

  console.log('=== Sending Invoice Email ===');
  console.log('To:', recipientEmail);
  console.log('Invoice:', invoiceData.invoiceNumber);

  // Generate the PDF
  const pdfBuffer = await generateInvoicePDF(invoiceData);
  const pdfBase64 = pdfBuffer.toString('base64');

  // Prepare email data
  const emailData = {
    recipientName: invoiceData.billedTo,
    invoiceNumber: invoiceData.invoiceNumber,
    amount: formatCurrency(invoiceData.amountDue),
    dueDate: formatDate(invoiceData.dueDate),
    paymentLink: invoiceData.paymentLink,
    senderName: senderName
  };

  // Generate HTML body
  const htmlBody = generateInvoiceEmailHTML(emailData);

  // Prepare webhook payload
  const payload = {
    to: recipientEmail,
    subject: `Safe Harbor Invoice #${invoiceData.invoiceNumber}`,
    htmlBody: htmlBody,
    pdfBase64: pdfBase64,
    pdfFilename: `Invoice-${invoiceData.invoiceNumber}.pdf`,
    type: 'unpaid'
  };

  try {
    const response = await axios.post(MAKE_WEBHOOK_URL, payload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    console.log('✅ Invoice email sent successfully');
    return { success: true, response: response.data };

  } catch (error) {
    console.error('❌ Failed to send invoice email:', error.message);
    throw error;
  }
}

/**
 * Sends a paid invoice email via Make.com webhook
 * @param {Object} invoiceData - Invoice data from Supabase
 * @param {string} recipientEmail - Recipient email address
 * @param {string} senderName - Sender name (default: "Safe Harbor Law Firm")
 * @returns {Promise<Object>} Webhook response
 */
async function sendPaidInvoiceEmail(invoiceData, recipientEmail, senderName = 'Safe Harbor Law Firm') {
  if (!MAKE_WEBHOOK_URL) {
    throw new Error('MAKE_INVOICE_EMAIL_WEBHOOK environment variable not set');
  }

  console.log('=== Sending Paid Invoice Email ===');
  console.log('To:', recipientEmail);
  console.log('Invoice:', invoiceData.invoiceNumber);

  // Generate the paid invoice PDF
  const pdfBuffer = await generatePaidInvoicePDF(invoiceData);
  const pdfBase64 = pdfBuffer.toString('base64');

  // Prepare email data
  const emailData = {
    recipientName: invoiceData.billedTo,
    invoiceNumber: invoiceData.invoiceNumber,
    amount: formatCurrency(invoiceData.amountDue),
    senderName: senderName
  };

  // Generate HTML body
  const htmlBody = generatePaidInvoiceEmailHTML(emailData);

  // Prepare webhook payload
  const payload = {
    to: recipientEmail,
    subject: `Payment Received - Invoice #${invoiceData.invoiceNumber}`,
    htmlBody: htmlBody,
    pdfBase64: pdfBase64,
    pdfFilename: `Invoice-${invoiceData.invoiceNumber}-PAID.pdf`,
    type: 'paid'
  };

  try {
    const response = await axios.post(MAKE_WEBHOOK_URL, payload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    console.log('✅ Paid invoice email sent successfully');
    return { success: true, response: response.data };

  } catch (error) {
    console.error('❌ Failed to send paid invoice email:', error.message);
    throw error;
  }
}

module.exports = {
  sendInvoiceEmail,
  sendPaidInvoiceEmail,
  generateInvoiceEmailHTML,
  generatePaidInvoiceEmailHTML
};
