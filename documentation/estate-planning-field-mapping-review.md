# Estate Planning Section - JotForm to GHL Field Mapping Review

Last Updated: 2025-11-21

## Overview
This document reviews the Estate Planning section field mappings from JotForm to GoHighLevel.

---

## Field Mappings

### 1. Estate Planning Goals
**JotForm Question:** "Many people come to us with different goals some want to avoid probate, others want to protect their kids or handle a specific asset. What's something you'd like us to help you plan for? What would you like to get out of your estate plan?"

**JotForm Field ID:** `q44_estatePlan`

**GHL Field Name:** Estate Planning Goals
**GHL Unique Key:** `{{ contact.contactestate_planning_goals }}`
**Type:** LARGE_TEXT
**Status:** ✅ CORRECT

---

### 2. Is the caller scheduling on behalf of the potential client?
**JotForm Question:** "Is the caller is scheduling on behalf of the potential client?"

**JotForm Field ID:** `q45_onBehalf`

**GHL Field Name:** Is The Caller Is Scheduling On Behalf Of The Potential Client?
**GHL Unique Key:** `{{ contact.is_the_caller_is_scheduling_on_behalf_of_the_potential_client }}`
**Type:** RADIO
**Choices:** Yes, No
**Status:** ✅ CORRECT

---

### 3. Will the client be able to join the meeting?
**JotForm Question:** "Will the client be able to join the meeting?"

**JotForm Field ID:** `q53_clientJoinMeeting`

**GHL Field Name:** Will The Client Be Able To Join The Meeting?
**GHL Unique Key:** `{{ contact.will_the_client_be_able_to_join_the_meeting }}`
**Type:** RADIO
**Choices:** Yes, No, No but I have POA
**Status:** ⚠️ **MISMATCH** - JotForm has 3 options but GHL spec shows only 2 (Yes, No)

**Note:** JotForm has additional option "No, but I have POA" which is not in GHL spec.

---

### 4. Sound Mind Confirmation
**JotForm Question:** "Can you confirm that the client is of sound mind to understand the conversation and make their own decisions? And to your knowledge, do they have any cognitive issues that might affect this?"

**JotForm Field ID:** `q54_soundMind`

**GHL Field Name:** Can You Confirm That The Client Is Of Sound Mind To Understand The Conversation And Make Their Own Decisions? And To Your Knowledge, Do They Have Any Cognitive Issues That Might Affect This?
**GHL Unique Key:** `{{ contact.client_is_of_sound_mind_to_make_decisions }}`
**Type:** RADIO
**Choices:** Yes, the client is of sound mind., No
**Status:** ⚠️ **CHOICE MISMATCH** - GHL spec shows "Yes, No" but JotForm shows "Yes, the client is of sound mind., No"

**Note:** First choice has more descriptive text in JotForm.

---

### 5. Caller's Name
**JotForm Question:** "Caller's Name"

**JotForm Field ID:** `q50_callersName` (First Name, Last Name)

**GHL Field Name:** Caller Full Name
**GHL Unique Key:** `{{ contact.caller_full_name }}`
**Type:** TEXT
**Status:** ⚠️ **FIELD KEY ISSUE**

**Issues:**
1. JotForm sends separate first/last name
2. GHL key `caller_full_name` doesn't match our created field `contact.callers_first_name`
3. Need to create new "Caller Full Name" field or use existing "Caller's First Name" field

**Current Mapping:** `contact.callers_first_name` (exists in GHL)
**Suggested Action:** Create `contact.caller_full_name` field or concatenate first+last into existing field

---

### 6. Caller's Phone Number
**JotForm Question:** "Caller's Phone Number"

**JotForm Field ID:** `q51_callersPhone`

**GHL Field Name:** Caller Phone Number
**GHL Unique Key:** `{{ contact.callers_phone_number }}`
**Type:** TEXT
**Status:** ⚠️ **FIELD KEY MISMATCH**

**Issue:** GHL spec shows `contact.callers_phone_number` but GHL actually created `contact.contactcallers_phone_number`

**Current GHL Field Key:** `contact.contactcallers_phone_number`
**Suggested Action:** Update documentation or use actual field key

