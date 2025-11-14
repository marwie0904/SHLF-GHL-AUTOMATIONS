# Task Sync Setup Checklist

## ✅ Prerequisites Done
- [x] Webhook endpoint created
- [x] Task service implemented
- [x] Migration SQL file created
- [x] Server deployed to DigitalOcean

## 🔲 Remaining Setup Steps

### Step 1: Run Supabase Migration
- [ ] Open Supabase Dashboard: https://app.supabase.com
- [ ] Navigate to **SQL Editor**
- [ ] Click **New Query**
- [ ] Copy SQL from: `supabase/migrations/create_tasks_table.sql`
- [ ] Paste and click **RUN**
- [ ] Verify success message

**Verify table created:**
```sql
SELECT * FROM tasks LIMIT 1;
```

### Step 2: Configure GHL Webhook
- [ ] Login to GoHighLevel
- [ ] Go to **Settings** → **Integrations** → **Webhooks**
- [ ] Click **Add Webhook**
- [ ] Configure:
  - Name: `Task Created - Supabase Sync`
  - Event: `Task Created`
  - URL: `https://shlf-ghl-automations-zsl6v.ondigitalocean.app/webhooks/ghl/task-created`
  - Method: `POST`
  - Content-Type: `application/json`
- [ ] Click **Save**
- [ ] Toggle webhook to **Active**

### Step 3: Test the Integration
- [ ] Create a test task in GHL:
  - Title: "Test Task - Webhook Sync"
  - Description: "Testing Supabase sync"
  - Assign to: (select a user)
  - Due Date: (any future date)
  - Contact: (select any contact)
- [ ] Save the task
- [ ] Wait 5-10 seconds
- [ ] Check Supabase:
  ```sql
  SELECT * FROM tasks ORDER BY created_at DESC LIMIT 1;
  ```
- [ ] Verify the task appears with all fields populated

### Step 4: Verify Server Logs (Optional)
- [ ] SSH to DigitalOcean or check console
- [ ] Run: `pm2 logs`
- [ ] Look for: `=== GHL TASK CREATED WEBHOOK RECEIVED ===`
- [ ] Verify: `Task synced successfully to Supabase`

## 🎯 Success Criteria

You'll know it's working when:
- ✅ Task appears in Supabase `tasks` table within seconds of creation in GHL
- ✅ All fields are populated (name, description, assignee name, assignee ID, due date)
- ✅ No errors in server logs
- ✅ Webhook shows "successful" status in GHL (if available)

## 📊 Quick Verification Query

Run this in Supabase to see all synced tasks:

```sql
SELECT
    task_name,
    assignee_name,
    TO_CHAR(due_date, 'YYYY-MM-DD HH24:MI') as due_date,
    completed,
    TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI') as synced_at
FROM tasks
ORDER BY created_at DESC
LIMIT 10;
```

## 🐛 If Something Goes Wrong

### Migration fails
- Check if table already exists: `SELECT * FROM tasks;`
- Drop and recreate: `DROP TABLE IF EXISTS tasks CASCADE;` then re-run migration

### Webhook not receiving
- Test server health: `curl https://shlf-ghl-automations-zsl6v.ondigitalocean.app/health`
- Check GHL webhook is Active/Enabled
- Verify URL exactly matches

### Task syncs but missing data
- **No assignee name**: Check `GHL_API_KEY` permissions
- **No due date**: Ensure task has due date set in GHL
- **No description**: Task body might be empty

## 📚 Documentation References

- [GHL Webhook Configuration](./GHL_WEBHOOK_CONFIGURATION.md)
- [Task Sync Setup Guide](./TASK_SYNC_SETUP.md)

## 🚀 Next Steps After Setup

Once tasks are syncing:

1. **Link tasks to workshops/custom objects**
   - Create a join table in Supabase
   - Or add custom object fields to tasks table

2. **Build queries for your app**
   - Get tasks for specific workshop
   - Get tasks by assignee
   - Get overdue tasks

3. **Optional enhancements**
   - Add webhook for task updates
   - Add webhook for task completion
   - Create dashboard to view tasks
