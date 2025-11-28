/**
 * Appointment Email Service
 *
 * Sends meeting confirmation emails via Make.com webhook for specific meeting types.
 * Triggered for: Initial Meeting, Vision Meeting, Standalone Meeting
 */

const axios = require('axios');

const MAKE_WEBHOOK_URL = process.env.MAKE_APPOINTMENT_EMAIL_WEBHOOK;

// Logo URL - hosted on GHL
const LOGO_URL = 'https://storage.googleapis.com/msgsndr/afYLuZPi37CZR1IpJlfn/media/68f107369d906785d9458314.png';

// Meeting types that trigger confirmation emails (in-person meetings)
const EMAIL_TRIGGER_MEETING_TYPES = [
  'Initial Meeting',
  'Vision Meeting',
  'Standalone Meeting'
];

// Meeting types that trigger discovery call emails (phone calls)
const DISCOVERY_CALL_MEETING_TYPES = [
  'Probate Discovery Call'
];

// JotForm link for Personal and Financial Information form
const JOTFORM_LINK = 'https://form.jotform.com/252972444974066';

// Workshop registration link
const WORKSHOP_LINK = 'https://safeharborlaw.mykajabi.com/offers/4G46XzDJ/checkout';

// Brochure PDF download link
const BROCHURE_LINK = 'https://storage.googleapis.com/msgsndr/afYLuZPi37CZR1IpJlfn/media/6929c210850cc4f85b2e7a03.pdf';

// Estate Questionnaire link for Probate Discovery Calls
// TODO: Replace with actual questionnaire link
const ESTATE_QUESTIONNAIRE_LINK = '[ESTATE_QUESTIONNAIRE_LINK]';

// Office addresses by meeting location
// TODO: Replace placeholders with actual addresses
const MEETING_LOCATIONS = {
  'Naples': {
    address: '[NAPLES OFFICE ADDRESS]',
    type: 'in-person'
  },
  'Fort Myers': {
    address: '[FORT MYERS OFFICE ADDRESS]',
    type: 'in-person'
  },
  'Zoom': {
    address: '[ZOOM LINK - Dynamic or Static TBD]',
    type: 'virtual'
  }
};

/**
 * Checks if the meeting type requires a confirmation email (in-person meetings)
 * @param {string} meetingType - The meeting type
 * @returns {boolean} True if email should be sent
 */
function shouldSendConfirmationEmail(meetingType) {
  if (!meetingType) return false;
  return EMAIL_TRIGGER_MEETING_TYPES.includes(meetingType);
}

/**
 * Checks if the meeting type requires a discovery call email (phone calls)
 * @param {string} meetingType - The meeting type
 * @returns {boolean} True if discovery call email should be sent
 */
function shouldSendDiscoveryCallEmail(meetingType) {
  if (!meetingType) return false;
  return DISCOVERY_CALL_MEETING_TYPES.includes(meetingType);
}

/**
 * Formats the appointment date and time for display
 * @param {string} startTime - ISO date string from appointment
 * @returns {string} Formatted date and time (e.g., "Monday, January 15, 2025 at 2:00 PM")
 */
function formatAppointmentDateTime(startTime) {
  if (!startTime) return '[Date and Time]';

  const date = new Date(startTime);

  const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/New_York' // Eastern Time for Florida
  };

  return date.toLocaleString('en-US', options);
}

/**
 * Gets the location text (address or zoom link) based on meeting location
 * @param {string} meetingLocation - The meeting location (e.g., "Naples", "Fort Myers", "Zoom")
 * @returns {string} Full address or zoom link
 */
function getLocationText(meetingLocation) {
  if (!meetingLocation) return '[Meeting Location]';

  const location = MEETING_LOCATIONS[meetingLocation];
  if (location) {
    return location.address;
  }

  // If location not found in mapping, return as-is (might be custom location)
  return meetingLocation;
}

/**
 * Generates the HTML email body for meeting confirmation
 * @param {Object} data - Email data
 * @param {string} data.firstName - Contact first name
 * @param {string} data.dateTime - Formatted date and time
 * @param {string} data.location - Full address or zoom link
 * @returns {string} HTML email body
 */
