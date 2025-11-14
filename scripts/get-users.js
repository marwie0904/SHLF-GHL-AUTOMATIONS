const axios = require('axios');
require('dotenv').config();

/**
 * Get all users in the location
 */
async function getUsers() {
    const apiKey = process.env.GHL_API_KEY;
    const locationId = process.env.GHL_LOCATION_ID;

    if (!apiKey || !locationId) {
        console.error('Missing required environment variables');
        process.exit(1);
    }

    console.log('🔍 Getting users in location...\n');
    console.log('Location ID:', locationId);
    console.log('\n');

    try {
        // Try different endpoints to find users
        let response;

        try {
            console.log('TEST 1: Trying /users endpoint...\n');
            response = await axios.get(
                'https://services.leadconnectorhq.com/users/',
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
        } catch (error1) {
            console.log('❌ /users failed, trying /users/search...\n');

            response = await axios.get(
                'https://services.leadconnectorhq.com/users/search',
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
        }

        console.log('✅ SUCCESS! Retrieved users!\n');
        console.log('Total users found:', response.data.users?.length || 0);
        console.log('\nFull Response:', JSON.stringify(response.data, null, 2));

        if (response.data.users && response.data.users.length > 0) {
            console.log('\n' + '='.repeat(60));
            console.log('USER DETAILS:');
            console.log('='.repeat(60));

            response.data.users.forEach((user, index) => {
                console.log(`\nUser ${index + 1}:`);
                console.log(`  ID: ${user.id}`);
                console.log(`  Name: ${user.name || user.firstName + ' ' + user.lastName}`);
                console.log(`  Email: ${user.email}`);
                console.log(`  Role: ${user.role || 'N/A'}`);
            });

            console.log('\n💡 To test getting tasks for a user, use:');
            console.log(`   node scripts/get-user-tasks.js ${response.data.users[0].id}`);
        }

        return response.data;

    } catch (error) {
        console.error('❌ FAILED\n');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Error:', error.message);
        }
        process.exit(1);
    }
}

console.log('='.repeat(60));
console.log('Getting Users in Location');
console.log('='.repeat(60));
console.log('\n');

getUsers();
