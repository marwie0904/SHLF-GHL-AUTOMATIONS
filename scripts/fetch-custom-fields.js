require('dotenv').config();
const { getCustomFields } = require('../services/ghlService');

async function main() {
  try {
    console.log('Fetching custom fields from GHL...\n');

    const customFields = await getCustomFields();

    console.log(`Found ${customFields.length} custom fields:\n`);
    console.log('='.repeat(80));

    customFields.forEach((field, index) => {
      console.log(`\n${index + 1}. ${field.name}`);
      console.log(`   ID: ${field.id}`);
      console.log(`   Key: ${field.fieldKey || 'N/A'}`);
      console.log(`   Data Type: ${field.dataType || 'N/A'}`);
      console.log(`   Model: ${field.model || 'N/A'}`);

      if (field.options && field.options.length > 0) {
        console.log(`   Options: ${field.options.join(', ')}`);
      }

      if (field.placeholder) {
        console.log(`   Placeholder: ${field.placeholder}`);
      }
    });

    console.log('\n' + '='.repeat(80));
    console.log('\nFormatted JSON output:\n');
    console.log(JSON.stringify(customFields, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
