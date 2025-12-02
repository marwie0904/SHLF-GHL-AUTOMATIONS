/**
 * Appointment SMS Service
 *
 * Sends appointment SMS notifications via GHL webhook.
 * Supports:
 * - Confirmation SMS (sent immediately after email)
 * - Reminder SMS (scheduled 24 hours before appointment, within 8am-4pm EST)
 */

const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// GHL Webhook URL for SMS automation
const GHL_SMS_WEBHOOK_URL = 'https://services.leadconnectorhq.com/hooks/afYLuZPi37CZR1IpJlfn/webhook-trigger/85d6309b-8bf7-49d7-9d53-1690e2a8d2f9';

/**
 * Formats the appointment date and time for SMS display
 * @param {string} startTime - ISO date string from appointment
 * @returns {string} Formatted date and time (e.g., "Tuesday, December 9, 2025 at 4:30 PM")
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
 * Calculates the reminder send time (24 hours before appointment, adjusted to 8am-4pm EST window)
 * @param {string} appointmentTime - ISO date string of appointment
 * @returns {Date} The calculated reminder send time
 */
function calculateReminderTime(appointmentTime) {
  if (!appointmentTime) return null;

  const appointmentDate = new Date(appointmentTime);

  // 24 hours before appointment
  const reminderTime = new Date(appointmentDate.getTime() - (24 * 60 * 60 * 1000));

  // Get the hour in EST
  const estFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    hour12: false
  });
  const estHour = parseInt(estFormatter.format(reminderTime));

  // Adjust to 8am-4pm window
  if (estHour < 8) {
    // Before 8am - set to 8am same day
    const hoursToAdd = 8 - estHour;
    reminderTime.setTime(reminderTime.getTime() + (hoursToAdd * 60 * 60 * 1000));
  } else if (estHour >= 16) {
    // After 4pm (16:00) - set to 3pm (15:00) same day
    const hoursToSubtract = estHour - 15;
    reminderTime.setTime(reminderTime.getTime() - (hoursToSubtract * 60 * 60 * 1000));
  }

  return reminderTime;
}

/**
 * Checks if current time is within SMS sending window (8am-4pm EST)
 * @returns {boolean} True if within window
 */
function isWithinSmsWindow() {
  const now = new Date();
  const estFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    hour12: false
  });
  const estHour = parseInt(estFormatter.format(now));

  return estHour >= 8 && estHour < 16;
}

/**
 * Sends an SMS via GHL webhook
 * @param {Object} smsData - SMS data
 * @param {string} smsData.type - 'confirmation' or 'reminder'
 * @param {string} smsData.eventTitle - The appointment title
 * @param {string} smsData.time - Formatted appointment time
 * @param {string} smsData.location - Meeting location
 * @param {string} smsData.contactId - GHL contact ID (for the automation to send to)
 * @param {string} smsData.contactName - Contact full name
 * @param {string} smsData.contactPhone - Contact phone number
 * @returns {Promise<Object>} Webhook response
 */
