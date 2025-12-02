const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Grace period in milliseconds (2 minutes)
const STAGE_CHANGE_GRACE_PERIOD_MS = 2 * 60 * 1000;

/**
 * Record a stage change in Supabase for grace period tracking
 * @param {Object} data - Stage change data
 * @returns {Promise<Object>} The created record
 */
async function recordStageChange(data) {
  try {
    const { data: record, error } = await supabase
      .from('opportunity_stage_changes')
      .insert({
        opportunity_id: data.opportunityId,
        opportunity_name: data.opportunityName,
        previous_stage: data.previousStage,
        previous_stage_id: data.previousStageId,
        new_stage: data.newStage,
        new_stage_id: data.newStageId,
        task_ids: data.taskIds || []
      })
      .select()
      .single();

    if (error) {
      console.error('Error recording stage change:', error);
      throw error;
    }

    console.log('Stage change recorded:', record.id);
    return record;
  } catch (error) {
    console.error('Error in recordStageChange:', error);
    throw error;
  }
}

/**
 * Get recent stage changes within grace period for an opportunity
 * @param {string} opportunityId - GHL opportunity ID
 * @returns {Promise<Array>} Array of recent stage changes
 */
async function getRecentStageChanges(opportunityId) {
  try {
    const gracePeriodStart = new Date(Date.now() - STAGE_CHANGE_GRACE_PERIOD_MS).toISOString();

    const { data, error } = await supabase
      .from('opportunity_stage_changes')
      .select('*')
      .eq('opportunity_id', opportunityId)
      .gte('created_at', gracePeriodStart)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching recent stage changes:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getRecentStageChanges:', error);
    throw error;
  }
}

/**
 * Delete a task from GHL
 * @param {string} contactId - GHL contact ID
 * @param {string} taskId - GHL task ID
 * @returns {Promise<boolean>} True if deleted successfully
 */
