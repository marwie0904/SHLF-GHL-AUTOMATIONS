/**
 * Invoice PDF Generation Service
 *
 * Generates professional PDF invoices using Puppeteer and HTML templates.
 * The invoice matches the Safe Harbor Law Firm branding.
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const https = require('https');

/**
 * Get Puppeteer launch options based on environment
 * Digital Ocean App Platform requires specific configuration
 */
function getPuppeteerLaunchOptions() {
  const baseOptions = {
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-extensions'
    ]
  };

  // Check for PUPPETEER_EXECUTABLE_PATH env var first (can be set in Digital Ocean)
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    console.log('Using PUPPETEER_EXECUTABLE_PATH:', process.env.PUPPETEER_EXECUTABLE_PATH);
    baseOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    return baseOptions;
  }

  // Try to find system chromium (for production environments)
  const possiblePaths = [
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/snap/bin/chromium'
  ];

  for (const chromePath of possiblePaths) {
    if (fs.existsSync(chromePath)) {
      console.log('Using system Chrome at:', chromePath);
      baseOptions.executablePath = chromePath;
      return baseOptions;
    }
  }

  // Let Puppeteer use its bundled browser (works locally)
  console.log('Using Puppeteer bundled browser');
  return baseOptions;
}

// Use hosted logo URL - will be fetched and converted to base64 when needed
const LOGO_URL = 'https://storage.googleapis.com/msgsndr/afYLuZPi37CZR1IpJlfn/media/68f107369d906785d9458314.png';

// Cache for logo base64 to avoid fetching multiple times
let LOGO_BASE64_CACHE = null;

/**
 * Fetches the logo from URL and converts to base64
 * @returns {Promise<string>} Base64 data URL for the logo
 */
async function getLogoBase64() {
  if (LOGO_BASE64_CACHE) {
    return LOGO_BASE64_CACHE;
  }

  return new Promise((resolve, reject) => {
    https.get(LOGO_URL, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        const buffer = Buffer.concat(chunks);
        LOGO_BASE64_CACHE = `data:image/png;base64,${buffer.toString('base64')}`;
        resolve(LOGO_BASE64_CACHE);
      });
      response.on('error', reject);
    }).on('error', reject);
  });
}

/**
 * Formats a number as USD currency
 * @param {number} amount - The amount to format
 * @returns {string} Formatted currency string
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

/**
 * Formats a date string to readable format
 * @param {string|Date} date - The date to format
 * @returns {string} Formatted date string (e.g., "November 28, 2025")
 */
