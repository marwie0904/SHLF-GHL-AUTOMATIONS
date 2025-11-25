# Quick Start Guide - GHL + Confido Invoice Integration

## 🚀 What Was Built

A complete invoice tracking system between GoHighLevel (GHL) and Confido:
- ✅ When invoice is created in GHL → Auto-creates in Confido
- ✅ When payment received in Confido → Updates invoice status & notifies GHL
- ✅ All data stored in Supabase for tracking

---

## 📋 Implementation Checklist

### Step 1: Database Setup ✅ DONE
- [x] Created `invoices` table in Supabase
- [x] Created `confido_payments` table in Supabase
- [ ] **YOU NEED TO DO**: Run the migration

```bash
# Option 1: Using Supabase CLI
supabase db push

# Option 2: Manual
# Go to Supabase dashboard → SQL Editor
# Copy/paste contents of: supabase/migrations/create_invoices_and_payments_tables.sql
# Click "Run"
```

---

### Step 2: Environment Variables ✅ DONE
- [x] Added Confido variables to `.env.example`
- [ ] **YOU NEED TO DO**: Add to your actual `.env` file

Add these to `.env`:
```env
CONFIDO_API_URL=https://api.confido.com
CONFIDO_API_KEY=your_actual_api_key_here
CONFIDO_WEBHOOK_SECRET=your_webhook_secret_here
```

---

### Step 3: Update Confido API Integration ⚠️ NEEDS YOUR INPUT

The Confido service is ready but needs actual API details:

**File to update**: `services/confidoService.js`

**What to update:**
1. **API Endpoints** (lines 36, 59, 82):
   - Replace placeholder URLs with actual Confido API endpoints
   - Check Confido API docs for correct paths

2. **Payload Structure** (lines 30-40):
   - Update the invoice creation payload to match Confido's API
   - Add/remove fields based on Confido requirements

3. **Webhook Signature** (line 117):
   - Update signature verification logic
   - Check Confido docs for signing algorithm (HMAC SHA256, etc.)

---

### Step 4: Configure Webhooks 🔧 YOUR ACTION REQUIRED

#### A. Set up GHL Webhook

1. Log into GoHighLevel
2. Go to: **Settings → Integrations → Webhooks**
3. Click **Create Webhook**
4. Configure:
   - **Name**: Invoice Created - Confido Sync
   - **Trigger**: Invoice Created
   - **URL**: `https://shlf-main-automation-ywgsu.ondigitalocean.app/webhooks/ghl/invoice-created`
5. **Save**

6. **Test it**: Create a test invoice in GHL
7. **Verify**: Check server logs to see webhook received

#### B. Set up Confido Webhook

1. Log into Confido
2. Find webhook settings (usually under Settings/Integrations)
3. Create new webhook:
   - **Event**: Payment Received / Payment Completed
   - **URL**: `https://shlf-main-automation-ywgsu.ondigitalocean.app/webhooks/confido/payment-received`
4. **Copy the webhook secret** → Add to `.env` as `CONFIDO_WEBHOOK_SECRET`
5. **Save**

---

### Step 5: Verify GHL Webhook Payload 🔍 YOUR ACTION REQUIRED

The webhook endpoint has common field name fallbacks, but you should verify:

**File**: `server.js` (lines 745-756)

**How to verify:**
1. Create a test invoice in GHL
2. Check server logs for the webhook payload
3. Compare field names with the code
4. Update field mappings if needed

**Example log to look for:**
```
=== GHL INVOICE CREATED WEBHOOK RECEIVED ===
Full Request Body: {
  "invoice_id": "...",
  "amount_due": 1000,
  // ... other fields
}
```

---

### Step 6: Verify Confido Webhook Payload 🔍 YOUR ACTION REQUIRED

**File**: `server.js` (lines 910-916)

**How to verify:**
1. Set up Confido webhook (Step 4B)
2. Make a test payment in Confido
3. Check server logs for webhook payload
4. Update field mappings if needed

---

## 🧪 Testing

### Local Testing

**1. Start the server:**
```bash
npm start
```

**2. Test GHL Invoice Webhook:**
```bash
node scripts/test-ghl-invoice-webhook.js
```

