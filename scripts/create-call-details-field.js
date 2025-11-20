require('dotenv').config();
const axios = require('axios');

const apiKey = process.env.GHL_API_KEY;
const locationId = process.env.GHL_LOCATION_ID;

async function createCallDetailsField() {
  try {
    console.log('Creating "Call Details" custom field in GHL...\n');

    const field = {
      name: "Call Details",
      fieldKey: "contact.call_details",
      dataType: "LARGE_TEXT",
      placeholder: "",
      model: "contact"
    };

    const response = await axios.post(
      `https://services.leadconnectorhq.com/locations/${locationId}/customFields`,
      field,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28'
        }
      }
    );

    console.log('✅ SUCCESS - Call Details field created');
    console.log('Field ID:', response.data.id);
    console.log('Field Key:', response.data.fieldKey);
    console.log('\nFull response:', JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.error('❌ FAILED - Could not create field');
    if (error.response?.data) {
      console.error('Error:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
  }
}

createCallDetailsField();
