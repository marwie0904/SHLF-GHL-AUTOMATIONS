/**
 * Test Script to Explore Confido Invoice Queries
 *
 * This script searches the Confido GraphQL schema for invoice-related
 * queries and types to determine if there's a way to create/sync invoices
 * separate from PaymentLinks.
 *
 * Usage:
 *   node scripts/test-confido-invoice-queries.js
 */

require('dotenv').config();
const confidoService = require('../services/confidoService');

/**
 * Query the GraphQL schema for invoice-related types
 */
async function querySchema() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  CONFIDO SCHEMA EXPLORATION - INVOICE QUERIES');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // Test 1: Introspect schema for all query types
    console.log('📋 TEST 1: Introspecting GraphQL Schema for Query Types\n');

    const introspectionQuery = `
      query IntrospectSchema {
        __schema {
          queryType {
            fields {
              name
              description
              args {
                name
                type {
                  name
                  kind
                }
              }
            }
          }
        }
      }
    `;

    const schemaData = await confidoService.executeGraphQL(introspectionQuery);

    // Filter for invoice-related queries
    const allQueries = schemaData.__schema.queryType.fields;
    const invoiceQueries = allQueries.filter(field =>
      field.name.toLowerCase().includes('invoice')
    );

    console.log('All Available Queries:');
    console.log('─────────────────────────────────────────────────────────────');
    allQueries.forEach(query => {
      console.log(`- ${query.name}`);
      if (query.description) {
        console.log(`  Description: ${query.description}`);
      }
    });
    console.log('');

    console.log('Invoice-Related Queries Found:');
    console.log('─────────────────────────────────────────────────────────────');
    if (invoiceQueries.length === 0) {
      console.log('❌ No invoice-related queries found in schema');
    } else {
      invoiceQueries.forEach(query => {
        console.log(`✅ ${query.name}`);
        if (query.description) {
          console.log(`   ${query.description}`);
        }
        if (query.args.length > 0) {
          console.log('   Arguments:', query.args.map(arg => arg.name).join(', '));
        }
      });
    }
    console.log('');

    // Test 2: Check for invoice-related types
    console.log('📋 TEST 2: Checking for Invoice-Related Types\n');

    const typeIntrospectionQuery = `
      query IntrospectTypes {
        __schema {
          types {
            name
            kind
            description
          }
        }
      }
    `;

    const typeData = await confidoService.executeGraphQL(typeIntrospectionQuery);
    const allTypes = typeData.__schema.types;
    const invoiceTypes = allTypes.filter(type =>
      type.name.toLowerCase().includes('invoice')
    );

    console.log('Invoice-Related Types Found:');
    console.log('─────────────────────────────────────────────────────────────');
    if (invoiceTypes.length === 0) {
      console.log('❌ No invoice-related types found in schema');
    } else {
      invoiceTypes.forEach(type => {
        console.log(`✅ ${type.name} (${type.kind})`);
        if (type.description) {
          console.log(`   ${type.description}`);
        }
      });
    }
    console.log('');

    // Test 3: Check PaymentLink for invoice reference fields
    console.log('📋 TEST 3: Checking PaymentLink Fields\n');

    const paymentLinkFieldsQuery = `
      query IntrospectPaymentLink {
        __type(name: "PaymentLink") {
          fields {
            name
            description
            type {
              name
              kind
            }
          }
        }
      }
    `;

    const paymentLinkData = await confidoService.executeGraphQL(paymentLinkFieldsQuery);
    const paymentLinkFields = paymentLinkData.__type.fields;

    console.log('PaymentLink Fields:');
    console.log('─────────────────────────────────────────────────────────────');
    paymentLinkFields.forEach(field => {
      const isInvoiceRelated = field.name.toLowerCase().includes('invoice') ||
                                field.name.toLowerCase().includes('qb');
      const marker = isInvoiceRelated ? '🔍' : '  ';
      console.log(`${marker} ${field.name}: ${field.type.name || field.type.kind}`);
      if (field.description) {
        console.log(`     ${field.description}`);
      }
    });
    console.log('');

    // Test 4: Check mutation types for invoice-related mutations
    console.log('📋 TEST 4: Checking Mutation Types\n');

    const mutationQuery = `
      query IntrospectMutations {
        __schema {
          mutationType {
            fields {
              name
              description
            }
          }
        }
      }
    `;

    const mutationData = await confidoService.executeGraphQL(mutationQuery);
    const allMutations = mutationData.__schema.mutationType.fields;
    const invoiceMutations = allMutations.filter(field =>
      field.name.toLowerCase().includes('invoice')
    );

    console.log('Invoice-Related Mutations Found:');
    console.log('─────────────────────────────────────────────────────────────');
    if (invoiceMutations.length === 0) {
      console.log('❌ No invoice-related mutations found in schema');
    } else {
      invoiceMutations.forEach(mutation => {
        console.log(`✅ ${mutation.name}`);
        if (mutation.description) {
          console.log(`   ${mutation.description}`);
        }
      });
    }
    console.log('');

    // Summary
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  SUMMARY');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('Key Findings:');
    console.log('─────────────────────────────────────────────────────────────');
    console.log(`Invoice Queries: ${invoiceQueries.length > 0 ? invoiceQueries.length : 'None found'}`);
    console.log(`Invoice Types: ${invoiceTypes.length > 0 ? invoiceTypes.length : 'None found'}`);
    console.log(`Invoice Mutations: ${invoiceMutations.length > 0 ? invoiceMutations.length : 'None found'}`);
    console.log('');

    // Check for QB fields
    const qbFields = paymentLinkFields.filter(f =>
      f.name.toLowerCase().includes('qb')
    );

    if (qbFields.length > 0) {
      console.log('QuickBooks Integration Fields Found:');
      qbFields.forEach(field => {
        console.log(`  - ${field.name}`);
      });
      console.log('');
      console.log('💡 Suggestion: PaymentLinks can reference QuickBooks invoices.');
      console.log('   This suggests Confido syncs with external invoice systems');
      console.log('   rather than creating invoices itself.');
    }

    console.log('');
    console.log('✅ Schema exploration complete!');
    console.log('─────────────────────────────────────────────────────────────\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERROR DURING SCHEMA EXPLORATION:');
    console.error('─────────────────────────────────────────────────────────────');
    console.error('Error Message:', error.message);
    console.error('');

    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
    }

    console.error('\nStack Trace:');
    console.error(error.stack);
    console.error('─────────────────────────────────────────────────────────────\n');

    process.exit(1);
  }
}

// Run the exploration
console.log('Starting Confido schema exploration...\n');
querySchema();
