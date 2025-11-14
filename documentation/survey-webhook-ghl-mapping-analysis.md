# Survey Webhook to GHL Field Mapping Analysis

## 1. Field Mapping: Webhook → GHL

### ✅ Correct Mappings (Field name matches unique key)

| Webhook Field | GHL Unique Key | Type | Notes |
|--------------|----------------|------|-------|
| Caller's First Name | `callers_first_name` | TEXT | ✓ |
| Do you have children? | `do_you_have_children` | RADIO | ✓ |
| Are you and your spouse planning together? | `are_you_and_your_spouse_planning_together` | RADIO | ✓ |
| Is the caller is scheduling on behalf of the potential client? | `is_the_caller_is_scheduling_on_behalf_of_the_potential_client` | RADIO | ✓ |
| Do you have a will or trust? | `do_you_have_a_will_or_trust` | RADIO | ✓ |
| Do you have existing documents? | `do_you_have_existing_documents` | RADIO | ✓ |
| Are you single or married? | `are_you_single_or_married` | RADIO | ✓ |
| Are you hoping to update your documents, start from scratch, or just have your current documents reviewed? | `are_you_hoping_to_update_your_documents_start_from_scratch_or_just_have_your_current_documents_reviewed` | RADIO | ✓ |
| Are you a Florida Resident? | `are_you_a_florida_resident` | RADIO | ✓ |
| Is the trust funded? | `is_the_trust_funded` | RADIO | ✓ |
| Spouse's Email | `spouses_email` | TEXT | ⚠️ See duplicate issue |
| Spouse Email | `spouse_email` | TEXT | ⚠️ Duplicate field |
| Are the assets owned individually by the decedent or are they in a trust? | `are_the_assets_owned_individually_by_the_decedent_or_are_they_in_a_trust` | RADIO | ✓ |
| Are all the assets owned individually by the decedent or are they in a trust? | `are_all_the_assets_owned_individually_by_the_decedent_or_are_they_in_a_trust` | RADIO | ⚠️ Similar to above |
| Relationship With The Decedent | `relationship_with_the_decedent` | TEXT | ✓ |
| Date of Death of The Decedent | `date_of_death_of_the_decedent` | DATE | ✓ |
| Complete Name of Decedent | `complete_name_of_decedent` | TEXT | ✓ |
| If applicable, What assets need to go to probate or are there assets that does not have any beneficiaries listed? | `if_applicable_what_assets_need_to_go_to_probate_or_are_there_assets_that_does_not_have_any_beneficiaries_listed` | LARGE_TEXT | ✓ |
| Was there a will? | `was_there_a_will` | RADIO | ✓ |
| Are there any disagreements among the beneficiaries that we should be aware of? | `are_there_any_disagreements_among_the_beneficiaries_that_we_should_be_aware_of_listen_closely_for_potential_litigation_concerns` | RADIO | ✓ |
| Do you have access to the original will? | `do_you_have_access_to_the_original_will` | RADIO | ✓ |
| *Do not ask the caller* Did the caller proactively mention any concerns/questions about tax implications? | `do_not_ask_the_caller_did_the_caller_proactively_mention_any_concerns_questions_about_tax_implications` | RADIO | ✓ |
| Deed Call Details | `deed_call_details` | LARGE_TEXT | ✓ |
| Important Client Info | `important_client_info` | LARGE_TEXT | ✓ |
| Specify the caller's concern | `specify_the_callers_concern` | RADIO | ✓ |
| PBTA Call Details | `pbta_call_details` | LARGE_TEXT | ✓ |
| Poperty address 1 | `poperty_address_1` | TEXT | ⚠️ Typo: "Poperty" |
| Poperty address 2 (if applicable) | `poperty_address_2_if_applicable` | TEXT | ⚠️ Typo: "Poperty" |
| Poperty address 3 (if applicable) | `poperty_address_3_if_applicable` | TEXT | ⚠️ Typo: "Poperty" |
| Medicaid Call Details | `medicaid_call_details` | LARGE_TEXT | ✓ |
| What assets are involved? | `what_assets_are_involved` | LARGE_TEXT | ✓ |
| What is your primary concern? | `what_is_your_primary_concern` | RADIO | ✓ |
| Contact ID | `contact_id` | TEXT | ✓ |

### ❌ INCORRECT/CONFUSING Mappings (Unique key doesn't match field)

