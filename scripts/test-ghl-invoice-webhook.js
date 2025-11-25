/**
 * Test Script for GHL Invoice Created Webhook
 *
 * Usage:
 *   node scripts/test-ghl-invoice-webhook.js
 *
 * This script sends a mock GHL invoice webhook to test the endpoint.
 * Update the payload below based on actual GHL invoice webhook structure.
 */

const axios = require('axios');

// Configuration
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:3000/webhooks/ghl/invoice-created';

// Mock GHL invoice webhook payload
// NOTE: Update this structure based on actual GHL invoice webhook payload
const mockInvoicePayload = {
  // Invoice identifiers
  invoice_id: 'test-ghl-invoice-' + Date.now(),
  invoiceId: 'test-ghl-invoice-' + Date.now(),

  // Opportunity and contact info
  opportunity_id: 'test-opp-123',
  opportunityId: 'test-opp-123',
  opportunity_name: 'Test Estate Planning Opportunity',
  opportunityName: 'Test Estate Planning Opportunity',

  contact_id: 'test-contact-456',
  contactId: 'test-contact-456',
  contact_name: 'John Doe',
  contactName: 'John Doe',
  contact_email: 'john.doe@example.com',
  email: 'john.doe@example.com',

  // Invoice details
  invoice_number: 'INV-2025-001',
  invoiceNumber: 'INV-2025-001',

  amount_due: 2500.00,
  amountDue: 2500.00,
  total: 2500.00,

  status: 'pending',

  // Dates
  invoice_date: new Date().toISOString(),
  invoiceDate: new Date().toISOString(),

  due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),

  // Line items (if applicable)
  line_items: [
    {
      description: 'Estate Planning Consultation',
      quantity: 1,
      unit_price: 1500.00,
      amount: 1500.00
    },
    {
      description: 'Will Preparation',
      quantity: 1,
      unit_price: 1000.00,
      amount: 1000.00
    }
  ],
  lineItems: [
    {
      description: 'Estate Planning Consultation',
      quantity: 1,
      unit_price: 1500.00,
      amount: 1500.00
    },
    {
      description: 'Will Preparation',
      quantity: 1,
      unit_price: 1000.00,
      amount: 1000.00
    }
  ]
};

/**
 * Send test webhook
 */
async function testInvoiceWebhook() {
  console.log('=== Testing GHL Invoice Webhook ===');
  console.log('Webhook URL:', WEBHOOK_URL);
  console.log('\nSending payload:');
  console.log(JSON.stringify(mockInvoicePayload, null, 2));
  console.log('\n' + '='.repeat(50) + '\n');

  try {
    const response = await axios.post(WEBHOOK_URL, mockInvoicePayload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Webhook request successful!');
    console.log('Status:', response.status);
    console.log('Response:');
    console.log(JSON.stringify(response.data, null, 2));

    if (response.data.success) {
      console.log('\n✅ TEST PASSED');
      console.log('Invoice ID:', response.data.invoiceId);
      console.log('GHL Invoice ID:', response.data.ghlInvoiceId);
      console.log('Confido Invoice ID:', response.data.confidoInvoiceId);
      console.log('Amount Due:', response.data.amountDue);
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
    } else if (error.request) {
      console.error('No response received from server');
      console.error('Error:', error.message);
    } else {
      console.error('Error:', error.message);
    }

    process.exit(1);
  }
}

// Run the test
testInvoiceWebhook();
