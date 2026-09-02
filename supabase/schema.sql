-- ==========================================================
-- Car Detailing CRM - Supabase PostgreSQL Schema
-- ==========================================================

-- Enable pgcrypto / uuid-ossp extension for UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Create leads table
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    service VARCHAR(100) NOT NULL,
    source VARCHAR(100) DEFAULT 'website',
    status VARCHAR(50) DEFAULT 'new',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Add table comment
COMMENT ON TABLE public.leads IS 'Stores prospective and active customer leads for car detailing CRM';

-- 3. Create indexes for high-performance querying and filtering
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_service ON public.leads(service);
CREATE INDEX IF NOT EXISTS idx_leads_source ON public.leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON public.leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_name ON public.leads(name);

-- 4. Create trigger to automatically update updated_at timestamp on row modification
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trg_leads_updated_at ON public.leads;

CREATE TRIGGER trg_leads_updated_at
    BEFORE UPDATE ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Row-Level Security (RLS) Configuration
-- Enable RLS for security best practices
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Allow full access to authenticated / anon users with valid API keys
-- Adjust these policies based on your production authentication model
CREATE POLICY "Allow public read access to leads"
    ON public.leads
    FOR SELECT
    USING (true);

CREATE POLICY "Allow public insert access to leads"
    ON public.leads
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow public update access to leads"
    ON public.leads
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow public delete access to leads"
    ON public.leads
    FOR DELETE
    USING (true);

-- 6. WhatsApp Conversation Sessions Table (Multi-turn state tracking)
CREATE TABLE IF NOT EXISTS public.whatsapp_sessions (
    phone VARCHAR(50) PRIMARY KEY,
    step VARCHAR(50) NOT NULL DEFAULT 'awaiting_service',
    selected_service VARCHAR(100),
    customer_name VARCHAR(255),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.whatsapp_sessions IS 'Stores active multi-turn WhatsApp conversation state';

CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_updated_at ON public.whatsapp_sessions(updated_at DESC);

ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public full access to whatsapp_sessions"
    ON public.whatsapp_sessions
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 7. Sample Seed Data (Optional for testing)
-- 7. WhatsApp Messages Table (CRM Live Inbox & History)
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(50) NOT NULL,
    customer_name VARCHAR(255),
    direction VARCHAR(20) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    sender VARCHAR(50) NOT NULL DEFAULT 'customer', -- 'customer', 'bot', 'agent'
    message_text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.whatsapp_messages IS 'Stores full WhatsApp message history for CRM Live Inbox';

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone ON public.whatsapp_messages(phone, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_created_at ON public.whatsapp_messages(created_at DESC);

ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public full access to whatsapp_messages"
    ON public.whatsapp_messages
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 8. Sample Seed Data (Optional for testing)
-- INSERT INTO public.leads (name, phone, service, source, status) VALUES
-- ('John Smith', '+1-555-0199', 'Full Detail', 'website', 'new'),
-- ('Sarah Connor', '+1-555-0144', 'Ceramic Coating', 'instagram', 'contacted'),
-- ('Michael Scott', '+1-555-0182', 'Paint Correction', 'referral', 'scheduled');

