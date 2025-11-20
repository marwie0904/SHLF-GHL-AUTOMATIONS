/**
 * Parses JotForm Intake Form webhook data
 * Extracts field values from the rawRequest parameter
 */

function parseJotFormIntakeWebhook(rawRequest) {
  if (!rawRequest) {
    throw new Error('rawRequest is required');
  }

  // Parse the URL-encoded string
  const params = new URLSearchParams(rawRequest);
  const data = {};

  // Helper to extract nested object values
  const extractNestedValue = (key) => {
    const nestedParams = {};
    for (const [paramKey, paramValue] of params.entries()) {
      if (paramKey.startsWith(key + '[')) {
        const nestedKey = paramKey.match(/\[([^\]]+)\]/)[1];
        nestedParams[nestedKey] = paramValue;
      }
    }
    return Object.keys(nestedParams).length > 0 ? nestedParams : null;
  };

  // Practice Area
  data.practiceArea = params.get('q10_practiceArea') || '';

  // Create PDF
  data.createPdf = params.get('q6_createPdf') || '';

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
  data.email = params.get('q12_email') || '';

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
  data.Referral = params.get('q14_referral') || '';
  data.referralOthers = params.get('q15_referralOthers') || '';

  // Call Details (single field)
  data.callDetails = params.get('q100_callDetails') || '';

  // Primary Concern
  data.primaryConcern = params.get('q17_primaryConcern') || '';

  // Assets Involved
  data.assetsInvolved = params.get('q20_assetsInvolved') || '';

  // Disagreements among beneficiaries
  data.disagreements = params.get('q23_disagreements') || '';

  // Asset Ownership (2 variants)
  data.assetOwnership = params.get('q25_assetOwnership') || '';
  data.assetOwnership2 = params.get('q26_assetOwnership2') || '';

  // Was there a will?
  data.isWill = params.get('q28_isWill') || '';

  // Original Will
  data.originalWill = params.get('q29_originalWill') || '';

  // Assets to Probate
  data.assetsProbate = params.get('q32_assetsProbate') || '';

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
  data.decedentRelationship = params.get('q35_decedentRelationship') || '';

  // Estate Plan Goals
  data.estatePlan = params.get('q44_estatePlan') || '';

  // Caller Information - Keep as object for mapper to concatenate
  const callersNameObj = extractNestedValue('q50_callersName');
  data.callersName = {
    first: callersNameObj?.first || '',
    last: callersNameObj?.last || ''
  };

  const callersPhoneObj = extractNestedValue('q51_callersPhone');
  data.callersPhone = callersPhoneObj?.full || '';

  data.callersEmail = params.get('q52_callersEmail') || '';

  // Spouse Information - Keep as object for mapper to handle TEXTBOX_LIST format
  const spouseNameObj = extractNestedValue('q115_spousesName');
  data.spousesName = {
    first: spouseNameObj?.first || '',
    last: spouseNameObj?.last || ''
  };

  data.spousesEmail = params.get('q116_spousesEmail') || '';

  const spousePhoneObj = extractNestedValue('q117_spousesPhone');
  data.spousesPhone = spousePhoneObj?.full || '';

  // On Behalf
  data.onBehalf = params.get('q45_onBehalf') || '';

  // Client Join Meeting
  data.clientJoinMeeting = params.get('q53_clientJoinMeeting') || '';

  // Sound Mind
  data.soundMind = params.get('q54_soundMind') || '';

  // Florida Resident (2 variants)
  data.floridaResident = params.get('q56_floridaResident') || '';
  data.docFloridaResident = params.get('q78_docFloridaResident') || '';

  // Specify Concern
  data.specifyConcern = params.get('q39_specifyConcern') || '';

  // Need Trust
  data.needTrust = params.get('q40_needTrust') || '';

  // Are you single or married
  data.areYouSingle = params.get('q59_areYouSingle') || '';

  // Spouse Planning
  data.spousePlanning = params.get('q60_spousePlanning') || '';

  // Do you have children
  data.doYouhaveChildren = params.get('q61_doYouhaveChildren') || '';

  // Existing Documents
  data.existingDocuments = params.get('q62_existingDocuments') || '';

  // What Documents (2 variants)
  data.whatDocuments = params.get('q64_whatDocuments') || '';
  data.whatDocuments2 = params.get('q87_whatDocuments2') || '';

  // Trust Funded
  data.trustFunded = params.get('q65_trustFunded') || '';

  // Update Documents
  data.updateDocument = params.get('q66_updateDocument') || '';

  // Doc Review Specific Fields
  data.legalAdvice = params.get('q79_legalAdvice') || '';
  data.lifeEvent = params.get('q80_lifeEvent') || '';
  data.documentOwner = params.get('q81_documentOwner') || '';
  data.relationshipWithDocOwners = params.get('q84_relationshipWithDocOwners') || '';
  data.beneficiaryOrTrustee = params.get('q85_beneficiaryOrTrustee') || '';
  data.poa = params.get('q86_poa') || '';
  data.pendingLitigation = params.get('q89_pendingLitigation') || '';

  return data;
}

module.exports = { parseJotFormIntakeWebhook };
