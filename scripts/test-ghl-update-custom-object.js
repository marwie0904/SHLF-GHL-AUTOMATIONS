/**
 * Test Script: GHL Custom Object Update
 *
 * This script tests updating custom object record properties
 *
 * Usage:
 *   node scripts/test-ghl-update-custom-object.js <record-id>
 */

require('dotenv').config();
const axios = require('axios');

const GHL_API_KEY = process.env.GHL_API_KEY;
const GHL_BASE_URL = 'https://services.leadconnectorhq.com';

// Get record ID from command line args
const RECORD_ID = process.argv[2];
const OBJECT_KEY = 'custom_objects.invoices';

if (!RECORD_ID) {
  console.error('❌ Usage: node scripts/test-ghl-update-custom-object.js <record-id>');
  process.exit(1);
}

/**
 * Create axios instance for GHL API
 */
const ghlClient = axios.create({
  baseURL: GHL_BASE_URL,
  headers: {
    'Authorization': `Bearer ${GHL_API_KEY}`,
    'Version': '2021-07-28',
    'Content-Type': 'application/json'
  }
});

/**
 * Test 1: Get the current custom object to see its structure
 */
async function getCustomObject() {
  try {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('TEST 1: Get Custom Object (Current State)');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('Object Key:', OBJECT_KEY);
    console.log('Record ID:', RECORD_ID);
    console.log(`Making request to: GET /objects/${OBJECT_KEY}/records/${RECORD_ID}\n`);

    const response = await ghlClient.get(`/objects/${OBJECT_KEY}/records/${RECORD_ID}`);

    console.log('✅ Success! Status:', response.status);
    console.log('\nCurrent Custom Object State:');
    console.log(JSON.stringify(response.data, null, 2));

    if (response.data.record && response.data.record.properties) {
      console.log('\n📋 Current Properties:');
      console.log('─────────────────────────────────────────────────────────────');
      Object.entries(response.data.record.properties).forEach(([key, value]) => {
        console.log(`  ${key}: ${JSON.stringify(value)}`);
      });
    }

    return response.data;

  } catch (error) {
    console.error('❌ Error getting custom object:');
    console.error('Status:', error.response?.status);
    console.error('Error:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Test 2: Update custom object with test values
 */
async function updateCustomObject() {
  try {
    console.log('\n\n═══════════════════════════════════════════════════════════');
    console.log('TEST 2: Update Custom Object Properties');
    console.log('═══════════════════════════════════════════════════════════\n');

    const testPayload = {
      properties: [
        {
          key: 'payment_link',
          valueString: 'https://test-payment-link.com/test123'
        },
        {
          key: 'invoice_number',
          valueString: 'INV-TEST-12345'
        },
        {
          key: 'subtotal',
          valueNumber: 100.50
        },
        {
          key: 'total',
          valueNumber: 100.50
        }
      ]
    };

    console.log('Object Key:', OBJECT_KEY);
    console.log('Record ID:', RECORD_ID);
    console.log(`Making request to: PUT /objects/${OBJECT_KEY}/records/${RECORD_ID}\n`);
    console.log('Request Body:');
    console.log(JSON.stringify(testPayload, null, 2));

    const response = await ghlClient.put(
      `/objects/${OBJECT_KEY}/records/${RECORD_ID}`,
      testPayload
    );

    console.log('\n✅ Success! Status:', response.status);
    console.log('\nResponse Data:');
    console.log(JSON.stringify(response.data, null, 2));

    return response.data;

  } catch (error) {
    console.error('\n❌ Error updating custom object:');
    console.error('Status:', error.response?.status);
    console.error('Error Data:', JSON.stringify(error.response?.data, null, 2));
    console.error('Error Message:', error.message);

    if (error.response?.status === 404) {
      console.error('\n⚠️ 404 Error - This could mean:');
      console.error('  1. The record ID does not exist');
      console.error('  2. The object key is incorrect');
      console.error('  3. The record was deleted');
    }

    return null;
  }
}

/**
 * Test 3: Get the updated custom object to verify changes
 */
async function verifyUpdate() {
  try {
    console.log('\n\n═══════════════════════════════════════════════════════════');
    console.log('TEST 3: Verify Update (Get Updated State)');
    console.log('═══════════════════════════════════════════════════════════\n');

    const response = await ghlClient.get(`/objects/${OBJECT_KEY}/records/${RECORD_ID}`);

    console.log('✅ Success! Status:', response.status);
    console.log('\nUpdated Custom Object State:');
    console.log(JSON.stringify(response.data, null, 2));

    if (response.data.record && response.data.record.properties) {
      console.log('\n📋 Updated Properties:');
      console.log('─────────────────────────────────────────────────────────────');
      Object.entries(response.data.record.properties).forEach(([key, value]) => {
        console.log(`  ${key}: ${JSON.stringify(value)}`);
      });
    }

    return response.data;

  } catch (error) {
    console.error('❌ Error verifying update:');
    console.error('Status:', error.response?.status);
    console.error('Error:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🚀 Starting GHL Custom Object Update Tests...\n');
  console.log('Configuration:');
  console.log('─────────────────────────────────────────────────────────────');
  console.log('API Key:', GHL_API_KEY ? GHL_API_KEY.substring(0, 20) + '...' : 'NOT SET');
  console.log('Object Key:', OBJECT_KEY);
  console.log('Record ID:', RECORD_ID);
  console.log('─────────────────────────────────────────────────────────────\n');

  if (!GHL_API_KEY) {
    console.error('❌ Missing GHL_API_KEY in .env file');
    process.exit(1);
  }

  // Test 1: Get current state
  const currentState = await getCustomObject();

  if (!currentState) {
    console.error('\n❌ Cannot proceed - record does not exist or is inaccessible');
    process.exit(1);
  }

  // Test 2: Update the custom object
  const updateResult = await updateCustomObject();

  // Test 3: Verify the update (only if update succeeded)
  let verifyResult = null;
  if (updateResult) {
    verifyResult = await verifyUpdate();
  }

  console.log('\n\n═══════════════════════════════════════════════════════════');
  console.log('  TESTS COMPLETED');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('Summary:');
  console.log('─────────────────────────────────────────────────────────────');
  console.log('✅ Test 1: Get Current State -', currentState ? 'SUCCESS' : 'FAILED');
  console.log('✅ Test 2: Update Properties -', updateResult ? 'SUCCESS' : 'FAILED');
  console.log('✅ Test 3: Verify Update -', verifyResult ? 'SUCCESS' : 'FAILED');
  console.log('─────────────────────────────────────────────────────────────\n');

  if (!updateResult) {
    console.log('⚠️ Update failed - check the error messages above for details\n');
  }

  process.exit(updateResult ? 0 : 1);
}

// Run tests
runTests().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  console.error(error.stack);
  process.exit(1);
});
