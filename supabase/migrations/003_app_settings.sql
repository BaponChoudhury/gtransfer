-- Migration: App settings table for owner-configurable values (pricing, promo etc.)
-- Run once in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.app_settings (
  key         text PRIMARY KEY,
  value       jsonb NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
-- No public access — only service role key can read/write
-- (admin API routes use createAdminClient which bypasses RLS)

-- Seed with defaults matching src/lib/pricing.ts
INSERT INTO public.app_settings (key, value) VALUES
  ('essential_gbp_pence', '1900'),
  ('essential_gbp_display', '"£19"'),
  ('essential_inr_amount',  '1999'),
  ('essential_inr_display', '"₹1,999"'),
  ('pro_gbp_pence',         '3900'),
  ('pro_gbp_display',       '"£39"'),
  ('pro_inr_amount',        '3999'),
  ('pro_inr_display',       '"₹3,999"'),
  ('promo_enabled',         'false'),
  ('promo_code',            '"LAUNCH20"'),
  ('promo_message',         '"Launch discount — use code"'),
  ('promo_expiry',          '""'),
  ('promo_color',           '"blue"')
ON CONFLICT (key) DO NOTHING;
