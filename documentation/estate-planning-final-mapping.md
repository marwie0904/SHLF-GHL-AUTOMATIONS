# Estate Planning Section - Final JotForm to GHL Field Mapping

Last Updated: 2025-11-21
Status: ✅ All fields exist in GHL

## Overview
Complete field mappings for Estate Planning section from JotForm to GoHighLevel. All GHL fields have been verified to exist.

---

## Field Mappings

| # | JotForm Question | JotForm Field ID | GHL Field Key | GHL Type | Notes |
|---|-----------------|------------------|---------------|----------|-------|
| 1 | Estate Planning Goals | `q44_estatePlan` | `contact.contactestate_planning_goals` | LARGE_TEXT | ✅ |
| 2 | Is the caller scheduling on behalf? | `q45_onBehalf` | `contact.is_the_caller_is_scheduling_on_behalf_of_the_potential_client` | RADIO | ✅ |
| 3 | Will client join meeting? | `q53_clientJoinMeeting` | `contact.will_the_client_be_able_to_join_the_meeting` | RADIO | ✅ |
| 4 | Client sound mind confirmation | `q54_soundMind` | `contact.client_is_of_sound_mind_to_make_decisions` | RADIO | ✅ |
| 5 | Caller's Name | `q50_callersName` | `contact.caller_full_name` | TEXT | Concatenate first+last |
| 6 | Caller's Phone | `q51_callersPhone` | `contact.callers_phone_number` | TEXT | ✅ |
| 7 | Caller's Email | `q52_callersEmail` | `contact.caller_email` | TEXT | ✅ |
| 8 | Florida Resident (variant 1) | `q56_floridaResident` | `contact.are_you_a_florida_resident` | RADIO | ✅ Maps to same field |
| 9 | Florida Resident (variant 2) | `q78_docFloridaResident` | `contact.are_you_a_florida_resident` | RADIO | ✅ Maps to same field |
| 10 | Single or Married | `q59_areYouSingle` | `contact.are_you_single_or_married` | RADIO | ✅ |
| 11 | Spouse's Name | `q115_spousesName` | `contact.current_spouse` | TEXTBOX_LIST | Format: Name, Veteran |
| 12 | Spouse planning together | `q60_spousePlanning` | `contact.are_you_and_your_spouse_planning_together` | RADIO | ✅ |
| 13 | Spouse's Email | `q116_spousesEmail` | `contact.spouse_email` | TEXT | ✅ |
| 14 | Spouse's Phone | `q117_spousesPhone` | `contact.spouse_number` | TEXT | ✅ |
| 15 | Have children | `q61_doYouhaveChildren` | `contact.do_you_have_children` | RADIO | ✅ |
| 16 | Have existing documents | `q62_existingDocuments` | `contact.do_you_have_existing_documents` | RADIO | ✅ |
| 17 | What documents (checkboxes) | `q87_whatDocuments2` | `contact.contactwhat_documents_do_you_have` | LARGE_TEXT | Convert array to text |
| 18 | Trust funded | `q65_trustFunded` | `contact.is_the_trust_funded` | RADIO | ✅ |
| 19 | Update/scratch/review | `q66_updateDocument` | `contact.are_you_hoping_to_update_your_documents_start_from_scratch_or_just_have_your_current_documents_reviewed` | RADIO | ✅ |

---

## Special Handling Required

### 1. Name Concatenation
**Fields requiring concatenation:**
- `q50_callersName` (first, last) → `contact.caller_full_name`
- `q115_spousesName` (first, last) → `contact.current_spouse` (TEXTBOX_LIST format)

```javascript
// Caller Full Name
const callerFullName = `${parsed.callersName.first || ''} ${parsed.callersName.last || ''}`.trim();
addCustomField('contact.caller_full_name', callerFullName);

// Current Spouse (TEXTBOX_LIST format)
const spouseName = `${parsed.spousesName.first || ''} ${parsed.spousesName.last || ''}`.trim();
if (spouseName) {
  // TEXTBOX_LIST format: field1\nfield2
  const spouseData = `${spouseName}\n`; // Name field, Veteran field empty
  addCustomField('contact.current_spouse', spouseData);
}
```

### 2. Checkbox to Text Conversion
**Field:** `q87_whatDocuments2` (checkboxes: Trust, Will, Other)

```javascript
// Convert checkbox array to comma-separated string
if (parsed.whatDocuments2 && Array.isArray(parsed.whatDocuments2)) {
  const documentsText = parsed.whatDocuments2.join(', ');
  addCustomField('contact.contactwhat_documents_do_you_have', documentsText);
} else if (typeof parsed.whatDocuments2 === 'string') {
  addCustomField('contact.contactwhat_documents_do_you_have', parsed.whatDocuments2);
}
```

### 3. Florida Resident (Dual Mapping)
**Two JotForm fields map to ONE GHL field:**
- `q56_floridaResident` → `contact.are_you_a_florida_resident`
- `q78_docFloridaResident` → `contact.are_you_a_florida_resident`

```javascript
// Use whichever is filled
const floridaResident = parsed.floridaResident || parsed.docFloridaResident;
addCustomField('contact.are_you_a_florida_resident', floridaResident);
```

---

## Parser Updates Required

### JotForm Field IDs to Add/Update