---

### 7. Caller's Email
**JotForm Question:** "Caller's Email"

**JotForm Field ID:** `q52_callersEmail`

**GHL Field Name:** Caller Email
**GHL Unique Key:** `{{ contact.caller_email }}`
**Type:** TEXT
**Status:** ⚠️ **FIELD KEY MISMATCH**

**Issue:** GHL spec shows `contact.caller_email` but GHL actually created `contact.contactcallers_email`

**Current GHL Field Key:** `contact.contactcallers_email`
**Suggested Action:** Update documentation or use actual field key

---

### 8. Are you a Florida Resident?
**JotForm Question:** "Are you a Florida Resident?"

**JotForm Field ID:** `q56_floridaResident`

**GHL Field Name:** Are You A Florida Resident?
**GHL Unique Key:** `{{ contact.are_you_a_florida_resident }}`
**Type:** RADIO
**Choices:** Yes, No, No but I am planning to become a resident within the next 12 months, No but I have a property in Florida and in need of a deed
**Status:** ⚠️ **MISMATCH** - GHL spec shows only 2 choices but JotForm has 4

**Note:** JotForm has 2 additional options not in GHL spec.

---

### 9. Are you single or married?
**JotForm Question:** "Are you single or married?"

**JotForm Field ID:** `q59_areYouSingle`

**GHL Field Name:** Are You Single Or Married?
**GHL Unique Key:** `{{ contact.are_you_single_or_married }}`
**Type:** RADIO
**Choices:** Single, Married
**Status:** ✅ CORRECT

---

### 10. Spouse's Name
**JotForm Question:** "Spouse's Name"

**JotForm Field ID:** `q115_spousesName` (First Name, Last Name)

**GHL Field Name:** Current Spouse
**GHL Unique Key:** `{{ contact.current_spouse }}`
**Type:** TEXTBOX_LIST
**List:** Name, Veteran
**Status:** ⚠️ **TYPE MISMATCH**

**Issues:**
1. JotForm sends separate first/last name fields
2. GHL field is TEXTBOX_LIST expecting "Name, Veteran" format
3. Need to map properly: concatenate first+last for Name field, and determine Veteran status

**Suggested Action:** Need to understand TEXTBOX_LIST format and how to populate it via API

---

### 11. Are you and your spouse planning together?
**JotForm Question:** "Are you and your spouse planning together?"

**JotForm Field ID:** `q60_spousePlanning`

**GHL Field Name:** Are You And Your Spouse Planning Together?
**GHL Unique Key:** `{{ contact.are_you_and_your_spouse_planning_together }}`
**Type:** RADIO
**Choices:** Yes, No
**Status:** ✅ CORRECT

---

### 12. Spouse's Email
**JotForm Question:** "Spouse's Email"

**JotForm Field ID:** `q116_spousesEmail`

**GHL Field Name:** Spouse Email
**GHL Unique Key:** `{{ contact.spouse_email }}`
**Type:** TEXT
**Status:** ✅ CORRECT (Field already exists in GHL)

---

### 13. Spouse's Phone Number
**JotForm Question:** "Spouse's Phone Number"

**JotForm Field ID:** `q117_spousesPhone`

**GHL Field Name:** Spouse Number
**GHL Unique Key:** `{{ contact.spouse_number }}`
**Type:** TEXT
**Status:** ❌ **FIELD MISSING**

**Issue:** Field `contact.spouse_number` does not exist in GHL

**Suggested Action:** Create new field "Spouse Number" in GHL

---

### 14. Do you have children?
**JotForm Question:** "Do you have children?"

**JotForm Field ID:** `q61_doYouhaveChildren`

**GHL Field Name:** Do You Have Children?
**GHL Unique Key:** `{{ contact.do_you_have_children }}`
**Type:** RADIO
**Choices:** Yes, No
**Status:** ✅ CORRECT

---

### 15. Do you have existing documents?
**JotForm Question:** "Do you have existing documents?"

**JotForm Field ID:** `q62_existingDocuments`

**GHL Field Name:** Do You Have Existing Documents?
**GHL Unique Key:** `{{ contact.do_you_have_existing_documents }}`
**Type:** RADIO
**Choices:** Yes, No
**Status:** ✅ CORRECT

