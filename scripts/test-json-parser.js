/**
 * Test intake parser with JSON format rawRequest
 */

const { parseJotFormIntakeWebhook } = require('../utils/jotformIntakeParser');

// Sample JSON rawRequest from the logs
const jsonRawRequest = '{"slug":"submit\\/252965467838072","noRedirect":"1","jsExecutionTracker":"build-date-1763751099844=>init-started:1763751100488=>validator-called:1763751100514=>validator-mounted-false:1763751100514=>init-complete:1763751100516=>onsubmit-fired:1763751103694=>observerSubmitHandler_received-submit-event:1763751103695=>submit-validation-passed:1763751103702=>observerSubmitHandler_validation-passed-submitting-form:1763751103712","submitSource":"form","submitDate":"1763751103712","buildDate":"1763751099844","uploadServerUrl":"https:\\/\\/upload.jotform.com\\/upload","eventObserver":"1","q6_createPdf":"No","q10_practiceArea":"Estate Planning","q100_callDetails":"Test Call Details","q3_name":{"first":"Wowa","middle":"","last":"Mawi"},"q12_email":"msjnndknsaj@nsjkand.com","q13_phoneNumber":{"full":"(098) 142-5555"},"q11_address":{"addr_line1":"test address","addr_line2":"","city":"","state":"","postal":"","country":"United States"},"q14_referral":"","q15_referralOthers":"","q20_assetsInvolved":"","q32_assetsProbate":"","q33_decedentName":{"first":"","last":""},"q34_decedentDeathDate":{"month":"","day":"","year":""},"q35_decedentRelationship":"","q44_estatePlan":"test estate goal shadsanjkdnakndnn cjnsn","q45_onBehalf":"No","q50_callersName":{"first":"","last":""},"q51_callersPhone":{"full":""},"q52_callersEmail":"","q56_floridaResident":"Yes","q59_areYouSingle":"Married","q115_spousesName":{"first":"","last":""},"q116_spousesEmail":"","q117_spousesPhone":{"full":""},"q61_doYouhaveChildren":"Yes","q62_existingDocuments":"Yes","q79_legalAdvice":"","q80_lifeEvent":"","q84_relationshipWithDocOwners":"","q85_beneficiaryOrTrustee":"","q86_poa":"","event_id":"1763751100488_252965467838072_Tr7KNz4","timeToSubmit":"3","JotFormPopulatedFields":"q3,q6,q10,q11,q12,q13,q14,q15,q17,q20,q23,q25,q26,q28,q29,q32,q33,q34,q35,q39,q40,q44,q45,q50,q51,q52,q53,q54,q56,q59,q60,q61,q62,q64,q65,q66,q78,q79,q80,q81,q84,q85,q86,q87,q89,q100,q115,q116,q117,q129","validatedNewRequiredFieldIDs":"{\\"new\\":1,\\"id_10\\":\\"Es\\"}","path":"\\/submit\\/252965467838072","q17_primaryConcern":"","q23_disagreements":"","q25_assetOwnership":"","q26_assetOwnership2":"","q28_isWill":"","q29_originalWill":"","q39_specifyConcern":"","q40_needTrust":"","q53_clientJoinMeeting":"","q54_soundMind":"","q60_spousePlanning":"","q64_whatDocuments":"","q65_trustFunded":"","q66_updateDocument":"","q78_docFloridaResident":"","q81_documentOwner":"","q87_whatDocuments2":"","q89_pendingLitigation":"","submissionEdited":1}';

console.log('=== Testing JSON Format Parser ===\n');

try {
  const parsedData = parseJotFormIntakeWebhook(jsonRawRequest);

  console.log('✅ Parser succeeded\n');
  console.log('Basic Contact Info:');
  console.log('  Name:', parsedData.name);
  console.log('  First Name:', parsedData.firstName);
  console.log('  Last Name:', parsedData.lastName);
  console.log('  Email:', parsedData.email);
  console.log('  Phone:', parsedData.phoneNumber);
  console.log('  Address:', parsedData.address);

  console.log('\nPractice & Details:');
  console.log('  Practice Area:', parsedData.practiceArea);
  console.log('  Call Details:', parsedData.callDetails);
  console.log('  Create PDF:', parsedData.createPdf);

  console.log('\nEstate Planning:');
  console.log('  Estate Plan Goals:', parsedData.estatePlan);
  console.log('  On Behalf:', parsedData.onBehalf);
  console.log('  Florida Resident:', parsedData.floridaResident);
  console.log('  Single/Married:', parsedData.areYouSingle);
  console.log('  Have Children:', parsedData.doYouhaveChildren);
  console.log('  Existing Documents:', parsedData.existingDocuments);

  console.log('\nCaller Info:');
  console.log('  Caller Name:', parsedData.callersName);
  console.log('  Caller Phone:', parsedData.callersPhone);
  console.log('  Caller Email:', parsedData.callersEmail);

  console.log('\nSpouse Info:');
  console.log('  Spouse Name:', parsedData.spousesName);
  console.log('  Spouse Email:', parsedData.spousesEmail);
  console.log('  Spouse Phone:', parsedData.spousesPhone);

  console.log('\n=== All Fields Parsed Successfully ===');

} catch (error) {
  console.error('❌ Parser failed:', error.message);
  console.error(error.stack);
}
