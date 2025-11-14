const axios = require('axios');
require('dotenv').config();

/**
 * Creates an association type between tasks and custom objects in GHL
 * This is an experimental script to test if task associations can be created
 */
async function createTaskCustomObjectAssociation() {
    const apiKey = process.env.GHL_API_KEY;
    const locationId = process.env.GHL_LOCATION_ID;

    if (!apiKey || !locationId) {
        console.error('Missing required environment variables: GHL_API_KEY and GHL_LOCATION_ID');
        process.exit(1);
    }

    // Get custom object key from user
    const customObjectKey = process.argv[2] || 'custom_objects.workshops';

    console.log('🧪 EXPERIMENTAL: Attempting to create task-custom-object association type in GHL...\n');
    console.log('Custom Object Key:', customObjectKey);
    console.log('Location ID:', locationId);
    console.log('\n');

    try {
        const response = await axios.post(
            'https://services.leadconnectorhq.com/associations/',
            {
                locationId: locationId,
                key: 'task_custom_object',
                firstObjectLabel: 'Task',
                firstObjectKey: 'task',  // ← Testing if 'task' is a valid object key
                secondObjectLabel: 'Custom Object',
                secondObjectKey: customObjectKey
            },
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'Version': '2021-07-28'
                }
            }
        );

        console.log('✅ Association created successfully!\n');
        console.log('Full Response:');
        console.log(JSON.stringify(response.data, null, 2));
        console.log('\n' + '='.repeat(60));
        console.log('⚠️  IMPORTANT: Add this to your .env file:');
        console.log('='.repeat(60));
        console.log(`GHL_TASK_ASSOCIATION_ID=${response.data.id}`);
        console.log('='.repeat(60) + '\n');

        return response.data;
    } catch (error) {
        console.error('❌ Error creating association:');

        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response:', JSON.stringify(error.response.data, null, 2));

            // Analyze the error
            if (error.response.status === 400) {
                console.log('\n💡 Possible reasons:');
                console.log('   - "task" might not be a valid objectKey');
                console.log('   - Tasks might use a different object key (try: "tasks", "task_item", etc.)');
                console.log('   - Task associations might be system-managed only');
                console.log('   - Feature might not be available yet via API');
            } else if (error.response.status === 409) {
                console.log('\n💡 The association might already exist. Try fetching existing associations.');
                console.log('Run: node scripts/get-associations.js');
            }
        } else {
            console.error('Error:', error.message);
        }

        process.exit(1);
    }
}

// Run the script
console.log('='.repeat(60));
console.log('Testing Task-to-Custom-Object Association Creation');
console.log('='.repeat(60));
console.log('Usage: node scripts/create-task-association.js [customObjectKey]');
console.log('Example: node scripts/create-task-association.js custom_objects.workshops');
console.log('='.repeat(60) + '\n');

createTaskCustomObjectAssociation();
