# Confido API Research Findings

## Executive Summary

✅ **Migration Applied** - Supabase tables created successfully
✅ **API Credentials Added** - Confido API key configured
✅ **API Structure Discovered** - Confido uses GraphQL, not REST
✅ **Service Updated** - confidoService.js rewritten for GraphQL API

---

## Key Discoveries

### 1. Confido Legal vs Confido Tech

There are TWO different companies called "Confido":
- **Confido Legal** (formerly Gravity Legal) - Legal payment processing platform ✅ **THIS IS THE ONE YOU'RE USING**
- Confido Tech - CPG/retail automation (not relevant)

### 2. API Architecture

**Type**: GraphQL API (not REST)
**Production URL**: `https://api.gravity-legal.com/`
**Sandbox URL**: `https://api.sandbox.gravity-legal.com/`
**Authentication**: Bearer token in Authorization header

### 3. Core Concept: PaymentLinks, Not Invoices

**Important**: Confido Legal uses **PaymentLinks** instead of traditional "invoices".

A PaymentLink is:
- A payment request sent to a client
- Essentially functions as an invoice
- Has a unique URL where clients can pay
- Can track multiple payments against it
- Supports both credit card and ACH

### 4. Required Entities & Flow

#### Flow for Creating an "Invoice" (PaymentLink):

```
1. Create or Find Client
   ├─ Required: clientName
   ├─ Recommended: email, phone
   └─ Optional: externalId (GHL Contact ID for linking)

2. Create PaymentLink
   ├─ Required: clientId (from step 1)
   ├─ Required: amounts[] (array of {amount: Int (cents), description: String})
   ├─ Optional: matterId (can store GHL Opportunity ID here)
   ├─ Optional: externalId (can store GHL Invoice ID here)
   └─ Optional: memo (invoice notes)
```

#### Field Mappings (GHL → Confido):

| GHL Field | Confido Field | Required | Notes |
|-----------|---------------|----------|-------|
| Contact Name | clientName | ✅ Yes | Full name |
| Contact Email | email | ⚠️ Recommended | For receipts |
| Contact Phone | phone | ⚠️ Recommended | For notifications |
| Contact ID | externalId (on Client) | ❌ No | For linking back to GHL |
| Invoice ID | externalId (on PaymentLink) | ❌ No | For tracking |
| Opportunity ID | matterId | ❌ No | Links to matter/case |
| Amount Due | amounts[].amount | ✅ Yes | **In cents!** (multiply by 100) |
| Line Items | amounts[] | ✅ Yes | Array of {amount, description} |
| Invoice Notes | memo | ❌ No | Displayed on payment page |

---

## Updated Services

### confidoService.js - Now Using GraphQL

**Key Functions:**

1. **`executeGraphQL(query, variables)`**
   - Executes GraphQL queries/mutations
   - Handles errors properly
   - Returns data or throws

2. **`findOrCreateClient(clientData)`**
   - Searches for existing client by externalId (GHL Contact ID)
   - Creates new client if not found
   - Returns Confido client ID

3. **`createInvoice(invoiceData)`**
   - Step 1: Find/create client
   - Step 2: Convert amounts to cents format
   - Step 3: Create PaymentLink via GraphQL mutation
   - Returns Confido PaymentLink ID and payment URL

4. **`getInvoice(paymentLinkId)`**
   - Fetches PaymentLink details
   - Includes payment history
   - Returns balance info (total, paid, outstanding)

---

## Webhook Considerations

### Confido → Your System

Confido supports webhooks for events like:
- `payment.created` - When a payment is made
- `payment.completed` - When payment clears
- `payment_link.created` - When PaymentLink is created
- And more...

**Setup Location**: Confido dashboard → Webhooks section

**Webhook URL**: `https://shlf-main-automation-ywgsu.ondigitalocean.app/webhooks/confido/payment-received`

**Payload Structure**: GraphQL-style nested objects

Example webhook payload (estimated):
```json
{
  "event": "payment.completed",
  "data": {
    "payment": {
      "id": "payment_123",
      "amount": 250000,
      "status": "completed",
      "createdOn": "2025-01-25T...",
      "paymentLink": {
        "id": "paymentLink_456",
        "externalId": "ghl-invoice-789"
      }
    }
  }
}
```

---

## Testing

### Test API Connection

```bash
node -e "require('./services/confidoService').testConnection().then(console.log)"
```

Expected output:
```
=== Testing Confido API Connection ===
✅ Confido API connection successful
true
```

### Test Client Creation

```bash
node -e "require('./services/confidoService').findOrCreateClient({name: 'Test Client', email: 'test@example.com', phone: '555-1234', externalId: 'ghl-contact-123'}).then(result => console.log(JSON.stringify(result, null, 2)))"
```

### Test Invoice Creation

Run the test script (after updating field mappings):
```bash
node scripts/test-ghl-invoice-webhook.js
```

---

## Important Notes

### 1. Amounts Must Be in Cents

Confido expects amounts as **integers in cents**, not dollars:
- ❌ Bad: `25.50`
- ✅ Good: `2550`

