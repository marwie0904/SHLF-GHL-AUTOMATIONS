# JotForm Intake Form to GHL Custom Fields Mapping

Last Updated: 2025-11-21
Status: ✅ All fields created and mapped

## Overview
This document maps JotForm intake form fields to GoHighLevel (GHL) custom contact fields. All required custom fields have been created in GHL.

---

## ✅ Complete Field Mappings

### Standard Fields
| JotForm Field ID | JotForm Question | GHL Field | GHL Field Key | Notes |
|-----------------|------------------|-----------|---------------|-------|
| `name` | Name | firstName / lastName | Standard fields | Split full name |
| `email` | Email | email | Standard field | - |
| `phoneNumber` | Phone | phone | Standard field | - |
| `address` | Address | address1 | Standard field | - |

### Custom Fields - Existing in GHL
| JotForm Field ID | JotForm Question | GHL Custom Field | GHL Field Key | Field Type |
|-----------------|------------------|------------------|---------------|------------|
| `createPdf` | Create PDF | PDF | `contact.pdf` | RADIO |
| `practiceArea` | Practice Area | Practice Area | `contact.practice_area` | TEXT |
| `Referral` | How did you hear about us? | Lead Source | `contact.lead_source` | SINGLE_OPTIONS |
| `referralOthers` | If Others (referral) | Lead Source | `contact.lead_source` | SINGLE_OPTIONS |
| `primaryConcern` | What is your primary concern? | What is your primary concern? | `contact.what_is_your_primary_concern` | RADIO |
| `assetsInvolved` | What assets are involved? | What assets are involved? | `contact.what_assets_are_involved` | LARGE_TEXT |
| `disagreements` | Are there any disagreements among the beneficiaries? | Are there any disagreements among the beneficiaries... | `contact.are_there_any_disagreements_among_the_beneficiaries_that_we_should_be_aware_of_listen_closely_for_potential_litigation_concerns` | RADIO |
| `assetOwnership` | Are the assets owned individually or in trust? | Are all the assets owned individually... | `contact.are_all_the_assets_owned_individually_by_the_decedent_or_are_they_in_a_trust` | RADIO |
| `assetOwnership2` | Are the assets owned individually or in trust? (variant) | Are all the assets owned individually... | `contact.are_all_the_assets_owned_individually_by_the_decedent_or_are_they_in_a_trust` | RADIO |
| `isWill` | Was there a will? | Was there a will? | `contact.was_there_a_will` | RADIO |
| `originalWill` | Do you have access to the original will? | Do you have access to the original will? | `contact.do_you_have_access_to_the_original_will` | RADIO |
| `assetsProbate` | What assets need to go to probate... | If applicable, What assets need to go to probate... | `contact.if_applicable_what_assets_need_to_go_to_probate_or_are_there_assets_that_does_not_have_any_beneficiaries_listed` | LARGE_TEXT |
| `decedentName` | Name of the Decedent | Complete Name of Decedent | `contact.complete_name_of_decedent` | TEXT |
| `decedentDeathDate` | Date of Death of the decedent | Date of Death of The Decedent | `contact.date_of_death_of_the_decedent` | DATE |
| `decedentRelationship` | What is your relationship with the decedent? | Relationship With The Decedent | `contact.relationship_with_the_decedent` | TEXT |
| `onBehalf` | Is the caller scheduling on behalf of the potential client? | Is the caller is scheduling on behalf... | `contact.is_the_caller_is_scheduling_on_behalf_of_the_potential_client` | RADIO |
| `clientJoinMeeting` | Will the client be able to join the meeting? | Will the client be able to join the meeting? | `contact.will_the_client_be_able_to_join_the_meeting` | RADIO |
| `soundMind` | Can you confirm that the client is of sound mind? | Can You Confirm That The Client Is Of Sound Mind... | `contact.client_is_of_sound_mind_to_make_decisions` | RADIO |
| `callersName` | Caller's Name | Caller's First Name | `contact.callers_first_name` | TEXT |
| `floridaResident` | Are you a Florida Resident? | Are you a Florida Resident? | `contact.are_you_a_florida_resident` | RADIO |
| `docFloridaResident` | Are you a Florida Resident? (doc review) | Are you a Florida Resident? | `contact.are_you_a_florida_resident` | RADIO |
| `specifyConcern` | Specify the caller's concern | Specify the caller's concern. | `contact.specify_the_callers_concern` | RADIO |
| `areYouSingle` | Are you single or married? | Are you single or married? | `contact.are_you_single_or_married` | RADIO |
| `spousePlanning` | Are you and your spouse planning together? | Are you and your spouse planning together? | `contact.are_you_and_your_spouse_planning_together` | RADIO |
| `doYouhaveChildren` | Do you have children? | Do you have children? | `contact.do_you_have_children` | RADIO |
| `existingDocuments` | Do you have existing documents? | Do you have existing documents? | `contact.do_you_have_existing_documents` | RADIO |
| `trustFunded` | Is the trust funded? | Is the trust funded? | `contact.is_the_trust_funded` | RADIO |
| `updateDocument` | Are you hoping to update your documents...? | Are you hoping to update your documents... | `contact.are_you_hoping_to_update_your_documents_start_from_scratch_or_just_have_your_current_documents_reviewed` | RADIO |