function formatDate(date) {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Formats a date string to short format (MM/DD/YYYY)
 * @param {string|Date} date - The date to format
 * @returns {string} Formatted date string (e.g., "11/28/2025")
 */
function formatDateShort(date) {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

/**
 * Generates HTML from the invoice template with data
 * @param {Object} invoiceData - Invoice data to populate template
 * @returns {Promise<string>} Populated HTML string
 */
async function generateInvoiceHTML(invoiceData) {
  const templatePath = path.join(__dirname, '..', 'templates', 'invoice-template.html');
  let html = fs.readFileSync(templatePath, 'utf8');

  // Get logo as base64
  const logoBase64 = await getLogoBase64();

  // Replace simple placeholders
  html = html.replace(/\{\{logoBase64\}\}/g, logoBase64);
  html = html.replace(/\{\{billedTo\}\}/g, invoiceData.billedTo || '-');
  html = html.replace(/\{\{invoiceNumber\}\}/g, invoiceData.invoiceNumber || '-');
  html = html.replace(/\{\{issueDate\}\}/g, formatDate(invoiceData.issueDate));
  html = html.replace(/\{\{dueDate\}\}/g, formatDate(invoiceData.dueDate));
  html = html.replace(/\{\{subtotal\}\}/g, formatCurrency(invoiceData.subtotal || 0));
  html = html.replace(/\{\{amountDue\}\}/g, formatCurrency(invoiceData.amountDue || 0));
  html = html.replace(/\{\{paymentLink\}\}/g, invoiceData.paymentLink || '#');

  // Generate line items HTML
  let lineItemsHTML = '';
  if (invoiceData.lineItems && invoiceData.lineItems.length > 0) {
    for (const item of invoiceData.lineItems) {
      lineItemsHTML += `
        <tr>
          <td>${item.name || '-'}</td>
          <td>${formatCurrency(item.price || 0)}</td>
          <td>${item.quantity || 1}</td>
          <td>${item.tax || '-'}</td>
          <td>${formatCurrency(item.subtotal || item.price || 0)}</td>
        </tr>
      `;
    }
  }

  // Replace line items section
  html = html.replace(/\{\{#lineItems\}\}[\s\S]*?\{\{\/lineItems\}\}/g, lineItemsHTML);

  return html;
}

/**
 * Generates a PDF invoice from invoice data
 * @param {Object} invoiceData - Invoice data
 * @param {string} invoiceData.billedTo - Customer name
 * @param {string} invoiceData.invoiceNumber - Invoice number
 * @param {string|Date} invoiceData.issueDate - Issue date
 * @param {string|Date} invoiceData.dueDate - Due date
 * @param {Array} invoiceData.lineItems - Array of line items [{name, price, quantity, tax, subtotal}]
 * @param {number} invoiceData.subtotal - Subtotal amount
 * @param {number} invoiceData.amountDue - Total amount due
 * @param {string} invoiceData.paymentLink - Payment link URL
 * @returns {Promise<Buffer>} PDF as a buffer
 */
async function generateInvoicePDF(invoiceData) {
  let browser = null;

  try {
    console.log('=== Generating Invoice PDF ===');
    console.log('Invoice Number:', invoiceData.invoiceNumber);
    console.log('Billed To:', invoiceData.billedTo);
    console.log('Amount Due:', invoiceData.amountDue);

    // Generate HTML with data
    const html = await generateInvoiceHTML(invoiceData);

    // Launch Puppeteer with environment-appropriate options
    browser = await puppeteer.launch(getPuppeteerLaunchOptions());

    const page = await browser.newPage();

    // Set content and wait for it to load
    await page.setContent(html, {
      waitUntil: 'networkidle0'
    });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    });

    console.log('✅ PDF generated successfully');
    console.log('PDF Size:', pdfBuffer.length, 'bytes');

    return pdfBuffer;

  } catch (error) {
    console.error('❌ Error generating PDF:', error.message);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Generates and saves a PDF invoice to a file
 * @param {Object} invoiceData - Invoice data
 * @param {string} outputPath - Path to save the PDF (optional)
 * @returns {Promise<{buffer: Buffer, path: string}>} PDF buffer and file path
 */
async function generateAndSaveInvoicePDF(invoiceData, outputPath = null) {
  const pdfBuffer = await generateInvoicePDF(invoiceData);

  // Generate default output path if not provided
  if (!outputPath) {
    const invoiceNumber = invoiceData.invoiceNumber || 'invoice';
    const timestamp = Date.now();
    outputPath = path.join(__dirname, '..', 'temp', `${invoiceNumber}-${timestamp}.pdf`);
  }

  // Ensure temp directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Save PDF to file
  fs.writeFileSync(outputPath, pdfBuffer);
  console.log('✅ PDF saved to:', outputPath);

  return {
    buffer: pdfBuffer,
    path: outputPath
  };
}

/**
 * Generates HTML from the paid invoice template with data
 * @param {Object} invoiceData - Invoice data to populate template
 * @returns {Promise<string>} Populated HTML string
 */
async function generatePaidInvoiceHTML(invoiceData) {
  const templatePath = path.join(__dirname, '..', 'templates', 'invoice-paid-template.html');
  let html = fs.readFileSync(templatePath, 'utf8');

  // Calculate balance due (should be 0 for paid invoice)
  const balanceDue = (invoiceData.amountDue || 0) - (invoiceData.paymentsReceived || invoiceData.amountDue || 0);

  // Get logo as base64
  const logoBase64 = await getLogoBase64();

  // Replace simple placeholders
  html = html.replace(/\{\{logoBase64\}\}/g, logoBase64);
  html = html.replace(/\{\{billedTo\}\}/g, invoiceData.billedTo || '-');
  html = html.replace(/\{\{invoiceNumber\}\}/g, invoiceData.invoiceNumber || '-');
  html = html.replace(/\{\{issueDate\}\}/g, formatDate(invoiceData.issueDate));
  html = html.replace(/\{\{dueDate\}\}/g, formatDate(invoiceData.dueDate));
  html = html.replace(/\{\{dueDateShort\}\}/g, formatDateShort(invoiceData.dueDate));
  html = html.replace(/\{\{subtotal\}\}/g, formatCurrency(invoiceData.subtotal || 0));
  html = html.replace(/\{\{amountDue\}\}/g, formatCurrency(invoiceData.amountDue || 0));
  html = html.replace(/\{\{paymentsReceived\}\}/g, formatCurrency(invoiceData.paymentsReceived || invoiceData.amountDue || 0));
  html = html.replace(/\{\{balanceDue\}\}/g, formatCurrency(balanceDue));

  // Generate line items HTML
  let lineItemsHTML = '';
  if (invoiceData.lineItems && invoiceData.lineItems.length > 0) {
    for (const item of invoiceData.lineItems) {
      lineItemsHTML += `
        <tr>
          <td>${item.name || '-'}</td>
          <td>${formatCurrency(item.price || 0)}</td>
          <td>${item.quantity || 1}</td>
          <td>${item.tax || '-'}</td>
          <td>${formatCurrency(item.subtotal || item.price || 0)}</td>
        </tr>
      `;
    }
  }

  // Replace line items section
  html = html.replace(/\{\{#lineItems\}\}[\s\S]*?\{\{\/lineItems\}\}/g, lineItemsHTML);

  return html;
}

/**
 * Generates a PAID invoice PDF from invoice data
 * Includes "Detailed Statement of Account" section and PAID badge (no Pay Now button)
 * @param {Object} invoiceData - Invoice data
 * @param {string} invoiceData.billedTo - Customer name
 * @param {string} invoiceData.invoiceNumber - Invoice number
 * @param {string|Date} invoiceData.issueDate - Issue date
 * @param {string|Date} invoiceData.dueDate - Due date
 * @param {Array} invoiceData.lineItems - Array of line items [{name, price, quantity, tax, subtotal}]
 * @param {number} invoiceData.subtotal - Subtotal amount
 * @param {number} invoiceData.amountDue - Total amount due
 * @param {number} invoiceData.paymentsReceived - Total payments received (defaults to amountDue)
 * @returns {Promise<Buffer>} PDF as a buffer
 */
async function generatePaidInvoicePDF(invoiceData) {
  let browser = null;

  try {
    console.log('=== Generating PAID Invoice PDF ===');
    console.log('Invoice Number:', invoiceData.invoiceNumber);
    console.log('Billed To:', invoiceData.billedTo);
    console.log('Amount Due:', invoiceData.amountDue);
    console.log('Payments Received:', invoiceData.paymentsReceived || invoiceData.amountDue);

    // Generate HTML with data
    const html = await generatePaidInvoiceHTML(invoiceData);

    // Launch Puppeteer with environment-appropriate options
    browser = await puppeteer.launch(getPuppeteerLaunchOptions());

    const page = await browser.newPage();

    // Set content and wait for it to load
    await page.setContent(html, {
      waitUntil: 'networkidle0'
    });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    });

    console.log('✅ PAID Invoice PDF generated successfully');
    console.log('PDF Size:', pdfBuffer.length, 'bytes');

    return pdfBuffer;

  } catch (error) {
    console.error('❌ Error generating PAID PDF:', error.message);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Generates and saves a PAID invoice PDF to a file
 * @param {Object} invoiceData - Invoice data
 * @param {string} outputPath - Path to save the PDF (optional)
 * @returns {Promise<{buffer: Buffer, path: string}>} PDF buffer and file path
 */
async function generateAndSavePaidInvoicePDF(invoiceData, outputPath = null) {
  const pdfBuffer = await generatePaidInvoicePDF(invoiceData);

  // Generate default output path if not provided
  if (!outputPath) {
    const invoiceNumber = invoiceData.invoiceNumber || 'invoice';
    const timestamp = Date.now();
    outputPath = path.join(__dirname, '..', 'temp', `${invoiceNumber}-PAID-${timestamp}.pdf`);
  }

  // Ensure temp directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Save PDF to file
  fs.writeFileSync(outputPath, pdfBuffer);
  console.log('✅ PAID PDF saved to:', outputPath);

  return {
    buffer: pdfBuffer,
    path: outputPath
  };
}

module.exports = {
  generateInvoicePDF,
  generateAndSaveInvoicePDF,
  generateInvoiceHTML,
  generatePaidInvoicePDF,
  generateAndSavePaidInvoicePDF,
  generatePaidInvoiceHTML,
  formatCurrency,
  formatDate,
  formatDateShort
};
