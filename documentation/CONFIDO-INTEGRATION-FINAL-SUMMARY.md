# Confido Integration - Final Implementation Summary

## ✅ COMPLETED - Ready for Testing!

---

## What Was Built

A complete 3-step invoice integration between GHL and Confido Legal:

**GHL Invoice Created** → **Create in Confido** → **Track Payment** → **Notify GHL**

The system now properly creates:
1. **Client** in Confido (directory entry for the contact)
2. **Matter** in Confido (directory entry for the opportunity/case)
3. **PaymentLink** in Confido (the actual invoice with payment URL)

---

## Key Changes from Original Plan

### Original Understanding:
- Confido = Simple invoice system with REST API
- Just create "invoices"

### Actual Reality:
- Confido Legal = Legal payment processing platform
- GraphQL API (not REST)
- **3-tier structure**: Clients → Matters → PaymentLinks
- PaymentLinks = "invoices" with payment URLs

---

## Complete Flow

### When GHL Invoice is Created:

```
1. GHL Webhook Received
   ↓
2. Save to Supabase (invoices table)
   ↓
3. CONFIDO STEP 1: Find or Create Client
   - Search by GHL Contact ID (externalId)
   - If not found, create new client
   - Store: Confido Client ID
   ↓
4. CONFIDO STEP 2: Find or Create Matter
   - Search by GHL Opportunity ID (externalId)
   - If not found, create new matter linked to client
   - Store: Confido Matter ID
   ↓
5. CONFIDO STEP 3: Create PaymentLink
   - Link to Client and Matter
   - Convert amounts to cents
   - Generate payment URL
   - Store: Confido PaymentLink ID
   ↓
6. Update Supabase with all Confido IDs
   - confido_client_id
   - confido_matter_id
   - confido_invoice_id (PaymentLink ID)
   - status, total, paid, outstanding
   ↓
7. Return Success Response with Payment URL
```

### When Payment is Made in Confido:

```
1. Confido Webhook Received
   ↓
2. Lookup Invoice in Supabase by confido_invoice_id
   ↓
3. Update Invoice Status to "paid" in Supabase
   ↓
4. Save Payment Transaction to confido_payments table
   ↓
5. Record Payment in GHL Invoice (NEW!)
   - POST /invoices/{invoiceId}/record-payment
   - Updates invoice status to "paid" in GHL
   - Includes Confido payment ID as transaction reference
   ↓
6. Create Task in GHL
   - "Payment Received: $X"
   - Link to opportunity
   ↓
7. Return Success
```

---

## Database Schema

### Invoices Table - Updated

```sql
CREATE TABLE public.invoices (
    id UUID PRIMARY KEY,

    -- GHL Identifiers
    ghl_invoice_id TEXT UNIQUE NOT NULL,
    ghl_opportunity_id TEXT,
    ghl_contact_id TEXT,

    -- Display Names
    opportunity_name TEXT,
    primary_contact_name TEXT,

    -- Confido Identifiers (NEW!)
    confido_invoice_id TEXT UNIQUE,      -- PaymentLink ID
    confido_client_id TEXT,               -- Client ID in directory
    confido_matter_id TEXT,               -- Matter ID in directory

    -- Invoice Details
    invoice_number TEXT,
    amount_due DECIMAL(10,2) NOT NULL,
    amount_paid DECIMAL(10,2) DEFAULT 0.00,
    status TEXT DEFAULT 'pending',

    -- Dates
    invoice_date TIMESTAMPTZ,
    due_date TIMESTAMPTZ,
    paid_date TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Confido Directory Structure

When an invoice is created, these entries appear in Confido:

### Clients Directory
```
Client Name: John Doe
Email: john@example.com
Phone: (555) 123-4567
External ID: ghl-contact-abc123
```

### Matters Directory
```
Matter Name: Estate Planning for John Doe
Client: John Doe
External ID: ghl-opportunity-xyz789
```

### PaymentLinks (Invoices)
```
Client: John Doe
Matter: Estate Planning for John Doe
Total: $2,500.00
Outstanding: $2,500.00
Paid: $0.00
Status: unpaid
Payment URL: https://pay.gravity-legal.com/abc123
```

---

## API Response Example

When an invoice is successfully created, you get:

```json
{
  "success": true,
  "message": "Invoice created successfully in both systems",
  "invoiceId": "uuid-from-supabase",
  "ghlInvoiceId": "ghl-invoice-123",
  "confido": {
    "invoiceId": "paymentLink_abc123",
    "clientId": "client_def456",
    "matterId": "matter_ghi789",
    "paymentUrl": "https://pay.gravity-legal.com/abc123",
    "status": "unpaid",
    "total": 2500.00,
    "paid": 0.00,
    "outstanding": 2500.00
  },
  "amountDue": 2500.00
}
```

---

## What Gets Tracked

### Status Tracking
- **Source**: Always "GHL" (where invoice originates)
- **Status**: `paid` or `unpaid` (calculated from Confido balance)
- **Total**: Total amount of invoice
- **Outstanding**: Amount still owed
- **Paid**: Amount already paid
- **Client Name**: From Confido client
- **Opportunity Name**: From Confido matter
- **Due Date**: From GHL invoice

### The Balance Object

Confido tracks two types of funds:
- **Operating**: Regular business funds
- **Trust**: Client trust account funds (lawyers use this)

We use the **total** values:
- `balance.totalOutstanding` - Still owed
- `balance.totalPaid` - Already paid
- Total = Outstanding + Paid

---

## Testing

### Test Connection

```bash
node -e "require('./services/confidoService').testConnection().then(console.log)"
```

**Expected Output:**
```
=== Testing Confido API Connection ===
✅ Confido API connection successful
true
```

### Test Invoice Creation

```bash
node scripts/test-ghl-invoice-webhook.js
```

**Expected Output:**
```
=== GHL INVOICE CREATED WEBHOOK RECEIVED ===
Creating Complete Invoice in Confido (Client → Matter → PaymentLink)