### Custom Fields - Newly Created (2025-11-21)
| JotForm Field ID | JotForm Question | GHL Custom Field | GHL Field Key | GHL Field ID |
|-----------------|------------------|------------------|---------------|--------------|
| `callDetails` | Call Details | Call Details | `contact.contactcall_details` | `VXeY8yaEx7NB8dYHCW5D` |
| `callersPhone` | Caller's Phone Number | Caller's Phone Number | `contact.contactcallers_phone_number` | `CaiwkU81uQHihhEei8Tb` |
| `callersEmail` | Caller's Email | Caller's Email | `contact.contactcallers_email` | `tUfSB2WZ089KZQDRPWnF` |
| `estatePlan` | What would you like to get out of your estate plan? | Estate Planning Goals | `contact.contactestate_planning_goals` | `8MHzLZPXWKvOmoUflq8q` |
| `whatDocuments2` | What documents do you have? | What Documents Do You Have | `contact.contactwhat_documents_do_you_have` | `bNv9hfUrSu3K8ugqrgQd` |
| `legalAdvice` | What legal advice are you seeking? | Legal Advice Sought | `contact.contactlegal_advice_sought` | `Lo8I4CtpepzDaYMNhQAc` |
| `lifeEvent` | Recent life changes or events | Recent Life Events | `contact.contactrecent_life_events` | `i4Jlmf1iD6Q4CNBH76fw` |
| `documentOwner` | Are you the document owner? | Are You The Document Owner | `contact.contactare_you_the_document_owner` | `eDSfGoq1EKx7WovjzTWB` |
| `relationshipWithDocOwners` | Relationship with document owners | Relationship With Document Owners | `contact.contactrelationship_with_document_owners` | `m5pzXlr0KDAKz5GBidYs` |
| `beneficiaryOrTrustee` | Are you a beneficiary or trustee? | Are You A Beneficiary Or Trustee | `contact.contactare_you_a_beneficiary_or_trustee` | `444HNl6rElyB7RUCOs2B` |
| `poa` | Do you have Power of Attorney? | Power of Attorney (POA) | `contact.contactpower_of_attorney_poa` | `jpvNCxKz9bUtZzyGa8xN` |
| `pendingLitigation` | Pending litigation related to estate/trust | Pending Litigation | `contact.contactpending_litigation` | `to4Z8xSXjn66KL2scqYD` |

---

## ✅ Resolved Mappings

All previously ambiguous and missing fields have been resolved:

| JotForm Field ID | Resolution | GHL Field Key |
|-----------------|------------|---------------|
| `Referral` | ✅ Maps to Lead Source | `contact.lead_source` |
| `referralOthers` | ✅ Maps to Lead Source | `contact.lead_source` |
| `estatePlan` | ✅ New field created | `contact.contactestate_planning_goals` |
| `callersPhone` | ✅ New field created | `contact.contactcallers_phone_number` |
| `callersEmail` | ✅ New field created | `contact.contactcallers_email` |
| `whatDocuments2` | ✅ New field created | `contact.contactwhat_documents_do_you_have` |
| `legalAdvice` | ✅ New field created | `contact.contactlegal_advice_sought` |
| `lifeEvent` | ✅ New field created | `contact.contactrecent_life_events` |
| `documentOwner` | ✅ New field created | `contact.contactare_you_the_document_owner` |
| `relationshipWithDocOwners` | ✅ New field created | `contact.contactrelationship_with_document_owners` |
| `beneficiaryOrTrustee` | ✅ New field created | `contact.contactare_you_a_beneficiary_or_trustee` |
| `poa` | ✅ New field created | `contact.contactpower_of_attorney_poa` |
| `pendingLitigation` | ✅ New field created | `contact.contactpending_litigation` |
| `assetOwnership2` | ✅ Maps to existing field | `contact.are_all_the_assets_owned_individually_by_the_decedent_or_are_they_in_a_trust` |
| `docFloridaResident` | ✅ Maps to existing field | `contact.are_you_a_florida_resident` |

