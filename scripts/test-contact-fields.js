const axios = require('axios');
require('dotenv').config();

/**
 * Test script to retrieve a contact and inspect all available fields
 * This will help us see if there are appointment-related fields like:
 * - appointments
 * - has_appointment
 * - upcoming_appointments
 * - calendar-related fields
 */
async function testContactFields() {
    const apiKey = process.env.GHL_API_KEY;
    const locationId = process.env.GHL_LOCATION_ID;

    if (!apiKey || !locationId) {
        console.error('❌ Missing required environment variables: GHL_API_KEY or GHL_LOCATION_ID');
        process.exit(1);
    }

    console.log('🔍 Testing Contact Fields for Appointment Data...\n');

    try {
        // First, get a sample contact
        console.log('📋 Step 1: Getting sample contact...');
        const searchResponse = await axios.get(
            'https://services.leadconnectorhq.com/contacts/',
            {
                params: {
                    locationId: locationId,
                    limit: 1
                },
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Version': '2021-07-28'
                }
            }
        );

        if (!searchResponse.data.contacts || searchResponse.data.contacts.length === 0) {
            console.log('❌ No contacts found in this location');
            process.exit(1);
        }

        const contactId = searchResponse.data.contacts[0].id;
        console.log(`✅ Found contact: ${contactId}\n`);

        // Now get the full contact details
        console.log('📋 Step 2: Retrieving full contact details...');
        const contactResponse = await axios.get(
            `https://services.leadconnectorhq.com/contacts/${contactId}`,
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Version': '2021-07-28'
                }
            }
        );

        console.log('✅ Contact retrieved successfully!\n');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('FULL CONTACT DATA:');
        console.log('═══════════════════════════════════════════════════════════');
        console.log(JSON.stringify(contactResponse.data, null, 2));
        console.log('═══════════════════════════════════════════════════════════\n');

        // Check for appointment-related fields
        const contact = contactResponse.data.contact || contactResponse.data;
        const appointmentFields = [];

        console.log('🔍 Checking for appointment-related fields...\n');

        const fieldsToCheck = [
            'appointments',
            'appointment',
            'has_appointment',
            'hasAppointment',
            'upcoming_appointments',
            'upcomingAppointments',
            'calendar',
            'calendars',
            'calendar_events',
            'calendarEvents',
            'scheduled_appointments',
            'scheduledAppointments',
            'appointment_count',
            'appointmentCount'
        ];

        fieldsToCheck.forEach(field => {
            if (contact.hasOwnProperty(field)) {
                appointmentFields.push(field);
                console.log(`✅ Found field: "${field}"`);
                console.log(`   Value:`, JSON.stringify(contact[field], null, 2));
                console.log('');
            }
        });

        if (appointmentFields.length === 0) {
            console.log('❌ No appointment-related fields found in contact object');
            console.log('');
            console.log('📝 Available top-level fields:');
            console.log(Object.keys(contact).sort().join(', '));
        } else {
            console.log(`\n✅ Found ${appointmentFields.length} appointment-related field(s):`);
            console.log(appointmentFields.join(', '));
        }

        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('CONCLUSION:');
        console.log('═══════════════════════════════════════════════════════════');
        if (appointmentFields.length > 0) {
            console.log('✅ Contact endpoint DOES include appointment data');
            console.log(`   Fields available: ${appointmentFields.join(', ')}`);
        } else {
            console.log('❌ Contact endpoint does NOT include appointment data');
            console.log('   You will need to use the calendar/appointments endpoint separately');
        }
        console.log('═══════════════════════════════════════════════════════════');

    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Headers:', error.response.headers);
        }
        process.exit(1);
    }
}

testContactFields();
