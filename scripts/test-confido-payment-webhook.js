/**
 * Test Script for Confido Payment Received Webhook
 *
 * Usage:
 *   node scripts/test-confido-payment-webhook.js
 *
 * This script sends a mock Confido payment webhook to test the endpoint.
 * Update the payload below based on actual Confido webhook structure.
 *
 * NOTE: You need to have an existing invoice in the database for this test to work.
 * Either run test-ghl-invoice-webhook.js first, or manually insert a test invoice.
 */

const axios = require('axios');

// Configuration
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:3000/webhooks/confido/payment-received';

// Mock Confido payment webhook payload
// NOTE: Update this structure based on actual Confido webhook payload
// IMPORTANT: Use a valid confido_invoice_id from your database
const mockPaymentPayload = {
  // Payment identifiers
  payment_id: 'confido-payment-' + Date.now(),
  paymentId: 'confido-payment-' + Date.now(),
  id: 'confido-payment-' + Date.now(),

  // Invoice reference
  // TODO: Replace with actual Confido invoice ID from your database
  invoice_id: 'confido-invoice-123',
  invoiceId: 'confido-invoice-123',

  // Payment details
  amount: 2500.00,
  payment_amount: 2500.00,

  payment_method: 'credit_card',
  paymentMethod: 'credit_card',

  status: 'completed',

  // Transaction info
  transaction_date: new Date().toISOString(),
  transactionDate: new Date().toISOString(),

  // Additional metadata (varies by Confido's actual structure)
  customer: {
    name: 'John Doe',
    email: 'john.doe@example.com'
  },

  metadata: {
    source: 'online_payment',
    processor: 'stripe'
  }
};

/**
 * Send test webhook with optional signature
 */
async function testPaymentWebhook() {
  console.log('=== Testing Confido Payment Webhook ===');
  console.log('Webhook URL:', WEBHOOK_URL);
  console.log('\nSending payload:');
  console.log(JSON.stringify(mockPaymentPayload, null, 2));
  console.log('\n' + '='.repeat(50) + '\n');

  // Optional: Generate a test signature if Confido uses webhook signatures
  const headers = {
    'Content-Type': 'application/json',
    // Uncomment and update if Confido uses webhook signatures
    // 'x-confido-signature': 'test-signature-here',
    // 'x-webhook-signature': 'test-signature-here'
  };

  try {
    const response = await axios.post(WEBHOOK_URL, mockPaymentPayload, {
      headers
    });

    console.log('✅ Webhook request successful!');
    console.log('Status:', response.status);
    console.log('Response:');
    console.log(JSON.stringify(response.data, null, 2));

    if (response.data.success) {
      console.log('\n✅ TEST PASSED');
      console.log('Payment ID:', response.data.paymentId);
      console.log('Confido Payment ID:', response.data.confidoPaymentId);
      console.log('Invoice ID:', response.data.invoiceId);
      console.log('GHL Invoice ID:', response.data.ghlInvoiceId);
      console.log('Amount:', response.data.amount);
      console.log('Invoice Status:', response.data.invoiceStatus);
    } else {
      console.log('\n❌ TEST FAILED');
      console.log('Error:', response.data.message);
    }

  } catch (error) {
    console.error('\n❌ Webhook request failed!');

    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:');
      console.error(JSON.stringify(error.response.data, null, 2));

      // Check for specific error cases
      if (error.response.status === 404) {
        console.error('\n💡 Invoice not found in database.');
        console.error('Make sure to:');
        console.error('1. Run test-ghl-invoice-webhook.js first to create a test invoice');
        console.error('2. Update the invoice_id in this script with the returned Confido invoice ID');
        console.error('3. Or manually insert a test invoice into the database');
      } else if (error.response.status === 401) {
        console.error('\n💡 Webhook signature verification failed.');
        console.error('Make sure the signature header matches the expected format.');
      }

    } else if (error.request) {
      console.error('No response received from server');
      console.error('Error:', error.message);
      console.error('\n💡 Make sure the server is running (npm start or node server.js)');
    } else {
      console.error('Error:', error.message);
    }

    process.exit(1);
  }
}

// Instructions
console.log('\n⚠️  IMPORTANT SETUP INSTRUCTIONS ⚠️');
console.log('━'.repeat(50));
console.log('Before running this test:');
console.log('1. Ensure you have an invoice in the database');
console.log('2. Run: node scripts/test-ghl-invoice-webhook.js');
console.log('3. Copy the "confidoInvoiceId" from the response');
console.log('4. Update the "invoice_id" field in this script');
console.log('5. Then run this test script');
console.log('━'.repeat(50) + '\n');

// Prompt to continue
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

readline.question('Have you updated the invoice_id in this script? (y/n): ', (answer) => {
  if (answer.toLowerCase() === 'y') {
    readline.close();
    testPaymentWebhook();
  } else {
    console.log('\n❌ Please update the invoice_id first before running this test.');
    console.log('Edit: scripts/test-confido-payment-webhook.js');
    console.log('Update the invoice_id field (around line 20)\n');
    readline.close();
    process.exit(0);
  }
});
