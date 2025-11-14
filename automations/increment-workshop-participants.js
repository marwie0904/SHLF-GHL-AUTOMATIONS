const axios = require('axios');

/**
 * Gets workshop data from GHL custom object
 * @param {string} workshopRecordId - The workshop record ID in GHL
 * @returns {Promise<Object>} Workshop data including current participants and max capacity
 */
async function getWorkshopData(workshopRecordId) {
    const apiKey = process.env.GHL_API_KEY;

    if (!apiKey) {
        throw new Error('GHL_API_KEY not configured in environment variables');
    }

    try {
        console.log(`Fetching workshop data for record ID: ${workshopRecordId}`);

        const response = await axios.get(
            `https://services.leadconnectorhq.com/objects/records/${workshopRecordId}`,
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'Version': '2021-07-28'
                }
            }
        );

        console.log('Workshop data retrieved:', response.data);

        // Extract properties from the record
        const properties = response.data.record?.properties || response.data.properties || {};

        return {
            recordId: workshopRecordId,
            currentParticipants: parseInt(properties.number_of_participants) || 0,
            maxCapacity: parseInt(properties.max_capacity) || 0,
            workshopName: properties.workshops || '',
            properties: properties
        };
    } catch (error) {
        console.error('Error fetching workshop data:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Updates the number of participants for a workshop
 * @param {string} workshopRecordId - The workshop record ID in GHL
 * @param {number} newParticipantCount - The new participant count
 * @returns {Promise<Object>} GHL API response
 */
async function updateParticipantCount(workshopRecordId, newParticipantCount) {
    const apiKey = process.env.GHL_API_KEY;

    if (!apiKey) {
        throw new Error('GHL_API_KEY not configured in environment variables');
    }

    try {
        console.log(`Updating workshop ${workshopRecordId} participants to: ${newParticipantCount}`);

        const response = await axios.patch(
            `https://services.leadconnectorhq.com/objects/records/${workshopRecordId}`,
            {
                properties: {
                    number_of_participants: newParticipantCount.toString()
                }
            },
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'Version': '2021-07-28'
                }
            }
        );

        console.log('Participant count updated successfully:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error updating participant count:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Increments the participant count for a workshop (with capacity check)
 * @param {string} workshopRecordId - The workshop record ID in GHL
 * @returns {Promise<Object>} Result object with status and details
 */
async function incrementParticipants(workshopRecordId) {
    try {
        console.log('Starting participant increment process...');

        // Get current workshop data
        const workshopData = await getWorkshopData(workshopRecordId);

        console.log(`Current participants: ${workshopData.currentParticipants}`);
        console.log(`Max capacity: ${workshopData.maxCapacity}`);

        // Check if workshop is at capacity
        if (workshopData.currentParticipants >= workshopData.maxCapacity) {
            console.log('Workshop is at max capacity. Not incrementing participants.');
            return {
                success: false,
                atCapacity: true,
                currentParticipants: workshopData.currentParticipants,
                maxCapacity: workshopData.maxCapacity,
                message: 'Workshop is at maximum capacity'
            };
        }

        // Increment participant count
        const newCount = workshopData.currentParticipants + 1;
        const updateResponse = await updateParticipantCount(workshopRecordId, newCount);

        console.log('Participant increment completed successfully');
        return {
            success: true,
            atCapacity: false,
            previousCount: workshopData.currentParticipants,
            newCount: newCount,
            maxCapacity: workshopData.maxCapacity,
            updateResponse: updateResponse
        };
    } catch (error) {
        console.error('Error in incrementParticipants:', error.message);
        throw error;
    }
}

/**
 * Main function to handle workshop participant increment from webhook
 * @param {Object} webhookData - Webhook data from GHL
 * @returns {Promise<Object>} Result object
 */
async function main(webhookData) {
    try {
        console.log('Processing workshop participant increment webhook...');
        console.log('Webhook data:', JSON.stringify(webhookData, null, 2));

        // Extract workshop record ID from webhook data
        // This may vary depending on how GHL sends the webhook
        // Common patterns: workshopId, recordId, workshop_id, etc.
        const workshopRecordId = webhookData.workshopRecordId
            || webhookData.recordId
            || webhookData.workshop_id
            || webhookData.workshopId;

        if (!workshopRecordId) {
            throw new Error('Workshop record ID not found in webhook data');
        }

        // Increment participants
        const result = await incrementParticipants(workshopRecordId);

        return result;
    } catch (error) {
        console.error('Error in main:', error.message);
        throw error;
    }
}

module.exports = {
    main,
    incrementParticipants,
    getWorkshopData,
    updateParticipantCount
};
