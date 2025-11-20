/**
 * Test Dual Florida Resident Mapping
 * Verifies that both q56_floridaResident and q78_docFloridaResident map to same field
 */

const { parseJotFormIntakeWebhook } = require('../utils/jotformIntakeParser');
const { mapIntakeToGHL } = require('../utils/intakeDataMapper');

console.log('=== Testing Dual Florida Resident Mapping ===\n');

// Test 1: Only q56_floridaResident is filled
console.log('Test 1: Only q56_floridaResident filled');
const test1Data = new URLSearchParams({
  'q56_floridaResident': 'Yes',
  'q3_name[first]': 'Test',
  'q3_name[last]': 'User',
  'q12_email': 'test@example.com',
  'q10_practiceArea': 'Estate Planning'
}).toString();

const parsed1 = parseJotFormIntakeWebhook(test1Data);
const ghl1 = mapIntakeToGHL(parsed1);
const floridaField1 = ghl1.customFields.find(f => f.key === 'contact.are_you_a_florida_resident');
console.log('Result:', floridaField1?.field_value);
console.log('Expected: Yes');
console.log('Status:', floridaField1?.field_value === 'Yes' ? '✅ PASS' : '❌ FAIL');

// Test 2: Only q78_docFloridaResident is filled
console.log('\nTest 2: Only q78_docFloridaResident filled');
const test2Data = new URLSearchParams({
  'q78_docFloridaResident': 'No',
  'q3_name[first]': 'Test',
  'q3_name[last]': 'User',
  'q12_email': 'test@example.com',
  'q10_practiceArea': 'Estate Planning'
}).toString();

const parsed2 = parseJotFormIntakeWebhook(test2Data);
const ghl2 = mapIntakeToGHL(parsed2);
const floridaField2 = ghl2.customFields.find(f => f.key === 'contact.are_you_a_florida_resident');
console.log('Result:', floridaField2?.field_value);
console.log('Expected: No');
console.log('Status:', floridaField2?.field_value === 'No' ? '✅ PASS' : '❌ FAIL');

// Test 3: Both filled (should use first one)
console.log('\nTest 3: Both filled (should prioritize q56)');
const test3Data = new URLSearchParams({
  'q56_floridaResident': 'Yes',
  'q78_docFloridaResident': 'No',
  'q3_name[first]': 'Test',
  'q3_name[last]': 'User',
  'q12_email': 'test@example.com',
  'q10_practiceArea': 'Estate Planning'
}).toString();

const parsed3 = parseJotFormIntakeWebhook(test3Data);
const ghl3 = mapIntakeToGHL(parsed3);
const floridaField3 = ghl3.customFields.find(f => f.key === 'contact.are_you_a_florida_resident');
console.log('Result:', floridaField3?.field_value);
console.log('Expected: Yes (q56 takes priority)');
console.log('Status:', floridaField3?.field_value === 'Yes' ? '✅ PASS' : '❌ FAIL');

console.log('\n=== All Tests Complete ===');