---

## 🔍 Existing GHL Fields NOT Used by Intake Form

These GHL custom fields exist but are **not mapped** to any JotForm intake field:

- Prefix (`contact.prefix`)
- Middle name (`contact.middle_name`)
- Lead Source (`contact.lead_source`) - May use for `Referral`
- Do you have a will or trust? (`contact.do_you_have_a_will_or_trust`) - Similar but not same as `whatDocuments`
- Are all the assets owned individually... (`contact.are_all_the_assets_owned_individually_by_the_decedent_or_are_they_in_a_trust`)
- *Do not ask the caller* Did the caller proactively mention tax implications? (`contact.do_not_ask_the_caller_did_the_caller_proactively_mention_any_concerns_questions_about_tax_implications`)
- Urgency of Your Case (`contact.urgency_of_your_case`)
- Preferred Contact Method (`contact.preferred_contact_method`)
- Reason for Consultation (`contact.reason_for_consultation`)
- Preferred Date for Consultation (`contact.preferred_date_for_consultation`)
- Preferred Appointment Time (`contact.preferred_appointment_time`)
- Contact ID (`contact.contact_id`)
- Jotform (file upload) (`contact.jotform`)
- Beneficiary 1-5 (`contact.beneficiary`, etc.)
- Financial Advisor (`contact.financial_advisor_full`)
- Accountant (`contact.accountant`)
- Current Spouse (`contact.current_spouse`)
- Bank 1-5 (`contact.bank_1` through `contact.bank_5`)
- custom-contact-id (`contact.customcontactid`)
- Which Statement Best Describes You (`contact.which_statement_best_describes_you`)
- Webinar Title (`contact.webinar_title`)
- Event Title/Venue (`contact.event_title`, `contact.event_venue`)
- Guest Name (`contact.guest_name`)
- How did you hear about us? (`contact.how_did_you_hear_about_us`)
- Message (`contact.message`)
- Preferred Office Location (`contact.preferred_office_location`)
- Select The Workshop (`contact.select_the_workshop_you_would_like_to_attend`)
- Workshop Description/Notes/Date (`contact.workshop_description`, etc.)
- Relevant Files (`contact.relevant_files_optional`)
- Time (`contact.time`)
- Net worth questions (`contact.net_worth_over_5m_single_or_10m_married`)
- Are you the PR? (`contact.are_you_the_pr`)
- Are You The Successor Trustee? (`contact.are_you_the_successor_trustee`)
- For The Assets That Are Owned Individually... (`contact.for_the_assets_that_are_owned_individually_are_there_listed_beneficiaries`)
- Spouse Email (`contact.spouse_email`)
- Property Address 1-3 (`contact.property_address_1`, etc.)
- Jotform Link (`contact.jotform_link`)

---

## 📋 Implementation Notes

### Standard Fields Mapping
```javascript
{
  firstName: parsed.name?.split(' ')[0] || '',
  lastName: parsed.name?.split(' ').slice(1).join(' ') || '',
  email: parsed.email,
  phone: parsed.phoneNumber,
  address1: parsed.address
}
```

