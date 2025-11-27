/**
 * Test Script: Check GHL Custom Object Schema
 *
 * This script checks the schema of the custom_objects.invoices object
 * to see what fields are available and their types
 *
 * Usage:
 *   node scripts/check-ghl-custom-object-schema.js
 */

require('dotenv').config();
const axios = require('axios');

const GHL_API_KEY = process.env.GHL_API_KEY;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;
const GHL_BASE_URL = 'https://services.leadconnectorhq.com';
const OBJECT_KEY = 'custom_objects.invoices';

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
 * Get all custom object schemas for the location
 */
async function getAllSchemas() {
  try {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('TEST 1: Get All Custom Object Schemas');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('Location ID:', GHL_LOCATION_ID);
    console.log(`Making request to: GET /locations/${GHL_LOCATION_ID}/objects/schemas\n`);

    const response = await ghlClient.get(`/locations/${GHL_LOCATION_ID}/objects/schemas`);

    console.log('✅ Success! Status:', response.status);
    console.log('\nAll Custom Object Schemas:');
    console.log(JSON.stringify(response.data, null, 2));

    // Find the invoices schema
    if (response.data.schemas) {
      const invoiceSchema = response.data.schemas.find(s => s.key === OBJECT_KEY);
      if (invoiceSchema) {
        console.log('\n\n📋 Found Invoice Schema:');
        console.log('─────────────────────────────────────────────────────────────');
        console.log('Name:', invoiceSchema.name);
        console.log('Key:', invoiceSchema.key);
        console.log('ID:', invoiceSchema.id);

        if (invoiceSchema.fields) {
          console.log('\n📝 Fields:');
          console.log('─────────────────────────────────────────────────────────────');
          invoiceSchema.fields.forEach(field => {
            console.log(`\n  Field: ${field.name}`);
            console.log(`    Key: ${field.key}`);
            console.log(`    Type: ${field.type}`);
            console.log(`    Required: ${field.required || false}`);
            if (field.options) {
              console.log(`    Options: ${JSON.stringify(field.options)}`);
            }
          });

          // Check if our target fields exist
          console.log('\n\n🔍 Checking for Target Fields:');
          console.log('─────────────────────────────────────────────────────────────');
          const targetFields = ['payment_link', 'invoice_number', 'subtotal', 'total'];
          targetFields.forEach(targetKey => {
            const field = invoiceSchema.fields.find(f => f.key === targetKey);
            if (field) {
              console.log(`  ✅ ${targetKey}: Found (type: ${field.type}, name: ${field.name})`);
            } else {
              console.log(`  ❌ ${targetKey}: NOT FOUND IN SCHEMA`);
            }
          });
        }

        return invoiceSchema;
      } else {
        console.log(`\n⚠️ Invoice schema "${OBJECT_KEY}" not found in schemas list`);
      }
    }

    return response.data;

  } catch (error) {
    console.error('❌ Error getting schemas:');
    console.error('Status:', error.response?.status);
    console.error('Error:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Get specific schema by key
 */
async function getSchemaByKey() {
  try {
    console.log('\n\n═══════════════════════════════════════════════════════════');
    console.log('TEST 2: Get Specific Schema by Key');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('Object Key:', OBJECT_KEY);
    console.log(`Making request to: GET /objects/schemas/${OBJECT_KEY}?locationId=${GHL_LOCATION_ID}\n`);

    const response = await ghlClient.get(`/objects/schemas/${OBJECT_KEY}`, {
      params: { locationId: GHL_LOCATION_ID }
    });

    console.log('✅ Success! Status:', response.status);
    console.log('\nSchema Details:');
    console.log(JSON.stringify(response.data, null, 2));

    return response.data;

  } catch (error) {
    console.error('❌ Error getting schema by key:');
    console.error('Status:', error.response?.status);
    console.error('Error:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🚀 Starting GHL Custom Object Schema Check...\n');
  console.log('Configuration:');
  console.log('─────────────────────────────────────────────────────────────');
  console.log('API Key:', GHL_API_KEY ? GHL_API_KEY.substring(0, 20) + '...' : 'NOT SET');
  console.log('Location ID:', GHL_LOCATION_ID);
  console.log('Object Key:', OBJECT_KEY);
  console.log('─────────────────────────────────────────────────────────────\n');

  if (!GHL_API_KEY || !GHL_LOCATION_ID) {
    console.error('❌ Missing GHL_API_KEY or GHL_LOCATION_ID in .env file');
    process.exit(1);
  }

  // Test 1: Get all schemas
  const allSchemas = await getAllSchemas();

  // Test 2: Get specific schema
  const specificSchema = await getSchemaByKey();

  console.log('\n\n═══════════════════════════════════════════════════════════');
  console.log('  TESTS COMPLETED');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('Summary:');
  console.log('─────────────────────────────────────────────────────────────');
  console.log('✅ Test 1: Get All Schemas -', allSchemas ? 'SUCCESS' : 'FAILED');
  console.log('✅ Test 2: Get Specific Schema -', specificSchema ? 'SUCCESS' : 'FAILED');
  console.log('─────────────────────────────────────────────────────────────\n');

  process.exit(0);
}

// Run tests
runTests().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  console.error(error.stack);
  process.exit(1);
});
