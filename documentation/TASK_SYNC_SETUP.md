# Task Sync Setup Guide

This guide explains how to sync GHL tasks to Supabase using webhooks.

## Overview

Since GHL doesn't support creating tasks directly for custom objects via API, we've created a workaround that:
1. Receives task creation webhooks from GHL
2. Syncs task data to Supabase
3. Allows you to manually link tasks to custom objects in your own database

## Setup Steps

### 1. Create Supabase Table

Run the migration to create the tasks table:

```bash
# Copy the SQL from supabase/migrations/create_tasks_table.sql
# Run it in your Supabase SQL editor
```

Or manually execute:
```sql
-- See: supabase/migrations/create_tasks_table.sql
```

### 2. Configure GHL Webhook

1. Go to GHL → Settings → Integrations → Webhooks
2. Create a new webhook with:
   - **Event**: Task Created
   - **URL**: `https://your-domain.com/webhooks/ghl/task-created`
   - **Method**: POST
   - **Content-Type**: application/json

### 3. Start Your Server

```bash
npm start
# Server will run on http://localhost:3000
```

### 4. Test the Webhook

```bash
# Test with sample data
node scripts/test-task-webhook.js
```

## Webhook Endpoint

**POST** `/webhooks/ghl/task-created`

### Expected Payload from GHL:

```json
{
  "id": "task-id-123",
  "title": "Task Title",
  "body": "Task description",
  "contactId": "contact-id-456",
  "assignedTo": "user-id-789",
  "dueDate": "2025-11-15T10:00:00.000Z",
  "completed": false,
  "dateAdded": "2025-11-13T10:00:00.000Z"
}
```

### What Gets Stored in Supabase:

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Auto-generated Supabase ID |
| `ghl_task_id` | TEXT | GHL task ID (unique) |
| `ghl_contact_id` | TEXT | Associated contact ID |
| `task_name` | TEXT | Task title/name |
| `task_description` | TEXT | Task body/description |
| `assignee_name` | TEXT | Assignee's full name (fetched from GHL) |
| `assignee_id` | TEXT | GHL user ID |
| `due_date` | TIMESTAMPTZ | Task due date |
| `completed` | BOOLEAN | Task completion status |
| `created_at` | TIMESTAMPTZ | When synced to Supabase |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

## Linking Tasks to Custom Objects

Since tasks are stored in Supabase, you can create your own relationship table:

### Option 1: Create a join table

```sql
CREATE TABLE task_custom_object_relations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID REFERENCES tasks(id),
    custom_object_type TEXT, -- e.g., 'workshop', 'project', etc.
    custom_object_id TEXT,   -- GHL custom object record ID
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Option 2: Add custom object reference to tasks table

```sql
ALTER TABLE tasks
ADD COLUMN custom_object_type TEXT,
ADD COLUMN custom_object_id TEXT;

CREATE INDEX idx_tasks_custom_object ON tasks(custom_object_type, custom_object_id);
```

## Troubleshooting

### Webhook not receiving data
- Check GHL webhook configuration
- Verify your server URL is accessible from the internet
- Check server logs: `pm2 logs` or console output

### Assignee name not appearing
- Verify `GHL_API_KEY` has permission to access user data
- Check the user exists in GHL
- Review logs for API errors

### Duplicate tasks
- The system uses `upsert` with `ghl_task_id` as unique key
- Duplicates are automatically updated, not inserted again

## Next Steps

1. Set up GHL webhook in production
2. Test with real task creation
3. Create relationships between tasks and custom objects
4. Build queries to fetch tasks for specific workshops/custom objects

## Example Queries

### Get all tasks for a specific assignee:
```sql
SELECT * FROM tasks
WHERE assignee_id = 'user-id-123'
ORDER BY due_date ASC;
```

### Get incomplete tasks:
```sql
SELECT * FROM tasks
WHERE completed = false
AND due_date > NOW()
ORDER BY due_date ASC;
```

### Get tasks by contact:
```sql
SELECT * FROM tasks
WHERE ghl_contact_id = 'contact-id-456';
```
