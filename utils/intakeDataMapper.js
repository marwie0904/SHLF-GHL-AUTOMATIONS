/**
 * Maps parsed JotForm Intake data to GHL contact format
 */

// GHL Custom Field IDs
const FIELD_IDS = {
  'contact.pdf': 'BJKwhr1OUaStUYVo6poh',
  'contact.practice_area': 'wDIbx6zdbLXKOykmZ2tz',
  'contact.lead_source': 'HXp4FS1uVHX14zsqKQsc',
  'contact.contactcall_details': 'VXeY8yaEx7NB8dYHCW5D',
  'contact.call_details': 'OnKVBS9adCKWvUs5XjcV',
  'contact.what_is_your_primary_concern': 'D0tJaiWjvhuoeDs612Ly',
  'contact.what_assets_are_involved': 'Kb5B5V6lhtJK0zNuY1AK',
  'contact.are_there_any_disagreements_among_the_beneficiaries_that_we_should_be_aware_of_listen_closely_for_potential_litigation_concerns': 'hvyeRjtJaVzr258ygiA9',
  'contact.are_the_assets_owned_individually_by_the_decedent_or_are_they_in_a_trust': 'f9P0TxDhzfUt9iJ3dSM4',
  'contact.are_all_the_assets_owned_individually_by_the_decedent_or_are_they_in_a_trust': '03uwVudxUoprB0qkYL9b',
  'contact.was_there_a_will': 'ZEUgmck6XDxSbBPuoF9Z',
  'contact.do_you_have_access_to_the_original_will': 'VcMVgPtDJDsw1JQgjPZB',
  'contact.if_applicable_what_assets_need_to_go_to_probate_or_are_there_assets_that_does_not_have_any_beneficiaries_listed': '7lzAFwgr7g9PHuH9go4i',
  'contact.complete_name_of_decedent': 'a6Nrb3zV1X3GvBU7MVSI',
  'contact.date_of_death_of_the_decedent': 'Utm3GRHcCwIqS8UX8aUZ',
  'contact.relationship_with_the_decedent': 'eM97PlH4hd5ymrk644o4',
  'contact.is_the_caller_is_scheduling_on_behalf_of_the_potential_client': 'ktGC3b2JInlsqPMkuo7n',
  'contact.will_the_client_be_able_to_join_the_meeting': 'joqJjFgOxWP9eE7pxwp8',
  'contact.client_is_of_sound_mind_to_make_decisions': 'q2G0uBRyIeQZm9CPDRGd',
  'contact.caller_full_name': '2ShvnG8RIHnxx8s3hTn3',
  'contact.are_you_a_florida_resident': 'VoJV82JGngzfNN0WeZ30',
  'contact.specify_the_callers_concern': 'qY1wsvCHcAuaYLlhS4hS',
  'contact.caller_does_not_have_a_trust_and_would_like_to_seek_counsel_on_whether_they_need_a_trust_set_up_for_my_property': 'ZKh6TYwT4NcRpwrmzR2G',
  'contact.are_you_single_or_married': 'SdnOpiR5HTA7fLdnAccX',
  'contact.current_spouse': 'PaWSsRF646ra92Wl28BO',
  'contact.are_you_and_your_spouse_planning_together': 'MRuVXS73El19MxjSr0Ig',
  'contact.spouse_email': 'BXXjv1Af1OqHIkUMYj6l',
  'contact.spouse_number': 'Sq5h0Skg4EC699PbpChg',
  'contact.do_you_have_children': 'xjWip13J5EdmS81fq3yc',
  'contact.do_you_have_existing_documents': 'C1gvPZ2nGBg9sGzbR4xN',
  'contact.is_the_trust_funded': 'aQ0oOgcXQ6JFTrbvf0N9',
  'contact.are_you_hoping_to_update_your_documents_start_from_scratch_or_just_have_your_current_documents_reviewed': 'AwfYv74AT3dgZtE4F2p5',
  'contact.callers_phone_number': 'uwRsFWKolWCIVF0FvFEc',
  'contact.caller_email': 'qIFylxpVQiK5U9QjOKrc',
  'contact.contactestate_planning_goals': '8MHzLZPXWKvOmoUflq8q',
  'contact.contactwhat_documents_do_you_have': 'bNv9hfUrSu3K8ugqrgQd',
  'contact.contactlegal_advice_sought': 'Lo8I4CtpepzDaYMNhQAc',
  'contact.contactrecent_life_events': 'i4Jlmf1iD6Q4CNBH76fw',
  'contact.contactare_you_the_document_owner': 'eDSfGoq1EKx7WovjzTWB',
  'contact.contactrelationship_with_document_owners': 'm5pzXlr0KDAKz5GBidYs',
  'contact.contactare_you_a_beneficiary_or_trustee': '444HNl6rElyB7RUCOs2B',
  'contact.contactpower_of_attorney_poa': 'jpvNCxKz9bUtZzyGa8xN',
  'contact.contactpending_litigation': 'VScWnDNprhqiKb7Es6ln',
  'contact.are_you_a_florida_resident__doc': 'uuIVUwtTAPXqUCLtcaig',
  'contact.what_documents_so_you_have__doc': 'w3LM4IBJW97j20EsonwS'
};

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
    // Skip if value is null, undefined, or empty
    if (!value) return;

    // Convert value to string if it's not already
    const stringValue = typeof value === 'string' ? value : String(value);

    // Skip if empty string after trim
    if (stringValue.trim() === '') return;

    const fieldId = FIELD_IDS[fieldKey];
    if (fieldId) {
      contactData.customFields.push({
        id: fieldId,
        field_value: stringValue
      });
    } else {
      console.warn(`No field ID found for key: ${fieldKey}`);
    }
  };

  // Existing GHL Custom Fields
  addCustomField('contact.pdf', parsedData.createPdf);
  addCustomField('contact.practice_area', parsedData.practiceArea);

  // Referral - use either Referral or referralOthers
  const referralValue = parsedData.Referral || parsedData.referralOthers;
  addCustomField('contact.lead_source', referralValue);

  // Call Details (map to both fields)
  addCustomField('contact.contactcall_details', parsedData.callDetails);
  addCustomField('contact.call_details', parsedData.callDetails);

  addCustomField('contact.what_is_your_primary_concern', parsedData.primaryConcern);
  addCustomField('contact.what_assets_are_involved', parsedData.assetsInvolved);
  addCustomField('contact.are_there_any_disagreements_among_the_beneficiaries_that_we_should_be_aware_of_listen_closely_for_potential_litigation_concerns', parsedData.disagreements);

  // Asset Ownership (map both variants to their respective fields)
  addCustomField('contact.are_the_assets_owned_individually_by_the_decedent_or_are_they_in_a_trust', parsedData.assetOwnership);
  addCustomField('contact.are_all_the_assets_owned_individually_by_the_decedent_or_are_they_in_a_trust', parsedData.assetOwnership2);

  addCustomField('contact.was_there_a_will', parsedData.isWill);
  addCustomField('contact.do_you_have_access_to_the_original_will', parsedData.originalWill);
  addCustomField('contact.if_applicable_what_assets_need_to_go_to_probate_or_are_there_assets_that_does_not_have_any_beneficiaries_listed', parsedData.assetsProbate);
  addCustomField('contact.complete_name_of_decedent', parsedData.decedentName);
  addCustomField('contact.date_of_death_of_the_decedent', parsedData.decedentDeathDate);
  addCustomField('contact.relationship_with_the_decedent', parsedData.decedentRelationship);
  addCustomField('contact.is_the_caller_is_scheduling_on_behalf_of_the_potential_client', parsedData.onBehalf);
  addCustomField('contact.will_the_client_be_able_to_join_the_meeting', parsedData.clientJoinMeeting);
  addCustomField('contact.client_is_of_sound_mind_to_make_decisions', parsedData.soundMind);

  // Caller Full Name - Concatenate first + last
  const callerFullName = parsedData.callersName
    ? `${parsedData.callersName.first || ''} ${parsedData.callersName.last || ''}`.trim()
    : '';
  addCustomField('contact.caller_full_name', callerFullName);

  // Florida Resident - use either variant
  const floridaResidentValue = parsedData.floridaResident || parsedData.docFloridaResident;
  addCustomField('contact.are_you_a_florida_resident', floridaResidentValue);

  addCustomField('contact.specify_the_callers_concern', parsedData.specifyConcern);
  addCustomField('contact.caller_does_not_have_a_trust_and_would_like_to_seek_counsel_on_whether_they_need_a_trust_set_up_for_my_property', parsedData.needTrust);
  addCustomField('contact.are_you_single_or_married', parsedData.areYouSingle);

  // Current Spouse - TEXTBOX_LIST format (Name\nVeteran)
  if (parsedData.spousesName && (parsedData.spousesName.first || parsedData.spousesName.last)) {
    const spouseName = `${parsedData.spousesName.first || ''} ${parsedData.spousesName.last || ''}`.trim();
    // TEXTBOX_LIST format: Name\nVeteran (leave Veteran empty for now)
    const spouseTextboxData = `${spouseName}\n`;
    addCustomField('contact.current_spouse', spouseTextboxData);
  }

  addCustomField('contact.are_you_and_your_spouse_planning_together', parsedData.spousePlanning);

  // Spouse Email & Phone
  addCustomField('contact.spouse_email', parsedData.spousesEmail);
  addCustomField('contact.spouse_number', parsedData.spousesPhone);

  addCustomField('contact.do_you_have_children', parsedData.doYouhaveChildren);
  addCustomField('contact.do_you_have_existing_documents', parsedData.existingDocuments);
  addCustomField('contact.is_the_trust_funded', parsedData.trustFunded);
  addCustomField('contact.are_you_hoping_to_update_your_documents_start_from_scratch_or_just_have_your_current_documents_reviewed', parsedData.updateDocument);

  // Caller Phone & Email
  addCustomField('contact.callers_phone_number', parsedData.callersPhone);
  addCustomField('contact.caller_email', parsedData.callersEmail);

  // Estate Planning Goals
  addCustomField('contact.contactestate_planning_goals', parsedData.estatePlan);

  // What Documents - convert checkbox array to text
  if (parsedData.whatDocuments2) {
    let documentsText = parsedData.whatDocuments2;
    if (Array.isArray(parsedData.whatDocuments2)) {
      documentsText = parsedData.whatDocuments2.join(', ');
    }
    addCustomField('contact.contactwhat_documents_do_you_have', documentsText);
  } else if (parsedData.whatDocuments) {
    let documentsText = parsedData.whatDocuments;
    if (Array.isArray(parsedData.whatDocuments)) {
      documentsText = parsedData.whatDocuments.join(', ');
    }
    addCustomField('contact.contactwhat_documents_do_you_have', documentsText);
  }

  // Doc Review specific fields
  addCustomField('contact.are_you_a_florida_resident__doc', parsedData.docFloridaResident);
  addCustomField('contact.contactlegal_advice_sought', parsedData.legalAdvice);
  addCustomField('contact.contactrecent_life_events', parsedData.lifeEvent);
  addCustomField('contact.contactare_you_the_document_owner', parsedData.documentOwner);
  addCustomField('contact.contactrelationship_with_document_owners', parsedData.relationshipWithDocOwners);
  addCustomField('contact.contactare_you_a_beneficiary_or_trustee', parsedData.beneficiaryOrTrustee);
  addCustomField('contact.contactpower_of_attorney_poa', parsedData.poa);

  // What Documents - Doc Review (maps to different field than estate planning)
  if (parsedData.whatDocuments2) {
    let documentsText = parsedData.whatDocuments2;
    if (Array.isArray(parsedData.whatDocuments2)) {
      documentsText = parsedData.whatDocuments2.join(', ');
    }
    addCustomField('contact.what_documents_so_you_have__doc', documentsText);
  }

  addCustomField('contact.contactpending_litigation', parsedData.pendingLitigation);

  // Remove customFields array if empty
  if (contactData.customFields.length === 0) {
    delete contactData.customFields;
  }

  return contactData;
}

module.exports = { mapIntakeToGHL };
