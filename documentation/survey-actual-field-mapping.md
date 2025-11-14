# Actual Survey Field Mapping (Verified from Screenshots)

Complete mapping of fields from the survey to GHL, verified from actual survey screenshots.

## Standard Contact Fields (Already Mapped in GHL)

| Survey Field | Webhook Field | GHL Field | Type |
|-------------|---------------|-----------|------|
| Client's First Name | first_name | contact.firstName | TEXT |
| Client's Last Name | last_name | contact.lastName | TEXT |
| Street Address | address1 | contact.address1 | TEXT |
| City | city | contact.city | TEXT |
| State | state | contact.state | TEXT |
| Country | country | contact.country | TEXT |
| Postal Code | postal_code | contact.postalCode | TEXT |
| Email | email | contact.email | TEXT |
| Phone | phone | contact.phone | TEXT |

---

## Custom Fields - Already in GHL (Correct Mapping)

| Survey Field | Webhook Field | GHL Unique Key | Type |
|-------------|---------------|----------------|------|
| Caller's First Name | Caller's First Name | callers_first_name | TEXT |
| Do you have children? | Do you have children? | do_you_have_children | RADIO |
| Are you and your spouse planning together? | Are you and your spouse planning together? | are_you_and_your_spouse_planning_together | RADIO |
| Is the caller is scheduling on behalf of the potential client? | Is the caller is scheduling on behalf of the potential client? | is_the_caller_is_scheduling_on_behalf_of_the_potential_client | RADIO |
| Do you have a will or trust? | Do you have a will or trust? | do_you_have_a_will_or_trust | RADIO |
| Do you have existing documents? | Do you have existing documents? | do_you_have_existing_documents | RADIO |
| Are you single or married? | Are you single or married? | are_you_single_or_married | RADIO |
| Are you hoping to update your documents... | Are you hoping to update your documents, start from scratch, or just have your current documents reviewed? | are_you_hoping_to_update_your_documents_start_from_scratch_or_just_have_your_current_documents_reviewed | RADIO |
| Are you a Florida Resident? | Are you a Florida Resident? | are_you_a_florida_resident | RADIO |
| Is the trust funded? | Is the trust funded? | is_the_trust_funded | RADIO |
| Spouse's Email / Spouse Email | Spouse's Email / Spouse Email | spouse_email / spouses_email | TEXT |
| Are the assets owned individually by the decedent or are they in a trust? | Are the assets owned individually by the decedent or are they in a trust? | are_the_assets_owned_individually_by_the_decedent_or_are_they_in_a_trust | RADIO |
| Are all the assets owned individually by the decedent or are they in a trust? | Are all the assets owned individually by the decedent or are they in a trust? | are_all_the_assets_owned_individually_by_the_decedent_or_are_they_in_a_trust | RADIO |
| Relationship With The Decedent | Relationship With The Decedent | relationship_with_the_decedent | TEXT |
| Date of Death of The Decedent | Date of Death of The Decedent | date_of_death_of_the_decedent | DATE |
| Complete Name of Decedent | Complete Name of Decedent | complete_name_of_decedent | TEXT |
| If applicable, What assets need to go to probate... | If applicable, What assets need to go to probate or are there assets that does not have any beneficiaries listed? | if_applicable_what_assets_need_to_go_to_probate_or_are_there_assets_that_does_not_have_any_beneficiaries_listed | LARGE_TEXT |
| Was there a will? | Was there a will? | was_there_a_will | RADIO |
| Are there any disagreements among the beneficiaries... | Are there any disagreements among the beneficiaries that we should be aware of? (Listen closely for potential litigation concerns.) | are_there_any_disagreements_among_the_beneficiaries_that_we_should_be_aware_of_listen_closely_for_potential_litigation_concerns | RADIO |
| Do you have access to the original will? | Do you have access to the original will? | do_you_have_access_to_the_original_will | RADIO |
| *Do not ask the caller* Did the caller proactively mention any concerns/questions about tax implications? | *Do not ask the caller* Did the caller proactively mention any concerns/questions about tax implications? | do_not_ask_the_caller_did_the_caller_proactively_mention_any_concerns_questions_about_tax_implications | RADIO |
| Deed Call Details | Deed Call Details | deed_call_details | LARGE_TEXT |
| Important Client Info | Important Client Info | important_client_info | LARGE_TEXT |
| Specify the caller's concern | Specify the caller's concern | specify_the_callers_concern | RADIO |
| PBTA Call Details | PBTA Call Details | pbta_call_details | LARGE_TEXT |
| Poperty address 1 | Poperty address 1 | poperty_address_1 | TEXT |
| Poperty address 2 (if applicable) | Poperty address 2 (if applicable) | poperty_address_2_if_applicable | TEXT |
| Poperty address 3 (if applicable) | Poperty address 3 (if applicable) | poperty_address_3_if_applicable | TEXT |
| Medicaid Call Details | Medicaid Call Details | medicaid_call_details | LARGE_TEXT |
| What assets are involved? | What assets are involved? | what_assets_are_involved | LARGE_TEXT |
| What is your primary concern? | What is your primary concern? | what_is_your_primary_concern | RADIO |
| Contact ID (Hidden) | Contact ID | contact_id | TEXT |

