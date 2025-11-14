const axios = require('axios');
require('dotenv').config();

/**
 * Retrieve all tasks from GHL
 */
async function getAllTasks() {
    const apiKey = process.env.GHL_API_KEY;
    const locationId = process.env.GHL_LOCATION_ID;

    if (!apiKey) {
        console.error('Missing GHL_API_KEY in environment variables');
        process.exit(1);
    }

    if (!locationId) {
        console.error('Missing GHL_LOCATION_ID in environment variables');
        process.exit(1);
    }

    console.log('🔍 Retrieving all tasks from GHL...\n');
    console.log('Location ID:', locationId);
    console.log('\n');

    try {
        // Try the tasks search endpoint first
        console.log('TEST 1: Trying /tasks/search endpoint...');
        console.log('Endpoint: https://services.leadconnectorhq.com/tasks/search');

        const params = {
            locationId: locationId
        };

        console.log('Query params:', JSON.stringify(params, null, 2));
        console.log('\n');

        let response;

        try {
            response = await axios.get(
                'https://services.leadconnectorhq.com/tasks/search',
                {
                    params: {
                        locationId: locationId,
                        isLocation: true
                    },
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Version': '2021-07-28'
                    }
                }
            );
            console.log('✅ SUCCESS with /tasks/search!\n');
        } catch (error1) {
            console.log(`❌ /tasks/search failed (${error1.response?.status}), trying /locations/{locationId}/tasks...\n`);

            try {
                response = await axios.get(
                    `https://services.leadconnectorhq.com/locations/${locationId}/tasks`,
                    {
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Version': '2021-07-28'
                        }
                    }
                );
                console.log('✅ SUCCESS with /locations/{locationId}/tasks!\n');
            } catch (error2) {
                console.log(`❌ /locations/{locationId}/tasks also failed (${error2.response?.status})\n`);
                console.log('Trying /contacts/{contactId}/tasks with a sample contact...\n');

                // This will fail but let's see the error
                throw error2;
            }
        }

        console.log('Total tasks found:', response.data.tasks?.length || 0);
        console.log('\nFull Response:', JSON.stringify(response.data, null, 2));

        // Show task details if available
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
            });

            // Collect unique assignee IDs
            const assignees = [...new Set(
                response.data.tasks
                    .map(task => task.assignedTo)
                    .filter(assignee => assignee)
            )];

            console.log('\n' + '='.repeat(60));
            console.log('UNIQUE ASSIGNEES:');
            console.log('='.repeat(60));
            assignees.forEach(assignee => {
                const count = response.data.tasks.filter(task => task.assignedTo === assignee).length;
                console.log(`  ${assignee}: ${count} task(s)`);
            });
            console.log('\n');

            // Suggest testing with first assignee
            if (assignees.length > 0) {
                console.log('💡 To test filtering by assignee, run:');
                console.log(`   node scripts/test-get-tasks-by-assignee.js ${assignees[0]}`);
            }
        }

        return response.data;

    } catch (error) {
        console.error('❌ FAILED to retrieve tasks\n');

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
console.log('Retrieving All Tasks from GHL');
console.log('='.repeat(60));
console.log('\n');

getAllTasks();
