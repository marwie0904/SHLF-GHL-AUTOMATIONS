# GHL Webhook Configuration for Task Sync

## Production Webhook URL

```
https://shlf-ghl-automations-zsl6v.ondigitalocean.app/webhooks/ghl/task-created
```

## Step-by-Step Setup in GoHighLevel

### 1. Access Webhook Settings
1. Log in to your GoHighLevel account
2. Go to **Settings** (gear icon)
3. Navigate to **Integrations** or **Workflows** → **Webhooks**

### 2. Create New Webhook
Click **"Add Webhook"** or **"Create Webhook"**

### 3. Configure Webhook

| Field | Value |
|-------|-------|
| **Name** | Task Created - Supabase Sync |
| **Event Type** | Task Created (or Task Events) |
| **Webhook URL** | `https://shlf-ghl-automations-zsl6v.ondigitalocean.app/webhooks/ghl/task-created` |
| **Method** | POST |
| **Content-Type** | application/json |
| **Active** | ✅ Enabled |

### 4. Test the Webhook

After saving:
1. Create a test task in GHL
2. Assign it to someone
3. Set a due date
4. Add a description
5. Check your Supabase `tasks` table to verify the sync

## Expected Webhook Payload from GHL

GHL will send data in this format:

```json
{
  "id": "task-id-from-ghl",
  "title": "Task Title",
  "body": "Task description",
  "contactId": "contact-id-123",
  "assignedTo": "user-id-456",
  "dueDate": "2025-11-15T10:00:00.000Z",
  "completed": false,
  "dateAdded": "2025-11-13T10:00:00.000Z",
  "locationId": "your-location-id"
}
```

## What Gets Synced to Supabase

Your endpoint will:
1. ✅ Receive the task webhook
2. ✅ Extract task details
3. ✅ Fetch assignee name from GHL API (using their user ID)
4. ✅ Store in Supabase `tasks` table:
   - Task name (title)
   - Task description (body)
   - Assignee name (fetched)
   - Assignee ID
   - Due date
   - Contact ID
   - Completion status

## Verify It's Working

### Check Server Logs (DigitalOcean)
```bash
# SSH into your DigitalOcean server or use the console
pm2 logs
```

Look for:
```
=== GHL TASK CREATED WEBHOOK RECEIVED ===
Syncing task to Supabase: <task-id>
Task synced successfully to Supabase
```

### Check Supabase
Run this query in Supabase SQL Editor:

```sql
SELECT
    task_name,
    assignee_name,
    due_date,
    completed,
    created_at
FROM tasks
ORDER BY created_at DESC
LIMIT 10;
```

## Troubleshooting

### Webhook not triggering
- ✅ Verify webhook is **Active/Enabled** in GHL
- ✅ Check the event type is "Task Created"
- ✅ Verify URL is exactly: `https://shlf-ghl-automations-zsl6v.ondigitalocean.app/webhooks/ghl/task-created`
- ✅ Test your server is accessible: `curl https://shlf-ghl-automations-zsl6v.ondigitalocean.app/health`

### Webhook receiving but not syncing
- Check server logs for errors
- Verify Supabase credentials in `.env`
- Ensure `tasks` table exists in Supabase

### Assignee name not showing
- Verify `GHL_API_KEY` has user read permissions
- Check the assignee exists in GHL
- Review server logs for API errors

## Security Notes

The webhook endpoint:
- ✅ Accepts POST requests only
- ✅ Validates required fields (task ID, title)
- ✅ Returns 400/500 errors appropriately
- ⚠️ Consider adding webhook signature verification for production

## Test from Command Line

```bash
curl -X POST https://shlf-ghl-automations-zsl6v.ondigitalocean.app/webhooks/ghl/task-created \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-123",
    "title": "Test Task",
    "body": "Testing webhook",
    "contactId": "contact-123",
    "assignedTo": "user-123",
    "dueDate": "2025-11-20T10:00:00.000Z",
    "completed": false
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Task synced to Supabase successfully",
  "taskId": "test-123"
}
```
