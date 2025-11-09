require('dotenv').config();
const axios = require('axios');

/**
 * Fetches all custom objects for the location to find the correct schema key
 */
async function getAllCustomObjects() {
  const apiKey = process.env.GHL_API_KEY;
  const locationId = process.env.GHL_LOCATION_ID;

  if (!apiKey) {
    console.error('Error: GHL_API_KEY not found in environment variables');
    process.exit(1);
  }

  if (!locationId) {
    console.error('Error: GHL_LOCATION_ID not found in environment variables');
    process.exit(1);
  }

  try {
    console.log('Fetching all objects for location:', locationId);
    console.log('');

    const response = await axios.get(
      'https://services.leadconnectorhq.com/objects/',
      {
        params: {
          locationId: locationId
        },
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Version': '2021-07-28'
        }
      }
    );

    console.log('✓ Successfully fetched objects');
    console.log('');
    console.log('Available Custom Objects:');
    console.log('========================');

    // Filter and display custom objects
    const customObjects = response.data.objects?.filter(obj =>
      obj.id?.startsWith('custom_objects.') || obj.key?.startsWith('custom_objects.')
    ) || [];

    if (customObjects.length === 0) {
      console.log('No custom objects found.');
      console.log('');
      console.log('All objects:', JSON.stringify(response.data, null, 2));
    } else {
      customObjects.forEach((obj, index) => {
        console.log(`\n${index + 1}. ${obj.name || 'Unnamed'}`);
        console.log(`   ID/Key: ${obj.id || obj.key || 'N/A'}`);
        console.log(`   Schema Key: ${obj.schemaKey || obj.schema_key || obj.id || obj.key || 'N/A'}`);

        if (obj.name?.toLowerCase().includes('workshop')) {
          console.log('   >>> THIS IS YOUR WORKSHOP OBJECT! <<<');
        }
      });
    }

    console.log('\n\nFull Response:');
    console.log(JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.error('Error fetching objects:', error.response?.data || error.message);

    if (error.response) {
      console.log('\nResponse Status:', error.response.status);
      console.log('Response Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

getAllCustomObjects();
