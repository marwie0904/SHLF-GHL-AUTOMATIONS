/**
 * Parses JotForm Intake Form webhook data
 * Extracts field values from the rawRequest parameter
 */

function parseJotFormIntakeWebhook(rawRequest) {
  if (!rawRequest) {
    throw new Error('rawRequest is required');
  }

  // Parse rawRequest - can be JSON string or URL-encoded
  let parsed;
  if (typeof rawRequest === 'string' && rawRequest.trim().startsWith('{')) {
    // JSON format
    parsed = JSON.parse(rawRequest);
  } else if (typeof rawRequest === 'object') {
    // Already parsed object
    parsed = rawRequest;
  } else {
    // URL-encoded format
    const params = new URLSearchParams(rawRequest);
    parsed = {};
    for (const [key, value] of params.entries()) {
      parsed[key] = value;
    }
  }

  const data = {};

  // Helper to extract nested object values from parsed data
  const extractNestedValue = (key) => {
    return parsed[key] || null;
  };

  // Practice Area
  data.practiceArea = parsed.q10_practiceArea || '';

  // Create PDF
  data.createPdf = parsed.q6_createPdf || '';

  // Name (full name object)
  const nameObj = extractNestedValue('q3_name');
  if (nameObj) {
    data.name = `${nameObj.first || ''} ${nameObj.middle || ''} ${nameObj.last || ''}`.trim();
    data.firstName = nameObj.first || '';
    data.middleName = nameObj.middle || '';
    data.lastName = nameObj.last || '';
  } else {
    data.name = '';
    data.firstName = '';
    data.middleName = '';
    data.lastName = '';
  }

  // Email
  data.email = parsed.q12_email || '';

  // Phone Number
  const phoneObj = extractNestedValue('q13_phoneNumber');
  data.phoneNumber = phoneObj?.full || '';

  // Address
  const addressObj = extractNestedValue('q11_address');
  if (addressObj) {
    data.address = addressObj.addr_line1 || '';
    data.address2 = addressObj.addr_line2 || '';
    data.city = addressObj.city || '';
    data.state = addressObj.state || '';
    data.postal = addressObj.postal || '';
    data.country = addressObj.country || '';
  } else {
    data.address = '';
    data.address2 = '';
    data.city = '';
    data.state = '';
    data.postal = '';
    data.country = '';
  }

  // Referral
  data.Referral = parsed.q14_referral || '';
  data.referralOthers = parsed.q15_referralOthers || '';

  // Call Details (single field)
  data.callDetails = parsed.q100_callDetails || '';

  // Primary Concern
  data.primaryConcern = parsed.q17_primaryConcern || '';

  // Assets Involved
  data.assetsInvolved = parsed.q20_assetsInvolved || '';

  // Disagreements among beneficiaries
  data.disagreements = parsed.q23_disagreements || '';

  // Asset Ownership (2 variants)
  data.assetOwnership = parsed.q25_assetOwnership || '';
  data.assetOwnership2 = parsed.q26_assetOwnership2 || '';

  // Was there a will?
  data.isWill = parsed.q28_isWill || '';

  // Original Will
  data.originalWill = parsed.q29_originalWill || '';

  // Assets to Probate
  data.assetsProbate = parsed.q32_assetsProbate || '';

  // Decedent Name
  const decedentNameObj = extractNestedValue('q33_decedentName');
  if (decedentNameObj) {
    data.decedentName = `${decedentNameObj.first || ''} ${decedentNameObj.last || ''}`.trim();
  } else {
    data.decedentName = '';
  }

  // Decedent Death Date
  const deathDateObj = extractNestedValue('q34_decedentDeathDate');
  if (deathDateObj && deathDateObj.year && deathDateObj.month && deathDateObj.day) {
    // Format as YYYY-MM-DD
    data.decedentDeathDate = `${deathDateObj.year}-${deathDateObj.month.padStart(2, '0')}-${deathDateObj.day.padStart(2, '0')}`;
  } else {
    data.decedentDeathDate = '';
  }

  // Decedent Relationship
  data.decedentRelationship = parsed.q35_decedentRelationship || '';

  // Estate Plan Goals
  data.estatePlan = parsed.q44_estatePlan || '';

  // Caller Information - Keep as object for mapper to concatenate
  const callersNameObj = extractNestedValue('q50_callersName');
  data.callersName = {
    first: callersNameObj?.first || '',
    last: callersNameObj?.last || ''
  };

  const callersPhoneObj = extractNestedValue('q51_callersPhone');
  data.callersPhone = callersPhoneObj?.full || '';

  data.callersEmail = parsed.q52_callersEmail || '';

  // Spouse Information - Keep as object for mapper to handle TEXTBOX_LIST format
  const spouseNameObj = extractNestedValue('q115_spousesName');
  data.spousesName = {
    first: spouseNameObj?.first || '',
    last: spouseNameObj?.last || ''
  };

  data.spousesEmail = parsed.q116_spousesEmail || '';

  const spousePhoneObj = extractNestedValue('q117_spousesPhone');
  data.spousesPhone = spousePhoneObj?.full || '';

  // On Behalf
  data.onBehalf = parsed.q45_onBehalf || '';

  // Client Join Meeting
  data.clientJoinMeeting = parsed.q53_clientJoinMeeting || '';

  // Sound Mind
  data.soundMind = parsed.q54_soundMind || '';

  // Florida Resident (2 variants)
  data.floridaResident = parsed.q56_floridaResident || '';
  data.docFloridaResident = parsed.q78_docFloridaResident || '';

  // Specify Concern
  data.specifyConcern = parsed.q39_specifyConcern || '';

  // Need Trust
  data.needTrust = parsed.q40_needTrust || '';

  // Are you single or married
  data.areYouSingle = parsed.q59_areYouSingle || '';

  // Spouse Planning
  data.spousePlanning = parsed.q60_spousePlanning || '';

  // Do you have children
  data.doYouhaveChildren = parsed.q61_doYouhaveChildren || '';

  // Existing Documents
  data.existingDocuments = parsed.q62_existingDocuments || '';

  // What Documents (2 variants)
  data.whatDocuments = parsed.q64_whatDocuments || '';
  data.whatDocuments2 = parsed.q87_whatDocuments2 || '';

  // Trust Funded
  data.trustFunded = parsed.q65_trustFunded || '';

  // Update Documents
  data.updateDocument = parsed.q66_updateDocument || '';

  // Doc Review Specific Fields
  data.legalAdvice = parsed.q79_legalAdvice || '';
  data.lifeEvent = parsed.q80_lifeEvent || '';
  data.documentOwner = parsed.q81_documentOwner || '';
  data.relationshipWithDocOwners = parsed.q84_relationshipWithDocOwners || '';
  data.beneficiaryOrTrustee = parsed.q85_beneficiaryTrustee || '';
  data.poa = parsed.q86_poaAuthority || '';
  data.pendingLitigation = parsed.q89_pendingLitigation || '';

  return data;
}

module.exports = { parseJotFormIntakeWebhook };
