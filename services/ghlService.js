const axios = require('axios');

/**
 * Creates a contact in GoHighLevel
 * @param {Object} contactData - Contact data in GHL format
 * @returns {Promise<Object>} API response
 */
async function createGHLContact(contactData) {
  const apiKey = process.env.GHL_API_KEY;
  const locationId = process.env.GHL_LOCATION_ID;

  if (!apiKey) {
    throw new Error('GHL_API_KEY not configured in environment variables');
  }

  if (!locationId) {
    throw new Error('GHL_LOCATION_ID not configured in environment variables');
  }

  const payload = {
    ...contactData,
    locationId: locationId
  };

  try {
    const response = await axios.post(
      'https://services.leadconnectorhq.com/contacts/',
      payload,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28'
        }
      }
    );

    console.log('GHL Contact created successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error creating GHL contact:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = { createGHLContact };
