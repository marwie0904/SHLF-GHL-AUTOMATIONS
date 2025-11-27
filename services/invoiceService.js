const { createClient } = require('@supabase/supabase-js');

/**
 * Invoice Service
 * Handles all invoice-related database operations with Supabase
 */

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

/**
 * Save or update invoice in Supabase
 * @param {Object} invoiceData - Invoice data to save
 * @returns {Promise<Object>} Saved invoice record
 */
async function saveInvoiceToSupabase(invoiceData) {
  try {
    console.log('=== Saving Invoice to Supabase ===');
    console.log('Invoice Data:', JSON.stringify(invoiceData, null, 2));

    const record = {
      ghl_invoice_id: invoiceData.ghlInvoiceId,
      ghl_opportunity_id: invoiceData.opportunityId,
      ghl_contact_id: invoiceData.contactId,
      opportunity_name: invoiceData.opportunityName,
      primary_contact_name: invoiceData.primaryContactName,
      confido_invoice_id: invoiceData.confidoInvoiceId || null,
      confido_client_id: invoiceData.confidoClientId || null,
      confido_matter_id: invoiceData.confidoMatterId || null,
      payment_url: invoiceData.paymentUrl || null,
      service_items: invoiceData.serviceItems || null,
      invoice_number: invoiceData.invoiceNumber,
      amount_due: invoiceData.amountDue,
      amount_paid: invoiceData.amountPaid || 0,
      status: invoiceData.status || 'pending',
      invoice_date: invoiceData.invoiceDate,
      due_date: invoiceData.dueDate,
      paid_date: invoiceData.paidDate || null,
    };

    const { data, error } = await supabase
      .from('invoices')
      .upsert(record, {
        onConflict: 'ghl_invoice_id',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error saving invoice to Supabase:', error);
      throw error;
    }

    console.log('✅ Invoice saved to Supabase successfully');
    console.log('Invoice ID:', data.id);

    return {
      success: true,
      data,
    };

  } catch (error) {
    console.error('❌ Error in saveInvoiceToSupabase:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Update invoice payment status
 * @param {string} confidoInvoiceId - Confido invoice ID
 * @param {Object} paymentData - Payment information
 * @returns {Promise<Object>} Updated invoice record
 */
async function updateInvoicePaymentStatus(confidoInvoiceId, paymentData) {
  try {
    console.log('=== Updating Invoice Payment Status ===');
    console.log('Confido Invoice ID:', confidoInvoiceId);
    console.log('Payment Data:', JSON.stringify(paymentData, null, 2));

    const updateData = {
      amount_paid: paymentData.amount,
      status: 'paid',
      paid_date: paymentData.transactionDate || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('confido_invoice_id', confidoInvoiceId)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating invoice payment status:', error);
      throw error;
    }

    if (!data) {
      console.warn('⚠️ No invoice found with Confido Invoice ID:', confidoInvoiceId);
      return {
        success: false,
        error: 'Invoice not found',
      };
    }

    console.log('✅ Invoice payment status updated successfully');
    console.log('Invoice ID:', data.id);

    return {
      success: true,
      data,
    };

  } catch (error) {
    console.error('❌ Error in updateInvoicePaymentStatus:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get invoice by GHL invoice ID
 * @param {string} ghlInvoiceId - GHL invoice ID
 * @returns {Promise<Object>} Invoice record
 */
async function getInvoiceByGHLId(ghlInvoiceId) {
  try {
    console.log('=== Fetching Invoice by GHL ID ===');
    console.log('GHL Invoice ID:', ghlInvoiceId);

    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('ghl_invoice_id', ghlInvoiceId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        console.log('ℹ️ No invoice found with GHL Invoice ID:', ghlInvoiceId);
        return {
          success: true,
          data: null,
        };
      }
      console.error('❌ Error fetching invoice:', error);
      throw error;
    }

    console.log('✅ Invoice found');

    return {
      success: true,
      data,
    };

  } catch (error) {
    console.error('❌ Error in getInvoiceByGHLId:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get invoice by Confido invoice ID
 * @param {string} confidoInvoiceId - Confido invoice ID
 * @returns {Promise<Object>} Invoice record
 */
async function getInvoiceByconfidoId(confidoInvoiceId) {
  try {
    console.log('=== Fetching Invoice by Confido ID ===');
    console.log('Confido Invoice ID:', confidoInvoiceId);

    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('confido_invoice_id', confidoInvoiceId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        console.log('ℹ️ No invoice found with Confido Invoice ID:', confidoInvoiceId);
        return {
          success: true,
          data: null,
        };
      }
      console.error('❌ Error fetching invoice:', error);
      throw error;
    }

    console.log('✅ Invoice found');

    return {
      success: true,
      data,
    };

  } catch (error) {
    console.error('❌ Error in getInvoiceByconfidoId:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Save payment transaction to Supabase
 * @param {Object} paymentData - Payment transaction data
 * @returns {Promise<Object>} Saved payment record
 */
async function savePaymentToSupabase(paymentData) {
  try {
    console.log('=== Saving Payment to Supabase ===');
    console.log('Payment Data:', JSON.stringify(paymentData, null, 2));

    const record = {
      confido_payment_id: paymentData.confidoPaymentId,
      confido_invoice_id: paymentData.confidoInvoiceId,
      ghl_invoice_id: paymentData.ghlInvoiceId,
      ghl_contact_id: paymentData.ghlContactId,
      ghl_opportunity_id: paymentData.ghlOpportunityId,
      amount: paymentData.amount,
      payment_method: paymentData.paymentMethod,
      status: paymentData.status || 'completed',
      transaction_date: paymentData.transactionDate,
      raw_webhook_data: paymentData.rawWebhookData || null,
    };

    const { data, error } = await supabase
      .from('confido_payments')
      .upsert(record, {
        onConflict: 'confido_payment_id',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error saving payment to Supabase:', error);
      throw error;
    }

    console.log('✅ Payment saved to Supabase successfully');
    console.log('Payment ID:', data.id);

    return {
      success: true,
      data,
    };

  } catch (error) {
    console.error('❌ Error in savePaymentToSupabase:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get all invoices for a specific opportunity
 * @param {string} opportunityId - GHL opportunity ID
 * @returns {Promise<Object>} Array of invoice records
 */
async function getInvoicesByOpportunity(opportunityId) {
  try {
    console.log('=== Fetching Invoices by Opportunity ===');
    console.log('Opportunity ID:', opportunityId);

    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('ghl_opportunity_id', opportunityId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching invoices:', error);
      throw error;
    }

    console.log(`✅ Found ${data.length} invoices for opportunity`);

    return {
      success: true,
      data,
    };

  } catch (error) {
    console.error('❌ Error in getInvoicesByOpportunity:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Calculate invoice total from service items
 * @param {Array<string>} serviceItemNames - Array of service item names
 * @returns {Promise<Object>} Total amount and line items
 */
async function calculateInvoiceTotal(serviceItemNames) {
  try {
    console.log('=== Calculating Invoice Total ===');
    console.log('Service Items:', serviceItemNames);

    if (!serviceItemNames || serviceItemNames.length === 0) {
      return {
        success: true,
        total: 0,
        lineItems: [],
        missingItems: []
      };
    }

    // Fetch service items from catalog
    const { data, error } = await supabase
      .from('invoice_service_items')
      .select('service_name, price, description')
      .in('service_name', serviceItemNames)
      .eq('is_active', true);

    if (error) {
      console.error('❌ Error fetching service items:', error);
      throw error;
    }

    let total = 0;
    const lineItems = [];
    const missingItems = [];

    // Calculate total and build line items
    for (const serviceName of serviceItemNames) {
      const item = data.find(d => d.service_name === serviceName);

      if (item) {
        const price = parseFloat(item.price);
        total += price;
        lineItems.push({
          name: serviceName,
          description: item.description || serviceName,
          price: price,
          quantity: 1
        });
        console.log(`✅ Found: ${serviceName} - $${price}`);
      } else {
        console.warn(`⚠️ Service item not found in catalog: ${serviceName}`);
        missingItems.push(serviceName);
      }
    }

    console.log(`Total: $${total.toFixed(2)}`);
    console.log(`Line Items: ${lineItems.length}`);
    if (missingItems.length > 0) {
      console.warn(`Missing Items: ${missingItems.join(', ')}`);
    }

    return {
      success: true,
      total,
      lineItems,
      missingItems
    };

  } catch (error) {
    console.error('❌ Error in calculateInvoiceTotal:', error.message);
    return {
      success: false,
      error: error.message,
      total: 0,
      lineItems: [],
      missingItems: []
    };
  }
}

/**
 * Get service items from catalog
 * @param {Array<string>} serviceNames - Array of service names to fetch
 * @returns {Promise<Object>} Service items data
 */
async function getServiceItems(serviceNames) {
  try {
    console.log('=== Fetching Service Items ===');
    console.log('Service Names:', serviceNames);

    const { data, error } = await supabase
      .from('invoice_service_items')
      .select('*')
      .in('service_name', serviceNames)
      .eq('is_active', true);

    if (error) {
      console.error('❌ Error fetching service items:', error);
      throw error;
    }

    console.log(`✅ Found ${data.length} service items`);

    return {
      success: true,
      data
    };

  } catch (error) {
    console.error('❌ Error in getServiceItems:', error.message);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
}

/**
 * Update invoice in Supabase by GHL invoice ID
 * @param {string} ghlInvoiceId - GHL invoice ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated invoice record
 */
async function updateInvoiceInSupabase(ghlInvoiceId, updates) {
  try {
    console.log('=== Updating Invoice in Supabase ===');
    console.log('GHL Invoice ID:', ghlInvoiceId);
    console.log('Updates:', JSON.stringify(updates, null, 2));

    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('ghl_invoice_id', ghlInvoiceId)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating invoice:', error);
      throw error;
    }

    if (!data) {
      console.warn('⚠️ No invoice found with GHL Invoice ID:', ghlInvoiceId);
      return {
        success: false,
        error: 'Invoice not found'
      };
    }

    console.log('✅ Invoice updated successfully');

    return {
      success: true,
      data
    };

  } catch (error) {
    console.error('❌ Error in updateInvoiceInSupabase:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  saveInvoiceToSupabase,
  updateInvoicePaymentStatus,
  getInvoiceByGHLId,
  getInvoiceByconfidoId,
  savePaymentToSupabase,
  getInvoicesByOpportunity,
  calculateInvoiceTotal,
  getServiceItems,
  updateInvoiceInSupabase,
};
