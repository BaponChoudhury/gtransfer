-- Migration: Add multi-tier plan system
-- Run this against your Supabase project once (SQL Editor → paste → Run)

-- 1. Add plan column to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free'
  CONSTRAINT profiles_plan_check CHECK (plan IN ('free', 'essential', 'pro'));

-- 2. Migrate existing premium users → pro plan
UPDATE public.profiles SET plan = 'pro' WHERE is_premium = true;

-- 3. Track cumulative email bytes transferred (for free tier 10 GB cap)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_transfer_bytes bigint NOT NULL DEFAULT 0;

-- 4. Purchases table — stores customer details for each paid upgrade
CREATE TABLE IF NOT EXISTS public.purchases (
  id              uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id         uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  plan            text NOT NULL CHECK (plan IN ('essential', 'pro')),
  price_cents     integer NOT NULL,
  currency        text NOT NULL DEFAULT 'usd',
  payment_provider text NOT NULL DEFAULT 'manual',  -- 'stripe', 'lemon_squeezy', 'manual'
  payment_id      text,                              -- provider transaction / order ID
  customer_email  text NOT NULL,
  customer_name   text,
  customer_country text,
  notes           text,
  purchased_at    timestamptz NOT NULL DEFAULT now(),
  activated_at    timestamptz
);

ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- Users can see their own purchases; admins use service-role key
CREATE POLICY "Users can view own purchases"
  ON public.purchases FOR SELECT
  USING (auth.uid() = user_id);

-- 5. Atomic increment helper (avoids race conditions on free-tier usage tracking)
CREATE OR REPLACE FUNCTION public.increment_email_bytes(p_user_id uuid, p_bytes bigint)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.profiles
  SET email_transfer_bytes = email_transfer_bytes + p_bytes
  WHERE id = p_user_id;
$$;
