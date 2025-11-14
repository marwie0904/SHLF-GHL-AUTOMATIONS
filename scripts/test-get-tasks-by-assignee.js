const axios = require('axios');
require('dotenv').config();

/**
 * Test: Can we retrieve tasks by assignee ID in GHL?
 * Testing different approaches to filter tasks by assigned user
 */
async function testGetTasksByAssignee() {
    const apiKey = process.env.GHL_API_KEY;
    const locationId = process.env.GHL_LOCATION_ID;
    const assigneeId = process.argv[2];

    if (!apiKey) {
        console.error('Missing GHL_API_KEY in environment variables');
        process.exit(1);
    }

    if (!locationId) {
        console.error('Missing GHL_LOCATION_ID in environment variables');
        process.exit(1);
    }

    if (!assigneeId) {
        console.error('Missing assignee ID');
        console.log('Usage: node scripts/test-get-tasks-by-assignee.js <assigneeId>');
        process.exit(1);
    }

    console.log('🔍 Testing task retrieval by assignee...\n');
    console.log('Location ID:', locationId);
    console.log('Assignee ID:', assigneeId);
    console.log('\n');

    try {
        // Test 1: Try the tasks search endpoint with assignedTo filter
        console.log('TEST 1: Using /tasks/search endpoint with assignedTo parameter...');
        console.log('Endpoint:', 'https://services.leadconnectorhq.com/tasks/search');

        const searchParams = {
            locationId: locationId,
            assignedTo: assigneeId
        };

        console.log('Query params:', JSON.stringify(searchParams, null, 2));
        console.log('\n');

        const response1 = await axios.get(
            'https://services.leadconnectorhq.com/tasks/search',
            {
                params: searchParams,
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Version': '2021-07-28'
                }
            }
        );

        console.log('✅ SUCCESS! Tasks retrieved by assignee!\n');
        console.log('Total tasks found:', response1.data.tasks?.length || 0);
        console.log('\nResponse:', JSON.stringify(response1.data, null, 2));

        return response1.data;

    } catch (error1) {
        console.error('❌ TEST 1 FAILED\n');

        if (error1.response) {
            console.error('Status:', error1.response.status);
            console.error('Response:', JSON.stringify(error1.response.data, null, 2));
        } else {
            console.error('Error:', error1.message);
        }

        // Test 2: Try the general tasks endpoint with query parameter
        console.log('\n\nTEST 2: Using /tasks endpoint with assignedTo parameter...');

        try {
            console.log('Endpoint:', 'https://services.leadconnectorhq.com/tasks');

            const params2 = {
                locationId: locationId,
                assignedTo: assigneeId
            };

            console.log('Query params:', JSON.stringify(params2, null, 2));
            console.log('\n');

            const response2 = await axios.get(
                'https://services.leadconnectorhq.com/tasks',
                {
                    params: params2,
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Version': '2021-07-28'
                    }
                }
            );

            console.log('✅ SUCCESS! Tasks retrieved!\n');
            console.log('Total tasks found:', response2.data.tasks?.length || 0);
            console.log('\nResponse:', JSON.stringify(response2.data, null, 2));

            return response2.data;

        } catch (error2) {
            console.error('❌ TEST 2 ALSO FAILED\n');

            if (error2.response) {
                console.error('Status:', error2.response.status);
                console.error('Response:', JSON.stringify(error2.response.data, null, 2));
            } else {
                console.error('Error:', error2.message);
            }

            // Test 3: Try getting all tasks and check response structure
            console.log('\n\nTEST 3: Getting all tasks to understand response structure...');

            try {
                console.log('Endpoint:', 'https://services.leadconnectorhq.com/tasks');

                const params3 = {
                    locationId: locationId,
                    limit: 10 // Get just a few to inspect structure
                };

                console.log('Query params:', JSON.stringify(params3, null, 2));
                console.log('\n');

                const response3 = await axios.get(
                    'https://services.leadconnectorhq.com/tasks',
                    {
                        params: params3,
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Version': '2021-07-28'
                        }
                    }
                );

                console.log('✅ Retrieved sample tasks!\n');
                console.log('Total tasks found:', response3.data.tasks?.length || 0);
                console.log('\nSample Response:', JSON.stringify(response3.data, null, 2));

                // Try to filter manually
                if (response3.data.tasks && response3.data.tasks.length > 0) {
                    console.log('\n' + '='.repeat(60));
                    console.log('🔍 TASK STRUCTURE ANALYSIS:');
                    console.log('='.repeat(60));
                    console.log('Sample task object:', JSON.stringify(response3.data.tasks[0], null, 2));

                    const tasksWithAssignee = response3.data.tasks.filter(task =>
                        task.assignedTo === assigneeId
                    );

                    console.log('\nManually filtered tasks for assignee:', tasksWithAssignee.length);
                    if (tasksWithAssignee.length > 0) {
                        console.log('Matching tasks:', JSON.stringify(tasksWithAssignee, null, 2));
                    }
                }

                return response3.data;

            } catch (error3) {
                console.error('❌ TEST 3 ALSO FAILED\n');

                if (error3.response) {
                    console.error('Status:', error3.response.status);
                    console.error('Response:', JSON.stringify(error3.response.data, null, 2));
                } else {
                    console.error('Error:', error3.message);
                }

                console.log('\n' + '='.repeat(60));
                console.log('🔍 CONCLUSION:');
                console.log('='.repeat(60));
                console.log('Could not retrieve tasks by assignee.');
                console.log('Check GHL API documentation for correct endpoint and parameters.');
                console.log('='.repeat(60) + '\n');

                process.exit(1);
            }
        }
    }
}

console.log('='.repeat(60));
console.log('Testing Task Retrieval by Assignee');
console.log('='.repeat(60));
console.log('This will test different methods to retrieve tasks by assignee ID\n');

testGetTasksByAssignee();
