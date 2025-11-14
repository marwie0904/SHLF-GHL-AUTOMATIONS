const axios = require('axios');

/**
 * Test script to verify production webhook endpoint
 */
async function testProductionWebhook() {
    const webhookUrl = 'https://shlf-ghl-automations-zsl6v.ondigitalocean.app/webhooks/ghl/task-created';

    // Sample task data simulating GHL webhook
    const sampleTaskData = {
        id: `test-prod-${Date.now()}`,
        title: 'Production Webhook Test Task',
        body: 'This is a test to verify the production webhook is working correctly',
        contactId: 'test-contact-prod-123',
        assignedTo: 'test-user-prod-456',
        dueDate: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        completed: false,
        dateAdded: new Date().toISOString(),
        locationId: process.env.GHL_LOCATION_ID
    };

    console.log('🧪 Testing Production Webhook Endpoint...\n');
    console.log('Webhook URL:', webhookUrl);
    console.log('Timestamp:', new Date().toISOString());
    console.log('\nSample Data:', JSON.stringify(sampleTaskData, null, 2));
    console.log('\n');

    try {
        // First, test health endpoint
        console.log('Step 1: Testing server health...');
        const healthResponse = await axios.get('https://shlf-ghl-automations-zsl6v.ondigitalocean.app/health');
        console.log('✅ Server is healthy:', healthResponse.data);
        console.log('\n');

        // Test webhook endpoint
        console.log('Step 2: Testing task webhook endpoint...');
        const response = await axios.post(webhookUrl, sampleTaskData, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });

        console.log('✅ WEBHOOK TEST SUCCESSFUL!\n');
        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(response.data, null, 2));
        console.log('\n' + '='.repeat(60));
        console.log('✅ Production webhook is working correctly!');
        console.log('='.repeat(60));
        console.log('\nNext steps:');
        console.log('1. Check Supabase tasks table for the test task');
        console.log('2. Configure the webhook in GHL');
        console.log('3. Create a real task in GHL to test end-to-end\n');

    } catch (error) {
        console.error('❌ WEBHOOK TEST FAILED\n');

        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response:', JSON.stringify(error.response.data, null, 2));

            if (error.response.status === 500) {
                console.log('\n💡 Possible issues:');
                console.log('   - Supabase table might not exist (run migration first)');
                console.log('   - Environment variables might be missing');
                console.log('   - Check server logs for detailed error');
            }
        } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
            console.error('\n💡 Server connection failed:');
            console.error('   - Server might be down');
            console.error('   - URL might be incorrect');
            console.error('   - Check DigitalOcean deployment status');
        } else {
            console.error('Error:', error.message);
        }

        console.log('\n📝 Troubleshooting:');
        console.log('1. Verify server is running on DigitalOcean');
        console.log('2. Check if Supabase migration was run');
        console.log('3. Verify environment variables are set');
        console.log('4. Check server logs: pm2 logs\n');

        process.exit(1);
    }
}

console.log('='.repeat(60));
console.log('Production Webhook Test');
console.log('='.repeat(60));
console.log('Target: https://shlf-ghl-automations-zsl6v.ondigitalocean.app');
console.log('='.repeat(60) + '\n');

testProductionWebhook();
