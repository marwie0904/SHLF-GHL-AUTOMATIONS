/**
 * Test script to verify GHL Form Submissions API
 *
 * Purpose:
 * 1. List all forms and verify the "Phone and Email" form ID
 * 2. Fetch sample submissions to identify field names
 * 3. Test the forms/submissions endpoint with filters
 *
 * Usage: node scripts/test-form-submissions.js
 */

require('dotenv').config();
const axios = require('axios');

const GHL_API_KEY = process.env.GHL_API_KEY;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;
const BASE_URL = 'https://services.leadconnectorhq.com';

// Form ID to verify (provided by user)
const FORM_ID_TO_VERIFY = 'GqeCjaSjT4CqyZuKWLIK';

const headers = {
  'Authorization': `Bearer ${GHL_API_KEY}`,
  'Version': '2021-07-28',
  'Content-Type': 'application/json'
};

/**
 * List all forms in the location
 */
async function listAllForms() {
  console.log('\n========================================');
  console.log('📋 LISTING ALL FORMS');
  console.log('========================================\n');

  try {
    const response = await axios.get(`${BASE_URL}/forms/`, {
      params: { locationId: GHL_LOCATION_ID },
      headers
    });

    const forms = response.data.forms || [];
    console.log(`Found ${forms.length} forms:\n`);

    forms.forEach((form, index) => {
      const isTarget = form.id === FORM_ID_TO_VERIFY ? ' ⭐ TARGET' : '';
      console.log(`${index + 1}. ${form.name}${isTarget}`);
      console.log(`   ID: ${form.id}`);
      console.log('');
    });

    // Check if target form exists
    const targetForm = forms.find(f => f.id === FORM_ID_TO_VERIFY);
    if (targetForm) {
      console.log(`✅ Found target form: "${targetForm.name}" (ID: ${FORM_ID_TO_VERIFY})`);
    } else {
      console.log(`❌ Target form ID ${FORM_ID_TO_VERIFY} NOT FOUND`);

      // Try to find "Phone and Email" form by name
      const phoneEmailForm = forms.find(f =>
        f.name.toLowerCase().includes('phone') &&
        f.name.toLowerCase().includes('email')
      );
      if (phoneEmailForm) {
        console.log(`💡 Found possible match: "${phoneEmailForm.name}" (ID: ${phoneEmailForm.id})`);
      }
    }

    return forms;
  } catch (error) {
    console.error('❌ Error listing forms:', error.response?.data || error.message);
    return [];
  }
}

/**
 * Fetch form submissions for a specific form
 */
async function getFormSubmissions(formId, limit = 5) {
  console.log('\n========================================');
  console.log(`📝 FETCHING SUBMISSIONS FOR FORM: ${formId}`);
  console.log('========================================\n');

  try {
    const response = await axios.get(`${BASE_URL}/forms/submissions`, {
      params: {
        locationId: GHL_LOCATION_ID,
        formId: formId,
        limit: limit
      },
      headers
    });

    const submissions = response.data.submissions || [];
    console.log(`Found ${submissions.length} submissions (limit: ${limit}):\n`);

    if (submissions.length === 0) {
      console.log('⚠️  No submissions found for this form');
      return [];
    }

    // Analyze the first submission to understand field structure
    submissions.forEach((submission, index) => {
      console.log(`\n--- Submission ${index + 1} ---`);
      console.log(`ID: ${submission.id}`);
      console.log(`Contact ID: ${submission.contactId}`);
      console.log(`Created At: ${submission.createdAt}`);

      console.log('\n📌 Fields:');
      if (submission.others) {
        Object.entries(submission.others).forEach(([key, value]) => {
          console.log(`   "${key}": "${value}"`);
        });
      }

      // Check for standard fields
      if (submission.name) console.log(`   name: "${submission.name}"`);
      if (submission.email) console.log(`   email: "${submission.email}"`);
      if (submission.phone) console.log(`   phone: "${submission.phone}"`);
    });

    // Summary of field names found
    if (submissions.length > 0 && submissions[0].others) {
      console.log('\n========================================');
      console.log('📊 FIELD NAMES SUMMARY');
      console.log('========================================');
      console.log('\nField keys found in submissions:');
      const fieldKeys = Object.keys(submissions[0].others);
      fieldKeys.forEach(key => {
        console.log(`   - "${key}"`);
      });

      console.log('\n🔍 Looking for target fields:');
      const targetFields = ['Meeting Type', 'Meeting', 'Calendar Name', 'meeting_type', 'meeting', 'calendar_name'];
      targetFields.forEach(target => {
        const found = fieldKeys.find(k =>
          k.toLowerCase().includes(target.toLowerCase().replace(' ', '')) ||
          k.toLowerCase() === target.toLowerCase()
        );
        if (found) {
          console.log(`   ✅ "${target}" -> Found as "${found}"`);
        } else {
          console.log(`   ❌ "${target}" -> NOT FOUND`);
        }
      });
    }

    return submissions;
  } catch (error) {
    console.error('❌ Error fetching submissions:', error.response?.data || error.message);
    return [];
  }
}

/**
 * Test searching submissions by phone/email
 */
async function searchSubmissionsByContact(formId, searchQuery) {
  console.log('\n========================================');
  console.log(`🔍 SEARCHING SUBMISSIONS BY: ${searchQuery}`);
  console.log('========================================\n');

  try {
    const response = await axios.get(`${BASE_URL}/forms/submissions`, {
      params: {
        locationId: GHL_LOCATION_ID,
        formId: formId,
        q: searchQuery,
        limit: 5
      },
      headers
    });

    const submissions = response.data.submissions || [];
    console.log(`Found ${submissions.length} submissions matching "${searchQuery}"`);

    if (submissions.length > 0) {
      console.log('\nFirst match:');
      console.log(JSON.stringify(submissions[0], null, 2));
    }

    return submissions;
  } catch (error) {
    console.error('❌ Error searching submissions:', error.response?.data || error.message);
    return [];
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 GHL Form Submissions Test Script');
  console.log('=====================================');
  console.log(`Location ID: ${GHL_LOCATION_ID}`);
  console.log(`Target Form ID: ${FORM_ID_TO_VERIFY}`);
  console.log('=====================================');

  if (!GHL_API_KEY || !GHL_LOCATION_ID) {
    console.error('❌ Missing GHL_API_KEY or GHL_LOCATION_ID in environment');
    process.exit(1);
  }

  // Step 1: List all forms
  await listAllForms();

  // Step 2: Fetch submissions for the target form
  await getFormSubmissions(FORM_ID_TO_VERIFY, 3);

  // Step 3: Optional - test search by contact
  // Uncomment and add a real phone/email to test
  // await searchSubmissionsByContact(FORM_ID_TO_VERIFY, '+1234567890');

  console.log('\n✅ Test complete!');
}

main().catch(console.error);
