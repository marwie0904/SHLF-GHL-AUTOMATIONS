const axios = require('axios');
require('dotenv').config();

/**
 * Test script for the intake form webhook endpoint
 * This simulates a Jotform webhook submission
 */
async function testIntakeFormWebhook() {
  const serverUrl = process.env.SERVER_URL || 'http://localhost:3000';

  console.log('🧪 Testing Intake Form Webhook...\n');
  console.log(`Server URL: ${serverUrl}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  // Sample Jotform webhook payload matching the structure you provided
  const testPayload = {
    action: '',
    webhookURL: 'https://services.leadconnectorhq.com/hooks/afYLuZPi37CZR1IpJlfn/webhook-trigger/2ee03396-f23a-4b17-8ed2-3a428664a3cf',
    username: 'Test_User',
    formID: '252965467838072',
    type: 'WEB',
    customParams: '',
    product: '',
    formTitle: 'Intake Form',
    customTitle: '',
    submissionID: '6393757170214519999', // Test submission ID
    event: '',
    documentID: '',
    teamID: '',
    subject: '',
    isSilent: '',
    customBody: '',
    rawRequest: JSON.stringify({
      slug: 'submit/252965467838072',
      jsExecutionTracker: 'build-date-1763566495775=>init-started:1763566496648=>validator-called:1763566496682=>validator-mounted-false:1763566496683=>init-complete:1763566496686=>onsubmit-fired:1763566517064=>observerSubmitHandler_received-submit-event:1763566517065=>submit-validation-passed:1763566517071=>observerSubmitHandler_validation-passed-submitting-form:1763566517081',
      submitSource: 'form',
      submitDate: '1763566517081',
      buildDate: '1763566495775',
      uploadServerUrl: 'https://upload.jotform.com/upload',
      eventObserver: '1',
      q10_practiceArea: '',
      q3_name: {
        first: 'John',
        middle: 'Test',
        last: 'Doe'
      },
      q12_email: 'johndoe@example.com',
      q13_phoneNumber: {
        full: '(555) 123-4567'
      },
      q11_address: {
        addr_line1: '',
        addr_line2: '',
        city: '',
        state: '',
        postal: ''
      },
      q14_referral: '',
      q15_referralOthers: '',
      q16_medicaidCallDetails: '',
      q20_assetsInvolved: '',
      q22_pbtaCallDetails: '',
      q32_assetsProbate: '',
      q33_decedentName: {
        first: '',
        last: ''
      },
      q34_decedentDeathDate: {
        month: '',
        day: '',
        year: ''
      },
      q35_decedentRelationship: '',
      q44_estatePlan: '',
      q50_callersName: {
        first: '',
        last: ''
      },
      q51_callersPhone: {
        full: ''
      },
      q52_callersEmail: '',
      q38_deedCallDetails: '',
      q79_whatLegal: '',
      q80_haveThere: '',
      q84_whatIs: '',
      q85_areYou85: '',
      q86_doYou: '',
      event_id: '1763566496648_252965467838072_Gss3FIy',
      timeToSubmit: '20',
      validatedNewRequiredFieldIDs: '{"new":1}',
      path: '/submit/252965467838072',
      q6_createPdf: '',
      q17_primaryConcern: '',
      q23_disagreements: '',
      q25_assetOwnership: '',
      q26_areAll: '',
      q28_isWill: '',
      q29_originalWill: '',
      q39_specifyConcern: '',
      q40_needTrust: '',
      q45_onBehalf: '',
      q53_clientJoinMeeting: '',
      q54_soundMind: '',
      q56_floridaResident: '',
      q59_areYouSingle: '',
      q60_spousePlanning: '',
      q61_doYouhaveChildren: '',
      q62_existingDocuments: '',
      q64_whatDocuments: '',
      q65_trustFunded: '',
      q66_areYou66: '',
      q78_areYou78: '',
      q81_areYou81: '',
      q87_whatDocuments87: '',
      q89_isThere: ''
    }),
    fromTable: '',
    appID: '',
    pretty: 'Name:John Test Doe, Email:johndoe@example.com, Phone Number:(555) 123-4567',
    unread: '',
    parent: '',
    ip: '192.168.1.1',
    headers: {
      'host': 'services.leadconnectorhq.com',
      'content-type': 'multipart/form-data; boundary=------------------------jqyD877cDEJ9qqIxLgG00V',
      'accept': '*/*'
    }
  };

  try {
    console.log('📤 Sending webhook request...');
    console.log('Test Data:');
    console.log('  - Name: John Test Doe');
    console.log('  - Email: johndoe@example.com');
    console.log('  - Phone: (555) 123-4567');
    console.log('  - Submission ID: 6393757170214519999\n');

    const startTime = Date.now();

    const response = await axios.post(
      `${serverUrl}/webhooks/intakeForm`,
      testPayload,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 30000 // 30 second timeout
      }
    );

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log('═══════════════════════════════════════════════════════════');
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
    console.log(`Is Duplicate: ${response.data.isDuplicate ? 'YES' : 'NO'}`);
    console.log(`Opportunity Created: ${response.data.opportunityCreated ? 'YES ✅' : 'NO ❌'}`);
    console.log(`Jotform Link: ${response.data.jotformLink}`);
    console.log('═══════════════════════════════════════════════════════════\n');

    if (response.data.success) {
      console.log('✅ TEST PASSED: Contact and opportunity created successfully!');
      console.log('\n💡 Next Steps:');
      console.log('   1. Check GHL to verify the contact was created/updated');
      console.log('   2. Verify the jotform_link custom field is set correctly');
      console.log('   3. Verify the opportunity was created in the correct pipeline/stage');
      console.log(`   4. Expected Jotform URL: https://www.jotform.com/inbox/252965467838072/${testPayload.submissionID}/edit`);
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

// Run the test
console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║        INTAKE FORM WEBHOOK TEST SUITE                    ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

testIntakeFormWebhook();
