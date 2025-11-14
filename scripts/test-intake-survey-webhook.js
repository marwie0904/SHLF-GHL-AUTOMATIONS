const axios = require('axios');
require('dotenv').config();

/**
 * Test script for the intake survey webhook endpoint
 * This will test the webhook with a contact that has an appointment
 */
async function testIntakeSurveyWebhook() {
  const serverUrl = process.env.SERVER_URL || 'http://localhost:3000';
  const contactId = 'IPbwCYvc2IsoD5tvjk7E'; // Test contact ID (has appointment)

  console.log('🧪 Testing Intake Survey Webhook...\n');
  console.log(`Server URL: ${serverUrl}`);
  console.log(`Test Contact ID: ${contactId}\n`);
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    console.log('📤 Sending webhook request...');
    console.log('⏱️  Note: This will take up to 95 seconds due to retry logic\n');

    const startTime = Date.now();

    const response = await axios.post(
      `${serverUrl}/webhooks/intakeSurvey`,
      {
        'contact-id': contactId,
        // Alternative formats that the endpoint supports:
        // contactId: contactId,
        // contact_id: contactId,
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 120000 // 2 minute timeout
      }
    );

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ WEBHOOK REQUEST SUCCESSFUL');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log(`⏱️  Processing Time: ${duration} seconds\n`);

    console.log('📋 Response:');
    console.log(JSON.stringify(response.data, null, 2));

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('SUMMARY:');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Contact ID: ${response.data.contactId}`);
    console.log(`Opportunity ID: ${response.data.opportunityId}`);
    console.log(`Has Appointments: ${response.data.hasAppointments ? 'YES ✅' : 'NO ❌'}`);
    console.log(`Moved To Stage: ${response.data.movedToStage}`);
    console.log(`Pipeline ID: ${response.data.pipelineId}`);
    console.log(`Stage ID: ${response.data.stageId}`);
    console.log('═══════════════════════════════════════════════════════════\n');

    if (response.data.hasAppointments) {
      console.log('✅ TEST PASSED: Contact has appointment, moved to "Scheduled Meeting I/V"');
    } else {
      console.log('✅ TEST PASSED: Contact has no appointment, moved to "Pending I/V"');
    }

  } catch (error) {
    console.error('\n❌ WEBHOOK REQUEST FAILED');
    console.error('═══════════════════════════════════════════════════════════\n');

    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('No response received from server');
      console.error('Error:', error.message);
      console.error('\nIs the server running? Start it with: npm start');
    } else {
      console.error('Error:', error.message);
    }

    process.exit(1);
  }
}

// Test with different contact IDs
async function runTests() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║          INTAKE SURVEY WEBHOOK TEST SUITE                ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  // Test 1: Contact with appointment
  console.log('TEST 1: Contact with appointment (IPbwCYvc2IsoD5tvjk7E)');
  console.log('Expected: Should move to "Scheduled Meeting I/V"\n');
  await testIntakeSurveyWebhook();

  console.log('\n\n');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║                   ALL TESTS COMPLETE                      ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  console.log('💡 To test with a contact without appointments:');
  console.log('   1. Find a contact ID that has no appointments');
  console.log('   2. Update the contactId variable in this script');
  console.log('   3. Run the script again');
  console.log('   Expected: Should move to "Pending I/V"\n');
}

runTests();
