const axios = require('axios');
const { searchOpportunitiesByContact } = require('./ghlOpportunityService');
const { shouldSendConfirmationEmail, sendMeetingConfirmationEmail, shouldSendDiscoveryCallEmail, sendProbateDiscoveryCallEmail } = require('./appointmentEmailService');
const { getContact } = require('./ghlService');

/**
 * Appointment Service
 *
 * Handles GHL appointment operations including:
 * - Fetching form submissions
 * - Getting calendar details
 * - Updating appointment titles
 * - Moving opportunities to stages based on meeting type
 */

const BASE_URL = 'https://services.leadconnectorhq.com';

// Form ID for "Phone and Email" booking form
const APPOINTMENT_FORM_ID = 'GqeCjaSjT4CqyZuKWLIK';

// Form field IDs for "Phone and Email" booking form
const FORM_FIELDS = {
  MEETING_TYPE: '88Kn2yxnw7Xe6LNjHyQl',  // e.g., "EP Discovery Call"
  MEETING: 'VJRoVeTD3qyr8haFP2N0',        // e.g., "Naples"
  CALENDAR_NAME: 'calendar_name'           // e.g., "Gabby Ang's Personal Calendar"
};

// Meeting Type to Stage ID mapping
// Discovery calls → "Scheduled Discovery Call" stage
// Meetings → "Scheduled I/V" stage
const MEETING_TYPE_STAGE_MAP = {
  // Discovery Calls → Scheduled Discovery Call
  'EP Discovery Call': '12d9abab-c81b-4215-8b2a-020bc3fff912',
  'Deed Discovery Call': '12d9abab-c81b-4215-8b2a-020bc3fff912',
  'Probate Discovery Call': '12d9abab-c81b-4215-8b2a-020bc3fff912',
  // Meetings → Scheduled I/V
  'Trust Admin Meeting': '1648da87-eab3-491f-a51b-8d1646137550',
  'Initial Meeting': '1648da87-eab3-491f-a51b-8d1646137550',
  'Vision Meeting': '1648da87-eab3-491f-a51b-8d1646137550',
  'Doc Review Meeting': '1648da87-eab3-491f-a51b-8d1646137550',
  'Standalone Meeting': '1648da87-eab3-491f-a51b-8d1646137550',
};

/**
 * Gets common headers for GHL API requests
 */
function getHeaders() {
  const apiKey = process.env.GHL_API_KEY;
  if (!apiKey) {
    throw new Error('GHL_API_KEY not configured in environment variables');
  }

  return {
    'Authorization': `Bearer ${apiKey}`,
    'Version': '2021-07-28',
    'Content-Type': 'application/json'
  };
}

/**
 * Fetches form submission by phone or email
 * @param {string} formId - The form ID to search
 * @param {string} searchQuery - Phone number or email to search
 * @returns {Promise<Object|null>} Form submission data or null if not found
 */
