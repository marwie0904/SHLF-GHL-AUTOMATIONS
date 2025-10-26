const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Get tasks for a specific opportunity stage from Supabase
 * @param {string} stageName - The opportunity stage name
 * @returns {Promise<Array>} Array of tasks for the stage
 */
async function getTasksForStage(stageName) {
  try {
    const { data, error } = await supabase
      .from('ghl_task_list')
      .select('*')
      .eq('opportunity_stage_name', stageName)
      .order('task_number', { ascending: true });

    if (error) {
      console.error('Error fetching tasks from Supabase:', error);
      throw error;
    }

    console.log(`Found ${data?.length || 0} tasks for stage: ${stageName}`);
    return data || [];
  } catch (error) {
    console.error('Error in getTasksForStage:', error);
    throw error;
  }
}

/**
 * Create a task in GHL
 * @param {Object} taskData - Task data including title, description, due date, etc.
 * @param {string} opportunityId - GHL opportunity ID
 * @param {string} contactId - GHL contact ID
 * @returns {Promise<Object>} API response
 */
async function createGHLTask(taskData, opportunityId, contactId) {
  const apiKey = process.env.GHL_API_KEY;

  if (!apiKey) {
    throw new Error('GHL_API_KEY not configured in environment variables');
  }

  try {
    const payload = {
      title: taskData.task_name,
      body: taskData.task_description,
      assignedTo: taskData.assignee_id,
      contactId: contactId,
      // Calculate due date based on taskData.due_date_value and due_date_time_relation
      // For now, we'll set it as a relative time
      dueDate: calculateDueDate(taskData)
    };

    const response = await axios.post(
      `https://services.leadconnectorhq.com/contacts/${contactId}/tasks`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28'
        }
      }
    );

    console.log('GHL Task created successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error creating GHL task:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Calculate due date based on task configuration
 * @param {Object} taskData - Task data with due_date_value and due_date_time_relation
 * @returns {string} ISO date string for due date
 */
function calculateDueDate(taskData) {
  const now = new Date();
  const value = taskData.due_date_value || 0;
  const relation = taskData.due_date_time_relation || 'days';

  let milliseconds = 0;
  switch (relation) {
    case 'minutes':
      milliseconds = value * 60 * 1000;
      break;
    case 'hours':
      milliseconds = value * 60 * 60 * 1000;
      break;
    case 'days':
      milliseconds = value * 24 * 60 * 60 * 1000;
      break;
    case 'weeks':
      milliseconds = value * 7 * 24 * 60 * 60 * 1000;
      break;
    default:
      milliseconds = value * 24 * 60 * 60 * 1000; // Default to days
  }

  const dueDate = new Date(now.getTime() + milliseconds);
  return dueDate.toISOString();
}

/**
 * Process opportunity stage change and create tasks
 * @param {Object} webhookData - Webhook data from GHL
 * @returns {Promise<Object>} Processing result
 */
async function processOpportunityStageChange(webhookData) {
  try {
    const { opportunityId, stageName, contactId } = webhookData;

    if (!opportunityId || !stageName) {
      throw new Error('Missing required fields: opportunityId or stageName');
    }

    console.log(`Processing opportunity ${opportunityId} - Stage: ${stageName}`);

    // Get tasks for this stage from Supabase
    const tasks = await getTasksForStage(stageName);

    if (tasks.length === 0) {
      console.log(`No tasks configured for stage: ${stageName}`);
      return {
        success: true,
        message: 'No tasks to create for this stage',
        tasksCreated: 0
      };
    }

    // Create tasks in GHL
    const createdTasks = [];
    for (const task of tasks) {
      try {
        const createdTask = await createGHLTask(task, opportunityId, contactId);
        createdTasks.push(createdTask);
      } catch (taskError) {
        console.error(`Error creating task ${task.task_number}:`, taskError.message);
        // Continue creating other tasks even if one fails
      }
    }

    console.log(`Successfully created ${createdTasks.length} out of ${tasks.length} tasks`);

    return {
      success: true,
      message: `Created ${createdTasks.length} tasks for stage: ${stageName}`,
      tasksCreated: createdTasks.length,
      totalTasks: tasks.length,
      tasks: createdTasks
    };
  } catch (error) {
    console.error('Error in processOpportunityStageChange:', error);
    throw error;
  }
}

module.exports = {
  getTasksForStage,
  createGHLTask,
  processOpportunityStageChange
};
