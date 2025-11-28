/**
 * Test Script: Invoice PDF Generation
 *
 * Tests the invoice PDF generation service with sample data.
 *
 * Usage:
 *   node scripts/test-invoice-pdf.js
 */

const path = require('path');
const { generateAndSaveInvoicePDF } = require('../services/invoicePdfService');

async function testInvoicePDF() {
  console.log('🚀 Testing Invoice PDF Generation...\n');

  // Sample invoice data matching the format from GHL
  const sampleInvoiceData = {
    billedTo: 'Jared Michael Hansen',
    invoiceNumber: 'INV-20251128-TEST',
    issueDate: new Date('2025-11-28'),
    dueDate: new Date('2025-12-12'),
    lineItems: [
      {
        name: 'Will Plan 50% plus Lady Bird Deed',
        price: 1425.00,
        quantity: 1,
        tax: '-',
        subtotal: 1425.00
      },
      {
        name: 'Trust Amendment',
        price: 350.00,
        quantity: 1,
        tax: '-',
        subtotal: 350.00
      }
    ],
    subtotal: 1775.00,
    amountDue: 1775.00,
    paymentLink: 'https://pay.gravity-legal.com/example-payment-link'
  };

  try {
    // Generate PDF
    const outputPath = path.join(__dirname, '..', 'temp', 'test-invoice.pdf');
    const result = await generateAndSaveInvoicePDF(sampleInvoiceData, outputPath);

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  TEST COMPLETED SUCCESSFULLY');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('PDF Buffer Size:', result.buffer.length, 'bytes');
    console.log('PDF Saved To:', result.path);
    console.log('\nOpen the PDF to verify the output looks correct.');
    console.log('─────────────────────────────────────────────────────────────\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run test
testInvoicePDF().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
