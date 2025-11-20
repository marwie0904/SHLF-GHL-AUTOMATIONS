const axios = require('axios');

// Sample raw data from your intake form
const sampleRawRequest = 'slug=submit%2F252965467838072&noRedirect=1&jsExecutionTracker=build-date-1763664710037%3D%3Einit-started%3A1763664710950%3D%3Evalidator-called%3A1763664710979%3D%3Evalidator-mounted-false%3A1763664710979%3D%3Einit-complete%3A1763664710982%3D%3Eonsubmit-fired%3A1763664731583%3D%3EobserverSubmitHandler_received-submit-event%3A1763664731583%3D%3Einterval-complete%3A1763664731990%3D%3Eonsubmit-fired%3A1763664736184%3D%3EobserverSubmitHandler_received-submit-event%3A1763664736184%3D%3Esubmit-validation-passed%3A1763664736188%3D%3EobserverSubmitHandler_validation-passed-submitting-form%3A1763664736199&submitSource=form&submitDate=1763664736199&buildDate=1763664710037&uploadServerUrl=https%3A%2F%2Fupload.jotform.com%2Fupload&eventObserver=1&q10_practiceArea=Estate+Planning&q100_callDetails=&q3_name%5Bfirst%5D=nov19test&q3_name%5Bmiddle%5D=&q3_name%5Blast%5D=nov19test&q12_email=testnov19%40gmail.com&q13_phoneNumber%5Bfull%5D=%28111%29+111-1113&q11_address%5Baddr_line1%5D=&q11_address%5Baddr_line2%5D=&q11_address%5Bcity%5D=&q11_address%5Bstate%5D=&q11_address%5Bpostal%5D=&q11_address%5Bcountry%5D=United+States&q14_referral=&q15_referralOthers=&q20_assetsInvolved=&q32_assetsProbate=&q33_decedentName%5Bfirst%5D=&q33_decedentName%5Blast%5D=&q34_decedentDeathDate%5Bmonth%5D=&q34_decedentDeathDate%5Bday%5D=&q34_decedentDeathDate%5Byear%5D=&q35_decedentRelationship=&q44_estatePlan=&q50_callersName%5Bfirst%5D=&q50_callersName%5Blast%5D=&q51_callersPhone%5Bfull%5D=&q52_callersEmail=&q115_spousesName%5Bfirst%5D=&q115_spousesName%5Blast%5D=&q116_spousesEmail=&q117_spousesPhone%5Bfull%5D=&q79_legalAdvice=&q80_lifeEvent=&q84_relationshipWithDocOwners=&q85_beneficiaryOrTrustee=&q86_poa=&event_id=1763664710950_252965467838072_tR8cgBR&timeToSubmit=20&JotFormPopulatedFields=q3%2Cq6%2Cq10%2Cq11%2Cq12%2Cq13%2Cq14%2Cq15%2Cq17%2Cq20%2Cq23%2Cq25%2Cq26%2Cq28%2Cq29%2Cq32%2Cq33%2Cq34%2Cq35%2Cq39%2Cq40%2Cq44%2Cq45%2Cq50%2Cq51%2Cq52%2Cq53%2Cq54%2Cq56%2Cq59%2Cq60%2Cq61%2Cq62%2Cq64%2Cq65%2Cq66%2Cq78%2Cq79%2Cq80%2Cq81%2Cq84%2Cq85%2Cq86%2Cq87%2Cq89%2Cq100%2Cq115%2Cq116%2Cq117%2Cq129&validatedNewRequiredFieldIDs=%7B%22new%22%3A1%2C%22id_10%22%3A%22Es%22%7D&path=%2Fsubmit%2F252965467838072&q6_createPdf=&q17_primaryConcern=&q23_disagreements=&q25_assetOwnership=&q26_assetOwnership2=&q28_isWill=&q29_originalWill=&q39_specifyConcern=&q40_needTrust=&q45_onBehalf=&q53_clientJoinMeeting=&q54_soundMind=&q56_floridaResident=&q59_areYouSingle=&q60_spousePlanning=&q61_doYouhaveChildren=&q62_existingDocuments=&q64_whatDocuments=&q65_trustFunded=&q66_updateDocument=&q78_docFloridaResident=&q81_documentOwner=&q87_whatDocuments2=&q89_pendingLitigation=&submissionEdited=1';

const webhookPayload = {
  rawRequest: sampleRawRequest,
  submissionID: 'test-submission-123',
  formID: '252965467838072'
};

async function testIntakeWebhook() {
  try {
    console.log('Testing Intake Webhook Endpoint...\n');
    console.log('Sending POST request to http://localhost:3000/webhook/jotform-intake\n');

    const response = await axios.post(
      'http://localhost:3000/webhook/jotform-intake',
      webhookPayload,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    console.log('✅ SUCCESS - Webhook processed successfully\n');
    console.log('Response Status:', response.status);
    console.log('Response Data:', JSON.stringify(response.data, null, 2));

    if (response.data.ghlContactId) {
      console.log('\n✅ Contact created with ID:', response.data.ghlContactId);
    }

    if (response.data.opportunityId) {
      console.log('✅ Opportunity created with ID:', response.data.opportunityId);
    }

  } catch (error) {
    console.error('❌ ERROR - Webhook test failed\n');

    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('No response received. Is the server running?');
      console.error('Make sure to start the server with: node server.js');
    } else {
      console.error('Error:', error.message);
    }
  }
}

testIntakeWebhook();
