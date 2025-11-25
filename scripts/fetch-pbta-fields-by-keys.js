/**
 * Fetches specific PBTA intake form fields by their keys
 */

require('dotenv').config();
const axios = require('axios');

const PBTA_FIELD_KEYS = [
  'contact.are_there_any_disagreements_among_the_beneficiaries_that_we_should_be_aware_of_listen_closely_for_potential_litigation_concerns',
  'contact.are_all_the_assets_owned_individually_by_the_decedent_or_are_they_in_a_trust',
  'contact.are_the_assets_owned_individually_by_the_decedent_or_are_they_in_a_trust',
  'contact.was_there_a_will',
  'contact.do_you_have_access_to_the_original_will',
  'contact.if_applicable_what_assets_need_to_go_to_probate_or_are_there_assets_that_does_not_have_any_beneficiaries_listed',
  'contact.complete_name_of_decedent',
  'contact.date_of_death_of_the_decedent',
  'contact.relationship_with_the_decedent'
];

async function fetchPBTAFields() {
  const apiKey = process.env.GHL_API_KEY;
  const locationId = process.env.GHL_LOCATION_ID;

  if (!apiKey || !locationId) {
    console.error('Missing GHL_API_KEY or GHL_LOCATION_ID in .env file');
    process.exit(1);
  }

  try {
    console.log('Fetching PBTA - INTAKE FORM fields from GHL...\n');

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

    console.log('='.repeat(100));
    console.log('PBTA - INTAKE FORM CUSTOM FIELDS');
    console.log('='.repeat(100));
    console.log();

    PBTA_FIELD_KEYS.forEach((key, index) => {
      const field = allFields.find(f => f.fieldKey === key);

      if (field) {
        console.log(`${index + 1}. ${field.name}`);
        console.log(`   ID: ${field.id}`);
        console.log(`   Key: ${field.fieldKey}`);
        console.log(`   Type: ${field.dataType}`);

        if (field.options && field.options.length > 0) {
          console.log(`   Options:`);
          field.options.forEach(opt => console.log(`     - ${opt}`));
        }

        if (field.picklistOptions && field.picklistOptions.length > 0) {
          console.log(`   Options:`);
          field.picklistOptions.forEach(opt => console.log(`     - ${opt}`));
        }
      } else {
        console.log(`${index + 1}. ❌ NOT FOUND`);
        console.log(`   Key: ${key}`);
      }

      console.log();
    });

    console.log('='.repeat(100));
    console.log(`Total fields found: ${PBTA_FIELD_KEYS.filter(key => allFields.find(f => f.fieldKey === key)).length}/9`);

  } catch (error) {
    console.error('Error fetching custom fields:', error.response?.data || error.message);
    process.exit(1);
  }
}

fetchPBTAFields();
