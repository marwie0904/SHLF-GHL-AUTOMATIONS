/**
 * Test script for GHL Appointment Created webhook flow
 *
 * This script tests:
 * 1. Form submission fetching by phone/email
 * 2. Calendar name fetching (fallback)
 * 3. Appointment title building
 * 4. Full processAppointmentCreated flow (without actual API update)
 *
 * Usage: node scripts/test-appointment-webhook.js
 */

require('dotenv').config();
const {
  getFormSubmission,
  extractMeetingData,
  getCalendar,
  buildAppointmentTitle,
  processAppointmentCreated,
  FORM_FIELDS
} = require('../services/appointmentService');

const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;
const GHL_APPOINTMENT_FORM_ID = process.env.GHL_APPOINTMENT_FORM_ID;

/**
 * Test 1: Form submission fetching
 */
async function testFormSubmissionFetch() {
  console.log('\n========================================');
  console.log('📋 TEST 1: Form Submission Fetch');
  console.log('========================================\n');

  // Use a known phone/email from the test data we fetched earlier
  const testPhone = '+12123124214';  // From submission 1

  console.log(`Testing with phone: ${testPhone}`);
  console.log(`Form ID: ${GHL_APPOINTMENT_FORM_ID}`);

  const submission = await getFormSubmission(GHL_APPOINTMENT_FORM_ID, testPhone);

  if (submission) {
    console.log('\n✅ Form submission found!');
    console.log('Submission ID:', submission.id);
    console.log('Contact ID:', submission.contactId);

    const meetingData = extractMeetingData(submission);
    console.log('\n📊 Extracted meeting data:');
    console.log('   Meeting Type:', meetingData.meetingType || '(not found)');
    console.log('   Meeting:', meetingData.meeting || '(not found)');
    console.log('   Calendar Name:', meetingData.calendarName || '(not found)');

    return { success: true, submission, meetingData };
  } else {
    console.log('\n❌ No form submission found');
    return { success: false };
  }
}

/**
 * Test 2: Calendar fetch (requires a valid calendar ID)
 */
async function testCalendarFetch(calendarId) {
  console.log('\n========================================');
  console.log('📅 TEST 2: Calendar Fetch');
  console.log('========================================\n');

  if (!calendarId) {
    console.log('⚠️ No calendar ID provided, skipping test');
    return { success: false, reason: 'No calendar ID' };
  }

  console.log(`Fetching calendar: ${calendarId}`);

  const calendar = await getCalendar(calendarId);

  if (calendar) {
    console.log('\n✅ Calendar found!');
    console.log('Calendar Name:', calendar.name);
    console.log('Calendar ID:', calendar.id);
    return { success: true, calendar };
  } else {
    console.log('\n❌ Calendar not found');
    return { success: false };
  }
}

/**
 * Test 3: Title building
 */
function testTitleBuilding() {
  console.log('\n========================================');
  console.log('🏷️ TEST 3: Title Building');
  console.log('========================================\n');

  const testCases = [
    {
      name: 'Full data',
      data: {
        calendarName: "Gabby Ang's Personal Calendar",
        meetingType: 'EP Discovery Call',
        meeting: 'Naples',
        contactName: 'John Doe'
      },
      expected: "Gabby Ang's Personal Calendar - EP Discovery Call - Naples - John Doe"
    },
    {
      name: 'Fallback (no form data)',
      data: {
        calendarName: "Gabby Ang's Personal Calendar",
        meetingType: null,
        meeting: null,
        contactName: 'Jane Smith'
      },
      expected: "Gabby Ang's Personal Calendar - Jane Smith"
    },
    {
      name: 'Minimal (only contact name)',
      data: {
        calendarName: null,
        meetingType: null,
        meeting: null,
        contactName: 'Bob Wilson'
      },
      expected: 'Bob Wilson'
    }
  ];

  let allPassed = true;

  testCases.forEach((testCase, index) => {
    const result = buildAppointmentTitle(testCase.data);
    const passed = result === testCase.expected;

    console.log(`Test ${index + 1}: ${testCase.name}`);
    console.log(`   Input:    ${JSON.stringify(testCase.data)}`);
    console.log(`   Expected: "${testCase.expected}"`);
    console.log(`   Got:      "${result}"`);
    console.log(`   Status:   ${passed ? '✅ PASSED' : '❌ FAILED'}\n`);

    if (!passed) allPassed = false;
  });

  return { success: allPassed };
}

/**
 * Test 4: Simulate full webhook flow (dry run - doesn't actually update appointment)
 */
async function testFullFlow() {
  console.log('\n========================================');
  console.log('🚀 TEST 4: Full Webhook Flow (Dry Run)');
  console.log('========================================\n');

  // Simulated webhook payload
  const mockWebhookData = {
    appointmentId: 'test-appointment-123',  // Fake ID - won't actually update
    contactId: 'MFp4u3e18Xr7SPSyDutP',
    contactPhone: '+12123124214',
    contactEmail: 'msjnndknsaj@nsjkand.com',
    contactName: 'Test Contact',
    calendarId: null  // Will be fetched from form submission
  };

  console.log('Mock webhook payload:');
  console.log(JSON.stringify(mockWebhookData, null, 2));

  console.log('\n⚠️ NOTE: This will attempt to call the GHL API to update the appointment.');
  console.log('Since we\'re using a fake appointment ID, it will fail at the update step.');
  console.log('This is expected behavior for a dry run test.\n');

  try {
    const result = await processAppointmentCreated(mockWebhookData);
    console.log('\n✅ Flow completed successfully!');
    console.log('Result:', JSON.stringify(result, null, 2));
    return { success: true, result };
  } catch (error) {
    console.log('\n⚠️ Flow stopped at update step (expected for dry run)');
    console.log('Error:', error.message);

    // This is expected - the appointment ID is fake
    if (error.message.includes('Not Found') || error.message.includes('404')) {
      console.log('✅ This error is expected - the appointment ID was fake');
      return { success: true, reason: 'Expected failure at update step' };
    }

    return { success: false, error: error.message };
  }
}

/**
 * Main test runner
 */
async function main() {
  console.log('🧪 GHL Appointment Webhook Test Suite');
  console.log('=====================================');
  console.log(`Location ID: ${GHL_LOCATION_ID}`);
  console.log(`Form ID: ${GHL_APPOINTMENT_FORM_ID}`);
  console.log('=====================================');

  if (!process.env.GHL_API_KEY || !GHL_LOCATION_ID) {
    console.error('❌ Missing required environment variables');
    process.exit(1);
  }

  if (!GHL_APPOINTMENT_FORM_ID) {
    console.error('❌ Missing GHL_APPOINTMENT_FORM_ID in environment');
    process.exit(1);
  }

  const results = {};

  // Run tests
  results.formSubmission = await testFormSubmissionFetch();
  results.titleBuilding = testTitleBuilding();

  // Only test calendar if we have an ID (you can add one manually)
  // results.calendar = await testCalendarFetch('YOUR_CALENDAR_ID_HERE');

  // Full flow test (will fail at update step with fake appointment ID)
  results.fullFlow = await testFullFlow();

  // Summary
  console.log('\n========================================');
  console.log('📊 TEST SUMMARY');
  console.log('========================================\n');

  Object.entries(results).forEach(([testName, result]) => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${testName}: ${result.success ? 'PASSED' : 'FAILED'}`);
  });

  console.log('\n✅ Test suite complete!');
}

main().catch(console.error);
