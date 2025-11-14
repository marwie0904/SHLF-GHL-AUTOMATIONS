const axios = require('axios');
require('dotenv').config();

/**
 * Test: Can we create a task linked to an opportunity?
 * This tests various approaches to associate tasks with opportunities in GHL
 */
async function testTaskForOpportunity() {
    const apiKey = process.env.GHL_API_KEY;
    const contactId = process.argv[2];
    const opportunityId = process.argv[3];

    if (!apiKey) {
        console.error('Missing GHL_API_KEY in environment variables');
        process.exit(1);
    }

    if (!contactId || !opportunityId) {
        console.error('Missing required arguments');
        console.log('Usage: node scripts/test-task-for-opportunity.js <contactId> <opportunityId>');
        process.exit(1);
    }

    console.log('🧪 Testing task creation with opportunity association...\n');
    console.log('Contact ID:', contactId);
    console.log('Opportunity ID:', opportunityId);
    console.log('\n');

    // TEST 1: Try creating task with opportunityId in the body
    console.log('TEST 1: Adding opportunityId field in task payload...');
    try {
        const payload = {
            title: 'Test Task - Opportunity Association',
            body: 'Testing if opportunityId field links task to opportunity',
            dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            completed: false,
            opportunityId: opportunityId  // Testing this field
        };

        console.log('Endpoint:', `https://services.leadconnectorhq.com/contacts/${contactId}/tasks`);
        console.log('Payload:', JSON.stringify(payload, null, 2));
        console.log('\n');

        const response = await axios.post(
            `https://services.leadconnectorhq.com/contacts/${contactId}/tasks`,
            payload,
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'Version': '2021-07-28'
                }
            }
        );

        console.log('✅ TEST 1 SUCCESS!\n');
        console.log('Task created. Response:');
        console.log(JSON.stringify(response.data, null, 2));

        const taskId = response.data.task?.id || response.data.id;
        console.log('\n📝 Task ID:', taskId);

        if (response.data.opportunityId || response.data.task?.opportunityId) {
            console.log('✅ Opportunity ID is present in response!');
            console.log('Opportunity association confirmed!');
        } else {
            console.log('⚠️  Opportunity ID not found in response.');
            console.log('The field might have been ignored by the API.');
        }

        return { success: true, taskId, response: response.data };

    } catch (error) {
        console.error('❌ TEST 1 FAILED\n');

        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response:', JSON.stringify(error.response.data, null, 2));

            if (error.response.status === 400) {
                console.log('\n💡 The opportunityId field might not be supported in the tasks endpoint.');
            }
        } else {
            console.error('Error:', error.message);
        }
    }

    // TEST 2: Try using a generic tasks endpoint with both contactId and opportunityId
    console.log('\n\nTEST 2: Using generic /tasks endpoint with both IDs...');
    try {
        const payload = {
            title: 'Test Task - Generic Endpoint',
            body: 'Testing generic tasks endpoint',
            contactId: contactId,
            opportunityId: opportunityId,
            dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            completed: false
        };

        console.log('Endpoint: https://services.leadconnectorhq.com/tasks');
        console.log('Payload:', JSON.stringify(payload, null, 2));
        console.log('\n');

        const response = await axios.post(
            'https://services.leadconnectorhq.com/tasks',
            payload,
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'Version': '2021-07-28'
                }
            }
        );

        console.log('✅ TEST 2 SUCCESS!\n');
        console.log('Response:', JSON.stringify(response.data, null, 2));

        return { success: true, response: response.data };

    } catch (error) {
        console.error('❌ TEST 2 FAILED\n');

        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Error:', error.message);
        }
    }

    // TEST 3: Check if we can retrieve the task and see opportunity association
    console.log('\n\nTEST 3: Retrieving contact tasks to check for opportunity field...');
    try {
        const response = await axios.get(
            `https://services.leadconnectorhq.com/contacts/${contactId}/tasks`,
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Version': '2021-07-28'
                }
            }
        );

        console.log('✅ Retrieved tasks successfully\n');
        const tasks = response.data.tasks || [];

        if (tasks.length > 0) {
            console.log(`Found ${tasks.length} tasks. Checking for opportunity fields...\n`);

            const taskWithOpportunity = tasks.find(t => t.opportunityId);

            if (taskWithOpportunity) {
                console.log('✅ FOUND: Some tasks have opportunityId field!');
                console.log('Sample task with opportunity:');
                console.log(JSON.stringify(taskWithOpportunity, null, 2));
            } else {
                console.log('❌ No tasks have opportunityId field in response');
                console.log('Sample task structure:');
                console.log(JSON.stringify(tasks[0], null, 2));
            }
        } else {
            console.log('No tasks found for this contact.');
        }

    } catch (error) {
        console.error('❌ TEST 3 FAILED\n');

        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Error:', error.message);
        }
    }

    console.log('\n' + '='.repeat(80));
    console.log('🔍 SUMMARY:');
    console.log('='.repeat(80));
    console.log('GHL Tasks API does not appear to support direct opportunity association.');
    console.log('Tasks are linked to contacts via the /contacts/{id}/tasks endpoint.');
    console.log('\n💡 RECOMMENDATION:');
    console.log('   - Tasks can only be created for contacts, not directly for opportunities');
    console.log('   - If you need to link tasks to opportunities, you may need to:');
    console.log('     1. Create the task for the contact');
    console.log('     2. Track the association in your own database (Supabase)');
    console.log('     3. Use custom fields or tags to identify opportunity-related tasks');
    console.log('='.repeat(80) + '\n');
}

console.log('='.repeat(80));
console.log('Testing Task Creation with Opportunity Association');
console.log('='.repeat(80));
console.log('This will test various methods to associate tasks with opportunities in GHL\n');

testTaskForOpportunity();