| Webhook Field | Current GHL Unique Key | Type | Issue | Recommended Key |
|--------------|------------------------|------|-------|-----------------|
| **Will the client be able to join the meeting?** | `radio_1dx8_bk0_copy` | RADIO | Generic key name, doesn't describe field | `will_the_client_be_able_to_join_the_meeting` |
| **Can you confirm that the client is of sound mind...** | `radio_1dx8_bk0_copy_mc3_copy` | RADIO | Generic key name with random suffix | `client_is_of_sound_mind_to_make_decisions` |
| **To help match you with the right attorney, would you say your net worth is over $5 million...** | `if_you_are_looking_for_updates_we_will_need_a_copy_of_your_will_trust_atleast_2_days_before_your_appointment_can_you_send_them_electronically_3xc_copy` | RADIO | Key describes a COMPLETELY DIFFERENT field about documents | `net_worth_over_5m_single_or_10m_married` |
| **Are you the PR?** | `was_there_a_will_7rh_copy` | RADIO | Key suggests "was there a will" question | `are_you_the_pr` |
| **Are you the Successor Trustee?** | `are_the_assets_owned_individually_by_the_decedent_or_are_they_in_a_trust_ug7_copy` | RADIO | Key describes asset ownership question | `are_you_the_successor_trustee` |
| **For the assets that are owned individually, are there listed beneficiaries?** | `are_all_the_assets_owned_individually_by_the_decedent_or_are_they_in_a_trust_x5p_copy` | RADIO | Key describes different asset question | `are_there_listed_beneficiaries_for_individual_assets` |

---

## 2. 🔴 CRITICAL ISSUES: Duplicate/Ambiguous Fields

### Duplicate Email Fields
**Issue:** Two separate fields for spouse email
- **Webhook Field 1:** "Spouse's Email" → `spouses_email`
- **Webhook Field 2:** "Spouse Email" → `spouse_email`

**Recommendation:**
- Keep ONE field: `spouse_email` (without possessive)
- Delete the duplicate
- Map both webhook variants to the same field

### Similar/Confusing Asset Questions
**Issue:** Multiple variations of "assets owned by decedent" question
- `are_the_assets_owned_individually_by_the_decedent_or_are_they_in_a_trust`
- `are_all_the_assets_owned_individually_by_the_decedent_or_are_they_in_a_trust`
- `are_the_assets_owned_individually_by_the_decedent_or_are_they_in_a_trust_ug7_copy` (incorrectly used for "Are you the Successor Trustee?")
- `are_all_the_assets_owned_individually_by_the_decedent_or_are_they_in_a_trust_x5p_copy` (incorrectly used for "are there listed beneficiaries")

**Recommendation:**
- These appear to be copies from GHL field duplication
- Clean up and use unique, descriptive keys for each distinct question
- The "_copy" suffix indicates fields were duplicated in GHL

### Generic Radio Button Keys
**Issue:** Multiple fields using generic `radio_1dx8_bk0_copy` pattern
- `radio_1dx8_bk0_copy` → "Will the client be able to join the meeting?"
- `radio_1dx8_bk0_copy_mc3_copy` → "Can you confirm client is of sound mind..."

**Recommendation:**
- Recreate these fields with descriptive unique keys
- Delete the old generic fields

---

## 3. Missing Fields

### 📥 Fields in Webhook but NOT in GHL Custom Fields

These fields come through the webhook but have no corresponding GHL custom field:

