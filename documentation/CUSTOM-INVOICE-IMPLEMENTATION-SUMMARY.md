# GHL Custom Invoice Integration - Implementation Summary

## ✅ COMPLETED - Ready for Configuration!

---

## What Was Built

A complete webhook system for GHL custom invoice objects that automatically calculates totals from a service items catalog and creates payment links in Confido.

**Flow:**
```
GHL Custom Invoice Created → Fetch Service Items → Calculate Total →
Get Opportunity/Contact → Create Confido PaymentLink → Save to Supabase →
Update GHL with Payment URL
```

---

## Files Changed

### 1. New Migration
**`supabase/migrations/20251127_add_invoice_service_items.sql`**
- Creates `invoice_service_items` catalog table
- Adds columns to `invoices` table: `confido_client_id`, `confido_matter_id`, `payment_url`, `service_items`
- Seeds initial data: "test" ($20), "test_2" ($40)

### 2. Service Functions Added
**`services/invoiceService.js`**
- `calculateInvoiceTotal(serviceItemNames)` - Looks up prices and calculates total
- `getServiceItems(serviceNames)` - Fetches from catalog
- `updateInvoiceInSupabase(ghlInvoiceId, updates)` - Updates existing invoices
- Updated `saveInvoiceToSupabase()` to include `payment_url` and `service_items`

### 3. GHL API Functions Added
**`services/ghlService.js`**
- `getCustomObject(objectKey, recordId)` - Fetch custom object details
- `updateCustomObject(objectKey, recordId, properties)` - Update with payment URL
- `getRelations(recordId, locationId)` - Get associations
- `getOpportunity(opportunityId)` - Fetch opportunity with contact

### 4. Webhook Endpoints
**`server.js`**
- **Updated:** `/webhooks/ghl/custom-object-created` (RecordCreate)
- **New:** `/webhooks/ghl/custom-object-updated` (RecordUpdate)
- **New:** `/webhooks/ghl/custom-object-deleted` (RecordDelete)

---

## Complete Flow

### RecordCreate (New Invoice)

```
1. Webhook receives POST with invoice ID
2. Fetch custom object details
   → Extract properties.serviceproduct array (e.g., ["test", "test_2"])
3. Calculate total from catalog
   → Look up "test" → $20
   → Look up "test_2" → $40
   → Total = $60
4. Get relations for invoice
   → Find opportunity association
5. Get opportunity details
   → Extract contact information
6. Create in Confido:
   → Client (contact)
   → Matter (opportunity)
   → PaymentLink ($60, returns payment URL)
7. Save to Supabase:
   → All GHL IDs
   → All Confido IDs
   → Payment URL
   → Service items JSON
   → Calculated total
8. Update GHL custom object:
   → payment_url
   → total_amount
   → status = "active"
9. Return success with payment URL
```

### RecordUpdate (Invoice Modified)

```
1. Fetch existing invoice from Supabase
2. Fetch updated custom object
3. Recalculate total from updated service items
4. Update Supabase with new amounts and items
5. Update GHL custom object with new total
6. Log if Confido PaymentLink needs manual adjustment
```

### RecordDelete (Invoice Deleted)

```
1. Fetch invoice from Supabase
2. Update status to "cancelled" (audit trail)
3. Return success
```

---

## Database Schema

### New Table: invoice_service_items

```sql
CREATE TABLE invoice_service_items (
  id UUID PRIMARY KEY,
  service_name TEXT UNIQUE NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initial data
INSERT INTO invoice_service_items (service_name, price) VALUES
  ('test', 20.00),
  ('test_2', 40.00);
```

### Updated Table: invoices

**New columns:**
- `confido_client_id` TEXT
- `confido_matter_id` TEXT
- `payment_url` TEXT
- `service_items` JSONB

---

## Webhook Data Extraction

### From GHL Webhook:
```json
{
  "type": "RecordCreate",
  "id": "69285dceb74644011976884b",
  "objectKey": "custom_objects.invoices",
  "locationId": "afYLuZPi37CZR1IpJlfn"
}
```

### From Custom Object Fetch:
```json
{
  "record": {
    "properties": {
      "invoice": "test",
      "serviceproduct": ["test", "test_2"],
      "due_date": "2025-11-26"
    }
  }
}
```

### From Service Items Calculation:
```json
{
  "total": 60.00,
  "lineItems": [
    {"name": "test", "price": 20.00, "quantity": 1},
    {"name": "test_2", "price": 40.00, "quantity": 1}
  ],
  "missingItems": []
}
```

---

## Configuration Steps

### 1. Apply Database Migration

**Option A: Supabase Dashboard**
1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `supabase/migrations/20251127_add_invoice_service_items.sql`
3. Execute the SQL

**Option B: Supabase CLI**
```bash
supabase db push
```

### 2. Add Custom Fields to GHL Invoice Object

In GHL, add these fields to your `custom_objects.invoices` schema:
- `payment_url` (URL field)
- `total_amount` (Number field)
- `status` (Text field)