📋 STEP 1: Client
✅ Client ready: client_abc123 (new)

📋 STEP 2: Matter (Opportunity)
✅ Matter ready: matter_def456 (new)

📋 STEP 3: PaymentLink (Invoice)
✅ PaymentLink created in Confido successfully
Confido PaymentLink ID: paymentLink_ghi789
Payment URL: https://pay.gravity-legal.com/...
Status: unpaid
Total: $2500.00

✅ Invoice saved to Supabase
✅ TEST PASSED
```

---

## Important Notes

### 1. Amounts in Cents

Confido requires amounts as **integers in cents**:
```javascript
// ❌ Wrong
amounts: [{ amount: 25.50, description: "Service" }]

// ✅ Correct
amounts: [{ amount: 2550, description: "Service" }]
```

The service handles conversion automatically:
```javascript
Math.round(dollarAmount * 100) // Converts to cents
```

### 2. External IDs for Linking

The system uses `externalId` to link entities:

| Confido Entity | externalId Contains | Purpose |
|----------------|---------------------|---------|
| Client | GHL Contact ID | Find existing client |
| Matter | GHL Opportunity ID | Find existing matter |
| PaymentLink | GHL Invoice ID | Track invoice origin |

This allows:
- Avoiding duplicate clients/matters
- Linking payments back to GHL invoices
- Syncing updates between systems

### 3. Status Calculation

Status is calculated from the balance:
```javascript
status = (outstanding === 0) ? 'paid' : 'unpaid'
```

Not using Confido's `status` field because it may have other values.

### 4. Reusing Clients and Matters

The service is smart:
- **First time**: Creates client + matter + paymentlink
- **Second invoice, same contact**: Reuses client + matter, creates new paymentlink
- **Third invoice, same contact**: Reuses client + matter, creates new paymentlink

This keeps Confido directory clean!

---

## Configuration

### Environment Variables (Already Set ✅)

```env
CONFIDO_API_URL=https://api.gravity-legal.com/
CONFIDO_API_KEY=f_secret_production_...
CONFIDO_WEBHOOK_SECRET=
```

### Webhooks to Configure

#### 1. GHL Webhook (Create in GHL Dashboard)
- **Trigger**: Invoice Created
- **URL**: `https://shlf-main-automation-ywgsu.ondigitalocean.app/webhooks/ghl/invoice-created`

#### 2. Confido Webhook (Create in Confido Dashboard)
- **Trigger**: Payment Completed / Payment Created
- **URL**: `https://shlf-main-automation-ywgsu.ondigitalocean.app/webhooks/confido/payment-received`

---

## What to Expect in Confido Dashboard

After creating a test invoice, you'll see:

### Clients Section
- New client entry with name, email, phone
- External ID will show GHL contact ID

### Matters Section
- New matter entry linked to the client
- Matter name will be the opportunity name
- External ID will show GHL opportunity ID

### PaymentLinks Section
- New payment link (invoice)
- Linked to client and matter
- Shows balance, status, payment URL
- Can be sent to client for payment

---

## Next Steps

1. **✅ Migration Applied** - Database tables ready
2. **✅ Service Updated** - 3-step flow implemented
3. **✅ Webhook Updated** - Handles all Confido IDs
4. **⏳ Configure GHL Webhook** - Point to your endpoint
5. **⏳ Configure Confido Webhook** - Point to your endpoint
6. **⏳ Test with Real Invoice** - Create test invoice in GHL
7. **⏳ Verify in Confido** - Check client, matter, paymentlink created
8. **⏳ Test Payment** - Make test payment, verify webhook

---

## Support & Debugging

### Check Logs

```bash
# View server logs
pm2 logs

# Or if running directly
npm start
```

### Common Issues

**Issue**: "Client not found" or "Matter not found"
- **Solution**: Service handles this automatically by creating them

**Issue**: GraphQL Error about required fields
- **Check**: Ensure contactName and opportunityName are provided

**Issue**: Amount shows as $0.00 in Confido
- **Check**: Verify amount is in cents (multiply by 100)

**Issue**: Webhook not received
- **Check**: Webhook URL is accessible
- **Check**: Webhook is configured in dashboard
- **Test**: Use test scripts first

---

## Files Modified

✅ `.env` - Added Confido credentials
✅ `services/confidoService.js` - Complete rewrite for 3-step flow
✅ `services/invoiceService.js` - Added client and matter ID fields
✅ `services/ghlService.js` - Added recordInvoicePayment() and getInvoice() functions
✅ `server.js` - Updated webhooks to use new flow with GHL payment recording
✅ Supabase migrations - Added confido_client_id and confido_matter_id columns

---

## Summary

The integration is **COMPLETE** and ready for testing!

**What it does:**
- ✅ Creates clients in Confido directory
- ✅ Creates matters (opportunities) in Confido directory
- ✅ Creates payment links (invoices) with payment URLs
- ✅ Tracks status (paid/unpaid) with balance details
- ✅ Stores all IDs for bi-directional sync
- ✅ Handles payment webhooks from Confido
- ✅ Records payments in GHL invoices (updates invoice to "paid")
- ✅ Creates GHL tasks when payments received

**What you need to do:**
1. Configure webhooks in GHL and Confido dashboards
2. Test with a real invoice
3. Verify everything appears correctly in Confido

**Ready to go!** 🚀
