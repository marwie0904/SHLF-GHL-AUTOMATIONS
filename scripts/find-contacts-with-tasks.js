const axios = require('axios');
require('dotenv').config();

/**
 * Find contacts that have tasks assigned
 */
async function findContactsWithTasks() {
    const apiKey = process.env.GHL_API_KEY;
    const locationId = process.env.GHL_LOCATION_ID;

    if (!apiKey || !locationId) {
        console.error('Missing required environment variables');
        process.exit(1);
    }

    console.log('🔍 Searching for contacts with tasks...\n');

    try {
        // Get all contacts (or at least a good sample)
        const response = await axios.get(
            'https://services.leadconnectorhq.com/contacts/',
            {
                params: {
                    locationId: locationId,
                    limit: 100
                },
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Version': '2021-07-28'
                }
            }
        );

        console.log(`Found ${response.data.contacts?.length || 0} contacts, checking for tasks...\n`);

        const contactsWithTasks = [];

        // Check each contact for tasks
        for (const contact of response.data.contacts || []) {
            try {
                const tasksResponse = await axios.get(
                    `https://services.leadconnectorhq.com/contacts/${contact.id}/tasks`,
                    {
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Version': '2021-07-28'
                        }
                    }
                );

                if (tasksResponse.data.tasks && tasksResponse.data.tasks.length > 0) {
                    console.log(`✅ ${contact.firstName} ${contact.lastName} (${contact.id}): ${tasksResponse.data.tasks.length} task(s)`);
                    contactsWithTasks.push({
                        contactId: contact.id,
                        contactName: `${contact.firstName} ${contact.lastName}`,
                        taskCount: tasksResponse.data.tasks.length,
                        tasks: tasksResponse.data.tasks
                    });
                }
            } catch (taskError) {
                // Skip contacts with errors
                console.log(`⚠️  ${contact.firstName} ${contact.lastName}: Error checking tasks`);
            }

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.log('\n' + '='.repeat(60));
        console.log('SUMMARY');
        console.log('='.repeat(60));
        console.log(`Total contacts checked: ${response.data.contacts?.length || 0}`);
        console.log(`Contacts with tasks: ${contactsWithTasks.length}`);

        if (contactsWithTasks.length > 0) {
            console.log('\n' + '='.repeat(60));
            console.log('ALL TASKS FOUND:');
            console.log('='.repeat(60));

            const allTasks = [];
            const assignees = new Set();

            contactsWithTasks.forEach(contact => {
                contact.tasks.forEach(task => {
                    allTasks.push({
                        ...task,
                        contactName: contact.contactName
                    });
                    if (task.assignedTo) {
                        assignees.add(task.assignedTo);
                    }
                });
            });

            allTasks.forEach((task, index) => {
                console.log(`\nTask ${index + 1}:`);
                console.log(`  ID: ${task.id}`);
                console.log(`  Title: ${task.title}`);
                console.log(`  Contact: ${task.contactName} (${task.contactId})`);
                console.log(`  Assigned To: ${task.assignedTo || 'Not assigned'}`);
                console.log(`  Status: ${task.completed ? 'Completed' : 'Open'}`);
                console.log(`  Due Date: ${task.dueDate || 'No due date'}`);
            });

            if (assignees.size > 0) {
                console.log('\n' + '='.repeat(60));
                console.log('UNIQUE ASSIGNEES:');
                console.log('='.repeat(60));
                Array.from(assignees).forEach(assignee => {
                    const count = allTasks.filter(task => task.assignedTo === assignee).length;
                    console.log(`  ${assignee}: ${count} task(s)`);
                });

                console.log('\n💡 To test filtering by assignee, use:');
                console.log(`   Assignee ID: ${Array.from(assignees)[0]}`);
                console.log(`   node scripts/test-get-tasks-by-assignee.js ${Array.from(assignees)[0]}`);
            }
        } else {
            console.log('\n⚠️  No tasks found in any contacts');
        }

    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
        process.exit(1);
    }
}

console.log('='.repeat(60));
console.log('Finding Contacts with Tasks');
console.log('='.repeat(60));
console.log('\n');

findContactsWithTasks();
