const axios = require('axios');
require('dotenv').config();

/**
 * Script to fetch and display all custom fields from GHL
 * This helps you find the correct field ID for the jotform_link field
 */
async function getCustomFields() {
  const apiKey = process.env.GHL_API_KEY;
  const locationId = process.env.GHL_LOCATION_ID;

  if (!apiKey || !locationId) {
    console.error('❌ Missing GHL_API_KEY or GHL_LOCATION_ID in environment variables');
    process.exit(1);
  }

  console.log('🔍 Fetching custom fields from GHL...\n');
  console.log(`Location ID: ${locationId}\n`);
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    const response = await axios.get(
      `https://services.leadconnectorhq.com/locations/${locationId}/customFields`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Version': '2021-07-28',
          'Accept': 'application/json'
        }
      }
    );

    const customFields = response.data.customFields || [];

    if (customFields.length === 0) {
      console.log('⚠️  No custom fields found in this location');
      return;
    }

    console.log(`✅ Found ${customFields.length} custom fields:\n`);

    // Look for jotform-related fields
    const jotformFields = customFields.filter(field =>
      field.name?.toLowerCase().includes('jotform') ||
      field.fieldKey?.toLowerCase().includes('jotform')
    );

    if (jotformFields.length > 0) {
      console.log('🎯 JOTFORM-RELATED FIELDS:');
      console.log('═══════════════════════════════════════════════════════════\n');
      jotformFields.forEach(field => {
        console.log(`Name: ${field.name}`);
        console.log(`ID: ${field.id}`);
        console.log(`Key: ${field.fieldKey}`);
        console.log(`Type: ${field.dataType}`);
        console.log('-----------------------------------------------------------');
      });
      console.log('');
    }

    // Display all fields
    console.log('\n📋 ALL CUSTOM FIELDS:');
    console.log('═══════════════════════════════════════════════════════════\n');

    customFields.forEach((field, index) => {
      console.log(`${index + 1}. ${field.name}`);
      console.log(`   ID: ${field.id}`);
      console.log(`   Key: ${field.fieldKey}`);
      console.log(`   Type: ${field.dataType}`);
      console.log('');
    });

    console.log('═══════════════════════════════════════════════════════════');
    console.log('💡 INSTRUCTIONS:');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('1. Look for "Jotform Link" in the list above');
    console.log('2. Copy its ID value');
    console.log('3. Update server.js line 560 with the correct ID');
    console.log('');
    console.log('If you don\'t see "Jotform Link", you need to:');
    console.log('1. Go to GHL Settings > Custom Fields');
    console.log('2. Create a new TEXT field called "Jotform Link"');
    console.log('3. Run this script again to get the field ID\n');

  } catch (error) {
    console.error('❌ Error fetching custom fields:', error.response?.data || error.message);

    if (error.response?.status === 401) {
      console.error('\n⚠️  Authorization failed. Check your GHL_API_KEY');
    } else if (error.response?.status === 404) {
      console.error('\n⚠️  Location not found. Check your GHL_LOCATION_ID');
    }

    process.exit(1);
  }
}

getCustomFields();