function generateMeetingConfirmationHTML(data) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #e8f4fc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #e8f4fc; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px;">
          <tr>
            <td align="center" style="padding: 40px 40px 20px 40px;">
              <img src="${LOGO_URL}" alt="Safe Harbor Law Firm" width="400" style="max-width: 100%;">
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px;">
              <h2 style="color: #1a365d; margin: 0 0 20px 0; font-size: 24px;">Meeting Confirmation</h2>
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 10px 0;">
                Hi ${data.firstName},
              </p>
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                We look forward to seeing you on <strong>${data.dateTime}</strong>, in our <strong>${data.location}</strong>.
              </p>

              <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 10px 0;">
                Here are the next steps:
              </p>

              <ol style="color: #333; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0; padding-left: 20px;">
                <li style="margin-bottom: 15px;">
                  To help us ensure that the meeting is beneficial for you, we have enclosed a "Personal and Financial Information" form. It is required for you to complete this form and return to us prior to your scheduled meeting. By completing the information before we meet, you will allow us to spend the maximum amount of time discussing your personal concerns and providing you additional options. All of the information that you provide is confidential and protected by attorney-client privilege, even if you choose not to go forward with your planning. If you are a couple, we will only need one form for the both of you. If you've already submitted a physical copy, no further action is needed. If you have a printed version filled out, feel free to bring it with you—no need to send it again.
                  <br><br>
                  <a href="${JOTFORM_LINK}" style="display: inline-block; background-color: #e07c5a; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 4px; font-size: 14px; font-weight: bold;">Complete Form</a>
                </li>
                <li style="margin-bottom: 15px;">
                  If you're married and planning together, your spouse must attend all meetings with the attorney for things to move forward.
                </li>
                <li style="margin-bottom: 15px;">
                  Please watch the recorded workshop, "How To Protect Your Assets In 3 Easy Steps", which will give you a better idea of different estate planning options, common risks, and address common misconceptions that are often made in regards to estate planning. Click the link below to view the recorded workshop:
                  <br><br>
                  <a href="${WORKSHOP_LINK}" style="display: inline-block; background-color: #2b6cb0; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 4px; font-size: 14px; font-weight: bold;">Register Here</a>
                </li>
                <li style="margin-bottom: 15px;">
                  During the meeting, the attorney may request to speak with the client privately for a few minutes. This is a normal part of our process and helps ensure their wishes are clearly understood and their plan is fully protected. Click below to download our brochure explaining the process.
                  <br><br>
                  <a href="${BROCHURE_LINK}" style="display: inline-block; background-color: #48bb78; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 4px; font-size: 14px; font-weight: bold;" download>Download Brochure</a>
                </li>
                <li style="margin-bottom: 15px;">
                  Should you need to cancel your appointment, be sure to do so at least 24 hours prior to your scheduled meeting. If you do not show up to your scheduled appointment, your next meeting will be charged at the attorney's hourly rate.
                </li>
              </ol>

              <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 20px 0;">
                If you have any questions, please respond to this email or give us a call/text at <strong>239-317-3116</strong>.
              </p>

              <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 20px 0 0 0;">
                Regards,<br><strong>Safe Harbor Law Firm</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Generates the HTML email body for Probate Discovery Call confirmation
 * @param {Object} data - Email data
 * @param {string} data.firstName - Contact first name
 * @param {string} data.dateTime - Formatted date and time
 * @param {string} data.phoneNumber - Contact phone number
 * @returns {string} HTML email body
 */
function generateProbateDiscoveryCallHTML(data) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #e8f4fc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #e8f4fc; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px;">
          <tr>
            <td align="center" style="padding: 40px 40px 20px 40px;">
              <img src="${LOGO_URL}" alt="Safe Harbor Law Firm" width="400" style="max-width: 100%;">
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px;">
              <h2 style="color: #1a365d; margin: 0 0 20px 0; font-size: 24px;">Discovery Call Confirmation</h2>
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 10px 0;">
                Hi ${data.firstName},
              </p>
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Your Probate Discovery Call has been scheduled for <strong>${data.dateTime}</strong>.
              </p>
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                We will call you at the number you provided: <strong>${data.phoneNumber}</strong>
              </p>
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; font-style: italic;">
                Please allow a brief 5–10 minute delay in case we are finishing another call or assisting another client.
              </p>

              <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 10px 0;">
                <strong>Before your appointment, please submit the following:</strong>
              </p>

              <ul style="color: #333; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0; padding-left: 20px;">
                <li style="margin-bottom: 10px;">
                  <strong>Estate Questionnaire</strong> – This helps our paralegal understand your situation and gain a full picture ahead of time.
                  <br>
                  <a href="${ESTATE_QUESTIONNAIRE_LINK}" style="color: #2b6cb0; text-decoration: underline;">Complete Estate Questionnaire</a>
                </li>
                <li style="margin-bottom: 10px;">
                  Decedent's will (if available)
                </li>
                <li style="margin-bottom: 10px;">
                  Decedent's Death certificate (if available)
                </li>
              </ul>

              <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 20px 0;">
                If you have any questions, please respond to this email or give us a call/text at <strong>239-317-3116</strong>.
              </p>

              <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 20px 0 0 0;">
                Regards,<br><strong>Safe Harbor Law Firm</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Sends a Probate Discovery Call confirmation email via Make.com webhook
 * @param {Object} appointmentData - Appointment data
 * @param {string} appointmentData.contactEmail - Recipient email address
 * @param {string} appointmentData.contactName - Contact full name
 * @param {string} appointmentData.contactFirstName - Contact first name
 * @param {string} appointmentData.contactPhone - Contact phone number
 * @param {string} appointmentData.startTime - Appointment start time (ISO string)
 * @param {string} appointmentData.meetingType - Meeting type
 * @returns {Promise<Object>} Webhook response
 */
