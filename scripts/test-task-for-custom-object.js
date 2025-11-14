const axios = require('axios');
require('dotenv').config();

/**
 * Test: Can we create a task for a custom object instead of a contact?
 * Testing if the task API accepts custom object IDs in place of contactId
 */
async function testTaskForCustomObject() {
    const apiKey = process.env.GHL_API_KEY;
    const customObjectRecordId = process.argv[2];

    if (!apiKey) {
        console.error('Missing GHL_API_KEY in environment variables');
        process.exit(1);
    }

    if (!customObjectRecordId) {
        console.error('Missing custom object record ID');
        console.log('Usage: node scripts/test-task-for-custom-object.js <customObjectRecordId>');
        process.exit(1);
    }

    console.log('🧪 EXPERIMENTAL: Testing task creation for custom object...\n');
    console.log('Custom Object Record ID:', customObjectRecordId);
    console.log('\n');

    try {
        // Test 1: Try using custom object ID in the contact endpoint path
        console.log('TEST 1: Using custom object ID in /contacts/{id}/tasks endpoint...');

        const payload = {
            title: 'Test Task for Custom Object',
            body: 'Testing if tasks can be created for custom objects',
            dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
            completed: false
        };

        console.log('Payload:', JSON.stringify(payload, null, 2));
        console.log('Endpoint:', `https://services.leadconnectorhq.com/contacts/${customObjectRecordId}/tasks`);
        console.log('\n');

        const response = await axios.post(
            `https://services.leadconnectorhq.com/contacts/${customObjectRecordId}/tasks`,
            payload,
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'Version': '2021-07-28'
                }
            }
        );

        console.log('✅ SUCCESS! Task created for custom object!\n');
        console.log('Response:', JSON.stringify(response.data, null, 2));
        return response.data;

    } catch (error) {
        console.error('❌ TEST 1 FAILED\n');

        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Error:', error.message);
        }

        // Test 2: Try a generic tasks endpoint if it exists
        console.log('\n\nTEST 2: Trying alternative endpoint with contactId in body...');

        try {
            const payload2 = {
                title: 'Test Task for Custom Object',
                body: 'Testing alternative approach',
                contactId: customObjectRecordId, // Try putting custom object ID here
                dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                completed: false
            };

            console.log('Payload:', JSON.stringify(payload2, null, 2));
            console.log('Endpoint: https://services.leadconnectorhq.com/tasks');
            console.log('\n');

            const response2 = await axios.post(
                'https://services.leadconnectorhq.com/tasks',
                payload2,
                {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                        'Version': '2021-07-28'
                    }
                }
            );

            console.log('✅ SUCCESS! Task created with alternative endpoint!\n');
            console.log('Response:', JSON.stringify(response2.data, null, 2));
            return response2.data;

        } catch (error2) {
            console.error('❌ TEST 2 ALSO FAILED\n');

            if (error2.response) {
                console.error('Status:', error2.response.status);
                console.error('Response:', JSON.stringify(error2.response.data, null, 2));
            } else {
                console.error('Error:', error2.message);
            }

            console.log('\n' + '='.repeat(60));
            console.log('🔍 CONCLUSION:');
            console.log('='.repeat(60));
            console.log('Tasks cannot be created directly for custom objects via API.');
            console.log('Tasks require a valid contactId in the endpoint path.');
            console.log('='.repeat(60) + '\n');

            process.exit(1);
        }
    }
}

console.log('='.repeat(60));
console.log('Testing Task Creation for Custom Objects');
console.log('='.repeat(60));
console.log('This will test if GHL allows tasks for custom objects\n');

testTaskForCustomObject();
