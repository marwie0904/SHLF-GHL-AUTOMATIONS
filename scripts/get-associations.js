const axios = require('axios');
require('dotenv').config();

/**
 * Lists all existing associations in GHL for your location
 * Use this to find your association ID if it already exists
 */
async function getAssociations() {
    const apiKey = process.env.GHL_API_KEY;
    const locationId = process.env.GHL_LOCATION_ID;

    if (!apiKey || !locationId) {
        console.error('Missing required environment variables: GHL_API_KEY and GHL_LOCATION_ID');
        process.exit(1);
    }

    try {
        console.log('Fetching all associations from GHL...\n');

        const response = await axios.get(
            `https://services.leadconnectorhq.com/associations/?locationId=${locationId}`,
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Version': '2021-07-28'
                }
            }
        );

        console.log('✅ Associations fetched successfully!\n');
        console.log('Total associations found:', response.data.associations?.length || 0);
        console.log('\nFull Response:');
        console.log(JSON.stringify(response.data, null, 2));

        // Look for contact-workshop association
        const associations = response.data.associations || [];
        const contactWorkshopAssociation = associations.find(a =>
            (a.firstObjectKey === 'contact' && a.secondObjectKey === 'custom_objects.workshops') ||
            (a.firstObjectKey === 'custom_objects.workshops' && a.secondObjectKey === 'contact')
        );

        if (contactWorkshopAssociation) {
            console.log('\n' + '='.repeat(60));
            console.log('✅ Found contact-workshop association!');
            console.log('='.repeat(60));
            console.log('Association ID:', contactWorkshopAssociation.id);
            console.log('Key:', contactWorkshopAssociation.key);
            console.log('First Object:', contactWorkshopAssociation.firstObjectKey, '(', contactWorkshopAssociation.firstObjectLabel, ')');
            console.log('Second Object:', contactWorkshopAssociation.secondObjectKey, '(', contactWorkshopAssociation.secondObjectLabel, ')');
            console.log('\n' + '='.repeat(60));
            console.log('⚠️  Add this to your .env file:');
            console.log('='.repeat(60));
            console.log(`GHL_ASSOCIATION_ID=${contactWorkshopAssociation.id}`);
            console.log('='.repeat(60) + '\n');
        } else {
            console.log('\n⚠️  No contact-workshop association found.');
            console.log('Run: node scripts/create-association.js to create one.');
        }

        return response.data;
    } catch (error) {
        console.error('❌ Error fetching associations:');

        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Error:', error.message);
        }

        process.exit(1);
    }
}

// Run the script
getAssociations();