| Webhook Field | Recommended GHL Key | Type | Priority |
|--------------|---------------------|------|----------|
| Lead Source | `lead_source` | TEXT | HIGH |
| Referrer's Name | `referrers_name` | TEXT | HIGH |
| Prefix | `prefix` | TEXT | MEDIUM |
| Middle name | `middle_name` | TEXT | MEDIUM |
| Single Line 9krf | ⚠️ Unclear purpose | TEXT | LOW - Clarify |
| Urgency of Your Case | `urgency_of_case` | RADIO/TEXT | MEDIUM |
| Preferred Contact Method | `preferred_contact_method` | RADIO | MEDIUM |
| Reason for Consultation | `reason_for_consultation` | TEXT/RADIO | MEDIUM |
| Preferred Date for Consultation | `preferred_date_for_consultation` | DATE | MEDIUM |
| Preferred Appointment Time | `preferred_appointment_time` | TEXT | MEDIUM |
| Numberfield | ⚠️ Unclear purpose | NUMBER | LOW - Clarify |
| Jotform | `jotform_submission_id` | TEXT | LOW |
| Beneficiary 1-5 | `beneficiary_1` through `beneficiary_5` | TEXT | MEDIUM |
| Financial Advisor | `financial_advisor` | TEXT | LOW |
| Accountant | `accountant` | TEXT | LOW |
| Current Spouse | `current_spouse` | TEXT | MEDIUM |
| Bank 1-5 | `bank_1` through `bank_5` | TEXT | LOW |
| PDF | `pdf_url` | TEXT | LOW |
| custom-contact-id | ⚠️ Duplicate of Contact ID? | TEXT | Clarify |
| Which Statement Best Describes You | `which_statement_best_describes_you` | RADIO | LOW |
| Webinar Title | `webinar_title` | TEXT | MEDIUM |
| Event Title | `event_title` | TEXT | MEDIUM |
| Event Venue | `event_venue` | TEXT | MEDIUM |
| Guest Name | `guest_name` | TEXT | LOW |
| How did you hear about us? | `how_did_you_hear_about_us` | RADIO | HIGH |
| Message | `message` | LARGE_TEXT | MEDIUM |
| Preferred Office Location | `preferred_office_location` | RADIO | MEDIUM |
| Select The Workshop you would like to attend | `selected_workshop` | TEXT/RADIO | MEDIUM |
| Case Details | `case_details` | LARGE_TEXT | MEDIUM |
| Workshop Description | `workshop_description` | LARGE_TEXT | LOW |
| Workshop Notes | `workshop_notes` | LARGE_TEXT | LOW |
| Date of Workshop | `date_of_workshop` | DATE | MEDIUM |
| Relevant Files (optional) | `relevant_files_url` | TEXT | LOW |
| Time | `time` | TEXT | MEDIUM |

### 📤 Fields in GHL but NOT in Webhook

Based on the screenshots, all GHL custom fields appear to have corresponding webhook fields (though some mappings are incorrect).

---

## 4. Typos to Fix

### Property vs "Poperty"
The webhook consistently uses "Poperty" (missing 'r'):
- Poperty address 1
- Poperty address 2 (if applicable)
- Poperty address 3 (if applicable)

**Recommendation:** Fix the survey/webhook source to use "Property" correctly, OR keep the GHL keys as `poperty_address_*` to match the webhook data.

---

## 5. 🎯 Action Items - Priority Order

### CRITICAL (Do First)
1. **Fix ambiguous unique keys** - Recreate these 6 fields with proper keys:
   - `radio_1dx8_bk0_copy` → `will_the_client_be_able_to_join_the_meeting`
   - `radio_1dx8_bk0_copy_mc3_copy` → `client_is_of_sound_mind_to_make_decisions`
   - `if_you_are_looking_for_updates_we_will_need_a_copy_of_your_will_trust_atleast_2_days_before_your_appointment_can_you_send_them_electronically_3xc_copy` → `net_worth_over_5m_single_or_10m_married`
   - `was_there_a_will_7rh_copy` → `are_you_the_pr`
   - `are_the_assets_owned_individually_by_the_decedent_or_are_they_in_a_trust_ug7_copy` → `are_you_the_successor_trustee`
   - `are_all_the_assets_owned_individually_by_the_decedent_or_are_they_in_a_trust_x5p_copy` → `are_there_listed_beneficiaries_for_individual_assets`

2. **Resolve spouse email duplicate** - Keep ONE field, delete the other

### HIGH (Do Next)
3. **Add missing HIGH priority fields:**
   - Lead Source
   - Referrer's Name
   - How did you hear about us?

### MEDIUM (Do Later)
4. **Add remaining webhook fields to GHL** based on business needs
5. **Fix "Poperty" typo** in survey form or document the exception

---

## 6. Recommended Field Mapping Code

