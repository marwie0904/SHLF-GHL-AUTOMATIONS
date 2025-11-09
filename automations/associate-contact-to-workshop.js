const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

/**
 * Finds workshop ID from Supabase by matching event details
 * @param {Object} eventDetails - Event details from form submission
 * @param {string} eventDetails.title - Event title
 * @param {string} eventDetails.date - Event date (format: MM/DD/YYYY)
 * @param {string} eventDetails.time - Event time
 * @param {string} eventDetails.type - Workshop type (Seminar/Webinar/Office)
 * @returns {Promise<string|null>} GHL workshop record ID or null if not found
 */
async function findWorkshopId(eventDetails) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        throw new Error('SUPABASE_URL or SUPABASE_KEY not configured in environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        console.log('Searching for workshop in Supabase...');
        console.log('Search criteria:', eventDetails);

        // Use case-insensitive matching with ilike for more robust searching
        const { data, error } = await supabase
            .from('workshops')
            .select('ghl_workshop_id')
            .ilike('title', eventDetails.title)
            .eq('event_date', eventDetails.date)
            .ilike('event_time', eventDetails.time)
            .ilike('workshop_type', eventDetails.type)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                // No rows found
                console.log('No matching workshop found');
                return null;
            }
            throw error;
        }

        console.log('Found workshop:', data.ghl_workshop_id);
        return data.ghl_workshop_id;
    } catch (error) {
        console.error('Error finding workshop in Supabase:', error.message);
        throw error;
    }
}

/**
 * Creates a relation between contact and workshop in GHL
 * @param {string} contactId - GHL contact ID
 * @param {string} workshopRecordId - GHL workshop record ID
 * @param {string} associationId - GHL association ID for contact-workshop relationship
 * @returns {Promise<Object>} GHL API response
 */
async function createContactWorkshopRelation(contactId, workshopRecordId, associationId) {
    const apiKey = process.env.GHL_API_KEY;
    const locationId = process.env.GHL_LOCATION_ID;

    if (!apiKey) {
        throw new Error('GHL_API_KEY not configured in environment variables');
    }

    if (!locationId) {
        throw new Error('GHL_LOCATION_ID not configured in environment variables');
    }

    if (!associationId) {
        throw new Error('GHL_ASSOCIATION_ID not configured in environment variables');
    }

    try {
        console.log('Creating contact-workshop relation in GHL...');
        console.log('Contact ID:', contactId);
        console.log('Workshop Record ID:', workshopRecordId);
        console.log('Association ID:', associationId);

        const response = await axios.post(
            'https://services.leadconnectorhq.com/associations/relations',
            {
                locationId: locationId,
                associationId: associationId,
                firstRecordId: contactId,
                secondRecordId: workshopRecordId
            },
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'Version': '2021-07-28'
                }
            }
        );

        console.log('Contact-workshop relation created successfully:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error creating contact-workshop relation:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Main function to associate contact to workshop
 * @param {Object} params - Function parameters
 * @param {string} params.contactId - GHL contact ID
 * @param {string} params.eventTitle - Workshop title
 * @param {string} params.eventDate - Event date (format: MM/DD/YYYY)
 * @param {string} params.eventTime - Event time
 * @param {string} params.eventType - Workshop type (Seminar/Webinar/Office)
 * @returns {Promise<Object>} Result object
 */
async function main({ contactId, eventTitle, eventDate, eventTime, eventType }) {
    try {
        console.log('Starting contact-workshop association process...');

        // Validate required parameters
        if (!contactId) {
            throw new Error('contactId is required');
        }
        if (!eventTitle) {
            throw new Error('eventTitle is required');
        }
        if (!eventDate) {
            throw new Error('eventDate is required');
        }
        if (!eventTime) {
            throw new Error('eventTime is required');
        }
        if (!eventType) {
            throw new Error('eventType is required');
        }

        // Validate eventType
        const validTypes = ['Seminar', 'Webinar', 'Office'];
        if (!validTypes.includes(eventType)) {
            throw new Error(`eventType must be one of: ${validTypes.join(', ')}`);
        }

        // Find workshop ID from Supabase
        const workshopRecordId = await findWorkshopId({
            title: eventTitle,
            date: eventDate,
            time: eventTime,
            type: eventType
        });

        if (!workshopRecordId) {
            throw new Error('Workshop not found. Please ensure the workshop exists in the system.');
        }

        // Get association ID from environment
        const associationId = process.env.GHL_ASSOCIATION_ID;

        // Create relation in GHL
        const relationResponse = await createContactWorkshopRelation(
            contactId,
            workshopRecordId,
            associationId
        );

        console.log('Contact-workshop association completed successfully');
        return {
            success: true,
            contactId: contactId,
            workshopRecordId: workshopRecordId,
            relationResponse: relationResponse
        };
    } catch (error) {
        console.error('Error in contact-workshop association:', error.message);
        throw error;
    }
}

module.exports = {
    main,
    findWorkshopId,
    createContactWorkshopRelation
};
