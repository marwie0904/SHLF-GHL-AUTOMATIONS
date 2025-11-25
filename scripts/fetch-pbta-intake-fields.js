/**
 * Fetches all custom fields from PBTA - INTAKE FORM group in GHL
 */

require('dotenv').config();
const axios = require('axios');

async function fetchPBTAIntakeFields() {
  const apiKey = process.env.GHL_API_KEY;
  const locationId = process.env.GHL_LOCATION_ID;

  if (!apiKey || !locationId) {
    console.error('Missing GHL_API_KEY or GHL_LOCATION_ID in .env file');
    process.exit(1);
  }

  try {
    console.log('Fetching all custom fields from GHL...\n');

    const response = await axios.get(
      `https://services.leadconnectorhq.com/locations/${locationId}/customFields`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Version': '2021-07-28'
        }
      }
    );

    const allFields = response.data.customFields || [];

    // First, find the PBTA - INTAKE FORM group
    const pbtaGroup = allFields.find(field =>
      field.name === 'PBTA - INTAKE FORM' && field.documentType === 'group'
    );

    if (!pbtaGroup) {
      console.log('❌ PBTA - INTAKE FORM group not found');
      console.log('\nAvailable groups:');
      const groups = allFields.filter(f => f.documentType === 'group');
      groups.forEach(g => console.log(`  - ${g.name} (ID: ${g.id})`));
      return;
    }

    console.log(`✅ Found PBTA - INTAKE FORM group (ID: ${pbtaGroup.id})\n`);
    console.log('='.repeat(80));
    console.log('CUSTOM FIELDS IN PBTA - INTAKE FORM');
    console.log('='.repeat(80));
    console.log();

    // Get all fields in this group
    const pbtaFields = allFields.filter(field =>
      field.parentId === pbtaGroup.id && field.documentType === 'field'
    );

    console.log(`Total fields: ${pbtaFields.length}\n`);

    pbtaFields.forEach((field, index) => {
      console.log(`${index + 1}. ${field.name}`);
      console.log(`   ID: ${field.id}`);
      console.log(`   Key: ${field.fieldKey}`);
      console.log(`   Type: ${field.dataType}`);

      if (field.options && field.options.length > 0) {
        console.log(`   Options:`);
        field.options.forEach(opt => console.log(`     - ${opt}`));
      }

      if (field.picklistOptions && field.picklistOptions.length > 0) {
        console.log(`   Picklist Options:`);
        field.picklistOptions.forEach(opt => console.log(`     - ${opt}`));
      }

      console.log();
    });

    console.log('='.repeat(80));

  } catch (error) {
    console.error('Error fetching custom fields:', error.response?.data || error.message);
    process.exit(1);
  }
}

fetchPBTAIntakeFields();