async function deleteGHLTask(contactId, taskId) {
  const apiKey = process.env.GHL_API_KEY;

  if (!apiKey) {
    throw new Error('GHL_API_KEY not configured in environment variables');
  }

  try {
    await axios.delete(
      `https://services.leadconnectorhq.com/contacts/${contactId}/tasks/${taskId}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Version': '2021-07-28'
        }
      }
    );

    console.log(`GHL Task ${taskId} deleted successfully`);
    return true;
  } catch (error) {
    console.error('Error deleting GHL task:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Delete tasks from previous stage change within grace period
 * @param {string} opportunityId - GHL opportunity ID
 * @param {string} contactId - GHL contact ID
 * @returns {Promise<Object>} Result with count of deleted tasks
 */
async function deletePreviousStageTasks(opportunityId, contactId) {
  try {
    const recentChanges = await getRecentStageChanges(opportunityId);

    if (recentChanges.length === 0) {
      console.log('No recent stage changes within grace period');
      return { deletedCount: 0, taskIds: [] };
    }

    // Get the most recent stage change (excluding the current one we're about to create)
    const previousChange = recentChanges[0];
    const taskIds = previousChange.task_ids || [];

    if (taskIds.length === 0) {
      console.log('No tasks to delete from previous stage change');
      return { deletedCount: 0, taskIds: [] };
    }

    console.log(`Found ${taskIds.length} tasks to delete from previous stage change`);

    let deletedCount = 0;
    for (const taskId of taskIds) {
      try {
        await deleteGHLTask(contactId, taskId);
        deletedCount++;
      } catch (deleteError) {
        console.error(`Failed to delete task ${taskId}:`, deleteError.message);
        // Continue with other tasks even if one fails
      }
    }

    // Remove the old stage change record since we've handled it
    await supabase
      .from('opportunity_stage_changes')
      .delete()
      .eq('id', previousChange.id);

    console.log(`Deleted ${deletedCount} out of ${taskIds.length} tasks from previous stage`);
    return { deletedCount, taskIds };
  } catch (error) {
    console.error('Error in deletePreviousStageTasks:', error);
    throw error;
  }
}

/**
 * Update the task_ids for a stage change record
 * @param {string} recordId - Stage change record ID
 * @param {Array} taskIds - Array of task IDs to store
 * @returns {Promise<void>}
 */
async function updateStageChangeTaskIds(recordId, taskIds) {
  try {
    const { error } = await supabase
      .from('opportunity_stage_changes')
      .update({ task_ids: taskIds })
      .eq('id', recordId);

    if (error) {
      console.error('Error updating stage change task IDs:', error);
      throw error;
    }

    console.log(`Updated stage change ${recordId} with ${taskIds.length} task IDs`);
  } catch (error) {
    console.error('Error in updateStageChangeTaskIds:', error);
    throw error;
  }
}

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
      dueDate: calculateDueDate(taskData),
      completed: false
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
 * Uses EST (America/New_York) timezone
 * @param {Object} taskData - Task data with due_date_value and due_date_time_relation
 * @returns {string} ISO date string for due date
 */
function calculateDueDate(taskData) {
  // Get current time in EST (America/New_York timezone)
  const now = new Date();
  const estTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));

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

  const dueDate = new Date(estTime.getTime() + milliseconds);

  // Log for debugging
  console.log(`Calculating due date in EST: Current EST time: ${estTime.toISOString()}, Due date: ${dueDate.toISOString()}`);

  return dueDate.toISOString();
}

/**
 * Process opportunity stage change and create tasks
 * Implements 2-minute grace period: if stage changes again within 2 minutes,
 * tasks from the previous stage change are deleted.
 * @param {Object} webhookData - Webhook data from GHL
 * @returns {Promise<Object>} Processing result
 */
async function processOpportunityStageChange(webhookData) {
  try {
    const { opportunityId, stageName, stageId, contactId, pipelineId, previousStageName, previousStageId, opportunityName } = webhookData;

    if (!opportunityId || !stageName) {
      throw new Error('Missing required fields: opportunityId or stageName');
    }

    console.log(`Processing opportunity ${opportunityId} - Stage: ${stageName}`);

    // Step 1: Check for recent stage changes within grace period and delete their tasks
    let deletionResult = { deletedCount: 0, taskIds: [] };
    if (contactId) {
      console.log('Checking for recent stage changes within 2-minute grace period...');
      deletionResult = await deletePreviousStageTasks(opportunityId, contactId);
      if (deletionResult.deletedCount > 0) {
        console.log(`Grace period cleanup: Deleted ${deletionResult.deletedCount} tasks from previous stage change`);
      }
    }

    // Step 2: Get tasks for this stage from Supabase
    const tasks = await getTasksForStage(stageName);

    if (tasks.length === 0) {
      console.log(`No tasks configured for stage: ${stageName}`);
      // Still record the stage change even if no tasks, so we can track if user changes again
      await recordStageChange({
        opportunityId,
        opportunityName: opportunityName || null,
        previousStage: previousStageName || null,
        previousStageId: previousStageId || null,
        newStage: stageName,
        newStageId: stageId || null,
        taskIds: []
      });
      return {
        success: true,
        message: 'No tasks to create for this stage',
        tasksCreated: 0,
        tasksDeleted: deletionResult.deletedCount
      };
    }

    // Step 3: Record this stage change BEFORE creating tasks
    const stageChangeRecord = await recordStageChange({
      opportunityId,
      opportunityName: opportunityName || null,
      previousStage: previousStageName || null,
      previousStageId: previousStageId || null,
      newStage: stageName,
      newStageId: stageId || null,
      taskIds: [] // Will update after tasks are created
    });

    // Step 4: Create tasks in GHL
    const createdTasks = [];
    const createdTaskIds = [];
    for (const task of tasks) {
      try {
        const createdTask = await createGHLTask(task, opportunityId, contactId);
        createdTasks.push(createdTask);
        // Extract task ID from response
        if (createdTask.task?.id) {
          createdTaskIds.push(createdTask.task.id);
        } else if (createdTask.id) {
          createdTaskIds.push(createdTask.id);
        }
      } catch (taskError) {
        console.error(`Error creating task ${task.task_number}:`, taskError.message);
        // Continue creating other tasks even if one fails
      }
    }

    // Step 5: Update the stage change record with created task IDs
    if (createdTaskIds.length > 0) {
      await updateStageChangeTaskIds(stageChangeRecord.id, createdTaskIds);
    }

    console.log(`Successfully created ${createdTasks.length} out of ${tasks.length} tasks`);

    return {
      success: true,
      message: `Created ${createdTasks.length} tasks for stage: ${stageName}`,
      tasksCreated: createdTasks.length,
      totalTasks: tasks.length,
      tasks: createdTasks,
      tasksDeleted: deletionResult.deletedCount,
      gracePeriodApplied: deletionResult.deletedCount > 0
    };
  } catch (error) {
    console.error('Error in processOpportunityStageChange:', error);
    throw error;
  }
}

/**
 * Update opportunity pipeline and stage
 * @param {string} opportunityId - GHL opportunity ID
 * @param {string} pipelineId - Target pipeline ID
 * @param {string} stageId - Target stage ID
 * @returns {Promise<Object>} API response
 */
async function updateOpportunityStage(opportunityId, pipelineId, stageId) {
  const apiKey = process.env.GHL_API_KEY;

  if (!apiKey) {
    throw new Error('GHL_API_KEY not configured in environment variables');
  }

  try {
    const payload = {
      pipelineId: pipelineId,
      pipelineStageId: stageId
    };

    const response = await axios.put(
      `https://services.leadconnectorhq.com/opportunities/${opportunityId}`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28'
        }
      }
    );

    console.log('Opportunity stage updated successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error updating opportunity stage:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Search for opportunities by contact ID
 * @param {string} contactId - GHL contact ID
 * @param {string} locationId - GHL location ID
 * @returns {Promise<Array>} Array of opportunities for the contact
 */
async function searchOpportunitiesByContact(contactId, locationId) {
  const apiKey = process.env.GHL_API_KEY;

  if (!apiKey) {
    throw new Error('GHL_API_KEY not configured in environment variables');
  }

  try {
    const response = await axios.get(
      `https://services.leadconnectorhq.com/opportunities/search`,
      {
        params: {
          location_id: locationId,
          contact_id: contactId
        },
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Version': '2021-07-28'
        }
      }
    );

    console.log(`Found ${response.data.opportunities?.length || 0} opportunities for contact ${contactId}`);
    return response.data.opportunities || [];
  } catch (error) {
    console.error('Error searching opportunities:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Get all tasks for a contact
 * @param {string} contactId - GHL contact ID
 * @returns {Promise<Array>} Array of tasks
 */
async function getContactTasks(contactId) {
  const apiKey = process.env.GHL_API_KEY;

  if (!apiKey) {
    throw new Error('GHL_API_KEY not configured in environment variables');
  }

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

    return response.data.tasks || [];
  } catch (error) {
    console.error('Error fetching contact tasks:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Check if contact has any appointments
 * @param {string} contactId - GHL contact ID
 * @returns {Promise<boolean>} True if appointments exist
 */
async function checkContactAppointments(contactId) {
  const apiKey = process.env.GHL_API_KEY;

  if (!apiKey) {
    throw new Error('GHL_API_KEY not configured in environment variables');
  }

  try {
    const response = await axios.get(
      `https://services.leadconnectorhq.com/contacts/${contactId}/appointments`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Version': '2021-07-28'
        }
      }
    );

    const appointments = response.data.events || response.data.appointments || [];
    const hasAppointments = appointments.length > 0;

    console.log(`Contact ${contactId} has ${appointments.length} appointment(s)`);
    return hasAppointments;
  } catch (error) {
    console.error('Error checking appointments:', error.response?.data || error.message);
    // Return false on error (default to no appointments)
    return false;
  }
}

/**
 * Check for appointments with retry logic (5s, 30s, 60s delays)
 * @param {string} contactId - GHL contact ID
 * @returns {Promise<boolean>} True if appointments found after retries
 */
async function checkAppointmentsWithRetry(contactId) {
  const delays = [5000, 30000, 60000]; // 5s, 30s, 60s

  for (let i = 0; i < delays.length; i++) {
    console.log(`Waiting ${delays[i]/1000} seconds before checking appointments (attempt ${i + 1}/3)...`);
    await new Promise(resolve => setTimeout(resolve, delays[i]));

    const hasAppointments = await checkContactAppointments(contactId);

    if (hasAppointments) {
      console.log(`✅ Appointments found on attempt ${i + 1}`);
      return true;
    }

    console.log(`❌ No appointments found on attempt ${i + 1}`);
  }

  console.log('No appointments found after all retries');
  return false;
}

/**
 * Get opportunity details by ID
 * @param {string} opportunityId - GHL opportunity ID
 * @returns {Promise<Object>} Opportunity details
 */
async function getOpportunityById(opportunityId) {
  const apiKey = process.env.GHL_API_KEY;

  if (!apiKey) {
    throw new Error('GHL_API_KEY not configured in environment variables');
  }

  try {
    const response = await axios.get(
      `https://services.leadconnectorhq.com/opportunities/${opportunityId}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Version': '2021-07-28'
        }
      }
    );

    return response.data.opportunity || response.data;
  } catch (error) {
    console.error('Error getting opportunity:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Check if opportunity is still in the same stage with retry logic (30s, 60s delays)
 * @param {string} opportunityId - GHL opportunity ID
 * @param {string} expectedPipelineId - Expected pipeline ID
 * @param {string} expectedStageId - Expected stage ID
 * @returns {Promise<boolean>} True if opportunity moved to different stage, false if still in same stage
 */
async function checkOpportunityStageWithRetry(opportunityId, expectedPipelineId, expectedStageId) {
  const delays = [30000, 60000]; // 30s, 60s

  for (let i = 0; i < delays.length; i++) {
    console.log(`Waiting ${delays[i]/1000} seconds before checking opportunity stage (attempt ${i + 1}/2)...`);
    await new Promise(resolve => setTimeout(resolve, delays[i]));

    const opportunity = await getOpportunityById(opportunityId);
    const currentPipelineId = opportunity.pipelineId;
    const currentStageId = opportunity.pipelineStageId;

    console.log(`Current stage: Pipeline ${currentPipelineId}, Stage ${currentStageId}`);
    console.log(`Expected stage: Pipeline ${expectedPipelineId}, Stage ${expectedStageId}`);

    // Check if opportunity has moved to a different stage
    if (currentPipelineId !== expectedPipelineId || currentStageId !== expectedStageId) {
      console.log(`✅ Opportunity has moved from original stage (attempt ${i + 1})`);
      return true; // Opportunity has moved
    }

    console.log(`❌ Opportunity still in same stage (attempt ${i + 1})`);
  }

  console.log('Opportunity still in same stage after all retries');
  return false; // Still in same stage
}

/**
 * Process task completion and check if opportunity should be moved
 * @param {Object} taskData - Task completion webhook data
 * @returns {Promise<Object>} Processing result
 */
async function processTaskCompletion(taskData) {
  try {
    const { contactId, title } = taskData;
    let { opportunityId, taskId } = taskData;

    console.log(`Processing task completion: Task "${title}", Contact ${contactId}, Opportunity ${opportunityId}`);

    if (!contactId) {
      console.log('Missing contactId, skipping');
      return { success: true, message: 'No contact to process' };
    }

    // If no opportunityId provided, search for it using contactId
    if (!opportunityId) {
      console.log('No opportunityId provided, searching by contactId...');
      const locationId = process.env.GHL_LOCATION_ID;

      try {
        const opportunities = await searchOpportunitiesByContact(contactId, locationId);
        console.log(`Search returned ${opportunities?.length || 0} opportunities:`, JSON.stringify(opportunities, null, 2));

        if (!opportunities || opportunities.length === 0) {
          console.log('No opportunities found for this contact');
          return { success: true, message: 'No opportunity found for contact' };
        }

        // Use the first open opportunity (you can add more logic here if needed)
        const openOpportunity = opportunities.find(opp => opp.status === 'open');
        opportunityId = openOpportunity?.id || opportunities[0].id;

        // Get stage info from the search result
        const selectedOpp = openOpportunity || opportunities[0];
        console.log(`Selected opportunity:`, JSON.stringify(selectedOpp, null, 2));
        console.log(`Found opportunity: ${opportunityId}`);
      } catch (searchError) {
        console.error('Error searching for opportunity:', searchError.message);
        throw searchError;
      }
    }

    // Get opportunity details to find current stage
    const apiKey = process.env.GHL_API_KEY;
    const oppResponse = await axios.get(
      `https://services.leadconnectorhq.com/opportunities/${opportunityId}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Version': '2021-07-28'
        }
      }
    );

    console.log('Opportunity API response:', JSON.stringify(oppResponse.data, null, 2));

    // Data is nested under 'opportunity' object
    const opportunityData = oppResponse.data.opportunity || oppResponse.data;
    const currentStageId = opportunityData.pipelineStageId || opportunityData.stageId;
    const currentPipelineId = opportunityData.pipelineId;

    console.log(`Current opportunity stage: ${currentStageId}, pipeline: ${currentPipelineId}`);

    // Check if this is the final task that should trigger opportunity move
    const finalTaskTitle = "Final follow-up call—if no answer, send final text and close the matter.";

    console.log(`Checking if task "${title}" matches final task: "${finalTaskTitle}"`);

    if (title !== finalTaskTitle) {
      console.log('Not the final task, skipping opportunity move');
      return { success: true, message: 'Not the final task' };
    }

    console.log('Final task completed, proceeding to move opportunity');

    // This was the final task - check if we should move the opportunity
    const { data: mappings, error } = await supabase
      .from('stage_completion_mappings')
      .select('*')
      .eq('source_stage_id', currentStageId)
      .eq('active', true)
      .limit(1);

    if (error) {
      console.error('Error fetching stage mapping:', error);
      throw error;
    }

    if (!mappings || mappings.length === 0) {
      console.log(`No mapping found for stage ${currentStageId}`);
      return { success: true, message: 'No stage mapping configured' };
    }

    const mapping = mappings[0];

    // Check if target stage ID is available
    if (!mapping.target_stage_id) {
      console.log(`Target stage ID not configured for ${mapping.source_stage_name}`);
      return { success: true, message: 'Target stage ID not configured yet' };
    }

    console.log(`Moving opportunity to pipeline ${mapping.target_pipeline_id}, stage ${mapping.target_stage_id}`);

    // Move the opportunity
    await updateOpportunityStage(
      opportunityId,
      mapping.target_pipeline_id,
      mapping.target_stage_id
    );

    return {
      success: true,
      message: `Opportunity moved to ${mapping.target_pipeline_name} - ${mapping.target_stage_name}`,
      movedTo: {
        pipelineId: mapping.target_pipeline_id,
        pipelineName: mapping.target_pipeline_name,
        stageId: mapping.target_stage_id,
        stageName: mapping.target_stage_name
      }
    };
  } catch (error) {
    console.error('Error in processTaskCompletion:', error);
    throw error;
  }
}

module.exports = {
  getTasksForStage,
  createGHLTask,
  deleteGHLTask,
  processOpportunityStageChange,
  processTaskCompletion,
  updateOpportunityStage,
  searchOpportunitiesByContact,
  checkContactAppointments,
  checkAppointmentsWithRetry,
  getOpportunityById,
  checkOpportunityStageWithRetry,
  // Grace period functions
  recordStageChange,
  getRecentStageChanges,
  deletePreviousStageTasks,
  updateStageChangeTaskIds,
  STAGE_CHANGE_GRACE_PERIOD_MS
};
