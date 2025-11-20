require('dotenv').config();
const axios = require('axios');

const apiKey = process.env.GHL_API_KEY;
const locationId = process.env.GHL_LOCATION_ID;

// Define all custom fields to create
const customFields = [
  {
    name: "Caller's Phone Number",
    fieldKey: "contact.callers_phone_number",
    dataType: "TEXT",
    placeholder: "",
    model: "contact"
  },
  {
    name: "Caller's Email",
    fieldKey: "contact.callers_email",
    dataType: "TEXT",
    placeholder: "",
    model: "contact"
  },
  {
    name: "Estate Planning Goals",
    fieldKey: "contact.estate_planning_goals",
    dataType: "LARGE_TEXT",
    placeholder: "",
    model: "contact"
  },
  {
    name: "What Documents Do You Have",
    fieldKey: "contact.what_documents_do_you_have",
    dataType: "LARGE_TEXT",
    placeholder: "",
    model: "contact"
  },
  {
    name: "Legal Advice Sought",
    fieldKey: "contact.legal_advice_sought",
    dataType: "LARGE_TEXT",
    placeholder: "",
    model: "contact"
  },
  {
    name: "Recent Life Events",
    fieldKey: "contact.recent_life_events",
    dataType: "LARGE_TEXT",
    placeholder: "",
    model: "contact"
  },
  {
    name: "Are You The Document Owner",
    fieldKey: "contact.are_you_the_document_owner",
    dataType: "RADIO",
    placeholder: "",
    model: "contact",
    picklistOptions: ["Yes", "No"],
    isAllowedCustomOption: false
  },
  {
    name: "Relationship With Document Owners",
    fieldKey: "contact.relationship_with_document_owners",
    dataType: "TEXT",
    placeholder: "",
    model: "contact"
  },
  {
    name: "Are You A Beneficiary Or Trustee",
    fieldKey: "contact.are_you_a_beneficiary_or_trustee",
    dataType: "RADIO",
    placeholder: "",
    model: "contact",
    picklistOptions: ["Beneficiary", "Trustee", "Both", "Neither"],
    isAllowedCustomOption: false
  },
  {
    name: "Power of Attorney (POA)",
    fieldKey: "contact.power_of_attorney_poa",
    dataType: "RADIO",
    placeholder: "",
    model: "contact",
    picklistOptions: ["Yes", "No"],
    isAllowedCustomOption: false
  },
  {
    name: "Pending Litigation",
    fieldKey: "contact.pending_litigation",
    dataType: "RADIO",
    placeholder: "",
    model: "contact",
    picklistOptions: ["Yes", "No"],
    isAllowedCustomOption: false
  }
];

async function createCustomField(field) {
  try {
    // Remove locationId from payload and rename picklistOptions to options
    const { locationId: _, picklistOptions, isAllowedCustomOption, ...restField } = field;

    const payload = {
      ...restField
    };

    // Add options for RADIO fields
    if (field.dataType === 'RADIO' && picklistOptions) {
      payload.options = picklistOptions;
    }

    console.log(`\nCreating field: ${field.name}`);
    console.log(`Field Key: ${field.fieldKey}`);
    console.log(`Data Type: ${field.dataType}`);
    if (payload.options) {
      console.log(`Options: ${payload.options.join(', ')}`);
    }

    const response = await axios.post(
      `https://services.leadconnectorhq.com/locations/${locationId}/customFields`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28'
        }
      }
    );

    console.log(`✅ SUCCESS - Created: ${field.name}`);
    console.log(`   ID: ${response.data.id}`);
    return { success: true, field: field.name, id: response.data.id };

  } catch (error) {
    console.error(`❌ FAILED - ${field.name}`);
    if (error.response?.data) {
      console.error(`   Error: ${JSON.stringify(error.response.data)}`);
    } else {
      console.error(`   Error: ${error.message}`);
    }
    return { success: false, field: field.name, error: error.response?.data || error.message };
  }
}

async function main() {
  console.log('='.repeat(80));
  console.log('Creating Custom Fields in GHL');
  console.log('='.repeat(80));
  console.log(`\nLocation ID: ${locationId}`);
  console.log(`Total fields to create: ${customFields.length}\n`);

  if (!apiKey || !locationId) {
    console.error('❌ Missing GHL_API_KEY or GHL_LOCATION_ID in environment variables');
    process.exit(1);
  }

  const results = [];

  // Create fields sequentially to avoid rate limiting
  for (const field of customFields) {
    const result = await createCustomField(field);
    results.push(result);

    // Wait 500ms between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`\n✅ Successful: ${successful.length}/${customFields.length}`);
  successful.forEach(r => {
    console.log(`   - ${r.field} (ID: ${r.id})`);
  });

  if (failed.length > 0) {
    console.log(`\n❌ Failed: ${failed.length}/${customFields.length}`);
    failed.forEach(r => {
      console.log(`   - ${r.field}`);
      console.log(`     Error: ${JSON.stringify(r.error)}`);
    });
  }

  console.log('\n' + '='.repeat(80));
}

main();
