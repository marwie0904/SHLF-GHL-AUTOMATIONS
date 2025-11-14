const axios = require('axios');
require('dotenv').config();

/**
 * Get a sample contact to use for testing tasks
 */
async function getSampleContact() {
    const apiKey = process.env.GHL_API_KEY;
    const locationId = process.env.GHL_LOCATION_ID;

    if (!apiKey || !locationId) {
        console.error('Missing required environment variables');
        process.exit(1);
    }

    console.log('🔍 Getting sample contact...\n');

    try {
        const response = await axios.get(
            'https://services.leadconnectorhq.com/contacts/',
            {
                params: {
                    locationId: locationId,
                    limit: 1
                },
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Version': '2021-07-28'
                }
            }
        );

        if (response.data.contacts && response.data.contacts.length > 0) {
            const contact = response.data.contacts[0];
            console.log('✅ Found contact!');
            console.log('Contact ID:', contact.id);
            console.log('Contact Name:', contact.firstName, contact.lastName);
            console.log('Contact Email:', contact.email);
            return contact.id;
        } else {
            console.log('❌ No contacts found in this location');
            process.exit(1);
        }
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
        process.exit(1);
    }
}

getSampleContact();
