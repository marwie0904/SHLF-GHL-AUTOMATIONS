-- Migration: Add invoice service items catalog and update invoices table
-- Created: 2025-11-27
-- Purpose: Support GHL custom invoice webhooks with service item pricing

-- Create invoice_service_items catalog table
CREATE TABLE IF NOT EXISTS public.invoice_service_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_name TEXT UNIQUE NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_service_items_name ON public.invoice_service_items(service_name);
CREATE INDEX IF NOT EXISTS idx_service_items_active ON public.invoice_service_items(is_active);

-- Insert initial service items
INSERT INTO public.invoice_service_items (service_name, price, description) VALUES
  ('test', 20.00, 'Test Service Item 1'),
  ('test_2', 40.00, 'Test Service Item 2')
ON CONFLICT (service_name) DO NOTHING;

-- Add new columns to invoices table
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS confido_client_id TEXT,
  ADD COLUMN IF NOT EXISTS confido_matter_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_url TEXT,
  ADD COLUMN IF NOT EXISTS service_items JSONB;

-- Create index for payment URL lookups
CREATE INDEX IF NOT EXISTS idx_invoices_payment_url ON public.invoices(payment_url);

-- Enable RLS on service items table
ALTER TABLE public.invoice_service_items ENABLE ROW LEVEL SECURITY;

-- RLS policy: Allow all operations (adjust based on your security requirements)
CREATE POLICY "Allow all operations on service items"
  ON public.invoice_service_items
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add comments for documentation
COMMENT ON TABLE public.invoice_service_items IS 'Catalog of billable service items with prices for GHL custom invoices';
COMMENT ON COLUMN public.invoice_service_items.service_name IS 'Unique service/product name matching GHL custom object field';
COMMENT ON COLUMN public.invoice_service_items.price IS 'Price in dollars (will be converted to cents for Confido)';
COMMENT ON COLUMN public.invoices.confido_client_id IS 'Confido client directory ID';
COMMENT ON COLUMN public.invoices.confido_matter_id IS 'Confido matter directory ID';
COMMENT ON COLUMN public.invoices.payment_url IS 'Confido payment link URL sent to client';
COMMENT ON COLUMN public.invoices.service_items IS 'JSON array of service items used in this invoice: [{name, price, quantity}]';
