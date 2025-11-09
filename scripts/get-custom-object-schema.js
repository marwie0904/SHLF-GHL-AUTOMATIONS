const axios = require('axios');
require('dotenv').config();

const apiKey = process.env.GHL_API_KEY;
const locationId = process.env.GHL_LOCATION_ID;

if (!apiKey || !locationId) {
    console.log('Missing API credentials');
    process.exit(1);
}

async function getCustomObjectSchema() {
    try {
        // Fetch all schemas to find the workshops object
        console.log('Fetching all schemas...\n');
        const response = await axios.get(
            `https://services.leadconnectorhq.com/objects/schemas`,
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Version': '2021-07-28'
                },
                params: {
                    locationId: locationId
                }
            }
        );

        console.log('Full Response:');
        console.log(JSON.stringify(response.data, null, 2));

        // Look for workshops schema
        const schemas = response.data.schemas || [response.data];
        const workshopsSchema = schemas.find(s =>
            s.key === 'custom_objects.workshops' ||
            s.name === 'workshops' ||
            s.id === 'workshops'
        );

        if (workshopsSchema) {
            console.log('\n=== Found Workshops Schema ===');
            console.log(JSON.stringify(workshopsSchema, null, 2));

            // Search for files field
            if (workshopsSchema.fields) {
                console.log('\n=== Searching for "files" field ===');
                const filesField = workshopsSchema.fields.find(f =>
                    f.name === 'files' ||
                    f.key === 'files' ||
                    f.key === 'custom_objects.workshops.files'
                );

                if (filesField) {
                    console.log('\n*** FILES FIELD FOUND ***');
                    console.log(JSON.stringify(filesField, null, 2));
                } else {
                    console.log('\nFiles field not found. All fields:');
                    workshopsSchema.fields.forEach(field => {
                        console.log(`  - ${field.name || field.key} (type: ${field.type})`);
                    });
                }
            }
        } else {
            console.log('\nWorkshops schema not found. Available schemas:');
            schemas.forEach(s => {
                console.log(`  - ${s.key || s.name || s.id}`);
            });
        }
    } catch (error) {
        console.error('Error fetching schema:', error.response?.data || error.message);
    }
}

getCustomObjectSchema();
