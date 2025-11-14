# Task Sync System - Summary

## Problem Statement
GoHighLevel doesn't support creating tasks directly for custom objects via API. Tasks can only be created for contacts, and the multi-object task association feature (available in UI) is not yet exposed in the API.

## Solution
Create a webhook-based sync system that:
1. Captures task creation events from GHL via webhook
2. Syncs task data to Supabase
3. Allows custom relationships to be managed in your own database

## What Was Created

### 📁 Files Created

| File | Purpose |
|------|---------|
| `supabase/migrations/create_tasks_table.sql` | Database schema for tasks table |
| `services/ghlTaskService.js` | Service to process and sync tasks |
| `server.js` (updated) | Added webhook endpoint |
| `scripts/test-task-webhook.js` | Local testing script |
| `scripts/test-production-webhook.js` | Production endpoint test |
| `scripts/get-sample-workshop-id.js` | Helper to get workshop IDs |
| `scripts/test-task-for-custom-object.js` | API capability test (confirmed limitation) |
| `documentation/GHL_WEBHOOK_CONFIGURATION.md` | Webhook setup guide |
| `documentation/TASK_SYNC_SETUP.md` | Complete setup guide |
| `documentation/SETUP_CHECKLIST.md` | Step-by-step checklist |

### 🔗 Webhook Endpoint

**URL:** `https://shlf-ghl-automations-zsl6v.ondigitalocean.app/webhooks/ghl/task-created`

**Method:** POST

**Accepts:** GHL task creation webhook payloads

### 📊 Database Schema

**Table:** `tasks`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `ghl_task_id` | TEXT | GHL task ID (unique) |
| `ghl_contact_id` | TEXT | Associated contact |
| `task_name` | TEXT | Task title |
| `task_description` | TEXT | Task body |
| `assignee_name` | TEXT | Full name (fetched from GHL) |
| `assignee_id` | TEXT | GHL user ID |
| `due_date` | TIMESTAMPTZ | Due date |
| `completed` | BOOLEAN | Completion status |
| `created_at` | TIMESTAMPTZ | Sync timestamp |
| `updated_at` | TIMESTAMPTZ | Last update |

## Setup Steps

### 1️⃣ Run Supabase Migration
Copy SQL from `supabase/migrations/create_tasks_table.sql` and run in Supabase SQL Editor.

### 2️⃣ Configure GHL Webhook
- Event: Task Created
- URL: `https://shlf-ghl-automations-zsl6v.ondigitalocean.app/webhooks/ghl/task-created`
- Method: POST

### 3️⃣ Test
```bash
node scripts/test-production-webhook.js
```

## How It Works

```
┌─────────────────┐
│   GHL User      │
│ Creates Task    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  GHL Webhook    │
│   (Task Event)  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│ Your Server (DigitalOcean)  │
│ /webhooks/ghl/task-created  │
└────────┬────────────────────┘
         │
         ├─► Fetch assignee name from GHL API
         │
         ▼
┌─────────────────┐
│    Supabase     │
│  tasks table    │
└─────────────────┘
```

## Data Flow

1. **Task Created in GHL** → Webhook triggered
2. **Webhook received** → Extract task data
3. **Fetch assignee info** → Get full name from GHL API
4. **Sync to Supabase** → Upsert into tasks table
5. **Return success** → Confirm to GHL

## Features

✅ **Auto-sync** - Tasks sync automatically when created in GHL
✅ **Assignee names** - Automatically fetches and stores assignee full names
✅ **No duplicates** - Uses upsert based on `ghl_task_id`
✅ **Error handling** - Graceful failures with detailed logging
✅ **Timestamps** - Tracks when tasks were synced and updated
✅ **Indexes** - Optimized for fast queries

## Linking Tasks to Custom Objects

Since tasks are now in Supabase, you can create your own relationships:

### Option A: Join Table
```sql
CREATE TABLE task_workshop_relations (
    task_id UUID REFERENCES tasks(id),
    workshop_id TEXT,
    PRIMARY KEY (task_id, workshop_id)
);
```

### Option B: Direct Fields
```sql
ALTER TABLE tasks
ADD COLUMN custom_object_type TEXT,
ADD COLUMN custom_object_id TEXT;
```

## Example Queries

### Get tasks for a specific workshop
```sql
SELECT t.*
FROM tasks t
JOIN task_workshop_relations twr ON t.id = twr.task_id
WHERE twr.workshop_id = 'workshop-123';
```

### Get tasks by assignee
```sql
SELECT *
FROM tasks
WHERE assignee_id = 'user-456'
ORDER BY due_date ASC;
```

### Get overdue incomplete tasks
```sql
SELECT *
FROM tasks
WHERE completed = false
AND due_date < NOW()
ORDER BY due_date ASC;
```

## Testing Results

✅ **Confirmed:** Cannot create tasks directly for custom objects via API
✅ **Confirmed:** Cannot create task-to-custom-object associations via API
✅ **Confirmed:** Task associations limited to contacts and opportunities only
✅ **Workaround:** Webhook sync to Supabase for custom relationship management

## Next Steps

1. ✅ Run Supabase migration
2. ✅ Configure GHL webhook
3. ✅ Test with real task creation
4. 🔲 Create task-to-workshop relationship logic
5. 🔲 Build queries for your application
6. 🔲 Optional: Add task update/completion webhooks

## Resources

- **Setup Checklist:** `documentation/SETUP_CHECKLIST.md`
- **Webhook Config:** `documentation/GHL_WEBHOOK_CONFIGURATION.md`
- **Full Setup Guide:** `documentation/TASK_SYNC_SETUP.md`

## Support

If you encounter issues:
1. Check server logs: `pm2 logs`
2. Verify Supabase connection
3. Test webhook endpoint: `node scripts/test-production-webhook.js`
4. Review GHL webhook delivery logs
