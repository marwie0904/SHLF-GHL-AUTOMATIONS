# Survey Form to Webhook Field Comparison

## Fields Visible in Screenshots - Status

### Screenshot 1: Basic Information Page

| Form Field | In Webhook? | Webhook Field Name | Notes |
|------------|-------------|-------------------|-------|
| Practice Area | ❌ NO | - | **MISSING** - Dropdown field |
| Client's First Name | ⚠️ PARTIAL | "Caller's First Name" | Different label - might be same field |
| Client's Last Name | ⚠️ PARTIAL | `last_name` | Standard field exists |
| Street Address | ✅ YES | `address1` | Standard GHL field |
| City | ✅ YES | `city` | Standard GHL field |
| State | ✅ YES | `state` | Standard GHL field |
| Country | ✅ YES | `country` | Standard GHL field |
| Postal Code | ✅ YES | `postal_code` | Standard GHL field |
| Email | ✅ YES | `email` | Standard GHL field |
| Phone | ✅ YES | `phone` | Standard GHL field |
| Were you referred to us by CPA/advisor/attorney? | ✅ YES | "Lead Source" | Maps to Lead Source field |
| How did you hear about us? | ❌ NO | - | **MISSING** - In missing fields doc |
| Referrer's Name | ❌ NO | - | **MISSING** - In missing fields doc |
| Important Client Info | ✅ YES | "Important Client Info" | ✓ |

---

### Screenshot 2: Medicaid Page

| Form Field | In Webhook? | Webhook Field Name | Notes |
|------------|-------------|-------------------|-------|
| Medicaid Call Details | ✅ YES | "Medicaid Call Details" | LARGE_TEXT field |
| What is your primary concern? | ✅ YES | "What is your primary concern?" | RADIO field |
| - I need help with applying for Medicaid | ✅ YES | (option value) | ✓ |
| - I need to protect my assets so I can qualify for Medicaid | ✅ YES | (option value) | ✓ |

---

### Screenshot 3 & 4: Deed Pages

| Form Field | In Webhook? | Webhook Field Name | Notes |
|------------|-------------|-------------------|-------|
| Deed Call Details | ✅ YES | "Deed Call Details" | LARGE_TEXT field |
| Specify the caller's concern | ✅ YES | "Specify the caller's concern" | RADIO field |
| - Deed property into a trust | ✅ YES | (option value) | ✓ |
| - Deed property out of a trust | ✅ YES | (option value) | ✓ |
| - Lady Bird Deed | ✅ YES | (option value) | ✓ |
| - Caller does not have a trust... | ✅ YES | (option value) | ✓ |
| - Type an Option | ✅ YES | (option value) | ✓ |
| *Do not ask caller* tax implications question | ✅ YES | Full field name in webhook | RADIO field |
| - Yes | ✅ YES | (option value) | ✓ |
| - No | ✅ YES | (option value) | ✓ |
| Schedule a 15-minute call with Attorney | ❌ NO | - | **MISSING** - Button/checkbox field |

---

### Screenshot 5: Estate Planning Questions Page

| Form Field | In Webhook? | Webhook Field Name | Notes |
|------------|-------------|-------------------|-------|
| Introductory text (estate planning needs) | N/A | - | Static text, not a field |
| Text area for goals/planning | ⚠️ UNCLEAR | - | May map to another field |
| Is the caller scheduling on behalf of client? | ✅ YES | Exact field name in webhook | RADIO field |
| - Yes | ✅ YES | (option value) | ✓ |
| - No | ✅ YES | (option value) | ✓ |
| Are you a Florida Resident? | ✅ YES | "Are you a Florida Resident?" | RADIO field |
| - Yes | ✅ YES | (option value) | ✓ |
| - No | ✅ YES | (option value) | ✓ |
| - No, but planning to become resident in 12 months | ⚠️ UNKNOWN | - | Third option not seen in webhook data |
| Are you single or married? | ✅ YES | "Are you single or married?" | RADIO field |
| - Single | ✅ YES | (option value) | ✓ |
| - Married | ✅ YES | (option value) | ✓ |
| Are you and your spouse planning together? | ✅ YES | Full field name in webhook | RADIO field |
| - Yes | ✅ YES | (option value) | ✓ |
| - No | ✅ YES | (option value) | ✓ |
| Do you have children? | ✅ YES | "Do you have children?" | RADIO field |
| - Yes | ✅ YES | (option value) | ✓ |
| - No | ✅ YES | (option value) | ✓ |
| Do you have existing documents? | ✅ YES | "Do you have existing documents?" | RADIO field |
| - Yes | ✅ YES | (option value) | ✓ |
| - No | ✅ YES | (option value) | ✓ |
| Schedule I/V | ❌ NO | - | **MISSING** - Button/action field |
| Privacy Policy link | N/A | - | Not a data field |
| Terms of Service link | N/A | - | Not a data field |

