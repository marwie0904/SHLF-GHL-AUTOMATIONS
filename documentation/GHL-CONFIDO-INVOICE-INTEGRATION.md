# GHL + Confido Invoice Integration

## Overview

This integration tracks invoices and payments between GoHighLevel (GHL) and Confido. When an invoice is created in GHL, it's automatically created in Confido. When a payment is received in Confido, the system updates the invoice status and creates a notification task in GHL.

---

## Architecture

### Data Flow

```
GHL Invoice Created
    ↓
Webhook → /webhooks/ghl/invoice-created
    ↓
Save to Supabase (invoices table)
    ↓
Create Invoice in Confido API
    ↓
Update Supabase with Confido Invoice ID
    ↓
Complete ✓

Confido Payment Received
    ↓
Webhook → /webhooks/confido/payment-received
    ↓
Lookup Invoice in Supabase
    ↓
Update Invoice Status to "paid"
    ↓
Save Payment to Supabase (confido_payments table)
    ↓
Create Notification Task in GHL
    ↓
Complete ✓
```

---

## Files Created

### 1. Database Migration
**File**: `supabase/migrations/create_invoices_and_payments_tables.sql`

Creates two tables:
- `invoices` - Stores invoice data from GHL and Confido
- `confido_payments` - Stores payment transactions from Confido

### 2. Service Files

**File**: `services/confidoService.js`
- `createInvoice()` - Creates invoice in Confido
- `getInvoice()` - Retrieves invoice details
- `updateInvoice()` - Updates invoice
- `verifyWebhookSignature()` - Validates webhook signatures
- `testConnection()` - Tests API connectivity

**File**: `services/invoiceService.js`
- `saveInvoiceToSupabase()` - Saves/updates invoice records
- `updateInvoicePaymentStatus()` - Marks invoice as paid
- `getInvoiceByGHLId()` - Retrieves invoice by GHL ID
- `getInvoiceByconfidoId()` - Retrieves invoice by Confido ID
- `savePaymentToSupabase()` - Saves payment transactions
- `getInvoicesByOpportunity()` - Gets all invoices for an opportunity

### 3. Webhook Endpoints

**File**: `server.js`

**Endpoint 1**: `POST /webhooks/ghl/invoice-created`
- Receives GHL invoice creation webhooks
- Saves invoice to Supabase
- Creates matching invoice in Confido
- Updates Supabase with Confido invoice ID

**Endpoint 2**: `POST /webhooks/confido/payment-received`
- Receives Confido payment webhooks
- Verifies webhook signature (if configured)
- Updates invoice status in Supabase
- Saves payment transaction record
- Creates notification task in GHL

### 4. Test Scripts

**File**: `scripts/test-ghl-invoice-webhook.js`
- Sends mock GHL invoice webhook
- Tests invoice creation flow
- Validates Supabase and Confido integration

**File**: `scripts/test-confido-payment-webhook.js`
- Sends mock Confido payment webhook
- Tests payment processing flow
- Validates invoice status update and GHL notification

---

## Setup Instructions

### 1. Run Database Migration

Run the migration to create the necessary tables in Supabase:

```bash
# Using Supabase CLI
supabase db push

# Or manually execute the SQL file in Supabase dashboard
```

### 2. Configure Environment Variables

Update your `.env` file with Confido credentials:

```env
# Confido Configuration
CONFIDO_API_URL=https://api.confido.com
CONFIDO_API_KEY=your_confido_api_key_here
CONFIDO_WEBHOOK_SECRET=your_confido_webhook_secret_here
```

**Get these values from:**
- Confido dashboard → API settings
- Confido dashboard → Webhook settings

### 3. Update Confido API Endpoints (IMPORTANT)

The Confido service uses placeholder API endpoints. Update these based on Confido's actual API documentation:

**File**: `services/confidoService.js`

- Line 36: Update `/invoices` endpoint
- Line 59: Update `/invoices/{id}` endpoint
- Line 82: Update invoice update endpoint
- Line 117: Update signature verification logic
- Line 139: Update health check endpoint

### 4. Configure Webhooks in GHL

Set up webhook in GHL to trigger on invoice creation:

1. Go to GHL Settings → Integrations → Webhooks
2. Create new webhook
3. **Trigger**: Invoice Created
4. **URL**: `https://shlf-main-automation-ywgsu.ondigitalocean.app/webhooks/ghl/invoice-created`
5. Save

### 5. Configure Webhooks in Confido

Set up webhook in Confido to trigger on payment received:

1. Go to Confido Settings → Webhooks (or equivalent)
2. Create new webhook
3. **Trigger**: Payment Received / Payment Completed
4. **URL**: `https://shlf-main-automation-ywgsu.ondigitalocean.app/webhooks/confido/payment-received`
5. Copy the webhook secret and add to `.env` as `CONFIDO_WEBHOOK_SECRET`
6. Save

### 6. Update GHL Webhook Field Names

The GHL webhook endpoint uses common field name patterns. Verify the actual field names from GHL's webhook payload and update if needed:

**File**: `server.js` (lines 745-756)

Check the actual GHL invoice webhook payload and update field mappings.

### 7. Update Confido Webhook Field Names

The Confido webhook endpoint uses common field name patterns. Verify the actual field names from Confido's webhook payload and update if needed:

**File**: `server.js` (lines 910-916)

Check the actual Confido payment webhook payload and update field mappings.

---

## Testing

### Test 1: GHL Invoice Webhook

```bash
# Make sure server is running
npm start

# In another terminal, run:
node scripts/test-ghl-invoice-webhook.js
```

