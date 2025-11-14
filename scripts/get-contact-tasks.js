const axios = require('axios');
require('dotenv').config();

/**
 * Get all tasks for a contact
 */
async function getContactTasks() {
    const apiKey = process.env.GHL_API_KEY;
    const contactId = process.argv[2] || '1TonMenNh0ILECoI63r3';

    if (!apiKey) {
        console.error('Missing GHL_API_KEY');
        process.exit(1);
    }

    console.log('🔍 Getting tasks for contact:', contactId);
    console.log('\n');

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

        console.log('✅ SUCCESS! Retrieved tasks!\n');
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
                console.log(`  Body: ${task.body || 'No description'}`);
            });

            // Collect unique assignee IDs
            const assignees = [...new Set(
                response.data.tasks
                    .map(task => task.assignedTo)
                    .filter(assignee => assignee)
            )];

            if (assignees.length > 0) {
                console.log('\n' + '='.repeat(60));
                console.log('UNIQUE ASSIGNEES IN THESE TASKS:');
                console.log('='.repeat(60));
                assignees.forEach(assignee => {
                    const count = response.data.tasks.filter(task => task.assignedTo === assignee).length;
                    console.log(`  ${assignee}: ${count} task(s)`);
                });
                console.log('\n');

                // Return first assignee and task info for testing
                return {
                    sampleAssignee: assignees[0],
                    sampleTaskId: response.data.tasks.find(t => t.assignedTo === assignees[0])?.id,
                    totalTasks: response.data.tasks.length
                };
            }
        } else {
            console.log('\n⚠️  No tasks found for this contact');
        }

        return null;

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
console.log('Getting Tasks for Contact');
console.log('='.repeat(60));
console.log('\n');

getContactTasks();