---

## ❌ Fields MISSING from Webhook

### Critical Missing Fields (Visible in Screenshots)

1. **Practice Area**
   - Type: DROPDOWN/RADIO
   - Recommended Key: `practice_area`
   - Priority: HIGH

2. **Schedule a 15-minute call with Attorney**
   - Type: CHECKBOX or hidden field
   - Recommended Key: `schedule_15_min_call_with_attorney`
   - Priority: MEDIUM

3. **Schedule I/V** (Initial/Virtual Consultation)
   - Type: CHECKBOX or button action
   - Recommended Key: `schedule_initial_virtual_consultation`
   - Priority: MEDIUM

### Fields Already in Missing Fields Document

4. **How did you hear about us?**
   - Visible in Screenshot 1
   - Already documented in `ghl-missing-fields.md`

5. **Referrer's Name**
   - Visible in Screenshot 1
   - Already documented in `ghl-missing-fields.md`

---

## ⚠️ Fields with Label Discrepancies

### Client vs Caller
The form uses "**Client's First Name**" and "**Client's Last Name**" while webhook has "**Caller's First Name**"

**Question:** Are these the same field or different?
- If SAME: Just a label difference, no action needed
- If DIFFERENT: Need to add Client's First Name and Client's Last Name as separate fields

---

## 🔍 Pages NOT in Screenshots - Need More Info

Based on webhook data, the following pages/sections exist but were not provided in screenshots:

### Probate/Decedent Pages
Fields in webhook but not in screenshots:
- Complete Name of Decedent
- Relationship With The Decedent
- Date of Death of The Decedent
- Was there a will?
- Do you have access to the original will?
- Are you the PR?
- Are you the Successor Trustee?
- Are the assets owned individually by the decedent or in a trust?
- For assets owned individually, are there listed beneficiaries?
- Are there any disagreements among beneficiaries?
- If applicable, what assets need to go to probate...

### Trust/Estate Planning Documents Pages
- Is the trust funded?
- Are you hoping to update documents, start from scratch, or have reviewed?
- Do you have a will or trust?
- Will the client be able to join the meeting?
- Can you confirm client is of sound mind...
- Spouse's Email / Spouse Email
- To help match you with the right attorney (net worth question)

### Property/Assets Pages
- Poperty address 1, 2, 3
- What assets are involved?

### PBTA Page
- PBTA Call Details

### Workshop/Event Pages
- Webinar Title
- Event Title
- Event Venue
- Guest Name
- Select The Workshop you would like to attend
- Workshop Description
- Workshop Notes
- Date of Workshop

### Beneficiary/Professional Info Pages
- Beneficiary 1-5
- Financial Advisor
- Accountant
- Current Spouse
- Bank 1-5

---

## Summary

**Total Fields in Screenshots:** ~30
**Matched to Webhook:** ~27 (90%)
**Missing from Webhook:** 3-5 critical fields
**Need Clarification:** 1 (Client vs Caller naming)

**Action Required:**
Please provide screenshots of the remaining form pages so we can complete the analysis and ensure all webhook fields are accounted for.