---

### 16. What documents do you have?
**JotForm Question:** "What documents do you have?"

**JotForm Field ID:** `q87_whatDocuments2` (Checkboxes: Trust, Will, Other)

**GHL Field Name:** What Documents Do You Have
**GHL Unique Key:** `{{ contact.contactwhat_documents_do_you_have }}`
**Type:** LARGE_TEXT
**Status:** ⚠️ **TYPE MISMATCH**

**Issue:** JotForm uses CHECKBOXES (multiple selection) but GHL field is LARGE_TEXT (free text)

**Suggested Action:**
- Option 1: Convert checkbox values to comma-separated string
- Option 2: Create MULTIPLE_OPTIONS field in GHL instead

---

### 17. Is the trust funded?
**JotForm Question:** "Is the trust funded?"

**JotForm Field ID:** `q65_trustFunded`

**GHL Field Name:** Is The Trust Funded?
**GHL Unique Key:** `{{ contact.is_the_trust_funded }}`
**Type:** RADIO
**Choices:** Yes, No
**Status:** ✅ CORRECT

---

### 18. Are you hoping to update your documents, start from scratch, or just have your current documents reviewed?
**JotForm Question:** "Are you hoping to update your documents, start from scratch, or just have your current documents reviewed?"

**JotForm Field ID:** `q66_updateDocument`

**GHL Field Name:** Are You Hoping To Update Your Documents, Start From Scratch, Or Just Have Your Current Documents Reviewed?
**GHL Unique Key:** `{{ contact.are_you_hoping_to_update_your_documents_start_from_scratch_or_just_have_your_current_documents_reviewed }}`
**Type:** RADIO
**Choices:** Update docs, Start from scratch, Unsure
**Status:** ✅ CORRECT

---

## Summary of Issues

### 🔴 Critical Issues (Field Missing)
1. **Spouse Number** (`contact.spouse_number`) - Field does not exist in GHL, needs to be created
2. **Caller Full Name** (`contact.caller_full_name`) - Field does not exist, using `contact.callers_first_name` instead

### ⚠️ Choice Mismatches (RADIO fields)
1. **Will the client be able to join the meeting?** - JotForm has 3 options (Yes, No, No but I have POA) vs GHL spec shows 2
2. **Sound Mind** - JotForm option text differs ("Yes, the client is of sound mind." vs "Yes")
3. **Are you a Florida Resident?** - JotForm has 4 options vs GHL spec shows 2

### ⚠️ Type Mismatches
1. **What documents do you have?** - JotForm CHECKBOXES vs GHL LARGE_TEXT
2. **Current Spouse** - JotForm separate name fields vs GHL TEXTBOX_LIST

### ⚠️ Field Key Mismatches (Documentation vs Actual)
1. **Caller's Phone Number** - Spec: `contact.callers_phone_number` / Actual: `contact.contactcallers_phone_number`
2. **Caller's Email** - Spec: `contact.caller_email` / Actual: `contact.contactcallers_email`

---

## Recommended Actions

### Immediate
1. ✅ Create missing field: **Spouse Number** (`contact.spouse_number`, TEXT)
2. ✅ Create missing field: **Caller Full Name** (`contact.caller_full_name`, TEXT) OR use concatenation logic
3. ⚠️ Update GHL field keys in documentation to match actual created fields

### Review Needed
1. ❓ Verify RADIO field choices in GHL match JotForm options (especially Florida Resident, Client Join Meeting, Sound Mind)
2. ❓ Decide on TEXTBOX_LIST format for Current Spouse field
3. ❓ Decide on handling checkboxes for "What documents do you have?" field

### Parser Updates Required
1. Concatenate spouse first+last name for Current Spouse field
2. Concatenate caller first+last name for Caller Full Name field
3. Convert checkbox array to string for What Documents field
4. Map `q117_spousesPhone` to new Spouse Number field

---

## Next Steps
1. Review and approve recommended actions
2. Create missing GHL custom fields
3. Update parser to handle name concatenation
4. Update mapper with correct field keys
5. Test with sample data
