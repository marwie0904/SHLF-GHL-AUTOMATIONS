/**
 * Maps parsed JotForm Intake data to GHL contact format
 */

function mapIntakeToGHL(parsedData) {
  const contactData = {
    // Custom fields array
    customFields: []
  };

  // Add standard fields only if they have values
  if (parsedData.firstName || parsedData.name) {
    contactData.firstName = parsedData.firstName || parsedData.name?.split(' ')[0] || '';
  }

  if (parsedData.lastName || parsedData.name) {
    contactData.lastName = parsedData.lastName || parsedData.name?.split(' ').slice(1).join(' ') || '';
  }

  if (parsedData.email) {
    contactData.email = parsedData.email;
  }

  if (parsedData.phoneNumber) {
    contactData.phone = parsedData.phoneNumber;
  }

  if (parsedData.address) {
    contactData.address1 = parsedData.address;
  }

  // Helper function to add custom field only if value exists
  const addCustomField = (fieldKey, value) => {
    if (value && value.trim() !== '') {
      contactData.customFields.push({
        key: fieldKey,
        field_value: value
      });
    }
  };

  // Existing GHL Custom Fields
  addCustomField('contact.pdf', parsedData.createPdf);
  addCustomField('contact.practice_area', parsedData.practiceArea);

  // Referral - use either Referral or referralOthers
  const referralValue = parsedData.Referral || parsedData.referralOthers;
  addCustomField('contact.lead_source', referralValue);

  addCustomField('contact.medicaid_call_details', parsedData.medicaidCallDetails);
  addCustomField('contact.what_is_your_primary_concern', parsedData.primaryConcern);
  addCustomField('contact.what_assets_are_involved', parsedData.assetsInvolved);
  addCustomField('contact.pbta_call_details', parsedData.pbtaCallDetails);
  addCustomField('contact.are_there_any_disagreements_among_the_beneficiaries_that_we_should_be_aware_of_listen_closely_for_potential_litigation_concerns', parsedData.disagreements);

  // Asset Ownership - use either variant
  const assetOwnershipValue = parsedData.assetOwnership || parsedData.assetOwnership2;
  addCustomField('contact.are_all_the_assets_owned_individually_by_the_decedent_or_are_they_in_a_trust', assetOwnershipValue);

  addCustomField('contact.was_there_a_will', parsedData.isWill);
  addCustomField('contact.do_you_have_access_to_the_original_will', parsedData.originalWill);
  addCustomField('contact.if_applicable_what_assets_need_to_go_to_probate_or_are_there_assets_that_does_not_have_any_beneficiaries_listed', parsedData.assetsProbate);
  addCustomField('contact.complete_name_of_decedent', parsedData.decedentName);
  addCustomField('contact.date_of_death_of_the_decedent', parsedData.decedentDeathDate);
  addCustomField('contact.relationship_with_the_decedent', parsedData.decedentRelationship);
  addCustomField('contact.is_the_caller_is_scheduling_on_behalf_of_the_potential_client', parsedData.onBehalf);
  addCustomField('contact.will_the_client_be_able_to_join_the_meeting', parsedData.clientJoinMeeting);
  addCustomField('contact.client_is_of_sound_mind_to_make_decisions', parsedData.soundMind);
  addCustomField('contact.callers_first_name', parsedData.callersName);

  // Florida Resident - use either variant
  const floridaResidentValue = parsedData.floridaResident || parsedData.docFloridaResident;
  addCustomField('contact.are_you_a_florida_resident', floridaResidentValue);

  addCustomField('contact.deed_call_details', parsedData.deedCallDetails);
  addCustomField('contact.specify_the_callers_concern', parsedData.specifyConcern);
  addCustomField('contact.are_you_single_or_married', parsedData.areYouSingle);
  addCustomField('contact.are_you_and_your_spouse_planning_together', parsedData.spousePlanning);
  addCustomField('contact.do_you_have_children', parsedData.doYouhaveChildren);
  addCustomField('contact.do_you_have_existing_documents', parsedData.existingDocuments);
  addCustomField('contact.is_the_trust_funded', parsedData.trustFunded);
  addCustomField('contact.are_you_hoping_to_update_your_documents_start_from_scratch_or_just_have_your_current_documents_reviewed', parsedData.updateDocument);

  // Newly Created Custom Fields (with 'contact' prefix from GHL)
  addCustomField('contact.contactcallers_phone_number', parsedData.callersPhone);
  addCustomField('contact.contactcallers_email', parsedData.callersEmail);
  addCustomField('contact.contactestate_planning_goals', parsedData.estatePlan);

  // What Documents - use whatDocuments2 as primary
  const whatDocsValue = parsedData.whatDocuments2 || parsedData.whatDocuments;
  addCustomField('contact.contactwhat_documents_do_you_have', whatDocsValue);

  addCustomField('contact.contactlegal_advice_sought', parsedData.legalAdvice);
  addCustomField('contact.contactrecent_life_events', parsedData.lifeEvent);
  addCustomField('contact.contactare_you_the_document_owner', parsedData.documentOwner);
  addCustomField('contact.contactrelationship_with_document_owners', parsedData.relationshipWithDocOwners);
  addCustomField('contact.contactare_you_a_beneficiary_or_trustee', parsedData.beneficiaryOrTrustee);
  addCustomField('contact.contactpower_of_attorney_poa', parsedData.poa);
  addCustomField('contact.contactpending_litigation', parsedData.pendingLitigation);

  // Spouse Information (if exists in GHL - may need custom fields)
  if (parsedData.spouseEmail) {
    addCustomField('contact.spouse_email', parsedData.spouseEmail);
  }

  // Remove customFields array if empty
  if (contactData.customFields.length === 0) {
    delete contactData.customFields;
  }

  return contactData;
}

module.exports = { mapIntakeToGHL };
