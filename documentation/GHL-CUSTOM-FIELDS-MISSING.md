# GHL Custom Object Fields Missing - Issue Report

## Problem

Custom object updates are failing with 404 errors when trying to update invoice fields in GoHighLevel.

```
❌ Error updating custom object in GHL: {
  message: 'Custom Object (custom_objects.invoices) not found',
  error: 'Not Found',
  statusCode: 404
}
```

## Root Cause

**The custom fields we're trying to update DO NOT EXIST in the GHL custom object schema.**

### Current Schema (What Exists)

When we fetch an invoice record, we only see these properties:

```json
{
  "properties": {
    "invoice": "Test invoice 5",
    "serviceproduct": ["test", "test_2"],
    "issue_date": "2025-11-21",
    "due_date": "2025-11-29"
  }
}
```

### Missing Fields (What We're Trying to Update)

Our code is trying to update these fields:

```javascript
[
  { key: 'payment_link', valueString: 'https://pay.gravity-legal.com/...' },
  { key: 'invoice_number', valueString: 'INV-20251127-JC6Q' },
  { key: 'subtotal', valueNumber: 60 },
  { key: 'total', valueNumber: 60 }
]
```

**NONE of these fields exist in the schema!**

## What's Happening

1. Our code creates invoice in Confido successfully ✅
2. Saves to Supabase successfully ✅
3. Tries to update GHL custom object with `payment_link`, `invoice_number`, `subtotal`, `total`
4. GHL returns 404 because these fields don't exist in the schema ❌

## Solution

You need to **add these 4 fields to your GHL custom object schema** in the GoHighLevel UI:

### Step-by-Step Fix

1. **Go to GoHighLevel**
   - Navigate to: Settings → Custom Objects
   - Find your "Invoices" custom object (key: `custom_objects.invoices`)

2. **Add These 4 Fields:**

   | Field Name | Field Key | Field Type | Required |
   |-----------|-----------|------------|----------|
   | Payment Link | `payment_link` | URL or Text | No |
   | Invoice Number | `invoice_number` | Text | No |
   | Subtotal | `subtotal` | Number | No |
   | Total | `total` | Number | No |

3. **Save the Schema Changes**

4. **Test Again**
   - Create a new invoice in GHL
   - The webhook should now successfully update all 4 fields

## How to Add Custom Fields in GHL

### Option 1: Via GHL UI (Recommended)

1. Login to GoHighLevel
2. Go to **Settings** → **Custom Objects**
3. Click on your **Invoices** object
4. Click **"Edit Schema"** or **"Manage Fields"**
5. Add each field:
   - Click **"Add Field"**
   - Enter **Field Name** (e.g., "Payment Link")
   - Choose **Field Type** (URL for payment_link, Text for invoice_number, Number for subtotal/total)
   - Set **Field Key** to match exactly: `payment_link`, `invoice_number`, `subtotal`, `total`
   - Save each field
6. **Save Schema**

### Option 2: Via API (Advanced)

If you prefer to add fields via API, you can use the GHL API to update the schema, but the UI is much easier.

## Verification

After adding the fields, you can verify they exist by running:

```bash
node -e "
const axios = require('axios');
require('dotenv').config();

axios.get('https://services.leadconnectorhq.com/objects/custom_objects.invoices/records/YOUR_RECORD_ID', {
  headers: {
    'Authorization': 'Bearer ' + process.env.GHL_API_KEY,
    'Version': '2021-07-28'
  }
}).then(res => {
  console.log('Properties:', Object.keys(res.data.record.properties));
}).catch(err => {
  console.log('ERROR:', err.response?.data);
});
"
```

Replace `YOUR_RECORD_ID` with an actual invoice record ID.

You should see the new fields in the properties list.

## Current Implementation Status

### What's Working ✅

- ✅ Webhook endpoint receiving GHL events
- ✅ Retry logic for incomplete data
- ✅ Service item price calculation from Supabase catalog
- ✅ Confido Client creation
- ✅ Confido Matter creation
- ✅ Confido PaymentLink creation
- ✅ Supabase invoice tracking
- ✅ Invoice number generation (INV-YYYYMMDD-XXXX)
- ✅ Duplicate PaymentLink error handling

### What's Failing ❌

- ❌ Updating GHL custom object fields (fields don't exist in schema)

### What You Need to Do

**Action Required:** Add the 4 missing fields to your GHL custom object schema using the steps above.

Once you add the fields, the integration will work end-to-end:
1. Invoice created in GHL → Webhook sent
2. Retry logic waits for service items + opportunity
3. Calculate total from service items
4. Create Client/Matter/PaymentLink in Confido
5. Generate invoice number
6. Save to Supabase
7. **Update GHL with payment link, invoice number, subtotal, total** ← Will work after you add fields

## Code References

The update code is correct - it's in `services/ghlService.js:443-474`:

```javascript
async function updateCustomObject(objectKey, recordId, properties) {
  const response = await axios.put(
    `https://services.leadconnectorhq.com/objects/${objectKey}/records/${recordId}`,
    { properties },
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28'
      }
    }
  );
  return response.data;
}
```

The endpoint and format are correct. The issue is purely that the fields don't exist in your GHL schema.

## Summary

**Problem:** 404 errors when updating custom object
**Cause:** Fields `payment_link`, `invoice_number`, `subtotal`, `total` don't exist in GHL schema
**Fix:** Add the 4 fields to your GHL custom object schema
**Where:** GoHighLevel → Settings → Custom Objects → Invoices → Edit Schema
**When:** Do this now before testing again

After you add the fields, everything should work perfectly!
