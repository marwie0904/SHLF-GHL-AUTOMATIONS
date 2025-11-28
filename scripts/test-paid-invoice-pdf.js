/**
 * Test Script: PAID Invoice PDF Generation
 */

const path = require('path');
const { generateAndSavePaidInvoicePDF } = require('../services/invoicePdfService');

async function testPaidInvoicePDF() {
  console.log('🚀 Testing PAID Invoice PDF Generation...\n');

  // Sample paid invoice data
  const paidInvoiceData = {
    billedTo: 'Marwie Ang',
    invoiceNumber: 'INV-20251128-A84C',
    issueDate: new Date('2025-11-28'),
    dueDate: new Date('2025-11-30'),
    lineItems: [
      {
        name: 'test',
        price: 20.00,
        quantity: 1,
        tax: '-',
        subtotal: 20.00
      },
      {
        name: 'test_2',
        price: 40.00,
        quantity: 1,
        tax: '-',
        subtotal: 40.00
      }
    ],
    subtotal: 60.00,
    amountDue: 60.00,
    paymentsReceived: 60.00  // Fully paid
  };

  try {
    const outputPath = path.join(__dirname, '..', 'temp', 'paid-invoice-test.pdf');
    const result = await generateAndSavePaidInvoicePDF(paidInvoiceData, outputPath);

    console.log('\n✅ PAID Invoice PDF Generated Successfully!');
    console.log('PDF Size:', result.buffer.length, 'bytes');
    console.log('PDF Saved To:', result.path);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testPaidInvoicePDF().then(() => process.exit(0));
