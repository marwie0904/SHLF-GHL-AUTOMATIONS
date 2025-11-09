const axios = require('axios');
require('dotenv').config();

/**
 * Creates an association type between contacts and workshops in GHL
 * This only needs to be run ONCE to set up the relationship type
 */
async function createContactWorkshopAssociation() {
    const apiKey = process.env.GHL_API_KEY;
    const locationId = process.env.GHL_LOCATION_ID;

    if (!apiKey || !locationId) {
        console.error('Missing required environment variables: GHL_API_KEY and GHL_LOCATION_ID');
        process.exit(1);
    }

    try {
        console.log('Creating contact-workshop association type in GHL...\n');

        const response = await axios.post(
            'https://services.leadconnectorhq.com/associations/',
            {
                locationId: locationId,
                key: 'contact_workshop',
                firstObjectLabel: 'Contact',
                firstObjectKey: 'contact',
                secondObjectLabel: 'Workshop Attendee',
                secondObjectKey: 'custom_objects.workshops'
            },
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'Version': '2021-07-28'
                }
            }
        );

        console.log('✅ Association created successfully!\n');
        console.log('Full Response:');
        console.log(JSON.stringify(response.data, null, 2));
        console.log('\n' + '='.repeat(60));
        console.log('⚠️  IMPORTANT: Add this to your .env file:');
        console.log('='.repeat(60));
        console.log(`GHL_ASSOCIATION_ID=${response.data.id}`);
        console.log('='.repeat(60) + '\n');

        return response.data;
    } catch (error) {
        console.error('❌ Error creating association:');

        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response:', JSON.stringify(error.response.data, null, 2));

            // Check if association already exists
            if (error.response.status === 400 || error.response.status === 409) {
                console.log('\n💡 The association might already exist. Try fetching existing associations instead.');
                console.log('Run: node scripts/get-associations.js');
            }
        } else {
            console.error('Error:', error.message);
        }

        process.exit(1);
    }
}

// Run the script
createContactWorkshopAssociation();
