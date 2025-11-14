const axios = require('axios');
require('dotenv').config();

/**
 * Test script for the updated intake survey webhook endpoint
 * This tests the stage-checking logic instead of appointment checking
 */
async function testIntakeSurveyStageCheck() {
  const serverUrl = process.env.SERVER_URL || 'http://localhost:3000';
  const contactId = 'IPbwCYvc2IsoD5tvjk7E'; // Test contact ID

  console.log('🧪 Testing Intake Survey Webhook (Stage Check Version)...\n');
  console.log(`Server URL: ${serverUrl}`);
  console.log(`Test Contact ID: ${contactId}\n`);
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('📋 NEW LOGIC:');
  console.log('   - Check if opportunity is in Pipeline: 6cYEonzedT5vf2Lt8rcl');
  console.log('   - Check if opportunity is in Stage: 042cb50b-6ef1-448e-9f64-a7455e1395b5');
  console.log('   - Wait 30 seconds, check again');
  console.log('   - Wait 60 seconds, check again');
  console.log('   - If STILL in same stage: Move to "Pending I/V"');
  console.log('   - If MOVED to different stage: Do nothing\n');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    console.log('📤 Sending webhook request...');
    console.log('⏱️  Note: This will take up to 90 seconds due to retry logic (30s + 60s)\n');

    const startTime = Date.now();

    const response = await axios.post(
      `${serverUrl}/webhooks/intakeSurvey`,
      {
        'contact-id': contactId,
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
    console.log(`Has Moved: ${response.data.hasMoved ? 'YES ✅' : 'NO ❌'}`);

    if (response.data.hasMoved) {
      console.log(`Action Taken: None (opportunity already moved)`);
    } else {
      console.log(`Moved To Stage: ${response.data.movedToStage || 'N/A'}`);
      console.log(`Pipeline ID: ${response.data.pipelineId || 'N/A'}`);
      console.log(`Stage ID: ${response.data.stageId || 'N/A'}`);
    }
    console.log('═══════════════════════════════════════════════════════════\n');

    if (response.data.hasMoved) {
      console.log('✅ TEST RESULT: Opportunity has moved to a different stage, no action taken');
    } else {
      console.log('✅ TEST RESULT: Opportunity still in same stage, moved to "Pending I/V"');
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

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║     INTAKE SURVEY WEBHOOK TEST (STAGE CHECK VERSION)     ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

testIntakeSurveyStageCheck();
