const mapping = require('../jotform-to-ghl-mapping.json');

/**
 * Maps JotForm webhook data to GHL contact format
 * @param {Object} parsedData - Parsed data from JotForm parser
 * @returns {Object} GHL contact payload
 */
function mapJotFormToGHL(parsedData) {
  const contact = {
    // Standard fields
    firstName: parsedData.yourFirstName || '',
    lastName: parsedData.yourLastName || '',
    phone: parsedData.yourPhoneNumber || '',
    customFields: []
  };

  // Map Current Spouse
  const spouseMapping = mapping.mapping.currentSpouse;
  const spouseName = `${parsedData.spouseFirstName || ''} ${parsedData.spouseLastName || ''}`.trim();

  if (spouseName || parsedData.spouseVeteran) {
    const spouseData = {};
    spouseMapping.subFields.forEach(subField => {
      if (subField.jotformField === 'Current Spouse: Name') {
        spouseData[subField.subFieldId] = spouseName;
      } else if (subField.jotformField === 'Current Spouse: Veteran') {
        spouseData[subField.subFieldId] = parsedData.spouseVeteran || '';
      }
    });

    contact.customFields.push({
      id: spouseMapping.ghlFieldId,
      field_value: spouseData
    });
  }

  // Map Financial Advisor
  const advisorMapping = mapping.mapping.financialAdvisor;
  if (parsedData.advisorName || parsedData.advisorFirm || parsedData.advisorPhone) {
    const advisorData = {};
    advisorMapping.subFields.forEach(subField => {
      if (subField.jotformField === 'Financial Advisor: Name') {
        advisorData[subField.subFieldId] = parsedData.advisorName || '';
      } else if (subField.jotformField === 'Financial Advisor: Firm') {
        advisorData[subField.subFieldId] = parsedData.advisorFirm || '';
      } else if (subField.jotformField === 'Financial Advisor: Phone') {
        advisorData[subField.subFieldId] = parsedData.advisorPhone || '';
      }
    });

    contact.customFields.push({
      id: advisorMapping.ghlFieldId,
      field_value: advisorData
    });
  }

  // Map Accountant
  const accountantMapping = mapping.mapping.accountant;
  if (parsedData.accountantName || parsedData.accountantFirm || parsedData.accountantPhone) {
    const accountantData = {};
    accountantMapping.subFields.forEach(subField => {
      if (subField.jotformField === 'Accountant: Name') {
        accountantData[subField.subFieldId] = parsedData.accountantName || '';
      } else if (subField.jotformField === 'Accountant: Firm') {
        accountantData[subField.subFieldId] = parsedData.accountantFirm || '';
      } else if (subField.jotformField === 'Accountant: Phone') {
        accountantData[subField.subFieldId] = parsedData.accountantPhone || '';
      }
    });

    contact.customFields.push({
      id: accountantMapping.ghlFieldId,
      field_value: accountantData
    });
  }

  // Map Beneficiaries (sequential mapping up to 5)
  const beneficiaries = parsedData.beneficiaries || [];
  beneficiaries.slice(0, 5).forEach((beneficiary, index) => {
    const beneficiaryMapping = mapping.mapping.beneficiaries[index];
    if (!beneficiaryMapping) return;

    const beneficiaryData = {};
    beneficiaryMapping.subFields.forEach(subField => {
      const fieldName = subField.jotformField.replace('Beneficiaries: ', '');
      beneficiaryData[subField.subFieldId] = beneficiary[fieldName] || '';
    });

    contact.customFields.push({
      id: beneficiaryMapping.ghlFieldId,
      field_value: beneficiaryData
    });
  });

  // Map Finances/Banks (sequential mapping up to 5)
  const bankAccounts = parsedData.bankAccounts || [];
  bankAccounts.slice(0, 5).forEach((bank, index) => {
    const bankMapping = mapping.mapping.finances[index];
    if (!bankMapping) return;

    const bankData = {};
    bankMapping.subFields.forEach(subField => {
      const fieldName = subField.jotformField.replace('Finances: ', '');
      bankData[subField.subFieldId] = bank[fieldName] || '';
    });

    contact.customFields.push({
      id: bankMapping.ghlFieldId,
      field_value: bankData
    });
  });

  return contact;
}

module.exports = { mapJotFormToGHL };
