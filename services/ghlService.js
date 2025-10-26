const axios = require('axios');

/**
 * Searches for existing contact by phone or email
 * @param {string} phone - Contact phone number
 * @param {string} locationId - GHL location ID
 * @param {string} apiKey - GHL API key
 * @returns {Promise<Object|null>} Existing contact or null
 */
async function findExistingContact(phone, locationId, apiKey) {
  if (!phone) return null;

  try {
    const response = await axios.get(
      `https://services.leadconnectorhq.com/contacts/`,
      {
        params: {
          locationId: locationId,
          query: phone
        },
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Version': '2021-07-28'
        }
      }
    );

    if (response.data.contacts && response.data.contacts.length > 0) {
      return response.data.contacts[0];
    }
    return null;
  } catch (error) {
    console.error('Error searching for contact:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Updates an existing contact in GoHighLevel
 * @param {string} contactId - GHL contact ID
 * @param {Object} contactData - Contact data in GHL format
 * @param {string} apiKey - GHL API key
 * @returns {Promise<Object>} API response
 */
async function updateGHLContact(contactId, contactData, apiKey) {
  try {
    const response = await axios.put(
      `https://services.leadconnectorhq.com/contacts/${contactId}`,
      contactData,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28'
        }
      }
    );

    console.log('GHL Contact updated successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error updating GHL contact:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Creates or updates a contact in GoHighLevel
 * @param {Object} contactData - Contact data in GHL format
 * @returns {Promise<Object>} API response with contactId and isDuplicate flag
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
    // Try to create contact
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
    return {
      ...response.data,
      isDuplicate: false
    };
  } catch (error) {
    // Check if it's a duplicate contact error
    const isDuplicateError = error.response?.status === 400 &&
                            error.response?.data?.message?.includes('duplicated');

    if (isDuplicateError) {
      console.log('Duplicate contact detected, searching for existing contact...');

      // Search for existing contact
      const existingContact = await findExistingContact(contactData.phone, locationId, apiKey);

      if (existingContact) {
        console.log('Found existing contact, updating:', existingContact.id);

        // Update existing contact
        const updateResponse = await updateGHLContact(existingContact.id, contactData, apiKey);

        return {
          contact: { id: existingContact.id },
          id: existingContact.id,
          isDuplicate: true,
          ...updateResponse
        };
      } else {
        console.error('Could not find existing contact to update');
        throw new Error('Duplicate contact error but could not find existing contact');
      }
    }

    // Re-throw if not a duplicate error
    console.error('Error creating GHL contact:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Creates an opportunity for a contact in GoHighLevel
 * @param {string} contactId - GHL contact ID
 * @param {string} pipelineId - GHL pipeline ID
 * @param {string} stageId - GHL stage ID (default: Pending Contact)
 * @param {string} name - Opportunity name
 * @returns {Promise<Object>} API response
 */
async function createGHLOpportunity(contactId, pipelineId, stageId, name) {
  const apiKey = process.env.GHL_API_KEY;
  const locationId = process.env.GHL_LOCATION_ID;

  if (!apiKey) {
    throw new Error('GHL_API_KEY not configured in environment variables');
  }

  if (!locationId) {
    throw new Error('GHL_LOCATION_ID not configured in environment variables');
  }

  try {
    const payload = {
      pipelineId: pipelineId,
      locationId: locationId,
      name: name,
      stageId: stageId,
      status: 'open',
      contactId: contactId
    };

    const response = await axios.post(
      'https://services.leadconnectorhq.com/opportunities/',
      payload,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28'
        }
      }
    );

    console.log('GHL Opportunity created successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error creating GHL opportunity:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = { createGHLContact, createGHLOpportunity };
