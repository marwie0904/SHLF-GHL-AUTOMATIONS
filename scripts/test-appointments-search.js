const axios = require('axios');
require('dotenv').config();

/**
 * Test script to search for appointments by contact ID
 * Testing various parameter combinations to see what works
 */
async function testAppointmentsSearch() {
    const apiKey = process.env.GHL_API_KEY;
    const locationId = process.env.GHL_LOCATION_ID;
    const contactId = 'IPbwCYvc2IsoD5tvjk7E';

    if (!apiKey || !locationId) {
        console.error('❌ Missing required environment variables: GHL_API_KEY or GHL_LOCATION_ID');
        process.exit(1);
    }

    console.log('🔍 Testing Appointments Search by Contact ID...\n');
    console.log(`Contact ID: ${contactId}\n`);
    console.log('═══════════════════════════════════════════════════════════\n');

    // Test 1: Try calendar events endpoint with contact_id parameter
    console.log('📋 TEST 1: GET /calendars/events with contact_id parameter');
    console.log('───────────────────────────────────────────────────────────');
    try {
        const response1 = await axios.get(
            'https://services.leadconnectorhq.com/calendars/events',
            {
                params: {
                    locationId: locationId,
                    contact_id: contactId
                },
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Version': '2021-07-28'
                }
            }
        );

        console.log('✅ SUCCESS!');
        console.log('Response:', JSON.stringify(response1.data, null, 2));
        console.log(`Found ${response1.data.events?.length || 0} events\n`);
    } catch (error) {
        console.log('❌ FAILED');
        console.log('Error:', error.response?.data || error.message);
        console.log('Status:', error.response?.status);
        console.log('');
    }

    // Test 2: Try with contactId (camelCase)
    console.log('📋 TEST 2: GET /calendars/events with contactId parameter');
    console.log('───────────────────────────────────────────────────────────');
    try {
        const response2 = await axios.get(
            'https://services.leadconnectorhq.com/calendars/events',
            {
                params: {
                    locationId: locationId,
                    contactId: contactId
                },
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Version': '2021-07-28'
                }
            }
        );

        console.log('✅ SUCCESS!');
        console.log('Response:', JSON.stringify(response2.data, null, 2));
        console.log(`Found ${response2.data.events?.length || 0} events\n`);
    } catch (error) {
        console.log('❌ FAILED');
        console.log('Error:', error.response?.data || error.message);
        console.log('Status:', error.response?.status);
        console.log('');
    }

    // Test 3: Try getting all events and filtering manually
    console.log('📋 TEST 3: GET /calendars/events (all events) - manual filter');
    console.log('───────────────────────────────────────────────────────────');
    try {
        const now = new Date();
        const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
        const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days ahead

        const response3 = await axios.get(
            'https://services.leadconnectorhq.com/calendars/events',
            {
                params: {
                    locationId: locationId,
                    startTime: startDate.toISOString(),
                    endTime: endDate.toISOString()
                },
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Version': '2021-07-28'
                }
            }
        );

        console.log('✅ SUCCESS - Retrieved all events');
        console.log(`Total events retrieved: ${response3.data.events?.length || 0}`);

        // Filter by contactId manually
        if (response3.data.events && response3.data.events.length > 0) {
            const contactEvents = response3.data.events.filter(event =>
                event.contactId === contactId ||
                event.contact_id === contactId
            );

            console.log(`Events for contact ${contactId}: ${contactEvents.length}`);

            if (contactEvents.length > 0) {
                console.log('\n📅 Contact Appointments:');
                console.log(JSON.stringify(contactEvents, null, 2));
            } else {
                console.log('No appointments found for this contact');

                // Show sample event structure
                console.log('\n📝 Sample event structure (first event):');
                console.log(JSON.stringify(response3.data.events[0], null, 2));
            }
        } else {
            console.log('No events found in the date range');
        }
        console.log('');
    } catch (error) {
        console.log('❌ FAILED');
        console.log('Error:', error.response?.data || error.message);
        console.log('Status:', error.response?.status);
        console.log('');
    }

    // Test 4: Try appointments endpoint with search
    console.log('📋 TEST 4: GET /calendars/appointments with contact_id');
    console.log('───────────────────────────────────────────────────────────');
    try {
        const response4 = await axios.get(
            'https://services.leadconnectorhq.com/calendars/appointments',
            {
                params: {
                    locationId: locationId,
                    contact_id: contactId
                },
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Version': '2021-07-28'
                }
            }
        );

        console.log('✅ SUCCESS!');
        console.log('Response:', JSON.stringify(response4.data, null, 2));
        console.log('');
    } catch (error) {
        console.log('❌ FAILED');
        console.log('Error:', error.response?.data || error.message);
        console.log('Status:', error.response?.status);
        console.log('');
    }

    // Test 5: Try contact appointments endpoint
    console.log('📋 TEST 5: GET /contacts/{contactId}/appointments');
    console.log('───────────────────────────────────────────────────────────');
    try {
        const response5 = await axios.get(
            `https://services.leadconnectorhq.com/contacts/${contactId}/appointments`,
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Version': '2021-07-28'
                }
            }
        );

        console.log('✅ SUCCESS!');
        console.log('Response:', JSON.stringify(response5.data, null, 2));
        console.log('');
    } catch (error) {
        console.log('❌ FAILED');
        console.log('Error:', error.response?.data || error.message);
        console.log('Status:', error.response?.status);
        console.log('');
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log('TEST COMPLETE');
    console.log('═══════════════════════════════════════════════════════════');
}

testAppointmentsSearch();
