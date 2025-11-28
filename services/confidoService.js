const axios = require('axios');

/**
 * Confido Legal Service
 * Handles all interactions with the Confido Legal GraphQL API
 *
 * Confido Structure:
 * - Clients: Customers/contacts from GHL
 * - Matters: Cases/opportunities from GHL
 * - PaymentLinks: Invoices with payment URLs
 *
 * Flow: Create Client → Create Matter → Create PaymentLink
 */

const CONFIDO_API_URL = process.env.CONFIDO_API_URL || 'https://api.gravity-legal.com/';
const CONFIDO_API_KEY = process.env.CONFIDO_API_KEY;

/**
 * Create axios instance for GraphQL requests
 */
const confidoClient = axios.create({
  baseURL: CONFIDO_API_URL,
  headers: {
    'Authorization': `Bearer ${CONFIDO_API_KEY}`,
    'Content-Type': 'application/json',
  },
});

/**
 * Execute a GraphQL query or mutation
 * @param {string} query - GraphQL query/mutation string
 * @param {Object} variables - Variables for the query
 * @returns {Promise<Object>} GraphQL response
 */
async function executeGraphQL(query, variables = {}) {
  try {
    const response = await confidoClient.post('', {
      query,
      variables
    });

    if (response.data.errors) {
      console.error('GraphQL Errors:', JSON.stringify(response.data.errors, null, 2));
      throw new Error(`GraphQL Error: ${response.data.errors[0]?.message || 'Unknown error'}`);
    }

    return response.data.data;
  } catch (error) {
    console.error('Confido API Error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Find or create a client in Confido
 * @param {Object} clientData - Client information
 * @param {string} clientData.name - Client full name
 * @param {string} clientData.email - Client email
 * @param {string} clientData.phone - Client phone
 * @param {string} clientData.externalId - GHL contact ID for linking
 * @returns {Promise<Object>} Client data with Confido client ID
 */
async function findOrCreateClient(clientData) {
  try {
    console.log('=== Finding or Creating Client in Confido ===');
    console.log('Client Data:', JSON.stringify(clientData, null, 2));

    // First, try to find existing client by externalId (GHL contact ID)
    // Use filter parameter to search efficiently
    const query = `
      query GetClients($filter: ClientsFilter) {
        clientsList(filter: $filter) {
          clients {
            id
            clientName
            email
            phone
            externalId
          }
        }
      }
    `;

    const searchVariables = {
      filter: {
        externalId: clientData.externalId
      }
    };

    let existingClient = null;

    try {
      const data = await executeGraphQL(query, searchVariables);
      // Check if client exists by externalId
      existingClient = data.clientsList?.clients?.find(
        client => client.externalId === clientData.externalId
      );
    } catch (searchError) {
      // If filter not supported, fall back to fetching all and filtering
      console.log('Filter not supported, falling back to full list search...');
      const fallbackQuery = `
        query GetClients {
          clientsList {
            clients {
              id
              clientName
              email
              phone
              externalId
            }
          }
        }
      `;
      const data = await executeGraphQL(fallbackQuery);
      existingClient = data.clientsList?.clients?.find(
        client => client.externalId === clientData.externalId
      );
    }

    if (existingClient) {
      console.log('✅ Found existing client:', existingClient.id);
      return {
        success: true,
        clientId: existingClient.id,
        isNew: false,
        data: existingClient
      };
    }

    // Client doesn't exist, create new one
    console.log('Creating new client in Confido...');

    const mutation = `
      mutation AddClient($input: AddClientInput!) {
        addClient(input: $input) {
          id
          clientName
          email
          phone
          externalId
        }
      }
    `;

    const variables = {
      input: {
        clientName: clientData.name,
        email: clientData.email || null,
        phone: clientData.phone || null,
        externalId: clientData.externalId || null
      }
    };

    let result;
    try {
      result = await executeGraphQL(mutation, variables);
    } catch (createError) {
      // Check if this is a duplicate error
      if (createError.message && (createError.message.includes('ER_DUP_ENTRY') || createError.message.includes('duplicate'))) {
        console.log('⚠️ Duplicate client detected during creation, searching again...');
        // Search again to get the existing client
        const fallbackQuery = `
          query GetClients {
            clientsList {
              clients {
                id
                clientName
                email
                phone
                externalId
              }
            }
          }
        `;
        const data = await executeGraphQL(fallbackQuery);
        const foundClient = data.clientsList?.clients?.find(
          client => client.externalId === clientData.externalId
        );

        if (foundClient) {
          console.log('✅ Found existing client after duplicate error:', foundClient.id);
          return {
            success: true,
            clientId: foundClient.id,
            isNew: false,
            data: foundClient
          };
        }
      }
      throw createError;
    }

    console.log('✅ Client created successfully:', result.addClient.id);

    return {
      success: true,
      clientId: result.addClient.id,
      isNew: true,
      data: result.addClient
    };

  } catch (error) {
    console.error('❌ Error finding/creating client:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Find or create a matter (opportunity/case) in Confido
 * @param {Object} matterData - Matter information
 * @param {string} matterData.clientId - Confido client ID
 * @param {string} matterData.name - Matter/opportunity name
 * @param {string} matterData.externalId - GHL opportunity ID for linking
 * @returns {Promise<Object>} Matter data with Confido matter ID
 */
async function findOrCreateMatter(matterData) {
  try {
    console.log('=== Finding or Creating Matter in Confido ===');
    console.log('Matter Data:', JSON.stringify(matterData, null, 2));

    // First, try to find existing matter by externalId (GHL opportunity ID)
    const query = `
      query GetMatters($clientId: String) {
        client(id: $clientId) {
          matters {
            edges {
              node {
                id
                name
                externalId
              }
            }
          }
        }
      }
    `;

    const variables = {
      clientId: matterData.clientId
    };

    const data = await executeGraphQL(query, variables);

    // Check if matter exists by externalId
    const existingMatter = data.client?.matters?.edges?.find(
      edge => edge.node.externalId === matterData.externalId
    )?.node;

    if (existingMatter) {
      console.log('✅ Found existing matter:', existingMatter.id);
      return {
        success: true,
        matterId: existingMatter.id,
        isNew: false,
        data: existingMatter
      };
    }

    // Matter doesn't exist, create new one
    console.log('Creating new matter in Confido...');

    const mutation = `
      mutation AddMatter($input: AddMatterInput!) {
        addMatter(input: $input) {
          id
          name
          externalId
        }
      }
    `;

    const createVariables = {
      input: {
        clientId: matterData.clientId,
        name: matterData.name,
        externalId: matterData.externalId || null
      }
    };

    let result;
    try {
      result = await executeGraphQL(mutation, createVariables);
    } catch (createError) {
      // Check if this is a duplicate error
      if (createError.message && (createError.message.includes('ER_DUP_ENTRY') || createError.message.includes('duplicate'))) {
        console.log('⚠️ Duplicate matter detected during creation, searching again...');
        // Search again to get the existing matter
        const retryData = await executeGraphQL(query, variables);
        const foundMatter = retryData.client?.matters?.edges?.find(
          edge => edge.node.externalId === matterData.externalId
        )?.node;

        if (foundMatter) {
          console.log('✅ Found existing matter after duplicate error:', foundMatter.id);
          return {
            success: true,
            matterId: foundMatter.id,
            isNew: false,
            data: foundMatter
          };
        }
      }
      throw createError;
    }

    console.log('✅ Matter created successfully:', result.addMatter.id);

    return {
      success: true,
      matterId: result.addMatter.id,
      isNew: true,
      data: result.addMatter
    };

  } catch (error) {
    console.error('❌ Error finding/creating matter:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Create a payment link (invoice) in Confido
 * Complete 3-step flow: Client → Matter → PaymentLink
 *
 * @param {Object} invoiceData - Invoice data from GHL
 * @param {string} invoiceData.ghlInvoiceId - GHL invoice ID (used as externalId)
 * @param {string} invoiceData.opportunityName - Opportunity name (for matter)
 * @param {string} invoiceData.opportunityId - GHL opportunity ID (for matter linking)
 * @param {string} invoiceData.contactName - Customer name (for client)
 * @param {string} invoiceData.contactEmail - Customer email (for client)
 * @param {string} invoiceData.contactPhone - Customer phone (for client)
 * @param {string} invoiceData.contactId - GHL contact ID (for client linking)
 * @param {number} invoiceData.amountDue - Total amount due
 * @param {string} invoiceData.dueDate - Due date ISO string
 * @param {string} invoiceData.invoiceNumber - Invoice number
 * @param {string} invoiceData.memo - Invoice notes/description
 * @param {Array} invoiceData.lineItems - Array of line items
 * @returns {Promise<Object>} Created payment link with Confido IDs and status
 */
async function createInvoice(invoiceData) {
  try {
    console.log('=== Creating Complete Invoice in Confido (Client → Matter → PaymentLink) ===');
    console.log('Invoice Data:', JSON.stringify(invoiceData, null, 2));

    // STEP 1: Find or create client
    console.log('\n📋 STEP 1: Client');
    const clientResult = await findOrCreateClient({
      name: invoiceData.contactName,
      email: invoiceData.contactEmail,
      phone: invoiceData.contactPhone,
      externalId: invoiceData.contactId  // GHL contact ID
    });

    if (!clientResult.success) {
      throw new Error(`Failed to get client: ${clientResult.error}`);
    }

    const clientId = clientResult.clientId;
    console.log('✅ Client ready:', clientId, clientResult.isNew ? '(new)' : '(existing)');

    // STEP 2: Find or create matter (opportunity)
    console.log('\n📋 STEP 2: Matter (Opportunity)');
    const matterResult = await findOrCreateMatter({
      clientId: clientId,
      name: invoiceData.opportunityName || `Matter for ${invoiceData.contactName}`,
      externalId: invoiceData.opportunityId  // GHL opportunity ID
    });

    if (!matterResult.success) {
      throw new Error(`Failed to get matter: ${matterResult.error}`);
    }

    const matterId = matterResult.matterId;
    console.log('✅ Matter ready:', matterId, matterResult.isNew ? '(new)' : '(existing)');

    // STEP 3: Prepare amount (simplified - use operating account)
    // Note: We can't efficiently query for existing PaymentLinks by externalId in Confido API
    // Instead, we'll handle duplicate errors gracefully during creation
    console.log('\n📋 STEP 3: PaymentLink (Invoice)');
    // Confido uses two types of accounts: operating (regular) and trust (client funds)
    // For invoices, we'll use operating account
    const totalInCents = Math.round(invoiceData.amountDue * 100); // Convert to cents

    console.log('Total Amount (in cents):', totalInCents);
    console.log('Total Amount (in dollars): $' + (totalInCents / 100).toFixed(2));

    // STEP 5: Create payment link
    const mutation = `
      mutation AddPaymentLink($input: AddPaymentLinkInput!) {
        addPaymentLink(input: $input) {
          id
          externalId
          url
          status
          balance {
            totalOutstanding
            totalPaid
            operatingOutstanding
            operatingPaid
            trustOutstanding
            trustPaid
          }
          client {
            id
            clientName
            email
          }
          matter {
            id
            name
          }
          createdOn
        }
      }
    `;

    const variables = {
      input: {
        clientId: clientId,
        matterId: matterId,  // Link to matter (opportunity)
        operating: totalInCents, // Total amount in cents (operating account)
        externalId: invoiceData.ghlInvoiceId, // GHL invoice ID for tracking
        memo: invoiceData.memo || `Invoice: ${invoiceData.invoiceNumber || 'N/A'}`,
        sendReceipts: true,
        surchargeEnabled: true, // Enable surcharging for credit cards
        paymentMethodsAllowed: ['CREDIT', 'ACH'] // Accept both payment methods (CREDIT = credit card)
      }
    };

    let result;
    try {
      result = await executeGraphQL(mutation, variables);
    } catch (createError) {
      // Check if this is a duplicate entry error
      if (createError.message && createError.message.includes('ER_DUP_ENTRY') && createError.message.includes(invoiceData.ghlInvoiceId)) {
        console.log('⚠️ PaymentLink with this externalId already exists in Confido');
        console.log('This likely means a webhook was triggered multiple times for the same invoice');
        console.log('Returning error so caller can check Supabase for existing record');

        // Return a special error response indicating duplicate
        return {
          success: false,
          error: 'DUPLICATE_PAYMENTLINK',
          message: 'PaymentLink already exists in Confido - check Supabase for existing record',
          ghlInvoiceId: invoiceData.ghlInvoiceId,
          confidoClientId: clientId,
          confidoMatterId: matterId
        };
      }

      // If it's not a duplicate error, re-throw
      throw createError;
    }

    console.log('✅ PaymentLink created in Confido successfully');
    console.log('Confido PaymentLink ID:', result.addPaymentLink.id);
    console.log('Payment URL:', result.addPaymentLink.url);
    console.log('Status:', result.addPaymentLink.status);
    console.log('Balance:', JSON.stringify(result.addPaymentLink.balance, null, 2));

    // Calculate status based on balance
    const balance = result.addPaymentLink.balance;
    const total = balance.totalOutstanding + balance.totalPaid;
    const paid = balance.totalPaid;
    const outstanding = balance.totalOutstanding;

    const status = outstanding === 0 ? 'paid' : 'unpaid';

    return {
      success: true,
      confidoInvoiceId: result.addPaymentLink.id,
      confidoClientId: clientId,
      confidoMatterId: matterId,
      paymentUrl: result.addPaymentLink.url,
      status: status,
      total: total / 100, // Convert back to dollars
      paid: paid / 100,
      outstanding: outstanding / 100,
      clientName: result.addPaymentLink.client.clientName,
      opportunityName: result.addPaymentLink.matter?.name || null,
      data: result.addPaymentLink
    };

  } catch (error) {
    console.error('❌ Error creating invoice in Confido:', error.message);

    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get payment link (invoice) details from Confido
 * @param {string} paymentLinkId - Confido payment link ID
 * @returns {Promise<Object>} Payment link details with status
 */
async function getInvoice(paymentLinkId) {
  try {
    console.log('=== Fetching PaymentLink from Confido ===');
    console.log('PaymentLink ID:', paymentLinkId);

    const query = `
      query GetPaymentLink($id: ID!) {
        paymentLink(id: $id) {
          id
          externalId
          url
          status
          memo
          balance {
            totalOutstanding
            totalPaid
            operatingOutstanding
            operatingPaid
            trustOutstanding
            trustPaid
          }
          client {
            id
            clientName
            email
            phone
          }
          matter {
            id
            name
            externalId
          }
          payments {
            nodes {
              id
              amount
              status
              createdOn
            }
          }
          createdOn
        }
      }
    `;

    const variables = { id: paymentLinkId };
    const data = await executeGraphQL(query, variables);

    const balance = data.paymentLink.balance;
    const total = balance.totalOutstanding + balance.totalPaid;
    const paid = balance.totalPaid;
    const outstanding = balance.totalOutstanding;
    const status = outstanding === 0 ? 'paid' : 'unpaid';

    console.log('✅ PaymentLink fetched successfully');
    console.log('Status:', status);
    console.log('Total:', total / 100, 'Paid:', paid / 100, 'Outstanding:', outstanding / 100);

    return {
      success: true,
      status: status,
      total: total / 100,
      paid: paid / 100,
      outstanding: outstanding / 100,
      data: data.paymentLink
    };

  } catch (error) {
    console.error('❌ Error fetching PaymentLink from Confido:', error.message);

    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Delete a payment link (invoice) from Confido
 * @param {string} paymentLinkId - Confido payment link ID
 * @returns {Promise<Object>} Deletion result
 */
async function deletePaymentLink(paymentLinkId) {
  try {
    console.log('=== Deleting PaymentLink from Confido ===');
    console.log('PaymentLink ID:', paymentLinkId);

    const mutation = `
      mutation RemovePaymentLink($input: RemovePaymentLinkInput!) {
        removePaymentLink(input: $input) {
          id
        }
      }
    `;

    const variables = {
      input: {
        id: paymentLinkId
      }
    };
    const result = await executeGraphQL(mutation, variables);

    console.log('✅ PaymentLink deleted successfully from Confido');
    console.log('Deleted ID:', result.removePaymentLink?.id);

    return {
      success: true,
      deletedId: result.removePaymentLink?.id
    };

  } catch (error) {
    console.error('❌ Error deleting PaymentLink from Confido:', error.message);

    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Verify webhook signature from Confido
 * Note: Confido webhook signature verification logic would go here if they provide it
 * @param {Object} payload - Webhook payload
 * @param {string} signature - Signature from webhook headers
 * @returns {boolean} True if signature is valid
 */
function verifyWebhookSignature(payload, signature) {
  // TODO: Implement signature verification if Confido provides webhook signatures
  // For now, we'll allow all webhooks if no secret is configured

  const CONFIDO_WEBHOOK_SECRET = process.env.CONFIDO_WEBHOOK_SECRET;

  if (!CONFIDO_WEBHOOK_SECRET) {
    console.warn('⚠️ CONFIDO_WEBHOOK_SECRET not set - skipping signature verification');
    return true;
  }

  try {
    // Implement Confido's specific signature verification algorithm here
    // This is a placeholder
    console.log('✅ Webhook signature verification (placeholder)');
    return true;

  } catch (error) {
    console.error('❌ Error verifying webhook signature:', error.message);
    return false;
  }
}

/**
 * Test Confido API connection
 * @returns {Promise<boolean>} True if connection successful
 */
async function testConnection() {
  try {
    console.log('=== Testing Confido API Connection ===');

    if (!CONFIDO_API_URL || !CONFIDO_API_KEY) {
      console.error('❌ Confido API credentials not configured');
      return false;
    }

    // Simple query to test connection
    const query = `
      query {
        __typename
      }
    `;

    await executeGraphQL(query);

    console.log('✅ Confido API connection successful');
    return true;

  } catch (error) {
    console.error('❌ Confido API connection failed:', error.message);
    return false;
  }
}

module.exports = {
  createInvoice,
  getInvoice,
  deletePaymentLink,
  findOrCreateClient,
  findOrCreateMatter,
  verifyWebhookSignature,
  testConnection,
  executeGraphQL
};
