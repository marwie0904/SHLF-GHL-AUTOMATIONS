const axios = require('axios');
require('dotenv').config();

/**
 * Get all tasks assigned to a specific user
 */
async function getUserTasks() {
    const apiKey = process.env.GHL_API_KEY;
    const locationId = process.env.GHL_LOCATION_ID;
    const userId = process.argv[2] || 'oDGoJrCn86uTwMVj8RKS';

    if (!apiKey || !locationId) {
        console.error('Missing required environment variables');
        process.exit(1);
    }

    console.log('🔍 Getting tasks for user:', userId);
    console.log('Location ID:', locationId);
    console.log('\n');

    try {
        // Try different endpoints to get tasks by assignee
        let response;
        let endpoint;

        try {
            console.log('TEST 1: Trying /tasks/search with assignedTo parameter...\n');
            endpoint = 'https://services.leadconnectorhq.com/tasks/search';
            response = await axios.get(endpoint, {
                params: {
                    locationId: locationId,
                    assignedTo: userId
                },
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Version': '2021-07-28'
                }
            });
            console.log('✅ SUCCESS with /tasks/search!\n');
        } catch (error1) {
            console.log(`❌ /tasks/search failed (${error1.response?.status})`);

            try {
                console.log('TEST 2: Trying /tasks with assignedTo parameter...\n');
                endpoint = 'https://services.leadconnectorhq.com/tasks';
                response = await axios.get(endpoint, {
                    params: {
                        locationId: locationId,
                        assignedTo: userId
                    },
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Version': '2021-07-28'
                    }
                });
                console.log('✅ SUCCESS with /tasks!\n');
            } catch (error2) {
                console.log(`❌ /tasks failed (${error2.response?.status})`);

                try {
                    console.log('TEST 3: Trying /users/{userId}/tasks...\n');
                    endpoint = `https://services.leadconnectorhq.com/users/${userId}/tasks`;
                    response = await axios.get(endpoint, {
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Version': '2021-07-28'
                        }
                    });
                    console.log('✅ SUCCESS with /users/{userId}/tasks!\n');
                } catch (error3) {
                    console.log(`❌ /users/{userId}/tasks failed (${error3.response?.status})`);
                    console.log('\n' + '='.repeat(60));
                    console.log('❌ CONCLUSION: None of the tested endpoints work');
                    console.log('='.repeat(60));
                    console.log('GHL API may not support getting tasks by assignee directly.');
                    console.log('You may need to:');
                    console.log('1. Get all contacts and their tasks, then filter by assignee');
                    console.log('2. Use a different approach in the GHL interface');
                    console.log('='.repeat(60));

                    if (error3.response) {
                        console.log('\nLast error details:');
                        console.log('Status:', error3.response.status);
                        console.log('Response:', JSON.stringify(error3.response.data, null, 2));
                    }
                    process.exit(1);
                }
            }
        }

        console.log('Total tasks found:', response.data.tasks?.length || 0);
        console.log('\nFull Response:', JSON.stringify(response.data, null, 2));

        if (response.data.tasks && response.data.tasks.length > 0) {
            console.log('\n' + '='.repeat(60));
            console.log('TASK DETAILS:');
            console.log('='.repeat(60));

            response.data.tasks.forEach((task, index) => {
                console.log(`\nTask ${index + 1}:`);
                console.log(`  ID: ${task.id}`);
                console.log(`  Title: ${task.title}`);
                console.log(`  Assigned To: ${task.assignedTo || 'Not assigned'}`);
                console.log(`  Contact ID: ${task.contactId || 'No contact'}`);
                console.log(`  Status: ${task.completed ? 'Completed' : 'Open'}`);
                console.log(`  Due Date: ${task.dueDate || 'No due date'}`);
                console.log(`  Body: ${task.body || 'No description'}`);
            });

            console.log('\n' + '='.repeat(60));
            console.log('✅ SUCCESS!');
            console.log('='.repeat(60));
            console.log(`Endpoint that worked: ${endpoint}`);
            console.log(`Parameter used: assignedTo=${userId}`);
            console.log('='.repeat(60));
        } else {
            console.log('\n⚠️  No tasks found for this user');
            console.log('This could mean:');
            console.log('- The user has no tasks assigned');
            console.log('- All tasks are completed');
            console.log('- The endpoint works but this user ID has no tasks');
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
console.log('Getting Tasks by User/Assignee');
console.log('='.repeat(60));
console.log('\n');

getUserTasks();
