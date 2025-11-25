-- Migration: Create invoices and confido_payments tables
-- Description: Tables to track invoices synced between GHL and Confido, and payment transactions

-- Create invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- GHL identifiers
    ghl_invoice_id TEXT UNIQUE NOT NULL,
    ghl_opportunity_id TEXT,
    ghl_contact_id TEXT,

    -- Display names
    opportunity_name TEXT,
    primary_contact_name TEXT,

    -- Confido identifiers
    confido_invoice_id TEXT UNIQUE,
    invoice_number TEXT,

    -- Financial data
    amount_due DECIMAL(10,2) NOT NULL,
    amount_paid DECIMAL(10,2) DEFAULT 0.00,

    -- Status tracking
    status TEXT DEFAULT 'pending', -- pending, paid, overdue, cancelled

    -- Date tracking
    invoice_date TIMESTAMPTZ,
    due_date TIMESTAMPTZ,
    paid_date TIMESTAMPTZ,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for invoices table
CREATE INDEX IF NOT EXISTS idx_invoices_ghl_invoice_id ON public.invoices(ghl_invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_confido_invoice_id ON public.invoices(confido_invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_ghl_opportunity_id ON public.invoices(ghl_opportunity_id);
CREATE INDEX IF NOT EXISTS idx_invoices_ghl_contact_id ON public.invoices(ghl_contact_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON public.invoices(created_at);

-- Create confido_payments table to track payment transactions
CREATE TABLE IF NOT EXISTS public.confido_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Confido identifiers
    confido_payment_id TEXT UNIQUE NOT NULL,
    confido_invoice_id TEXT,

    -- GHL identifiers (from linked invoice)
    ghl_invoice_id TEXT,
    ghl_contact_id TEXT,
    ghl_opportunity_id TEXT,

    -- Payment details
    amount DECIMAL(10,2) NOT NULL,
    payment_method TEXT,
    status TEXT DEFAULT 'completed', -- completed, pending, failed, refunded

    -- Transaction info
    transaction_date TIMESTAMPTZ NOT NULL,

    -- Raw webhook data for debugging
    raw_webhook_data JSONB,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for confido_payments table
CREATE INDEX IF NOT EXISTS idx_confido_payments_payment_id ON public.confido_payments(confido_payment_id);
CREATE INDEX IF NOT EXISTS idx_confido_payments_invoice_id ON public.confido_payments(confido_invoice_id);
CREATE INDEX IF NOT EXISTS idx_confido_payments_ghl_invoice_id ON public.confido_payments(ghl_invoice_id);
CREATE INDEX IF NOT EXISTS idx_confido_payments_transaction_date ON public.confido_payments(transaction_date);

-- Enable Row Level Security
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.confido_payments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allow all operations for now - adjust based on security requirements)
CREATE POLICY "Allow all operations on invoices" ON public.invoices
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on confido_payments" ON public.confido_payments
    FOR ALL USING (true) WITH CHECK (true);

-- Create function to auto-update updated_at timestamp if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to auto-update updated_at
CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON public.invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_confido_payments_updated_at
    BEFORE UPDATE ON public.confido_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE public.invoices IS 'Stores invoices synced between GHL and Confido';
COMMENT ON TABLE public.confido_payments IS 'Stores payment transactions received from Confido webhooks';

COMMENT ON COLUMN public.invoices.ghl_invoice_id IS 'Unique invoice ID from GoHighLevel';
COMMENT ON COLUMN public.invoices.confido_invoice_id IS 'Unique invoice ID from Confido (populated after creation)';
COMMENT ON COLUMN public.invoices.status IS 'Invoice status: pending, paid, overdue, cancelled';

COMMENT ON COLUMN public.confido_payments.confido_payment_id IS 'Unique payment transaction ID from Confido';
COMMENT ON COLUMN public.confido_payments.raw_webhook_data IS 'Full webhook payload for debugging and auditing';
