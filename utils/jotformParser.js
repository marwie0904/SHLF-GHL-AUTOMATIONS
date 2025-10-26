/**
 * Decodes HTML entities from JotForm webhook data
 * @param {string} text - Text containing HTML entities
 * @returns {string} Decoded text
 */
function decodeHtmlEntities(text) {
  if (typeof text !== 'string') {
    return text;
  }

  var decoded = text;

  // Decode HTML entities in order
  decoded = decoded.replace(/&quot;/g, '"');
  decoded = decoded.replace(/&#x3D;/g, '=');
  decoded = decoded.replace(/&#x2F;/g, '/');
  decoded = decoded.replace(/&amp;/g, '&');
  decoded = decoded.replace(/&lt;/g, '<');
  decoded = decoded.replace(/&gt;/g, '>');
  decoded = decoded.replace(/\\&quot;/g, '\\"');

  return decoded;
}

/**
 * Formats date object to string
 * @param {Object} dateObj - Date object with month, day, year
 * @returns {string} Formatted date
 */
function formatDate(dateObj) {
  if (dateObj && dateObj.month && dateObj.day && dateObj.year) {
    return dateObj.month + '/' + dateObj.day + '/' + dateObj.year;
  }
  return '';
}

/**
 * Parses JotForm webhook raw data
 * @param {string|Object} rawData - Raw webhook data
 * @returns {Object} Parsed and structured data
 */
function parseJotFormWebhook(rawData) {
  let rawDataString = rawData;

  // Check if it's a string that needs decoding
  if (typeof rawDataString === 'string') {
    // Decode HTML entities
    rawDataString = decodeHtmlEntities(rawDataString);

    // Parse the JSON string
    try {
      var parsedData = JSON.parse(rawDataString);
    } catch (e) {
      throw new Error('Failed to parse JSON: ' + e.toString());
    }
  } else {
    // It's already an object
    var parsedData = rawDataString;
  }

  // Parse nested JSON strings
  if (parsedData.validatedNewRequiredFieldIDs && typeof parsedData.validatedNewRequiredFieldIDs === 'string') {
    try {
      parsedData.validatedNewRequiredFieldIDs = JSON.parse(parsedData.validatedNewRequiredFieldIDs);
    } catch (e) {
      console.error('Error parsing validatedNewRequiredFieldIDs:', e.toString());
    }
  }

  // Parse the beneficiaries array if it exists
  if (parsedData.q43_beneficiaries && typeof parsedData.q43_beneficiaries === 'string') {
    try {
      parsedData.q43_beneficiaries = JSON.parse(parsedData.q43_beneficiaries);
    } catch (e) {
      console.error('Error parsing q43_beneficiaries:', e.toString());
    }
  }

  // Parse the finances/bank accounts array if it exists
  if (parsedData.q33_finances && typeof parsedData.q33_finances === 'string') {
    try {
      parsedData.q33_finances = JSON.parse(parsedData.q33_finances);
    } catch (e) {
      console.error('Error parsing q33_finances:', e.toString());
    }
  }

  // Extract ALL fields
  const dateToday = formatDate(parsedData['q6_date-today']);
  const yourFirstName = (parsedData['q3_your-name'] && parsedData['q3_your-name'].first) || '';
  const yourLastName = (parsedData['q3_your-name'] && parsedData['q3_your-name'].last) || '';
  const yourPhoneNumber = (parsedData['q58_your-phoneNumber'] && parsedData['q58_your-phoneNumber'].full) || (parsedData['q58_phoneNumber'] && parsedData['q58_phoneNumber'].full) || '';
  const yourVeteran = parsedData['q51_you-veteran'] || '';
  const spouseFirstName = (parsedData['q7_spouse-name'] && parsedData['q7_spouse-name'].first) || '';
  const spouseLastName = (parsedData['q7_spouse-name'] && parsedData['q7_spouse-name'].last) || '';
  const spouseVeteran = parsedData['q52_spouse-veteran'] || '';
  const advisorFirstName = (parsedData['q12_financialAdvisor-name'] && parsedData['q12_financialAdvisor-name'].first) || '';
  const advisorLastName = (parsedData['q12_financialAdvisor-name'] && parsedData['q12_financialAdvisor-name'].last) || '';
  const advisorName = advisorFirstName && advisorLastName ? advisorFirstName + ' ' + advisorLastName : '';
  const advisorFirm = parsedData['q44_financialAdvisor-firm'] || '';
  const advisorPhone = (parsedData['q14_financialAdvisor-phone'] && parsedData['q14_financialAdvisor-phone'].full) || '';
  const accountantFirstName = (parsedData['q13_accountant-name'] && parsedData['q13_accountant-name'].first) || '';
  const accountantLastName = (parsedData['q13_accountant-name'] && parsedData['q13_accountant-name'].last) || '';
  const accountantName = accountantFirstName && accountantLastName ? accountantFirstName + ' ' + accountantLastName : '';
  const accountantFirm = parsedData['q46_accountant-firm'] || '';
  const accountantPhone = (parsedData['q15_accountant-phone'] && parsedData['q15_accountant-phone'].full) || '';
  const beneficiaries = parsedData.q43_beneficiaries || [];
  const bankAccounts = parsedData.q33_finances || [];
  const savePdf = parsedData.q38_savePdf || '';
  const slug = parsedData.slug || '';
  const submitDate = parsedData.submitDate || '';
  const submitSource = parsedData.submitSource || '';
  const eventId = parsedData.event_id || '';
  const timeToSubmit = parsedData.timeToSubmit || '';
  const buildDate = parsedData.buildDate || '';

  return {
    slug: slug,
    submitDate: submitDate,
    submitSource: submitSource,
    eventId: eventId,
    timeToSubmit: timeToSubmit,
    buildDate: buildDate,
    dateToday: dateToday,
    yourFirstName: yourFirstName,
    yourLastName: yourLastName,
    yourPhoneNumber: yourPhoneNumber,
    yourVeteran: yourVeteran,
    spouseFirstName: spouseFirstName,
    spouseLastName: spouseLastName,
    spouseVeteran: spouseVeteran,
    advisorName: advisorName,
    advisorFirstName: advisorFirstName,
    advisorLastName: advisorLastName,
    advisorFirm: advisorFirm,
    advisorPhone: advisorPhone,
    accountantName: accountantName,
    accountantFirstName: accountantFirstName,
    accountantLastName: accountantLastName,
    accountantFirm: accountantFirm,
    accountantPhone: accountantPhone,
    beneficiaries: beneficiaries,
    bankAccounts: bankAccounts,
    savePdf: savePdf,
    fullData: parsedData
  };
}

module.exports = { parseJotFormWebhook };
