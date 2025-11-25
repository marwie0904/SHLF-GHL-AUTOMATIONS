/**
 * Manual Test Script for Confido Invoice Creation
 *
 * This script manually creates a complete invoice in Confido using mock GHL data
 * to verify the 3-step flow: Client → Matter → PaymentLink
 *
 * Usage:
 *   node scripts/test-confido-manual-creation.js
 */

require('dotenv').config();
const confidoService = require('../services/confidoService');

// Mock GHL invoice data
const mockGHLInvoiceData = {
  // GHL Invoice Details
  ghlInvoiceId: `test-ghl-invoice-${Date.now()}`,
  invoiceNumber: `INV-${Date.now()}`,
  amountDue: 2500.00,
  invoiceDate: new Date().toISOString(),
  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now

  // GHL Contact (Client) Details
  contactId: `test-ghl-contact-${Date.now()}`,
  contactName: 'John Smith',
  contactEmail: 'john.smith@example.com',
  contactPhone: '(555) 123-4567',

  // GHL Opportunity (Matter) Details
  opportunityId: `test-ghl-opportunity-${Date.now()}`,
  opportunityName: 'Estate Planning - Smith Family Trust',

  // Invoice Details
  memo: 'Estate planning services including will preparation and trust setup',
  lineItems: [
    {
      description: 'Initial Estate Planning Consultation',
      amount: 500.00,
      quantity: 1
    },
    {
      description: 'Will Preparation and Review',
      amount: 1000.00,
      quantity: 1
    },
    {
      description: 'Living Trust Creation',
      amount: 800.00,
      quantity: 1
    },
    {
      description: 'Power of Attorney Documents',
      amount: 200.00,
      quantity: 1
    }
  ]
};

/**
 * Main test function
 */
async function runTest() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  MANUAL CONFIDO INVOICE CREATION TEST');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('📋 Mock GHL Invoice Data:');
  console.log('─────────────────────────────────────────────────────────────');
  console.log('Invoice ID:', mockGHLInvoiceData.ghlInvoiceId);
  console.log('Invoice Number:', mockGHLInvoiceData.invoiceNumber);
  console.log('Amount Due: $' + mockGHLInvoiceData.amountDue.toFixed(2));
  console.log('');
  console.log('Contact:', mockGHLInvoiceData.contactName);
  console.log('Email:', mockGHLInvoiceData.contactEmail);
  console.log('Phone:', mockGHLInvoiceData.contactPhone);
  console.log('GHL Contact ID:', mockGHLInvoiceData.contactId);
  console.log('');
  console.log('Opportunity:', mockGHLInvoiceData.opportunityName);
  console.log('GHL Opportunity ID:', mockGHLInvoiceData.opportunityId);
  console.log('');
  console.log('Line Items:');
  mockGHLInvoiceData.lineItems.forEach((item, i) => {
    console.log(`  ${i + 1}. ${item.description} - $${item.amount.toFixed(2)}`);
  });
  console.log('─────────────────────────────────────────────────────────────\n');

  try {
    // Step 1: Test API Connection
    console.log('🔌 STEP 0: Testing Confido API Connection...');
    const connectionTest = await confidoService.testConnection();

    if (!connectionTest) {
      console.error('❌ Connection test failed. Please check your API credentials.');
      process.exit(1);
    }

    console.log('✅ Connection successful!\n');

    // Step 2: Create Invoice (This will do all 3 steps internally)
    console.log('🚀 Starting Invoice Creation Process...\n');
    console.log('═══════════════════════════════════════════════════════════');

    const result = await confidoService.createInvoice(mockGHLInvoiceData);

    console.log('═══════════════════════════════════════════════════════════\n');

    if (!result.success) {
      console.error('❌ Invoice creation failed!');
      console.error('Error:', result.error);
      process.exit(1);
    }

    // Step 3: Display Results
    console.log('✅ SUCCESS! Invoice Created in Confido\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  CONFIDO INVOICE DETAILS');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('📁 DIRECTORY ENTRIES CREATED:');
    console.log('─────────────────────────────────────────────────────────────');
    console.log('Client ID:', result.confidoClientId);
    console.log('Client Name:', result.clientName);
    console.log('');
    console.log('Matter ID:', result.confidoMatterId);
    console.log('Matter Name:', result.opportunityName);
    console.log('─────────────────────────────────────────────────────────────\n');

    console.log('💰 INVOICE (PAYMENTLINK):');
    console.log('─────────────────────────────────────────────────────────────');
    console.log('PaymentLink ID:', result.confidoInvoiceId);
    console.log('Status:', result.status.toUpperCase());
    console.log('');
    console.log('Total: $' + result.total.toFixed(2));
    console.log('Paid: $' + result.paid.toFixed(2));
    console.log('Outstanding: $' + result.outstanding.toFixed(2));
    console.log('');
    console.log('Payment URL:', result.paymentUrl);
    console.log('─────────────────────────────────────────────────────────────\n');

    console.log('🔗 LINKING INFORMATION:');
    console.log('─────────────────────────────────────────────────────────────');
    console.log('GHL Invoice ID:', mockGHLInvoiceData.ghlInvoiceId);
    console.log('GHL Contact ID:', mockGHLInvoiceData.contactId);
    console.log('GHL Opportunity ID:', mockGHLInvoiceData.opportunityId);
    console.log('─────────────────────────────────────────────────────────────\n');

    console.log('📊 WHAT TO CHECK IN CONFIDO DASHBOARD:');
    console.log('─────────────────────────────────────────────────────────────');
    console.log('1. Go to Clients section');
    console.log('   → Look for:', result.clientName);
    console.log('   → Should show External ID:', mockGHLInvoiceData.contactId);
    console.log('');
    console.log('2. Go to Matters section');
    console.log('   → Look for:', result.opportunityName);
    console.log('   → Should be linked to:', result.clientName);
    console.log('   → Should show External ID:', mockGHLInvoiceData.opportunityId);
    console.log('');
    console.log('3. Go to PaymentLinks section');
    console.log('   → Look for invoice with amount: $' + result.total.toFixed(2));
    console.log('   → Should be linked to Client and Matter above');
    console.log('   → Status should be: UNPAID');
    console.log('   → Payment URL should be accessible');
    console.log('─────────────────────────────────────────────────────────────\n');

    console.log('✅ TEST COMPLETED SUCCESSFULLY!\n');
    console.log('Next Steps:');
    console.log('1. Log into Confido dashboard');
    console.log('2. Verify Client, Matter, and PaymentLink are created');
    console.log('3. Try accessing the payment URL');
    console.log('4. (Optional) Make a test payment to verify webhook flow\n');

    // Return success
    process.exit(0);

  } catch (error) {
    console.error('\n❌ TEST FAILED WITH ERROR:');
    console.error('─────────────────────────────────────────────────────────────');
    console.error('Error Message:', error.message);
    console.error('');

    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
    }

    console.error('\nStack Trace:');
    console.error(error.stack);
    console.error('─────────────────────────────────────────────────────────────\n');

    console.log('🔍 TROUBLESHOOTING:');
    console.log('─────────────────────────────────────────────────────────────');
    console.log('1. Check that CONFIDO_API_KEY is set in .env');
    console.log('2. Verify API key has proper permissions');
    console.log('3. Check that CONFIDO_API_URL is correct');
    console.log('4. Review error message above for specific issue');
    console.log('─────────────────────────────────────────────────────────────\n');

    process.exit(1);
  }
}

// Run the test
console.log('Starting Confido manual creation test...\n');
runTest();
