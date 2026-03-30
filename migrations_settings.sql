-- Migration: Add site settings table

CREATE TABLE IF NOT EXISTS public.site_settings (
    setting_key TEXT PRIMARY KEY,
    setting_value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings
DROP POLICY IF EXISTS "Public can view settings" ON public.site_settings;
CREATE POLICY "Public can view settings" ON public.site_settings FOR SELECT USING (true);

-- Only admins can update settings
DROP POLICY IF EXISTS "Admins can update settings" ON public.site_settings;
CREATE POLICY "Admins can update settings" ON public.site_settings FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'ADMIN', 'SUPERADMIN'))
);

-- Insert defaults if none exist
INSERT INTO public.site_settings (setting_key, setting_value)
VALUES 
    ('maintenance_mode', 'false'::jsonb),
    ('min_deposit', '5'::jsonb),
    ('min_withdraw', '10'::jsonb),
    ('jazzcash_number', '"03000000000"'::jsonb),
    ('easypaisa_number', '"03450000000"'::jsonb),
    ('bank_details', '"Habib Bank Limited\nAccount: 123456789\nTitle: EasyPay App"'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;
