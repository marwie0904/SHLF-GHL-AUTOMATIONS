/**
 * Test Script: GHL Custom Object Associations
 *
 * This script tests retrieving associations and details for a custom object
 *
 * Tests:
 * 1. Get associations for custom object ID
 * 2. Find associated opportunity details
 * 3. Get custom object details
 *
 * Usage:
 *   node scripts/test-ghl-custom-object-associations.js
 */

require('dotenv').config();
const axios = require('axios');

const GHL_API_KEY = process.env.GHL_API_KEY;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;
const GHL_BASE_URL = 'https://services.leadconnectorhq.com';

// Custom object ID to test
const CUSTOM_OBJECT_ID = '69272319e0d54ad54fc40196';

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
 * Test 1: Get all associations for the location
 */
async function getAllAssociations() {
  try {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('TEST 1: Get All Associations for Location');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('Location ID:', GHL_LOCATION_ID);
    console.log('Making request to: GET /locations/:locationId/associations\n');

    const response = await ghlClient.get(`/locations/${GHL_LOCATION_ID}/associations`);

    console.log('✅ Success! Status:', response.status);
    console.log('\nResponse Data:');
    console.log(JSON.stringify(response.data, null, 2));

    // Filter for associations involving our custom object
    if (response.data.associations) {
      const relevantAssociations = response.data.associations.filter(assoc =>
        assoc.firstObjectId === CUSTOM_OBJECT_ID ||
        assoc.secondObjectId === CUSTOM_OBJECT_ID
      );

      if (relevantAssociations.length > 0) {
        console.log('\n📋 Associations for Custom Object:', CUSTOM_OBJECT_ID);
        console.log('─────────────────────────────────────────────────────────────');
        relevantAssociations.forEach((assoc, i) => {
          console.log(`\nAssociation ${i + 1}:`);
          console.log('  Association ID:', assoc.id);
          console.log('  First Object:', assoc.firstObjectKey, '→', assoc.firstObjectId);
          console.log('  Second Object:', assoc.secondObjectKey, '→', assoc.secondObjectId);
        });
      } else {
        console.log('\n⚠️ No associations found for custom object ID:', CUSTOM_OBJECT_ID);
      }
    }

    return response.data;

  } catch (error) {
    console.error('❌ Error getting associations:');
    console.error('Status:', error.response?.status);
    console.error('Error:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Test 2: Get associations by object keys
 * Try different endpoints to find associations
 */
async function getAssociationsByObjectId() {
  try {
    console.log('\n\n═══════════════════════════════════════════════════════════');
    console.log('TEST 2: Get Associations by Object ID');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('Custom Object ID:', CUSTOM_OBJECT_ID);

    // Try endpoint: /associations with query params
    console.log('\nTrying: GET /associations?objectId=' + CUSTOM_OBJECT_ID);

    const response = await ghlClient.get('/associations', {
      params: {
        objectId: CUSTOM_OBJECT_ID,
        locationId: GHL_LOCATION_ID
      }
    });

    console.log('✅ Success! Status:', response.status);
    console.log('\nResponse Data:');
    console.log(JSON.stringify(response.data, null, 2));

    return response.data;

  } catch (error) {
    console.error('❌ Error getting associations by object ID:');
    console.error('Status:', error.response?.status);
    console.error('Error:', error.response?.data || error.message);

    // Try alternative endpoint format
    try {
      console.log('\nTrying alternative: GET /objects/associations/' + CUSTOM_OBJECT_ID);
      const altResponse = await ghlClient.get(`/objects/associations/${CUSTOM_OBJECT_ID}`);
      console.log('✅ Alternative succeeded! Status:', altResponse.status);
      console.log('\nResponse Data:');
      console.log(JSON.stringify(altResponse.data, null, 2));
      return altResponse.data;
    } catch (altError) {
      console.error('❌ Alternative also failed:');
      console.error('Status:', altError.response?.status);
      console.error('Error:', altError.response?.data || altError.message);
    }

    return null;
  }
}

/**
 * Test 3: Get custom object details
 * Need to know the schema key first
 */
async function getCustomObjectDetails(schemaKey, recordId) {
  try {
    console.log('\n\n═══════════════════════════════════════════════════════════');
    console.log('TEST 3: Get Custom Object Details');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('Schema Key:', schemaKey);
    console.log('Record ID:', recordId);
    console.log(`Making request to: GET /objects/${schemaKey}/records/${recordId}\n`);

    const response = await ghlClient.get(`/objects/${schemaKey}/records/${recordId}`);

    console.log('✅ Success! Status:', response.status);
    console.log('\nCustom Object Details:');
    console.log(JSON.stringify(response.data, null, 2));

    return response.data;

  } catch (error) {
    console.error('❌ Error getting custom object details:');
    console.error('Status:', error.response?.status);
    console.error('Error:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Test 4: Get opportunity details
 */
async function getOpportunityDetails(opportunityId) {
  try {
    console.log('\n\n═══════════════════════════════════════════════════════════');
    console.log('TEST 4: Get Opportunity Details');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('Opportunity ID:', opportunityId);
    console.log(`Making request to: GET /opportunities/${opportunityId}\n`);

    const response = await ghlClient.get(`/opportunities/${opportunityId}`);

    console.log('✅ Success! Status:', response.status);
    console.log('\nOpportunity Details:');
    console.log(JSON.stringify(response.data, null, 2));

    return response.data;

  } catch (error) {
    console.error('❌ Error getting opportunity details:');
    console.error('Status:', error.response?.status);
    console.error('Error:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Test 5: Search for custom object schemas
 */
async function getCustomObjectSchemas() {
  try {
    console.log('\n\n═══════════════════════════════════════════════════════════');
    console.log('TEST 5: Get Custom Object Schemas');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('Making request to: GET /objects/schemas?locationId=' + GHL_LOCATION_ID + '\n');

    const response = await ghlClient.get(`/locations/${GHL_LOCATION_ID}/objects/schemas`);

    console.log('✅ Success! Status:', response.status);
    console.log('\nCustom Object Schemas:');
    console.log(JSON.stringify(response.data, null, 2));

    return response.data;

  } catch (error) {
    console.error('❌ Error getting schemas:');
    console.error('Status:', error.response?.status);
    console.error('Error:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🚀 Starting GHL Custom Object Association Tests...\n');
  console.log('Configuration:');
  console.log('─────────────────────────────────────────────────────────────');
  console.log('API Key:', GHL_API_KEY ? GHL_API_KEY.substring(0, 20) + '...' : 'NOT SET');
  console.log('Location ID:', GHL_LOCATION_ID);
  console.log('Custom Object ID:', CUSTOM_OBJECT_ID);
  console.log('─────────────────────────────────────────────────────────────\n');

  if (!GHL_API_KEY || !GHL_LOCATION_ID) {
    console.error('❌ Missing GHL_API_KEY or GHL_LOCATION_ID in .env file');
    process.exit(1);
  }

  // Test 5: Get schemas first to understand structure
  const schemas = await getCustomObjectSchemas();

  // Test 1: Get all associations
  const allAssociations = await getAllAssociations();

  // Test 2: Get associations by object ID
  const objectAssociations = await getAssociationsByObjectId();

  // If we found associations, test getting details
  if (allAssociations?.associations && allAssociations.associations.length > 0) {
    const firstAssoc = allAssociations.associations[0];

    // Test 3: Get custom object details (if we have schema key)
    if (schemas?.schemas && schemas.schemas.length > 0) {
      const firstSchema = schemas.schemas[0];
      await getCustomObjectDetails(firstSchema.key, CUSTOM_OBJECT_ID);
    }

    // Test 4: Get opportunity details (if association points to opportunity)
    if (firstAssoc.secondObjectKey === 'opportunities' || firstAssoc.firstObjectKey === 'opportunities') {
      const oppId = firstAssoc.secondObjectKey === 'opportunities'
        ? firstAssoc.secondObjectId
        : firstAssoc.firstObjectId;
      await getOpportunityDetails(oppId);
    }
  }

  console.log('\n\n═══════════════════════════════════════════════════════════');
  console.log('  TESTS COMPLETED');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('Summary:');
  console.log('─────────────────────────────────────────────────────────────');
  console.log('✅ Test 5: Get Custom Object Schemas -', schemas ? 'SUCCESS' : 'FAILED');
  console.log('✅ Test 1: Get All Associations -', allAssociations ? 'SUCCESS' : 'FAILED');
  console.log('✅ Test 2: Get Associations by Object ID -', objectAssociations ? 'SUCCESS' : 'FAILED');
  console.log('─────────────────────────────────────────────────────────────\n');

  process.exit(0);
}

// Run tests
runTests().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  console.error(error.stack);
  process.exit(1);
});