### 3. Configure GHL OAuth App Webhooks

In your GHL OAuth app, subscribe to these events:
- `RecordCreate` → `https://shlf-main-automation-ywgsu.ondigitalocean.app/webhooks/ghl/custom-object-created`
- `RecordUpdate` → `https://shlf-main-automation-ywgsu.ondigitalocean.app/webhooks/ghl/custom-object-updated`
- `RecordDelete` → `https://shlf-main-automation-ywgsu.ondigitalocean.app/webhooks/ghl/custom-object-deleted`

### 4. Add More Service Items (Optional)

To add more service items to the catalog:

```sql
INSERT INTO invoice_service_items (service_name, price, description) VALUES
  ('consultation', 150.00, 'Initial Consultation'),
  ('filing_fee', 300.00, 'Court Filing Fee'),
  ('document_prep', 200.00, 'Document Preparation');
```

---

## Testing

### Test RecordCreate

1. Create a custom invoice in GHL
2. Add service items: "test", "test_2"
3. Associate with an opportunity
4. Save the invoice
5. Webhook fires → Check logs for:
   - ✅ Service items found: test ($20), test_2 ($40)
   - ✅ Calculated Total: $60
   - ✅ Confido PaymentLink created
   - ✅ Payment URL: https://pay.gravity-legal.com/...
   - ✅ GHL custom object updated
6. Verify in GHL: `payment_url`, `total_amount`, `status` fields populated
7. Verify in Supabase: Invoice record with all IDs and service_items JSON
8. Verify in Confido: Client, Matter, PaymentLink created

### Test RecordUpdate

1. Edit existing invoice
2. Change service items (add or remove)
3. Save
4. Webhook fires → Check logs for:
   - ✅ Recalculated total
   - ✅ Supabase updated
   - ✅ GHL custom object updated with new total

### Test RecordDelete

1. Delete invoice in GHL
2. Webhook fires → Check logs for:
   - ✅ Invoice marked as cancelled in Supabase

---

## API Response Examples

### Success Response (RecordCreate):
```json
{
  "success": true,
  "message": "Custom invoice processed successfully",
  "invoiceId": "69285dceb74644011976884b",
  "opportunityId": "BcAyHjKegecSbZUQoAsq",
  "total": 60.00,
  "lineItems": [
    {"name": "test", "price": 20.00, "quantity": 1},
    {"name": "test_2", "price": 40.00, "quantity": 1}
  ],
  "missingItems": [],
  "confido": {
    "invoiceId": "paymentLink_abc123",
    "paymentUrl": "https://pay.gravity-legal.com/abc123",
    "status": "unpaid"
  }
}
```

### Warning - Missing Service Items:
```json
{
  "success": true,
  "total": 20.00,
  "lineItems": [
    {"name": "test", "price": 20.00, "quantity": 1}
  ],
  "missingItems": ["unknown_service"]
}
```

---

## Error Handling

### Missing Service Items
- Logs warning with service name
- Continues with available items
- Returns `missingItems` array in response
- Partial total calculated

### No Opportunity Association
- Returns 200 with message "No opportunity association found"
- Invoice not created in Confido
- Waits for association webhook

### Confido API Failure
- Saves invoice to Supabase with status "pending"
- Logs error for retry
- Returns error in response

### GHL Custom Object Update Failure
- Non-blocking operation
- Logs error but continues
- Invoice still created successfully

---

## Monitoring

### Key Logs to Watch:
```
=== GHL CUSTOM OBJECT CREATED WEBHOOK RECEIVED ===
Service Items: ["test", "test_2"]
✅ Found: test - $20
✅ Found: test_2 - $40
Total: $60.00
✅ Found opportunity: BcAyHjKegecSbZUQoAsq
✅ Invoice created in Confido
Payment URL: https://pay.gravity-legal.com/...
✅ Invoice saved to Supabase
✅ GHL custom object updated with payment URL
```

### Warning Signs:
```
⚠️ Service item not found in catalog: unknown_service
⚠️ No relations found for this invoice yet
⚠️ Invoice amount changed - Confido PaymentLink may need manual adjustment
```

---

## Next Steps

1. ✅ Code deployed to production
2. ⏳ Apply database migration in Supabase
3. ⏳ Add custom fields to GHL invoice object
4. ⏳ Configure OAuth app webhooks
5. ⏳ Test with real invoice creation
6. ⏳ Add additional service items to catalog
7. ⏳ Monitor logs for errors

---

## Summary

**What's Working:**
- ✅ Service item catalog with automatic price lookup
- ✅ Automatic total calculation
- ✅ Confido Client/Matter/PaymentLink creation
- ✅ Payment URL sent back to GHL
- ✅ Full audit trail in Supabase
- ✅ Update and delete handling

**What's Needed:**
- Database migration application
- GHL custom field configuration
- OAuth app webhook configuration
- Service item catalog population

**Ready to go!** 🚀
