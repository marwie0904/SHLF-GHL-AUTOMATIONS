# ⚡ Quick Start - Task Sync

## 🎯 Goal
Sync GHL tasks to Supabase (since tasks can't be created for custom objects via API).

## 🚀 3-Step Setup

### Step 1: Run Migration in Supabase (2 min)
1. Open: https://app.supabase.com → SQL Editor
2. Copy all SQL from: `supabase/migrations/create_tasks_table.sql`
3. Paste and click **RUN**

### Step 2: Add GHL Webhook (2 min)
1. GHL → Settings → Integrations → Webhooks → **Add Webhook**
2. Configure:
   - Event: **Task Created**
   - URL: `https://shlf-ghl-automations-zsl6v.ondigitalocean.app/webhooks/ghl/task-created`
   - Method: **POST**
3. Save and **Enable**

### Step 3: Test (1 min)
```bash
node scripts/test-production-webhook.js
```

Or create a task in GHL and check Supabase:
```sql
SELECT * FROM tasks ORDER BY created_at DESC LIMIT 5;
```

## ✅ You're Done!

Tasks will now automatically sync from GHL → Supabase with:
- Task name
- Description
- Assignee name (auto-fetched)
- Assignee ID
- Due date
- Contact ID

## 📚 Full Docs
- [Setup Checklist](documentation/SETUP_CHECKLIST.md)
- [GHL Webhook Config](documentation/GHL_WEBHOOK_CONFIGURATION.md)
- [Complete Summary](documentation/TASK_SYNC_SUMMARY.md)

## 🐛 Issues?
```bash
# Test production endpoint
node scripts/test-production-webhook.js

# Check what's in Supabase
SELECT COUNT(*) FROM tasks;
```
