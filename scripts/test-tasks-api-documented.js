const axios = require('axios');
require('dotenv').config();

/**
 * Test the documented Tasks API endpoint with various parameters
 * Based on GHL API documentation: GET /contacts/:contactId/tasks
 */
async function testTasksAPI() {
    const apiKey = process.env.GHL_API_KEY;
    const locationId = process.env.GHL_LOCATION_ID;

    if (!apiKey || !locationId) {
        console.error('Missing required environment variables');
        process.exit(1);
    }

    console.log('🔍 Testing documented Tasks API...\n');

    try {
        // First, get a sample contact
        console.log('Step 1: Getting a sample contact...\n');
        const contactsResponse = await axios.get(
            'https://services.leadconnectorhq.com/contacts/',
            {
                params: { locationId, limit: 1 },
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Version': '2021-07-28'
                }
            }
        );

        const contactId = contactsResponse.data.contacts[0]?.id;
        if (!contactId) {
            console.log('❌ No contacts found');
            process.exit(1);
        }

        console.log(`✅ Found contact: ${contactId}\n`);

        // Step 2: Get tasks for this contact (documented endpoint)
        console.log('Step 2: Testing documented endpoint GET /contacts/:contactId/tasks\n');

        const tasksResponse = await axios.get(
            `https://services.leadconnectorhq.com/contacts/${contactId}/tasks`,
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Version': '2021-07-28'
                }
            }
        );

        console.log('✅ Documented endpoint works!');
        console.log('Tasks found:', tasksResponse.data.tasks?.length || 0);
        console.log('\nSample task structure:', JSON.stringify(tasksResponse.data.tasks?.[0], null, 2));

        // Step 3: Try adding query parameters to see if filtering works
        console.log('\n' + '='.repeat(60));
        console.log('Step 3: Testing if query parameters work on this endpoint...\n');

        const testUserId = 'oDGoJrCn86uTwMVj8RKS'; // Sample user ID

        const paramsToTest = [
            { assignedTo: testUserId },
            { assignee: testUserId },
            { userId: testUserId },
            { filter: JSON.stringify({ assignedTo: testUserId }) }
        ];

        for (const params of paramsToTest) {
            try {
                console.log(`Testing with params:`, JSON.stringify(params));

                const testResponse = await axios.get(
                    `https://services.leadconnectorhq.com/contacts/${contactId}/tasks`,
                    {
                        params: params,
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Version': '2021-07-28'
                        }
                    }
                );

                console.log(`  ✅ Request succeeded`);
                console.log(`  Tasks returned: ${testResponse.data.tasks?.length || 0}`);

                // Check if filtering actually worked
                const allAssigned = testResponse.data.tasks?.every(t => t.assignedTo === testUserId);
                if (allAssigned && testResponse.data.tasks?.length > 0) {
                    console.log(`  🎯 FILTERING WORKS! All tasks are assigned to ${testUserId}`);
                } else if (testResponse.data.tasks?.length === 0) {
                    console.log(`  ⚠️  No tasks returned - could be filtering or just no tasks`);
                } else {
                    console.log(`  ⚠️  Filtering may not be working - got unfiltered results`);
                }
                console.log('');

            } catch (error) {
                console.log(`  ❌ Failed: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
                console.log('');
            }
        }

        // Step 4: Check documentation structure
        console.log('='.repeat(60));
        console.log('CONCLUSION:');
        console.log('='.repeat(60));
        console.log('✅ Documented endpoint: GET /contacts/:contactId/tasks');
        console.log('❓ Tasks are scoped to contacts, not available globally');
        console.log('❓ No documented way to filter tasks by assignee at the API level');
        console.log('\nTo get all tasks for a specific assignee:');
        console.log('1. Get all contacts in the location');
        console.log('2. Get tasks for each contact');
        console.log('3. Filter tasks where task.assignedTo matches the user ID');
        console.log('='.repeat(60));

    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
        process.exit(1);
    }
}

console.log('='.repeat(60));
console.log('Testing GHL Tasks API (Documented Endpoints)');
console.log('='.repeat(60));
console.log('\n');

testTasksAPI();