async function sendAppointmentSms(smsData) {
  const { type, eventTitle, time, location, contactId, contactName, contactPhone } = smsData;

  if (!contactId) {
    console.log('⚠️ No contact ID provided, skipping SMS');
    return { success: false, reason: 'No contact ID' };
  }

  console.log('=== Sending Appointment SMS ===');
  console.log('Type:', type);
  console.log('Event Title:', eventTitle);
  console.log('Time:', time);
  console.log('Location:', location);
  console.log('Contact ID:', contactId);
  console.log('Contact Name:', contactName);
  console.log('Contact Phone:', contactPhone);

  const payload = {
    type: type,
    eventTitle: eventTitle,
    time: time,
    location: location,
    contactId: contactId,
    contactName: contactName,
    contactPhone: contactPhone
  };

  try {
    const response = await axios.post(GHL_SMS_WEBHOOK_URL, payload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    console.log(`✅ ${type} SMS webhook triggered successfully`);
    return { success: true, response: response.data };

  } catch (error) {
    console.error(`❌ Failed to trigger ${type} SMS webhook:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Sends a confirmation SMS immediately after email
 * @param {Object} appointmentData - Appointment data
 * @param {string} appointmentData.contactId - GHL contact ID
 * @param {string} appointmentData.eventTitle - Appointment title
 * @param {string} appointmentData.startTime - Appointment start time (ISO string)
 * @param {string} appointmentData.location - Meeting location
 * @param {string} appointmentData.contactName - Contact full name
 * @param {string} appointmentData.contactPhone - Contact phone number
 * @returns {Promise<Object>} Result
 */
async function sendConfirmationSms(appointmentData) {
  const { contactId, eventTitle, startTime, location, contactName, contactPhone } = appointmentData;

  const formattedTime = formatAppointmentDateTime(startTime);

  return sendAppointmentSms({
    type: 'confirmation',
    eventTitle: eventTitle || 'Appointment',
    time: formattedTime,
    location: location || '[Location]',
    contactId: contactId,
    contactName: contactName,
    contactPhone: contactPhone
  });
}

/**
 * Schedules a reminder SMS for 24 hours before appointment (adjusted to 8am-4pm EST window)
 * Saves to Supabase scheduled_sms table for cron job to process
 * @param {Object} appointmentData - Appointment data
 * @param {string} appointmentData.contactId - GHL contact ID
 * @param {string} appointmentData.appointmentId - Appointment ID
 * @param {string} appointmentData.eventTitle - Appointment title
 * @param {string} appointmentData.startTime - Appointment start time (ISO string)
 * @param {string} appointmentData.location - Meeting location
 * @param {string} appointmentData.contactName - Contact full name
 * @param {string} appointmentData.contactPhone - Contact phone number
 * @returns {Promise<Object>} Result with scheduled time info
 */
async function scheduleReminderSms(appointmentData) {
  const { contactId, appointmentId, eventTitle, startTime, location, contactName, contactPhone } = appointmentData;

  if (!startTime) {
    console.log('⚠️ No start time provided, cannot schedule reminder');
    return { success: false, reason: 'No start time' };
  }

  if (!contactId) {
    console.log('⚠️ No contact ID provided, cannot schedule reminder');
    return { success: false, reason: 'No contact ID' };
  }

  const reminderTime = calculateReminderTime(startTime);
  const formattedAppointmentTime = formatAppointmentDateTime(startTime);

  console.log('=== Scheduling Reminder SMS ===');
  console.log('Appointment Time:', formattedAppointmentTime);
  console.log('Calculated Reminder Time:', reminderTime?.toISOString());

  // Check if reminder time is in the past
  if (reminderTime && reminderTime <= new Date()) {
    console.log('⚠️ Reminder time is in the past, skipping scheduling');
    return { success: false, reason: 'Reminder time is in the past' };
  }

  try {
    // Save to Supabase for cron job to process
    const { data, error } = await supabase
      .from('scheduled_sms')
      .insert({
        contact_id: contactId,
        contact_name: contactName,
        contact_phone: contactPhone,
        appointment_id: appointmentId,
        event_title: eventTitle || 'Appointment',
        appointment_time: startTime,
        location: location || '[Location]',
        scheduled_send_time: reminderTime.toISOString(),
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Failed to schedule reminder SMS:', error.message);
      return { success: false, error: error.message };
    }

    console.log(`✅ Reminder SMS scheduled for ${reminderTime.toISOString()}`);
    console.log(`📝 Scheduled SMS ID: ${data.id}`);

    return {
      success: true,
      scheduledSmsId: data.id,
      scheduledFor: reminderTime.toISOString(),
      appointmentTime: startTime
    };

  } catch (error) {
    console.error('❌ Failed to schedule reminder SMS:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Processes pending scheduled SMS reminders (called by cron job)
 * Sends all reminders that are due and within the 8am-4pm EST window
 * @returns {Promise<Object>} Results of processing
 */
async function processScheduledReminders() {
  console.log('\n========================================');
  console.log('📱 Processing Scheduled SMS Reminders');
  console.log('========================================');

  // Check if within SMS window (8am-4pm EST)
  if (!isWithinSmsWindow()) {
    console.log('⏰ Outside SMS window (8am-4pm EST), skipping processing');
    return { success: true, processed: 0, reason: 'Outside SMS window' };
  }

  const now = new Date();
  console.log(`Current time: ${now.toISOString()}`);

  try {
    // Get all pending reminders that are due
    const { data: pendingReminders, error: fetchError } = await supabase
      .from('scheduled_sms')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_send_time', now.toISOString())
      .order('scheduled_send_time', { ascending: true });

    if (fetchError) {
      console.error('❌ Failed to fetch pending reminders:', fetchError.message);
      return { success: false, error: fetchError.message };
    }

    console.log(`Found ${pendingReminders?.length || 0} pending reminders to process`);

    if (!pendingReminders || pendingReminders.length === 0) {
      return { success: true, processed: 0 };
    }

    const results = {
      success: true,
      processed: 0,
      sent: 0,
      failed: 0,
      details: []
    };

    // Process each reminder
    for (const reminder of pendingReminders) {
      console.log(`\n📤 Processing reminder for: ${reminder.contact_name || reminder.contact_id}`);

      const formattedTime = formatAppointmentDateTime(reminder.appointment_time);

      // Send the SMS
      const smsResult = await sendAppointmentSms({
        type: 'reminder',
        eventTitle: reminder.event_title,
        time: formattedTime,
        location: reminder.location,
        contactId: reminder.contact_id,
        contactName: reminder.contact_name,
        contactPhone: reminder.contact_phone
      });

      // Update the record status
      const updateData = smsResult.success
        ? { status: 'sent', sent_at: new Date().toISOString(), updated_at: new Date().toISOString() }
        : { status: 'failed', error_message: smsResult.error || smsResult.reason, updated_at: new Date().toISOString() };

      const { error: updateError } = await supabase
        .from('scheduled_sms')
        .update(updateData)
        .eq('id', reminder.id);

      if (updateError) {
        console.error(`⚠️ Failed to update reminder status: ${updateError.message}`);
      }

      results.processed++;
      if (smsResult.success) {
        results.sent++;
      } else {
        results.failed++;
      }

      results.details.push({
        id: reminder.id,
        contactId: reminder.contact_id,
        success: smsResult.success,
        error: smsResult.error || smsResult.reason
      });
    }

    console.log(`\n✅ Processing complete: ${results.sent} sent, ${results.failed} failed`);
    return results;

  } catch (error) {
    console.error('❌ Error processing scheduled reminders:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Cancels a scheduled reminder by appointment ID
 * @param {string} appointmentId - The appointment ID
 * @returns {Promise<Object>} Result
 */
async function cancelScheduledReminder(appointmentId) {
  if (!appointmentId) {
    return { success: false, reason: 'No appointment ID provided' };
  }

  try {
    const { data, error } = await supabase
      .from('scheduled_sms')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('appointment_id', appointmentId)
      .eq('status', 'pending')
      .select();

    if (error) {
      console.error('❌ Failed to cancel scheduled reminder:', error.message);
      return { success: false, error: error.message };
    }

    console.log(`✅ Cancelled ${data?.length || 0} scheduled reminder(s) for appointment ${appointmentId}`);
    return { success: true, cancelled: data?.length || 0 };

  } catch (error) {
    console.error('❌ Error cancelling scheduled reminder:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendAppointmentSms,
  sendConfirmationSms,
  scheduleReminderSms,
  processScheduledReminders,
  cancelScheduledReminder,
  formatAppointmentDateTime,
  calculateReminderTime,
  isWithinSmsWindow,
  GHL_SMS_WEBHOOK_URL
};
