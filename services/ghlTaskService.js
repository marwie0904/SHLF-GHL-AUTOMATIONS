const { createClient } = require('@supabase/supabase-js');

/**
 * Syncs a task from GHL to Supabase
 * @param {Object} taskData - Task data from GHL webhook
 * @returns {Promise<Object>} Supabase response
 */
async function syncTaskToSupabase(taskData) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('SUPABASE_URL or SUPABASE_KEY not configured in environment variables');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log('Syncing task to Supabase:', taskData.ghl_task_id);

    // Prepare task data for Supabase
    const taskRecord = {
      ghl_task_id: taskData.ghl_task_id,
      ghl_contact_id: taskData.ghl_contact_id || null,
      task_name: taskData.task_name,
      task_description: taskData.task_description || null,
      assignee_name: taskData.assignee_name || null,
      assignee_id: taskData.assignee_id || null,
      due_date: taskData.due_date || null,
      completed: taskData.completed || false
    };

    // Upsert task (insert or update if exists)
    const { data, error } = await supabase
      .from('ghl_tasks')
      .upsert(taskRecord, {
        onConflict: 'ghl_task_id',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (error) {
      console.error('Error syncing task to Supabase:', error);
      throw error;
    }

    console.log('Task synced successfully to Supabase:', data);
    return data;
  } catch (error) {
    console.error('Error in syncTaskToSupabase:', error);
    throw error;
  }
}

/**
 * Get assignee information from GHL
 * @param {string} assigneeId - GHL user ID
 * @param {string} apiKey - GHL API key
 * @returns {Promise<Object|null>} User information or null
 */
async function getAssigneeInfo(assigneeId, apiKey) {
  if (!assigneeId) return null;

  const axios = require('axios');
  const locationId = process.env.GHL_LOCATION_ID;

  try {
    const response = await axios.get(
      `https://services.leadconnectorhq.com/users/${assigneeId}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Version': '2021-07-28'
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error fetching assignee info:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Process task creation webhook from GHL
 * @param {Object} webhookData - Raw webhook data from GHL
 * @returns {Promise<Object>} Processing result
 */
async function processTaskCreation(webhookData) {
  const apiKey = process.env.GHL_API_KEY;

  try {
    console.log('=== PROCESSING TASK CREATION WEBHOOK ===');
    console.log('Raw webhook data:', JSON.stringify(webhookData, null, 2));

    // Extract task data from webhook
    const taskData = {
      ghl_task_id: webhookData.id || webhookData.task?.id,
      ghl_contact_id: webhookData.contactId || webhookData.task?.contactId,
      task_name: webhookData.title || webhookData.task?.title,
      task_description: webhookData.body || webhookData.task?.body,
      assignee_id: webhookData.assignedTo || webhookData.task?.assignedTo,
      due_date: webhookData.dueDate || webhookData.task?.dueDate,
      completed: webhookData.completed || webhookData.task?.completed || false
    };

    // Validate required fields
    if (!taskData.ghl_task_id) {
      throw new Error('Missing required field: task ID');
    }

    if (!taskData.task_name) {
      throw new Error('Missing required field: task name/title');
    }

    // Get assignee information if assignee ID exists
    let assigneeName = null;
    if (taskData.assignee_id && apiKey) {
      const assigneeInfo = await getAssigneeInfo(taskData.assignee_id, apiKey);
      if (assigneeInfo) {
        assigneeName = assigneeInfo.name || `${assigneeInfo.firstName || ''} ${assigneeInfo.lastName || ''}`.trim();
      }
    }

    taskData.assignee_name = assigneeName;

    console.log('Extracted task data:', JSON.stringify(taskData, null, 2));

    // Sync to Supabase
    const result = await syncTaskToSupabase(taskData);

    return {
      success: true,
      message: 'Task synced to Supabase successfully',
      taskId: taskData.ghl_task_id,
      supabaseRecord: result
    };
  } catch (error) {
    console.error('Error processing task creation:', error);
    throw error;
  }
}

module.exports = {
  syncTaskToSupabase,
  processTaskCreation,
  getAssigneeInfo
};
