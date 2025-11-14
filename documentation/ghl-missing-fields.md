# GHL Missing Fields

Fields present in the actual survey (verified from screenshots) but missing in GHL custom fields.

## Missing Fields (Actually in Survey)

### Lead Source
- **Webhook Field:** "Lead Source "
- **Recommended Unique Key:** `lead_source`
- **Type:** DROPDOWN
- **Location in Survey:** Page 1 - "Were you referred to us by your CPA, financial advisor, or another attorney?"

---

### How did you hear about us?
- **Webhook Field:** "How did you hear about us?"
- **Recommended Unique Key:** `how_did_you_hear_about_us`
- **Type:** TEXT
- **Location in Survey:** Page 1

---

### Practice Area
- **Webhook Field:** Not shown in webhook sample but visible in survey
- **Recommended Unique Key:** `practice_area`
- **Type:** DROPDOWN
- **Location in Survey:** Page 1 (top of form)

---

## Total Missing Fields: 3

---

## Fields NOT in Survey (To be removed from webhook mapping)

These fields appear in the webhook data but are NOT visible in the survey screenshots. They may be:
- Backend/system fields
- Fields from other forms
- Deprecated fields

### System/Backend Fields
- Prefix
- Middle name
- Single Line 9krf
- Numberfield
- Jotform
- custom-contact-id
- PDF
- Time

### Workshop-Related Fields (Different Form)
- Webinar Title
- Event Title
- Event Venue
- Guest Name
- Select The Workshop you would like to attend
- Workshop Description
- Workshop Notes
- Date of Workshop

### Legal Planning Fields (Not in Current Survey)
- Beneficiary 1-5
- Financial Advisor
- Accountant
- Current Spouse
- Bank 1-5

### Contact Preference Fields (Not in Current Survey)
- Urgency of Your Case
- Preferred Contact Method
- Reason for Consultation
- Preferred Date for Consultation
- Preferred Appointment Time
- Message
- Preferred Office Location
- Case Details
- Which Statement Best Describes You

**Note:** These fields may belong to other survey forms or were removed from the current version.
