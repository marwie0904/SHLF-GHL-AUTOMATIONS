require('dotenv').config();
const axios = require('axios');

const API_KEY = process.env.GHL_API_KEY || 'pit-0b1fca76-709a-4d4d-bf92-210320bd4fd5';
const LOCATION_ID = process.env.GHL_LOCATION_ID || 'afYLuZPi37CZR1IpJlfn';

const keysToTry = [
  'workshops',
  'custom_objects.workshops',
  'custom_objects.workshops.workshops',
  'workshop',
  'Workshops'
];

async function testSchemaKey(schemaKey) {
  try {
    const url = `https://services.leadconnectorhq.com/objects/${schemaKey}/records`;
    const testData = {
      locationId: LOCATION_ID,
      name: "Test Workshop"
    };

    await axios.post(url, testData, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28'
      }
    });

    console.log(`✓ SUCCESS: "${schemaKey}" is the correct schema key!`);
    return true;
  } catch (error) {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message;
    console.log(`✗ FAILED: "${schemaKey}" - ${status} ${message}`);
    return false;
  }
}

async function main() {
  console.log('Testing different schema key formats...\n');

  for (const key of keysToTry) {
    await testSchemaKey(key);
  }

  console.log('\n\nTrying to get all objects...');
  try {
    const response = await axios.get(
      'https://services.leadconnectorhq.com/objects/',
      {
        params: { locationId: LOCATION_ID },
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Version': '2021-07-28'
        }
      }
    );

    console.log('\nAll objects:');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('Error getting objects:', error.response?.data || error.message);
  }
}

main();