```javascript
// In jotformIntakeParser.js

// Caller Information
const callersNameObj = extractNestedValue('q50_callersName');
data.callersName = {
  first: callersNameObj?.first || '',
  last: callersNameObj?.last || ''
};

const callersPhoneObj = extractNestedValue('q51_callersPhone');
data.callersPhone = callersPhoneObj?.full || '';

data.callersEmail = params.get('q52_callersEmail') || '';

// Spouse Information
const spouseNameObj = extractNestedValue('q115_spousesName');
data.spousesName = {
  first: spouseNameObj?.first || '',
  last: spouseNameObj?.last || ''
};

data.spousesEmail = params.get('q116_spousesEmail') || '';

const spousePhoneObj = extractNestedValue('q117_spousesPhone');
data.spousesPhone = spousePhoneObj?.full || '';

// What Documents (checkboxes)
// This may come as multiple params or comma-separated string
data.whatDocuments2 = params.get('q87_whatDocuments2') || '';

// Florida Resident (two variants)
data.floridaResident = params.get('q56_floridaResident') || '';
data.docFloridaResident = params.get('q78_docFloridaResident') || '';

// Other fields already parsed...
data.onBehalf = params.get('q45_onBehalf') || '';
data.clientJoinMeeting = params.get('q53_clientJoinMeeting') || '';
data.soundMind = params.get('q54_soundMind') || '';
data.areYouSingle = params.get('q59_areYouSingle') || '';
data.spousePlanning = params.get('q60_spousePlanning') || '';
data.doYouhaveChildren = params.get('q61_doYouhaveChildren') || '';
data.existingDocuments = params.get('q62_existingDocuments') || '';
data.trustFunded = params.get('q65_trustFunded') || '';
data.updateDocument = params.get('q66_updateDocument') || '';
data.estatePlan = params.get('q44_estatePlan') || '';
```

---

## Mapper Updates Required

### In intakeDataMapper.js

```javascript
// Estate Planning Goals
addCustomField('contact.contactestate_planning_goals', parsedData.estatePlan);

// Caller Information
const callerFullName = parsedData.callersName
  ? `${parsedData.callersName.first || ''} ${parsedData.callersName.last || ''}`.trim()
  : '';
addCustomField('contact.caller_full_name', callerFullName);
addCustomField('contact.callers_phone_number', parsedData.callersPhone);
addCustomField('contact.caller_email', parsedData.callersEmail);

// On Behalf & Meeting Questions
addCustomField('contact.is_the_caller_is_scheduling_on_behalf_of_the_potential_client', parsedData.onBehalf);
addCustomField('contact.will_the_client_be_able_to_join_the_meeting', parsedData.clientJoinMeeting);
addCustomField('contact.client_is_of_sound_mind_to_make_decisions', parsedData.soundMind);

// Florida Resident (use either)
const floridaResident = parsedData.floridaResident || parsedData.docFloridaResident;
addCustomField('contact.are_you_a_florida_resident', floridaResident);

// Marital Status & Spouse Info
addCustomField('contact.are_you_single_or_married', parsedData.areYouSingle);

// Current Spouse (TEXTBOX_LIST format)
if (parsedData.spousesName && (parsedData.spousesName.first || parsedData.spousesName.last)) {
  const spouseName = `${parsedData.spousesName.first || ''} ${parsedData.spousesName.last || ''}`.trim();
  // TEXTBOX_LIST format: Name\nVeteran (leave Veteran empty for now)
  const spouseTextboxData = `${spouseName}\n`;
  addCustomField('contact.current_spouse', spouseTextboxData);
}

addCustomField('contact.are_you_and_your_spouse_planning_together', parsedData.spousePlanning);
addCustomField('contact.spouse_email', parsedData.spousesEmail);
addCustomField('contact.spouse_number', parsedData.spousesPhone);

// Children & Documents
addCustomField('contact.do_you_have_children', parsedData.doYouhaveChildren);
addCustomField('contact.do_you_have_existing_documents', parsedData.existingDocuments);

// What Documents (convert checkboxes to text)
if (parsedData.whatDocuments2) {
  let documentsText = parsedData.whatDocuments2;
  if (Array.isArray(parsedData.whatDocuments2)) {
    documentsText = parsedData.whatDocuments2.join(', ');
  }
  addCustomField('contact.contactwhat_documents_do_you_have', documentsText);
}

addCustomField('contact.is_the_trust_funded', parsedData.trustFunded);
addCustomField('contact.are_you_hoping_to_update_your_documents_start_from_scratch_or_just_have_your_current_documents_reviewed', parsedData.updateDocument);
```

---

## Verification Checklist

- [ ] All 19 fields mapped correctly
- [ ] Parser extracts all JotForm field IDs
- [ ] Mapper uses correct GHL field keys
- [ ] Name concatenation logic implemented
- [ ] TEXTBOX_LIST format for Current Spouse implemented
- [ ] Checkbox-to-text conversion implemented
- [ ] Florida Resident dual mapping handled
- [ ] Test with sample JotForm webhook data
- [ ] Verify all fields populate in GHL contact

---

## Summary

✅ **All GHL fields exist** - No new fields need to be created
✅ **Type mismatches acceptable** - GHL accepts text for checkboxes and TEXTBOX_LIST
✅ **Dual Florida Resident mapping** - Handled by using first non-empty value
⚠️ **Special handling needed** for name concatenation and checkbox conversion

**Total Fields:** 19
**Parser Updates:** Required for all fields
**Mapper Updates:** Required for proper formatting