**Expected output:**
```
✅ Webhook request successful!
✅ TEST PASSED
Invoice ID: <uuid>
GHL Invoice ID: <ghl-id>
Confido Invoice ID: <confido-id>
```

**3. Test Confido Payment Webhook:**
```bash
# First, copy the Confido Invoice ID from step 2
# Edit: scripts/test-confido-payment-webhook.js
# Update line 20 with the Confido invoice ID

node scripts/test-confido-payment-webhook.js
```

**Expected output:**
```
✅ Webhook request successful!
✅ TEST PASSED
Payment ID: <uuid>
Invoice Status: paid
```

---

## 📊 How to View Data

### Check Invoices in Supabase

```sql
-- View all invoices
SELECT * FROM invoices ORDER BY created_at DESC;

-- View paid invoices
SELECT * FROM invoices WHERE status = 'paid';

-- View pending invoices
SELECT * FROM invoices WHERE status = 'pending';
```

### Check Payments in Supabase

```sql
-- View all payments
SELECT * FROM confido_payments ORDER BY transaction_date DESC;

-- View payments with invoice details
SELECT
  p.*,
  i.invoice_number,
  i.opportunity_name,
  i.primary_contact_name
FROM confido_payments p
JOIN invoices i ON p.confido_invoice_id = i.confido_invoice_id
ORDER BY p.transaction_date DESC;
```

---

## 🐛 Troubleshooting

### Issue: Confido invoice creation fails

**Check:**
1. Is `CONFIDO_API_KEY` set in `.env`?
2. Is the API URL correct?
3. Does the payload match Confido's API spec?

**Solution:**
```bash
# Check logs for error details
# Look for: "Failed to create invoice in Confido:"

# Update services/confidoService.js with correct:
# - API endpoint URLs
# - Payload structure
# - Authentication headers
```

### Issue: Payment webhook returns 404 "Invoice not found"

**This means:** The invoice doesn't exist in Supabase or Confido ID doesn't match

**Solution:**
1. Query Supabase to check if invoice exists
2. Verify `confido_invoice_id` is populated
3. Check if Confido webhook sends the correct invoice ID field

### Issue: GHL task not created after payment

**This is usually OK** - the payment is still recorded

**To fix:**
1. Check GHL API credentials
2. Verify contact/opportunity IDs exist
3. Review logs for task creation error

---

## 📝 Important Notes

### Confido API Documentation Needed

The integration is **90% complete** but needs Confido-specific details:

**What you need from Confido:**
- ✅ API base URL
- ✅ API authentication method
- ✅ Invoice creation endpoint and payload structure
- ✅ Webhook signature algorithm
- ✅ Webhook payload structure for payments

**Where to update:**
- `services/confidoService.js` - API integration
- `server.js` (line 910-916) - Payment webhook field mapping

### Field Name Variations

The code handles common variations:
- `invoice_id` / `invoiceId` / `id`
- `amount_due` / `amountDue` / `total`
- etc.

But you should still verify the actual field names from webhook payloads.

---

## 🎯 Next Steps After Setup

1. **Run the migration** (Step 1)
2. **Add Confido credentials** to `.env` (Step 2)
3. **Update Confido API details** in `confidoService.js` (Step 3)
4. **Configure webhooks** in GHL and Confido (Step 4)
5. **Test with real data** - Create test invoice in GHL
6. **Monitor logs** - Ensure everything works
7. **Verify Supabase** - Check data is being saved

---

## 🆘 Need Help?

**Check these files:**
- `documentation/GHL-CONFIDO-INVOICE-INTEGRATION.md` - Full documentation
- Server logs - Detailed error messages and webhook payloads
- `scripts/test-*.js` - Test scripts with mock data

**Common commands:**
```bash
# View server logs
pm2 logs

# Or if running directly:
npm start

# Run tests
node scripts/test-ghl-invoice-webhook.js
node scripts/test-confido-payment-webhook.js
```

---

**Implementation Status:**
- ✅ Database schema
- ✅ Service layer
- ✅ Webhook endpoints
- ✅ Test scripts
- ⚠️ Confido API integration (needs your input)
- ⚠️ Webhook configuration (needs your setup)