**Expected Result:**
- ✅ Invoice saved to Supabase
- ✅ Invoice created in Confido (or graceful error if API not configured)
- ✅ Response contains invoice IDs

### Test 2: Confido Payment Webhook

```bash
# First, run the invoice test to create a test invoice
node scripts/test-ghl-invoice-webhook.js

# Copy the "confidoInvoiceId" from the response

# Edit scripts/test-confido-payment-webhook.js
# Update the invoice_id field (around line 20) with the copied ID

# Run the payment test
node scripts/test-confido-payment-webhook.js
```

**Expected Result:**
- ✅ Payment saved to Supabase
- ✅ Invoice status updated to "paid"
- ✅ Task created in GHL (or graceful error if not configured)
- ✅ Response contains payment details

---

## Database Schema

### `invoices` Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| ghl_invoice_id | TEXT | GHL invoice ID (unique) |
| ghl_opportunity_id | TEXT | GHL opportunity ID |
| ghl_contact_id | TEXT | GHL contact ID |
| opportunity_name | TEXT | Opportunity name |
| primary_contact_name | TEXT | Contact name |
| confido_invoice_id | TEXT | Confido invoice ID (unique) |
| invoice_number | TEXT | Invoice number |
| amount_due | DECIMAL | Total amount due |
| amount_paid | DECIMAL | Amount paid |
| status | TEXT | Invoice status (pending, paid, overdue, cancelled) |
| invoice_date | TIMESTAMPTZ | Invoice creation date |
| due_date | TIMESTAMPTZ | Payment due date |
| paid_date | TIMESTAMPTZ | Payment completion date |
| created_at | TIMESTAMPTZ | Record creation timestamp |
| updated_at | TIMESTAMPTZ | Record update timestamp |

### `confido_payments` Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| confido_payment_id | TEXT | Confido payment ID (unique) |
| confido_invoice_id | TEXT | Confido invoice ID |
| ghl_invoice_id | TEXT | GHL invoice ID |
| ghl_contact_id | TEXT | GHL contact ID |
| ghl_opportunity_id | TEXT | GHL opportunity ID |
| amount | DECIMAL | Payment amount |
| payment_method | TEXT | Payment method |
| status | TEXT | Payment status |
| transaction_date | TIMESTAMPTZ | Transaction date |
| raw_webhook_data | JSONB | Full webhook payload (for debugging) |
| created_at | TIMESTAMPTZ | Record creation timestamp |
| updated_at | TIMESTAMPTZ | Record update timestamp |

---

## Webhook URLs

### Production URLs

**GHL Invoice Webhook:**
```
https://shlf-main-automation-ywgsu.ondigitalocean.app/webhooks/ghl/invoice-created
```

**Confido Payment Webhook:**
```
https://shlf-main-automation-ywgsu.ondigitalocean.app/webhooks/confido/payment-received
```

### Local Testing URLs

```
http://localhost:3000/webhooks/ghl/invoice-created
http://localhost:3000/webhooks/confido/payment-received
```

---

## Error Handling

### Graceful Degradation

The system is designed to handle partial failures gracefully:

1. **Invoice Creation Flow:**
   - If Supabase save fails → Returns 500 error
   - If Confido creation fails → Invoice still saved in Supabase, returns success with error details

2. **Payment Processing Flow:**
   - If invoice not found → Returns 404 error
   - If GHL task creation fails → Payment still recorded, logs error

### Logging

All webhooks log:
- Full request payload
- Extracted data
- Processing steps
- Success/failure results

Check logs to debug issues.

---

## Next Steps / Future Enhancements

### Phase 2 (Future)
- Add support for partial payments
- Handle invoice updates/cancellations
- Support for invoice line items
- Add invoice PDF generation
- Email notifications on payment

### Phase 3 (Future)
- Dashboard for viewing invoices and payments
- Reporting and analytics
- Automated payment reminders
- Refund handling

---

## Troubleshooting

### Issue: Invoice not created in Confido

**Possible causes:**
1. Confido API credentials not configured
2. API endpoint URLs need updating
3. Payload structure doesn't match Confido API

**Solution:**
- Check `.env` has correct `CONFIDO_API_KEY` and `CONFIDO_API_URL`
- Review Confido API documentation
- Update `services/confidoService.js` with correct endpoints and payload structure

### Issue: Payment webhook returns 404

**Possible causes:**
1. Invoice doesn't exist in database
2. Confido invoice ID doesn't match

**Solution:**
- Check invoice exists: Query Supabase `invoices` table
- Verify `confido_invoice_id` is populated
- Check webhook payload has correct invoice ID

### Issue: GHL task not created

**Possible causes:**
1. Missing GHL contact or opportunity ID
2. GHL API credentials invalid
3. Task creation API changed

**Solution:**
- Verify invoice has `ghl_contact_id` and `ghl_opportunity_id`
- Check GHL API credentials in `.env`
- Review `services/ghlService.js` task creation method

### Issue: Webhook signature verification failed

**Possible causes:**
1. Incorrect webhook secret
2. Signature algorithm mismatch

**Solution:**
- Verify `CONFIDO_WEBHOOK_SECRET` matches Confido dashboard
- Check Confido docs for signature algorithm
- Update `confidoService.verifyWebhookSignature()` with correct logic

---

## Support

For issues or questions:
1. Check server logs for detailed error messages
2. Review webhook payloads in console logs
3. Verify environment variables are set correctly
4. Test with mock payloads using test scripts
5. Consult Confido API documentation

---

**Last Updated:** 2025-01-25
**Version:** 1.0.0
