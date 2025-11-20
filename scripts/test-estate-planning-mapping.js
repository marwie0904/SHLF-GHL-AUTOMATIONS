/**
 * Test Estate Planning Field Mapping
 * Tests the parser and mapper updates for estate planning section
 */

const { parseJotFormIntakeWebhook } = require('../utils/jotformIntakeParser');
const { mapIntakeToGHL } = require('../utils/intakeDataMapper');

// Sample estate planning data from JotForm webhook
const sampleEstatePlanningData = new URLSearchParams({
  // Estate Planning Goals
  'q44_estatePlan': 'I want to avoid probate and protect my children',

  // On Behalf Questions
  'q45_onBehalf': 'Yes',
  'q53_clientJoinMeeting': 'No, but I have POA',
  'q54_soundMind': 'Yes, the client is of sound mind.',

  // Caller Information (nested)
  'q50_callersName[first]': 'John',
  'q50_callersName[last]': 'Smith',
  'q51_callersPhone[full]': '+1234567890',
  'q52_callersEmail': 'john.smith@example.com',

  // Florida Resident (variant 1)
  'q56_floridaResident': 'Yes',

  // Marital Status
  'q59_areYouSingle': 'Married',

  // Spouse Information (nested)
  'q115_spousesName[first]': 'Jane',
  'q115_spousesName[last]': 'Smith',
  'q60_spousePlanning': 'Yes',
  'q116_spousesEmail': 'jane.smith@example.com',
  'q117_spousesPhone[full]': '+1234567891',

  // Children & Documents
  'q61_doYouhaveChildren': 'Yes',
  'q62_existingDocuments': 'Yes',
  'q87_whatDocuments2': 'Trust, Will',
  'q65_trustFunded': 'No',
  'q66_updateDocument': 'Update docs',

  // Required fields for contact creation
  'q3_name[first]': 'Jane',
  'q3_name[last]': 'Smith',
  'q12_email': 'jane.smith@example.com',
  'q13_phoneNumber[full]': '+1234567891',
  'q10_practiceArea': 'Estate Planning'
}).toString();

console.log('=== Testing Estate Planning Field Mapping ===\n');

try {
  // Step 1: Parse the webhook data
  console.log('Step 1: Parsing JotForm webhook data...');
  const parsedData = parseJotFormIntakeWebhook(sampleEstatePlanningData);

  console.log('\n--- Parsed Caller Name (should be object) ---');
  console.log('callersName:', parsedData.callersName);

  console.log('\n--- Parsed Spouse Name (should be object) ---');
  console.log('spousesName:', parsedData.spousesName);

  console.log('\n--- Other Estate Planning Fields ---');
  console.log('estatePlan:', parsedData.estatePlan);
  console.log('onBehalf:', parsedData.onBehalf);
  console.log('clientJoinMeeting:', parsedData.clientJoinMeeting);
  console.log('soundMind:', parsedData.soundMind);
  console.log('callersPhone:', parsedData.callersPhone);
  console.log('callersEmail:', parsedData.callersEmail);
  console.log('floridaResident:', parsedData.floridaResident);
  console.log('areYouSingle:', parsedData.areYouSingle);
  console.log('spousePlanning:', parsedData.spousePlanning);
  console.log('spousesEmail:', parsedData.spousesEmail);
  console.log('spousesPhone:', parsedData.spousesPhone);
  console.log('doYouhaveChildren:', parsedData.doYouhaveChildren);
  console.log('existingDocuments:', parsedData.existingDocuments);
  console.log('whatDocuments2:', parsedData.whatDocuments2);
  console.log('trustFunded:', parsedData.trustFunded);
  console.log('updateDocument:', parsedData.updateDocument);

  // Step 2: Map to GHL format
  console.log('\n\nStep 2: Mapping to GHL contact format...');
  const ghlData = mapIntakeToGHL(parsedData);

  console.log('\n--- GHL Contact Data ---');
  console.log(JSON.stringify(ghlData, null, 2));

  // Step 3: Verify specific estate planning fields
  console.log('\n\n=== Verification ===\n');

  const customFields = ghlData.customFields || [];

  // Find specific fields
  const callerFullName = customFields.find(f => f.key === 'contact.caller_full_name');
  const callersPhone = customFields.find(f => f.key === 'contact.callers_phone_number');
  const callersEmail = customFields.find(f => f.key === 'contact.caller_email');
  const currentSpouse = customFields.find(f => f.key === 'contact.current_spouse');
  const spouseEmail = customFields.find(f => f.key === 'contact.spouse_email');
  const spouseNumber = customFields.find(f => f.key === 'contact.spouse_number');
  const estatePlanGoals = customFields.find(f => f.key === 'contact.contactestate_planning_goals');
  const whatDocs = customFields.find(f => f.key === 'contact.contactwhat_documents_do_you_have');
  const floridaResident = customFields.find(f => f.key === 'contact.are_you_a_florida_resident');

  console.log('✅ Caller Full Name (concatenated):', callerFullName?.field_value);
  console.log('✅ Callers Phone:', callersPhone?.field_value);
  console.log('✅ Callers Email:', callersEmail?.field_value);
  console.log('✅ Current Spouse (TEXTBOX_LIST):', JSON.stringify(currentSpouse?.field_value));
  console.log('✅ Spouse Email:', spouseEmail?.field_value);
  console.log('✅ Spouse Number:', spouseNumber?.field_value);
  console.log('✅ Estate Planning Goals:', estatePlanGoals?.field_value);
  console.log('✅ What Documents (text):', whatDocs?.field_value);
  console.log('✅ Florida Resident:', floridaResident?.field_value);

  // Verify TEXTBOX_LIST format
  console.log('\n--- TEXTBOX_LIST Format Check ---');
  if (currentSpouse) {
    const lines = currentSpouse.field_value.split('\n');
    console.log('Line 1 (Name):', lines[0]);
    console.log('Line 2 (Veteran):', lines[1] || '(empty)');
    console.log('Format correct:', lines.length >= 2 ? '✅' : '❌');
  }

  console.log('\n=== Test Complete ===');

} catch (error) {
  console.error('❌ Test failed:', error.message);
  console.error(error.stack);
}
