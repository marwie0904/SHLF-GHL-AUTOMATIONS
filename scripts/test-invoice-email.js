/**
 * Test Script: Invoice Email via Make.com Webhook
 *
 * Tests sending invoice emails with PDF attachment through Make.com
 */

require('dotenv').config();
const { sendInvoiceEmail, sendPaidInvoiceEmail } = require('../services/invoiceEmailService');

async function testInvoiceEmail() {
  console.log('🚀 Testing Invoice Email via Make.com...\n');

  // Sample invoice data
  const invoiceData = {
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
    paymentLink: 'https://pay.gravity-legal.com/paylink/0228d4f9-6f2b-4864-83a9-eaa8b8147d08'
  };

  // Test recipient email - change this to your email for testing
  const testEmail = 'test@example.com';

  try {
    // Test unpaid invoice email
    console.log('--- Testing Unpaid Invoice Email ---');
    const result = await sendInvoiceEmail(invoiceData, testEmail, 'Gabby Ang');
    console.log('Result:', result);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

async function testPaidInvoiceEmail() {
  console.log('\n🚀 Testing Paid Invoice Email via Make.com...\n');

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
    paymentsReceived: 60.00
  };

  const testEmail = 'test@example.com';

  try {
    console.log('--- Testing Paid Invoice Email ---');
    const result = await sendPaidInvoiceEmail(paidInvoiceData, testEmail, 'Gabby Ang');
    console.log('Result:', result);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run tests based on command line argument
const testType = process.argv[2] || 'unpaid';

if (testType === 'paid') {
  testPaidInvoiceEmail().then(() => process.exit(0));
} else if (testType === 'both') {
  testInvoiceEmail()
    .then(() => testPaidInvoiceEmail())
    .then(() => process.exit(0));
} else {
  testInvoiceEmail().then(() => process.exit(0));
}
