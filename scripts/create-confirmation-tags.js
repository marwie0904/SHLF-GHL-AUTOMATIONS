/**
 * Script to create all confirmation tags in GHL
 * Run once to set up the tags: node scripts/create-confirmation-tags.js
 */

require('dotenv').config();
const { createAllConfirmationTags, CONFIRMATION_TAGS } = require('../services/smsConfirmationService');

async function main() {
  console.log('========================================');
  console.log('Creating Confirmation Tags in GHL');
  console.log('========================================\n');

  console.log('Tags to create:');
  CONFIRMATION_TAGS.forEach((tag, index) => {
    console.log(`  ${index + 1}. ${tag}`);
  });
  console.log('');

  try {
    const results = await createAllConfirmationTags();

    console.log('\n========================================');
    console.log('SUMMARY');
    console.log('========================================');

    if (results.created.length > 0) {
      console.log('\nCreated tags:');
      results.created.forEach(tag => console.log(`  ✅ ${tag}`));
    }

    if (results.alreadyExists.length > 0) {
      console.log('\nAlready existed:');
      results.alreadyExists.forEach(tag => console.log(`  ℹ️ ${tag}`));
    }

    if (results.failed.length > 0) {
      console.log('\nFailed to create:');
      results.failed.forEach(item => console.log(`  ❌ ${item.tagName}: ${item.error}`));
    }

    console.log('\n========================================');
    console.log('Done!');
    console.log('========================================\n');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