async function getFormSubmission(formId, searchQuery) {
  const locationId = process.env.GHL_LOCATION_ID;

  if (!locationId) {
    throw new Error('GHL_LOCATION_ID not configured in environment variables');
  }

  if (!searchQuery) {
    console.log('⚠️ No search query provided for form submission lookup');
    return null;
  }

  // Clean the search query for phone numbers
  // - Remove + prefix (causes regex issues in GHL API)
  // - Remove spaces (phone might come as "+63 2 1319 4213")
  let cleanedQuery = searchQuery;
  if (searchQuery.match(/^[\+\d\s]+$/)) {
    // It looks like a phone number - clean it
    cleanedQuery = searchQuery.replace(/[\+\s]/g, '');
    console.log(`📞 Cleaned phone number: "${searchQuery}" -> "${cleanedQuery}"`);
  }

  try {
    console.log(`🔍 Searching form submissions for: ${cleanedQuery}`);

    const response = await axios.get(`${BASE_URL}/forms/submissions`, {
      params: {
        locationId: locationId,
        formId: formId,
        q: cleanedQuery,
        limit: 1
      },
      headers: getHeaders()
    });

    const submissions = response.data.submissions || [];

    if (submissions.length === 0) {
      console.log(`⚠️ No form submission found for query: ${searchQuery}`);
      return null;
    }

    console.log(`✅ Found form submission: ${submissions[0].id}`);
    return submissions[0];
  } catch (error) {
    console.error('❌ Error fetching form submission:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Extracts meeting data from form submission
 * @param {Object} submission - Form submission object
 * @returns {Object} Extracted meeting data
 */
function extractMeetingData(submission) {
  const others = submission.others || {};

  return {
    meetingType: others[FORM_FIELDS.MEETING_TYPE] || null,
    meeting: others[FORM_FIELDS.MEETING] || null,
    calendarName: others[FORM_FIELDS.CALENDAR_NAME] || null
  };
}

/**
 * Fetches calendar details by ID
 * @param {string} calendarId - The calendar ID
 * @returns {Promise<Object|null>} Calendar data or null if not found
 */
async function getCalendar(calendarId) {
  if (!calendarId) {
    console.log('⚠️ No calendar ID provided');
    return null;
  }

  try {
    console.log(`📅 Fetching calendar: ${calendarId}`);

    const response = await axios.get(`${BASE_URL}/calendars/${calendarId}`, {
      headers: getHeaders()
    });

    console.log(`✅ Found calendar: ${response.data.calendar?.name || 'Unknown'}`);
    return response.data.calendar || response.data;
  } catch (error) {
    console.error('❌ Error fetching calendar:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Fetches an appointment by ID
 * @param {string} appointmentId - The appointment/event ID
 * @returns {Promise<Object|null>} Appointment data or null if not found
 */
async function getAppointment(appointmentId) {
  if (!appointmentId) {
    console.log('⚠️ No appointment ID provided');
    return null;
  }

  try {
    console.log(`📅 Fetching appointment: ${appointmentId}`);

    const response = await axios.get(
      `${BASE_URL}/calendars/events/appointments/${appointmentId}`,
      {
        headers: getHeaders()
      }
    );

    console.log(`✅ Found appointment`);
    return response.data.event || response.data;
  } catch (error) {
    console.error('❌ Error fetching appointment:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Updates an appointment's title
 * @param {string} appointmentId - The appointment/event ID
 * @param {string} title - New title for the appointment
 * @param {string} calendarId - The calendar ID (required for the endpoint, will be fetched if not provided)
 * @returns {Promise<Object|null>} Updated appointment data or null on failure
 */
async function updateAppointmentTitle(appointmentId, title, calendarId) {
  if (!appointmentId) {
    throw new Error('Appointment ID is required');
  }

  if (!title) {
    throw new Error('Title is required');
  }

  // If calendarId not provided, fetch the appointment to get it
  let resolvedCalendarId = calendarId;
  if (!resolvedCalendarId) {
    console.log('📅 No calendarId provided, fetching appointment to get it...');
    const appointment = await getAppointment(appointmentId);
    if (appointment) {
      resolvedCalendarId = appointment.calendarId;
      console.log(`📅 Got calendarId from appointment: ${resolvedCalendarId}`);
    }
  }

  if (!resolvedCalendarId) {
    throw new Error('Could not determine calendarId for appointment update');
  }

  try {
    console.log(`📝 Updating appointment ${appointmentId} title to: "${title}"`);

    const response = await axios.put(
      `${BASE_URL}/calendars/events/appointments/${appointmentId}`,
      {
        title: title,
        calendarId: resolvedCalendarId
      },
      {
        headers: getHeaders()
      }
    );

    console.log(`✅ Appointment title updated successfully`);
    return response.data;
  } catch (error) {
    console.error('❌ Error updating appointment:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Gets the stage ID for a given meeting type
 * @param {string} meetingType - The meeting type (e.g., "EP Discovery Call")
 * @returns {string|null} Stage ID or null if no mapping exists
 */
function getStageIdForMeetingType(meetingType) {
  if (!meetingType) return null;
  return MEETING_TYPE_STAGE_MAP[meetingType] || null;
}

/**
 * Updates an opportunity's stage in GHL
 * @param {string} opportunityId - The opportunity ID
 * @param {string} stageId - The target stage ID
 * @returns {Promise<Object|null>} Updated opportunity data or null on failure
 */
async function updateOpportunityStage(opportunityId, stageId) {
  if (!opportunityId) {
    console.log('⚠️ No opportunity ID provided, skipping stage update');
    return null;
  }

  if (!stageId) {
    console.log('⚠️ No stage ID provided, skipping stage update');
    return null;
  }

  const pipelineId = process.env.GHL_PIPELINE_ID || 'LFxLIUP3LCVES60i9iwN';

  try {
    console.log(`📊 Updating opportunity ${opportunityId} to stage ${stageId}`);

    const response = await axios.put(
      `${BASE_URL}/opportunities/${opportunityId}`,
      {
        pipelineId: pipelineId,
        pipelineStageId: stageId
      },
      {
        headers: getHeaders()
      }
    );

    console.log(`✅ Opportunity stage updated successfully`);
    return response.data;
  } catch (error) {
    console.error('❌ Error updating opportunity stage:', error.response?.data || error.message);
    // Don't throw - stage update failure shouldn't fail the whole webhook
    return null;
  }
}

/**
 * Cleans calendar name by removing "'s Personal Calendar" suffix
 * @param {string} calendarName - Raw calendar name (e.g., "Gabby Ang's Personal Calendar")
 * @returns {string} Cleaned name (e.g., "Gabby Ang")
 */
function cleanCalendarName(calendarName) {
  if (!calendarName) return null;

  // Remove "'s Personal Calendar" suffix if present
  return calendarName.replace(/'s Personal Calendar$/i, '').trim();
}

/**
 * Builds the appointment title from components
 * @param {Object} options - Title components
 * @param {string} options.calendarName - Calendar name
 * @param {string} options.meetingType - Meeting type (e.g., "EP Discovery Call")
 * @param {string} options.meeting - Meeting location/name (e.g., "Naples")
 * @param {string} options.contactName - Contact's full name
 * @returns {string} Formatted title
 */
function buildAppointmentTitle({ calendarName, meetingType, meeting, contactName }) {
  const parts = [];

  // Clean calendar name (remove "'s Personal Calendar" suffix)
  const cleanedCalendarName = cleanCalendarName(calendarName);
  if (cleanedCalendarName) parts.push(cleanedCalendarName);
  if (meetingType) parts.push(meetingType);
  if (meeting) parts.push(meeting);
  if (contactName) parts.push(contactName);

  return parts.join(' - ');
}

/**
 * Main handler for appointment created webhook
 * Fetches form submission, extracts data, updates appointment title,
 * and moves opportunity to appropriate stage based on meeting type
 *
 * @param {Object} webhookData - Webhook payload from GHL
 * @param {string} webhookData.appointmentId - The appointment ID
 * @param {string} webhookData.contactId - Contact ID
 * @param {string} webhookData.contactPhone - Contact phone number
 * @param {string} webhookData.contactEmail - Contact email
 * @param {string} webhookData.contactName - Contact full name
 * @param {string} webhookData.calendarId - Calendar ID (optional)
 * @param {string} webhookData.calendarName - Calendar name (optional, preferred over calendarId)
 * @param {string} webhookData.opportunityId - Opportunity ID (optional, for stage updates)
 * @returns {Promise<Object>} Result of the operation
 */
async function processAppointmentCreated(webhookData) {
  const {
    appointmentId,
    contactId,
    contactPhone,
    contactEmail,
    contactName,
    calendarId,
    calendarName: webhookCalendarName,
    opportunityId
  } = webhookData;

  console.log('\n========================================');
  console.log('📅 Processing Appointment Created Webhook');
  console.log('========================================');
  console.log(`Appointment ID: ${appointmentId}`);
  console.log(`Contact: ${contactName} (${contactId})`);
  console.log(`Phone: ${contactPhone}`);
  console.log(`Email: ${contactEmail}`);
  console.log(`Calendar ID: ${calendarId || '(not provided)'}`);
  console.log(`Calendar Name: ${webhookCalendarName || '(not provided)'}`);
  console.log(`Opportunity ID: ${opportunityId || '(not provided)'}`);
  console.log('========================================\n');

  // Validate required fields
  if (!appointmentId) {
    throw new Error('Missing required field: appointmentId');
  }

  const formId = APPOINTMENT_FORM_ID;

  let meetingData = null;
  let calendarName = null;

  // Step 1: Try to fetch form submission
  // Try phone first, then email
  const searchQuery = contactPhone || contactEmail;

  if (searchQuery) {
    const submission = await getFormSubmission(formId, searchQuery);

    if (submission) {
      meetingData = extractMeetingData(submission);
      calendarName = meetingData.calendarName;
      console.log('📋 Extracted meeting data:', meetingData);
    }
  }

  // Step 2: If no calendar name from form, use webhook calendarName or fetch from API
  if (!calendarName) {
    if (webhookCalendarName) {
      // Use calendar name provided directly in webhook
      calendarName = webhookCalendarName;
      console.log(`📅 Using calendar name from webhook: "${calendarName}"`);
    } else if (calendarId) {
      // Fallback: fetch from calendar API
      console.log('📅 Fetching calendar name from API (fallback)...');
      const calendar = await getCalendar(calendarId);
      if (calendar) {
        calendarName = calendar.name;
      }
    }
  }

  // Step 3: Build the title
  let title;

  if (meetingData && meetingData.meetingType) {
    // Full format: Calendar Name - Meeting Type - Meeting - Contact Name
    title = buildAppointmentTitle({
      calendarName: calendarName,
      meetingType: meetingData.meetingType,
      meeting: meetingData.meeting,
      contactName: contactName
    });
  } else {
    // Fallback format: Calendar Name - Contact Name
    title = buildAppointmentTitle({
      calendarName: calendarName || 'Appointment',
      contactName: contactName
    });
    console.log('⚠️ Using fallback title format (form submission not found or missing data)');
  }

  console.log(`🏷️ Final title: "${title}"`);

  // Step 4: Update the appointment
  const result = await updateAppointmentTitle(appointmentId, title, calendarId);

  // Step 5: Move opportunity to appropriate stage based on meeting type
  let stageUpdateResult = null;
  let targetStageId = null;
  let resolvedOpportunityId = opportunityId;

  // If no opportunityId provided, try to find it by contactId
  if (!resolvedOpportunityId && contactId) {
    console.log(`🔍 No opportunity ID provided, searching by contact ID: ${contactId}`);
    try {
      const locationId = process.env.GHL_LOCATION_ID;
      const opportunities = await searchOpportunitiesByContact(contactId, locationId);

      if (opportunities && opportunities.length > 0) {
        // Use the first open opportunity, or fall back to the first one
        const openOpportunity = opportunities.find(opp => opp.status === 'open');
        resolvedOpportunityId = openOpportunity?.id || opportunities[0].id;
        console.log(`✅ Found opportunity: ${resolvedOpportunityId} (from ${opportunities.length} total)`);
      } else {
        console.log('⚠️ No opportunities found for contact');
      }
    } catch (searchError) {
      console.error('❌ Error searching for opportunity:', searchError.message);
    }
  }

  if (resolvedOpportunityId && meetingData?.meetingType) {
    targetStageId = getStageIdForMeetingType(meetingData.meetingType);

    if (targetStageId) {
      console.log(`📊 Meeting type "${meetingData.meetingType}" maps to stage ID: ${targetStageId}`);
      stageUpdateResult = await updateOpportunityStage(resolvedOpportunityId, targetStageId);
    } else {
      console.log(`⚠️ No stage mapping found for meeting type: "${meetingData.meetingType}", skipping stage update`);
    }
  } else if (!resolvedOpportunityId) {
    console.log('⚠️ No opportunity ID found (not provided and not found by contact), skipping stage update');
  } else if (!meetingData?.meetingType) {
    console.log('⚠️ No meeting type found, skipping stage update');
  }

  // Step 6: Send confirmation email for specific meeting types
  let emailResult = null;
  const requiresConfirmationEmail = meetingData?.meetingType && shouldSendConfirmationEmail(meetingData.meetingType);
  const requiresDiscoveryCallEmail = meetingData?.meetingType && shouldSendDiscoveryCallEmail(meetingData.meetingType);

  if (requiresConfirmationEmail || requiresDiscoveryCallEmail) {
    const emailType = requiresConfirmationEmail ? 'confirmation' : 'discovery call';
    console.log(`📧 Meeting type "${meetingData.meetingType}" requires ${emailType} email`);

    // Fetch full appointment details to get start time
    const appointmentDetails = await getAppointment(appointmentId);
    console.log('📅 Appointment details:', JSON.stringify(appointmentDetails, null, 2));

    // Extract appointment data (may be nested under 'appointment' key)
    const appointment = appointmentDetails?.appointment || appointmentDetails;
    const appointmentStartTime = appointment?.startTime || appointment?.start_time;
    console.log(`📅 Appointment start time: ${appointmentStartTime}`);

    // Get the contact ID from the appointment
    const appointmentContactId = appointment?.contactId || appointment?.contact_id || contactId;

    // Fetch contact to get their email, first name, and phone
    let recipientEmail = contactEmail;
    let recipientName = contactName;
    let recipientFirstName = null;
    let recipientPhone = contactPhone;

    if (appointmentContactId) {
      try {
        console.log(`👤 Fetching contact details for: ${appointmentContactId}`);
        const contactData = await getContact(appointmentContactId);
        const contact = contactData?.contact || contactData;

        if (contact?.email) {
          recipientEmail = contact.email;
          console.log(`✅ Found contact email: ${recipientEmail}`);
        }
        if (contact?.firstName) {
          recipientFirstName = contact.firstName;
          console.log(`✅ Found contact first name: ${recipientFirstName}`);
        }
        if (contact?.phone) {
          recipientPhone = contact.phone;
          console.log(`✅ Found contact phone: ${recipientPhone}`);
        }
        if (contact?.name || contact?.firstName) {
          recipientName = contact.name || `${contact.firstName} ${contact.lastName || ''}`.trim();
        }
      } catch (contactError) {
        console.error('⚠️ Could not fetch contact, using webhook data:', contactError.message);
      }
    }

    if (!recipientEmail) {
      console.log('⚠️ No email found for contact, skipping email');
      emailResult = { success: false, reason: 'No email address found' };
    } else if (requiresConfirmationEmail) {
      // Send meeting confirmation email (Initial, Vision, Standalone)
      emailResult = await sendMeetingConfirmationEmail({
        contactEmail: recipientEmail,
        contactName: recipientName,
        contactFirstName: recipientFirstName,
        startTime: appointmentStartTime,
        meetingLocation: meetingData.meeting,
        meetingType: meetingData.meetingType
      });
    } else if (requiresDiscoveryCallEmail) {
      // Send discovery call email (Probate Discovery Call)
      emailResult = await sendProbateDiscoveryCallEmail({
        contactEmail: recipientEmail,
        contactName: recipientName,
        contactFirstName: recipientFirstName,
        contactPhone: recipientPhone,
        startTime: appointmentStartTime,
        meetingType: meetingData.meetingType
      });
    }
  } else if (meetingData?.meetingType) {
    console.log(`📧 Meeting type "${meetingData.meetingType}" does not require confirmation email`);
  }

  return {
    success: true,
    appointmentId,
    title,
    usedFallback: !meetingData || !meetingData.meetingType,
    meetingData,
    stageUpdate: {
      opportunityId: resolvedOpportunityId,
      opportunityIdSource: opportunityId ? 'webhook' : (resolvedOpportunityId ? 'search' : 'not_found'),
      targetStageId,
      success: !!stageUpdateResult
    },
    emailSent: emailResult
  };
}

module.exports = {
  getFormSubmission,
  extractMeetingData,
  getCalendar,
  getAppointment,
  updateAppointmentTitle,
  buildAppointmentTitle,
  processAppointmentCreated,
  getStageIdForMeetingType,
  updateOpportunityStage,
  FORM_FIELDS,
  MEETING_TYPE_STAGE_MAP
};