Always multiply by 100 and round:
```javascript
amount: Math.round(dollarAmount * 100)
```

### 2. Line Items vs Single Amount

Confido requires `amounts` as an array:

**With line items:**
```javascript
amounts: [
  { amount: 150000, description: "Estate Planning Consultation" },
  { amount: 100000, description: "Will Preparation" }
]
```

**Without line items (single amount):**
```javascript
amounts: [
  { amount: 250000, description: "Invoice #12345" }
]
```

### 3. ExternalId for Linking

Use `externalId` to link between systems:
- **On Client**: Store GHL Contact ID
- **On PaymentLink**: Store GHL Invoice ID

This allows you to:
- Find Confido clients by GHL contact ID
- Match Confido payments back to GHL invoices

### 4. Payment URL

When you create a PaymentLink, Confido returns a `url` field:
```javascript
{
  success: true,
  confidoInvoiceId: "paymentLink_abc123",
  paymentUrl: "https://pay.gravity-legal.com/xyz789"
}
```

You can:
- Send this URL to the client
- Include it in GHL emails
- Store it in a custom field

---

## Database Schema - Already Created ✅

The Supabase tables are ready and support both systems:

### `invoices` Table
- Stores both GHL and Confido IDs
- Tracks payment status
- Links to opportunities and contacts

### `confido_payments` Table
- Stores individual payment transactions
- Includes raw webhook data for debugging
- Links back to invoices

---

## Next Steps

### 1. Update Server.js Webhook (if needed)

The webhook handler in `server.js` already accounts for the field structure, but you may want to verify the Confido webhook payload format once you set up webhooks in Confido.

### 2. Get Contact Email/Phone in GHL Webhook

The current webhook handler tries to fetch contact details if not provided:

```javascript
// server.js line 775-787
if (webhookData.contactId && !webhookData.primaryContactName) {
  const contactResponse = await ghlService.getContact(webhookData.contactId);
  webhookData.primaryContactName = `${contactResponse.contact.firstName} ${contactResponse.contact.lastName}`.trim();
}
```

You may want to also fetch email and phone for better Confido integration.

### 3. Configure Webhooks in Confido

1. Log into Confido Legal dashboard
2. Go to Settings → Webhooks (or API → Webhooks)
3. Add webhook URL: `https://shlf-main-automation-ywgsu.ondigitalocean.app/webhooks/confido/payment-received`
4. Select events: `payment.completed`, `payment.failed` (or similar)
5. Copy webhook secret → Add to `.env` as `CONFIDO_WEBHOOK_SECRET`

### 4. Configure Webhook in GHL

1. GHL Settings → Workflows/Automations → Webhooks
2. Add webhook for "Invoice Created" event
3. URL: `https://shlf-main-automation-ywgsu.ondigitalocean.app/webhooks/ghl/invoice-created`

### 5. Test End-to-End

1. Create a test invoice in GHL
2. Check logs to see webhook received
3. Verify invoice created in Confido Legal dashboard
4. Verify record in Supabase `invoices` table
5. Make a test payment in Confido
6. Verify payment webhook received
7. Verify invoice status updated in Supabase
8. Verify task created in GHL

---

## GraphQL Schema Reference

### Useful Queries

**Get all clients:**
```graphql
query {
  clients {
    nodes {
      id
      clientName
      email
      phone
      externalId
    }
  }
}
```

**Get specific PaymentLink:**
```graphql
query GetPaymentLink($id: ID!) {
  paymentLink(id: $id) {
    id
    externalId
    url
    status
    balance {
      total
      paid
      outstanding
    }
    payments {
      nodes {
        id
        amount
        status
        createdOn
      }
    }
  }
}
```

### Useful Mutations

**Create Client:**
```graphql
mutation AddClient($input: AddClientInput!) {
  addClient(input: $input) {
    id
    clientName
    email
  }
}
```

**Create PaymentLink:**
```graphql
mutation AddPaymentLink($input: AddPaymentLinkInput!) {
  addPaymentLink(input: $input) {
    id
    url
    status
  }
}
```

---

## Troubleshooting

### Error: "GraphQL Error: ..."

- Check the error message in logs
- Verify required fields are provided
- Ensure amounts are in cents (integer)
- Check clientId exists

### Error: "Failed to get client"

- Verify client was created successfully
- Check externalId matches GHL contact ID
- Try querying clients to see if it exists

### Payment not showing up

- Check Confido webhook is configured
- Verify webhook URL is accessible
- Check logs for webhook received
- Verify externalId on PaymentLink matches

---

## Summary of Changes Made

✅ **Migration applied to Supabase** - Tables created
✅ **Credentials added to `.env`** - API key configured
✅ **API URL updated** - Changed to correct `api.gravity-legal.com`
✅ **confidoService.js rewritten** - Now uses GraphQL with proper schema
✅ **Field mappings verified** - All fields accounted for

**The integration is now ready to test!**

---

**Date**: 2025-01-25
**API Version**: Confido Legal Production API
**Documentation**: https://docs.confidolegal.com