async function sendProbateDiscoveryCallEmail(appointmentData) {
  if (!MAKE_WEBHOOK_URL) {
    console.log('⚠️ MAKE_APPOINTMENT_EMAIL_WEBHOOK not configured, skipping email');
    return { success: false, reason: 'Webhook not configured' };
  }

  const { contactEmail, contactName, contactFirstName, contactPhone, startTime, meetingType } = appointmentData;

  if (!contactEmail) {
    console.log('⚠️ No contact email provided, skipping discovery call email');
    return { success: false, reason: 'No email address' };
  }

  console.log('=== Sending Probate Discovery Call Email ===');
  console.log('To:', contactEmail);
  console.log('First Name:', contactFirstName);
  console.log('Phone:', contactPhone);
  console.log('Meeting Type:', meetingType);
  console.log('Time:', startTime);

  // Format date/time
  const formattedDateTime = formatAppointmentDateTime(startTime);

  // Prepare email data
  const emailData = {
    firstName: contactFirstName || contactName || 'Valued Client',
    dateTime: formattedDateTime,
    phoneNumber: contactPhone || '[Phone Number]'
  };

  // Generate HTML body
  const htmlBody = generateProbateDiscoveryCallHTML(emailData);

  // Prepare webhook payload
  const payload = {
    to: contactEmail,
    subject: 'Discovery Call Confirmation: Safe Harbor Law Firm',
    htmlBody: htmlBody,
    type: 'probate_discovery_call'
  };

  try {
    const response = await axios.post(MAKE_WEBHOOK_URL, payload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    console.log('✅ Probate Discovery Call email sent successfully');
    return { success: true, response: response.data };

  } catch (error) {
    console.error('❌ Failed to send Probate Discovery Call email:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Sends a meeting confirmation email via Make.com webhook
 * @param {Object} appointmentData - Appointment data
 * @param {string} appointmentData.contactEmail - Recipient email address
 * @param {string} appointmentData.contactName - Contact full name
 * @param {string} appointmentData.contactFirstName - Contact first name
 * @param {string} appointmentData.startTime - Appointment start time (ISO string)
 * @param {string} appointmentData.meetingLocation - Meeting location (e.g., "Naples", "Fort Myers", "Zoom")
 * @param {string} appointmentData.meetingType - Meeting type
 * @returns {Promise<Object>} Webhook response
 */
async function sendMeetingConfirmationEmail(appointmentData) {
  if (!MAKE_WEBHOOK_URL) {
    console.log('⚠️ MAKE_APPOINTMENT_EMAIL_WEBHOOK not configured, skipping email');
    return { success: false, reason: 'Webhook not configured' };
  }

  const { contactEmail, contactName, contactFirstName, startTime, meetingLocation, meetingType } = appointmentData;

  if (!contactEmail) {
    console.log('⚠️ No contact email provided, skipping confirmation email');
    return { success: false, reason: 'No email address' };
  }

  console.log('=== Sending Meeting Confirmation Email ===');
  console.log('To:', contactEmail);
  console.log('First Name:', contactFirstName);
  console.log('Meeting Type:', meetingType);
  console.log('Location:', meetingLocation);
  console.log('Time:', startTime);

  // Format date/time and get location text
  const formattedDateTime = formatAppointmentDateTime(startTime);
  const locationText = getLocationText(meetingLocation);

  // Prepare email data - use first name for greeting, fall back to full name or default
  const emailData = {
    firstName: contactFirstName || contactName || 'Valued Client',
    dateTime: formattedDateTime,
    location: locationText
  };

  // Generate HTML body
  const htmlBody = generateMeetingConfirmationHTML(emailData);

  // Prepare webhook payload
  const payload = {
    to: contactEmail,
    subject: 'Your Upcoming Meeting with Safe Harbor Law Firm',
    htmlBody: htmlBody,
    type: 'meeting_confirmation'
  };

  try {
    const response = await axios.post(MAKE_WEBHOOK_URL, payload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    console.log('✅ Meeting confirmation email sent successfully');
    return { success: true, response: response.data };

  } catch (error) {
    console.error('❌ Failed to send meeting confirmation email:', error.message);
    // Don't throw - email failure shouldn't fail the webhook
    return { success: false, error: error.message };
  }
}

module.exports = {
  shouldSendConfirmationEmail,
  shouldSendDiscoveryCallEmail,
  sendMeetingConfirmationEmail,
  sendProbateDiscoveryCallEmail,
  formatAppointmentDateTime,
  getLocationText,
  generateMeetingConfirmationHTML,
  generateProbateDiscoveryCallHTML,
  EMAIL_TRIGGER_MEETING_TYPES,
  DISCOVERY_CALL_MEETING_TYPES,
  MEETING_LOCATIONS
};