---

## Custom Fields - WRONG Unique Keys in GHL (Need to Fix)

| Survey Field | Webhook Field | Current GHL Key (WRONG) | Recommended Key |
|-------------|---------------|-------------------------|-----------------|
| Will the client be able to join the meeting? | Will the client be able to join the meeting? | radio_1dx8_bk0_copy | will_the_client_be_able_to_join_the_meeting |
| Can you confirm that the client is of sound mind... | Can you confirm that the client is of sound mind to understand the conversation and make their own decisions? And to your knowledge, do they have any cognitive issues that might affect this? | radio_1dx8_bk0_copy_mc3_copy | client_is_of_sound_mind_to_make_decisions |
| To help match you with the right attorney... | To help match you with the right attorney, would you say your net worth is over $5 million if single—or $10 million if married? | if_you_are_looking_for_updates_we_will_need_a_copy_of_your_will_trust_atleast_2_days_before_your_appointment_can_you_send_them_electronically_3xc_copy | net_worth_over_5m_single_or_10m_married |
| Are you the PR? | Are you the PR? | was_there_a_will_7rh_copy | are_you_the_pr |
| Are you the Successor Trustee? | Are you the Successor Trustee? | are_the_assets_owned_individually_by_the_decedent_or_are_they_in_a_trust_ug7_copy | are_you_the_successor_trustee |
| For the assets that are owned individually, are there listed beneficiaries? | For the assets that are owned individually, are there llsted beneficiaries? | are_all_the_assets_owned_individually_by_the_decedent_or_are_they_in_a_trust_x5p_copy | are_there_listed_beneficiaries_for_individual_assets |

---

## Fields MISSING in GHL (Need to Add)

| Survey Field | Webhook Field | Recommended Key | Type |
|-------------|---------------|-----------------|------|
| Practice Area | (Not in webhook sample) | practice_area | DROPDOWN |
| Were you referred to us by your CPA, financial advisor, or another attorney? | Lead Source | lead_source | DROPDOWN |
| How did you hear about us? | How did you hear about us? | how_did_you_hear_about_us | TEXT |
| Referrer's Name | Referrer's Name | referrers_name | TEXT |

---

## Summary

- **Standard Contact Fields:** 9 (already mapped)
- **Custom Fields with Correct Mapping:** 30
- **Custom Fields with Wrong Keys:** 6 (need to recreate)
- **Duplicate Fields:** 1 (spouse email - keep one)
- **Missing Fields:** 4 (need to add to GHL)
- **Typo Fields:** 3 (poperty address fields)

**Total Survey Fields:** ~50