```javascript
// Webhook field to GHL custom field mapping
const webhookToGHLMapping = {
  // Standard GHL fields
  'contact_id': 'contact.id', // Use for lookup
  'first_name': 'contact.firstName',
  'last_name': 'contact.lastName',
  'email': 'contact.email',
  'phone': 'contact.phone',
  'address1': 'contact.address1',
  'city': 'contact.city',
  'state': 'contact.state',
  'country': 'contact.country',
  'postal_code': 'contact.postalCode',

  // Custom fields - Correct mappings
  "Caller's First Name": 'customField.callers_first_name',
  "Do you have children?": 'customField.do_you_have_children',
  "Are you and your spouse planning together?": 'customField.are_you_and_your_spouse_planning_together',
  "Is the caller is scheduling on behalf of the potential client?": 'customField.is_the_caller_is_scheduling_on_behalf_of_the_potential_client',
  "Do you have a will or trust?": 'customField.do_you_have_a_will_or_trust',
  "Do you have existing documents?": 'customField.do_you_have_existing_documents',
  "Are you single or married?": 'customField.are_you_single_or_married',
  "Are you hoping to update your documents, start from scratch, or just have your current documents reviewed?": 'customField.are_you_hoping_to_update_your_documents_start_from_scratch_or_just_have_your_current_documents_reviewed',
  "Are you a Florida Resident?": 'customField.are_you_a_florida_resident',
  "Is the trust funded?": 'customField.is_the_trust_funded',

  // Handle both spouse email variants
  "Spouse's Email": 'customField.spouse_email',
  "Spouse Email": 'customField.spouse_email',

  // Fields with problematic keys (AFTER recreating them in GHL)
  "Will the client be able to join the meeting?": 'customField.will_the_client_be_able_to_join_the_meeting',
  "Can you confirm that the client is of sound mind to understand the conversation and make their own decisions? And to your knowledge, do they have any cognitive issues that might affect this?": 'customField.client_is_of_sound_mind_to_make_decisions',
  "To help match you with the right attorney, would you say your net worth is over $5 million if single—or $10 million if married?": 'customField.net_worth_over_5m_single_or_10m_married',
  "Are you the PR?": 'customField.are_you_the_pr',
  "Are you the Successor Trustee?": 'customField.are_you_the_successor_trustee',
  "For the assets that are owned individually, are there llsted beneficiaries?": 'customField.are_there_listed_beneficiaries_for_individual_assets',

  // Remaining fields
  "Are the assets owned individually by the decedent or are they in a trust?": 'customField.are_the_assets_owned_individually_by_the_decedent_or_are_they_in_a_trust',
  "Are all the assets owned individually by the decedent or are they in a trust?": 'customField.are_all_the_assets_owned_individually_by_the_decedent_or_are_they_in_a_trust',
  "Relationship With The Decedent": 'customField.relationship_with_the_decedent',
  "Date of Death of The Decedent": 'customField.date_of_death_of_the_decedent',
  "Complete Name of Decedent": 'customField.complete_name_of_decedent',
  "If applicable, What assets need to go to probate or are there assets that does not have any beneficiaries listed?": 'customField.if_applicable_what_assets_need_to_go_to_probate_or_are_there_assets_that_does_not_have_any_beneficiaries_listed',
  "Was there a will?": 'customField.was_there_a_will',
  "Are there any disagreements among the beneficiaries that we should be aware of? (Listen closely for potential litigation concerns.)": 'customField.are_there_any_disagreements_among_the_beneficiaries_that_we_should_be_aware_of_listen_closely_for_potential_litigation_concerns',
  "Do you have access to the original will?": 'customField.do_you_have_access_to_the_original_will',
  "*Do not ask the caller* Did the caller proactively mention any concerns/questions about tax implications?": 'customField.do_not_ask_the_caller_did_the_caller_proactively_mention_any_concerns_questions_about_tax_implications',
  "Deed Call Details": 'customField.deed_call_details',
  "Important Client Info": 'customField.important_client_info',
  "Specify the caller's concern": 'customField.specify_the_callers_concern',
  "PBTA Call Details": 'customField.pbta_call_details',
  "Poperty address 1": 'customField.poperty_address_1',
  "Poperty address 2 (if applicable)": 'customField.poperty_address_2_if_applicable',
  "Poperty address 3 (if applicable)": 'customField.poperty_address_3_if_applicable',
  "Medicaid Call Details": 'customField.medicaid_call_details',
  "What assets are involved?": 'customField.what_assets_are_involved',
  "What is your primary concern?": 'customField.what_is_your_primary_concern',
  "Contact ID": 'customField.contact_id',

  // NEW FIELDS TO ADD (after creating in GHL)
  "Lead Source": 'customField.lead_source',
  "Referrer's Name": 'customField.referrers_name',
  // ... add more as needed
};
```

---

## Summary

**Total Webhook Custom Fields:** ~70+
**Mapped GHL Fields:** ~40
**Critical Issues:** 6 fields with wrong unique keys
**Missing in GHL:** ~30 fields
**Duplicates:** 2 (spouse email variants)
