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
    console.error('GHL API Error Details:', JSON.stringify(error.response?.data, null, 2));

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
      pipelineStageId: stageId,
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

/**
 * Fetches all custom fields from GoHighLevel location
 * @returns {Promise<Array>} Array of custom field objects
 */
async function getCustomFields() {
  const apiKey = process.env.GHL_API_KEY;
  const locationId = process.env.GHL_LOCATION_ID;

  if (!apiKey) {
    throw new Error('GHL_API_KEY not configured in environment variables');
  }

  if (!locationId) {
    throw new Error('GHL_LOCATION_ID not configured in environment variables');
  }

  try {
    const response = await axios.get(
      `https://services.leadconnectorhq.com/locations/${locationId}/customFields`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Version': '2021-07-28'
        }
      }
    );

    console.log('Custom fields fetched successfully');
    return response.data.customFields || [];
  } catch (error) {
    console.error('Error fetching custom fields:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Gets a contact by ID from GoHighLevel
 * @param {string} contactId - GHL contact ID
 * @returns {Promise<Object>} Contact data
 */
async function getContact(contactId) {
  const apiKey = process.env.GHL_API_KEY;

  if (!apiKey) {
    throw new Error('GHL_API_KEY not configured in environment variables');
  }

  try {
    const response = await axios.get(
      `https://services.leadconnectorhq.com/contacts/${contactId}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Version': '2021-07-28'
        }
      }
    );

    console.log('Contact fetched successfully:', contactId);
    return response.data;
  } catch (error) {
    console.error('Error fetching contact:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Creates a task in GoHighLevel
 * @param {string} contactId - Contact ID to assign task to
 * @param {string} title - Task title
 * @param {string} body - Task description/body
 * @param {string} dueDate - ISO date string for due date
 * @param {string} assignedTo - User ID to assign task to (optional)
 * @param {string} opportunityId - Opportunity ID to link task to (optional)
 * @returns {Promise<Object>} Task creation response
 */
async function createTask(contactId, title, body, dueDate, assignedTo = null, opportunityId = null) {
  const apiKey = process.env.GHL_API_KEY;

  if (!apiKey) {
    throw new Error('GHL_API_KEY not configured in environment variables');
  }

  const payload = {
    contactId: contactId,
    title: title,
    body: body,
    dueDate: dueDate,
    completed: false
  };

  // Add optional fields if provided
  if (assignedTo) {
    payload.assignedTo = assignedTo;
  }

  if (opportunityId) {
    payload.opportunityId = opportunityId;
  }

  try {
    const response = await axios.post(
      'https://services.leadconnectorhq.com/opportunities/tasks',
      payload,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28'
        }
      }
    );

    console.log('Task created successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error creating task:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Records a manual payment for an invoice in GoHighLevel
 * @param {string} invoiceId - GHL invoice ID
 * @param {Object} paymentData - Payment information
 * @param {number} paymentData.amount - Payment amount in dollars
 * @param {string} paymentData.paymentMethod - Payment method (e.g., 'credit_card', 'ach', 'cash')
 * @param {string} paymentData.transactionId - External transaction ID (Confido payment ID)
 * @param {string} paymentData.note - Payment note/memo
 * @returns {Promise<Object>} Payment record response
 */
async function recordInvoicePayment(invoiceId, paymentData) {
  const apiKey = process.env.GHL_API_KEY;

  if (!apiKey) {
    throw new Error('GHL_API_KEY not configured in environment variables');
  }

  try {
    console.log('=== Recording Payment in GHL Invoice ===');
    console.log('Invoice ID:', invoiceId);
    console.log('Payment Data:', JSON.stringify(paymentData, null, 2));

    const payload = {
      amount: paymentData.amount, // Amount in dollars
      paymentMode: paymentData.paymentMethod || 'other',
      transactionId: paymentData.transactionId || null,
      note: paymentData.note || 'Payment processed via Confido Legal'
    };

    const response = await axios.post(
      `https://services.leadconnectorhq.com/invoices/${invoiceId}/record-payment`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28'
        }
      }
    );

    console.log('✅ Payment recorded in GHL invoice successfully');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('❌ Error recording payment in GHL invoice:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Gets invoice details from GoHighLevel
 * @param {string} invoiceId - GHL invoice ID
 * @returns {Promise<Object>} Invoice data
 */
async function getInvoice(invoiceId) {
  const apiKey = process.env.GHL_API_KEY;

  if (!apiKey) {
    throw new Error('GHL_API_KEY not configured in environment variables');
  }

  try {
    console.log('=== Fetching Invoice from GHL ===');
    console.log('Invoice ID:', invoiceId);

    const response = await axios.get(
      `https://services.leadconnectorhq.com/invoices/${invoiceId}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Version': '2021-07-28'
        }
      }
    );

    console.log('✅ Invoice fetched successfully from GHL');
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching invoice from GHL:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Gets custom object details from GoHighLevel
 * @param {string} objectKey - Custom object schema key (e.g., "custom_objects.invoices")
 * @param {string} recordId - Custom object record ID
 * @returns {Promise<Object>} Custom object data
 */
async function getCustomObject(objectKey, recordId) {
  const apiKey = process.env.GHL_API_KEY;

  if (!apiKey) {
    throw new Error('GHL_API_KEY not configured in environment variables');
  }

  try {
    console.log('=== Fetching Custom Object from GHL ===');
    console.log('Object Key:', objectKey);
    console.log('Record ID:', recordId);

    const response = await axios.get(
      `https://services.leadconnectorhq.com/objects/${objectKey}/records/${recordId}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Version': '2021-07-28'
        }
      }
    );

    console.log('✅ Custom object fetched successfully from GHL');
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching custom object from GHL:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Updates custom object properties in GoHighLevel
 * @param {string} objectKey - Custom object schema key
 * @param {string} recordId - Custom object record ID
 * @param {Array} properties - Array of property updates [{key, value...}]
 * @returns {Promise<Object>} Update response
 */
async function updateCustomObject(objectKey, recordId, properties) {
  const apiKey = process.env.GHL_API_KEY;

  if (!apiKey) {
    throw new Error('GHL_API_KEY not configured in environment variables');
  }

  try {
    console.log('=== Updating Custom Object in GHL ===');
    console.log('Object Key:', objectKey);
    console.log('Record ID:', recordId);
    console.log('Properties:', JSON.stringify(properties, null, 2));

    const response = await axios.put(
      `https://services.leadconnectorhq.com/objects/${objectKey}/records/${recordId}`,
      { properties },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28'
        }
      }
    );

    console.log('✅ Custom object updated successfully in GHL');
    return response.data;
  } catch (error) {
    console.error('❌ Error updating custom object in GHL:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Gets relations/associations for a custom object record
 * @param {string} recordId - Custom object record ID
 * @param {string} locationId - GHL location ID
 * @returns {Promise<Object>} Relations data
 */
async function getRelations(recordId, locationId) {
  const apiKey = process.env.GHL_API_KEY;

  if (!apiKey) {
    throw new Error('GHL_API_KEY not configured in environment variables');
  }

  try {
    console.log('=== Fetching Relations from GHL ===');
    console.log('Record ID:', recordId);
    console.log('Location ID:', locationId);

    const response = await axios.get(
      `https://services.leadconnectorhq.com/associations/relations/${recordId}`,
      {
        params: { locationId },
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Version': '2021-07-28'
        }
      }
    );

    console.log('✅ Relations fetched successfully from GHL');
    console.log(`Found ${response.data.relations?.length || 0} relations`);
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching relations from GHL:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Gets opportunity details including contact information
 * @param {string} opportunityId - GHL opportunity ID
 * @returns {Promise<Object>} Opportunity data with contact details
 */
async function getOpportunity(opportunityId) {
  const apiKey = process.env.GHL_API_KEY;

  if (!apiKey) {
    throw new Error('GHL_API_KEY not configured in environment variables');
  }

  try {
    console.log('=== Fetching Opportunity from GHL ===');
    console.log('Opportunity ID:', opportunityId);

    const response = await axios.get(
      `https://services.leadconnectorhq.com/opportunities/${opportunityId}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Version': '2021-07-28'
        }
      }
    );

    console.log('✅ Opportunity fetched successfully from GHL');
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching opportunity from GHL:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = {
  createGHLContact,
  createGHLOpportunity,
  getCustomFields,
  getContact,
  createTask,
  recordInvoicePayment,
  getInvoice,
  getCustomObject,
  updateCustomObject,
  getRelations,
  getOpportunity
};
