const axios = require('axios');

/**
 * Test script to simulate GHL task creation webhook
 */
async function testTaskWebhook() {
    const webhookUrl = 'http://localhost:3000/webhooks/ghl/task-created';

    // Sample task data that GHL would send
    const sampleTaskData = {
        id: 'test-task-123456',
        title: 'Test Task from Webhook',
        body: 'This is a test task description to verify webhook is working',
        contactId: 'test-contact-789',
        assignedTo: 'test-user-456',
        dueDate: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 2 days from now
        completed: false,
        dateAdded: new Date().toISOString()
    };

    console.log('🧪 Testing Task Creation Webhook...\n');
    console.log('Webhook URL:', webhookUrl);
    console.log('Sample Data:', JSON.stringify(sampleTaskData, null, 2));
    console.log('\n');

    try {
        const response = await axios.post(webhookUrl, sampleTaskData, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ SUCCESS!\n');
        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(response.data, null, 2));

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
console.log('Task Webhook Test');
console.log('='.repeat(60));
console.log('Make sure your server is running on http://localhost:3000');
console.log('='.repeat(60) + '\n');

testTaskWebhook();