### Custom Fields Mapping Structure
```javascript
customField: {
  // Existing fields
  'contact.pdf': parsed.createPdf,
  'contact.practice_area': parsed.practiceArea,
  'contact.lead_source': parsed.Referral || parsed.referralOthers,
  'contact.what_is_your_primary_concern': parsed.primaryConcern,
  'contact.what_assets_are_involved': parsed.assetsInvolved,
  'contact.are_there_any_disagreements_among_the_beneficiaries_that_we_should_be_aware_of_listen_closely_for_potential_litigation_concerns': parsed.disagreements,
  'contact.are_all_the_assets_owned_individually_by_the_decedent_or_are_they_in_a_trust': parsed.assetOwnership || parsed.assetOwnership2,
  'contact.was_there_a_will': parsed.isWill,
  'contact.do_you_have_access_to_the_original_will': parsed.originalWill,
  'contact.if_applicable_what_assets_need_to_go_to_probate_or_are_there_assets_that_does_not_have_any_beneficiaries_listed': parsed.assetsProbate,
  'contact.complete_name_of_decedent': parsed.decedentName,
  'contact.date_of_death_of_the_decedent': parsed.decedentDeathDate,
  'contact.relationship_with_the_decedent': parsed.decedentRelationship,
  'contact.is_the_caller_is_scheduling_on_behalf_of_the_potential_client': parsed.onBehalf,
  'contact.will_the_client_be_able_to_join_the_meeting': parsed.clientJoinMeeting,
  'contact.client_is_of_sound_mind_to_make_decisions': parsed.soundMind,
  'contact.callers_first_name': parsed.callersName,
  'contact.are_you_a_florida_resident': parsed.floridaResident || parsed.docFloridaResident,
  'contact.specify_the_callers_concern': parsed.specifyConcern,
  'contact.are_you_single_or_married': parsed.areYouSingle,
  'contact.are_you_and_your_spouse_planning_together': parsed.spousePlanning,
  'contact.do_you_have_children': parsed.doYouhaveChildren,
  'contact.do_you_have_existing_documents': parsed.existingDocuments,
  'contact.is_the_trust_funded': parsed.trustFunded,
  'contact.are_you_hoping_to_update_your_documents_start_from_scratch_or_just_have_your_current_documents_reviewed': parsed.updateDocument,

  // Newly created fields (note: GHL added 'contact' prefix)
  'contact.contactcall_details': parsed.callDetails,
  'contact.contactcallers_phone_number': parsed.callersPhone,
  'contact.contactcallers_email': parsed.callersEmail,
  'contact.contactestate_planning_goals': parsed.estatePlan,
  'contact.contactwhat_documents_do_you_have': parsed.whatDocuments2,
  'contact.contactlegal_advice_sought': parsed.legalAdvice,
  'contact.contactrecent_life_events': parsed.lifeEvent,
  'contact.contactare_you_the_document_owner': parsed.documentOwner,
  'contact.contactrelationship_with_document_owners': parsed.relationshipWithDocOwners,
  'contact.contactare_you_a_beneficiary_or_trustee': parsed.beneficiaryOrTrustee,
  'contact.contactpower_of_attorney_poa': parsed.poa,
  'contact.contactpending_litigation': parsed.pendingLitigation
}
```

### ✅ All Fields Created
All 11 required custom fields have been created in GHL on 2025-11-21.

---

## 🎯 Recommendations

### High Priority
1. **Create missing custom fields** listed above before launching intake form webhook
2. **Clarify referral field mapping** - Decide if `Referral` should map to Lead Source or separate field
3. **Handle caller vs client distinction** - Fields like `callersName`, `callersPhone`, `callersEmail` need proper fields

### Medium Priority
1. **Standardize "what documents" question** - Currently ambiguous across different intake types
2. **Consider merging similar fields** - e.g., "Are you the PR?" and "beneficiaryOrTrustee" could be consolidated
3. **Add validation** - Ensure radio fields match expected values

### Low Priority
1. Review unused GHL fields - Some may be deprecated and could be removed
2. Consider field grouping in GHL for better organization
3. Add field descriptions/help text for complex fields

---

## 📊 Summary Statistics

- **Total JotForm Fields**: 44
- **Standard Fields**: 4 (name, email, phone, address)
- **Existing GHL Custom Fields**: 28
- **Newly Created GHL Custom Fields**: 12
- **Total Mappings**: 44/44 ✅
- **Duplicate JotForm IDs**: 2 (resolved)
  - `whatDocuments` vs `whatDocuments2` → Use `whatDocuments2`
  - `floridaResident` vs `docFloridaResident` → Both map to same GHL field

---

## Next Steps

1. ✅ Review this mapping document
2. ✅ Create missing custom fields in GHL (11 fields created on 2025-11-21)
3. ✅ Resolve ambiguous mappings (all resolved)
4. ⬜ Create JotForm parser for intake form
5. ⬜ Create data mapper function for intake form
6. ⬜ Build intake webhook endpoint
7. ⬜ Test with sample data
8. ⬜ Deploy and configure JotForm webhook

## 🎯 Ready for Implementation
All field mappings are complete and GHL custom fields are created. Ready to proceed with building the intake form webhook.
