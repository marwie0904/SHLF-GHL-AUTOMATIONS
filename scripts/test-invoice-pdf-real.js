/**
 * Test Script: Invoice PDF Generation with Real Supabase Data
 */

const path = require('path');
const { generateAndSaveInvoicePDF } = require('../services/invoicePdfService');

async function testRealInvoicePDF() {
  console.log('🚀 Testing Invoice PDF Generation with Real Data...\n');

  // Real invoice data from Supabase (INV-20251128-A84C)
  const realInvoiceData = {
    billedTo: 'Marwie Ang',
    invoiceNumber: 'INV-20251128-A84C',
    issueDate: new Date('2025-11-28T07:17:23.827Z'),
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
    paymentLink: 'https://pay.gravity-legal.com/paylink/0228d4f9-6f2b-4864-83a9-eaa8b8147d08'
  };

  try {
    const outputPath = path.join(__dirname, '..', 'temp', 'real-invoice-test.pdf');
    const result = await generateAndSaveInvoicePDF(realInvoiceData, outputPath);

    console.log('\n✅ PDF Generated Successfully!');
    console.log('PDF Size:', result.buffer.length, 'bytes');
    console.log('PDF Saved To:', result.path);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

testRealInvoicePDF().then(() => process.exit(0));
