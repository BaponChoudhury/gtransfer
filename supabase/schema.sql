-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles (extends Supabase auth.users)
create table public.profiles (
  id                    uuid references auth.users(id) on delete cascade primary key,
  email                 text not null,
  full_name             text,
  avatar_url            text,
  plan                  text not null default 'free' check (plan in ('free', 'essential', 'pro')),
  email_transfer_bytes  bigint not null default 0,   -- cumulative bytes transferred (free-tier cap)
  is_premium            boolean not null default false, -- legacy; kept for reference only
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Purchases — customer details for each paid upgrade
create table public.purchases (
  id               uuid default uuid_generate_v4() primary key,
  user_id          uuid references public.profiles(id) on delete set null,
  plan             text not null check (plan in ('essential', 'pro')),
  price_cents      integer not null,
  currency         text not null default 'usd',
  payment_provider text not null default 'manual',  -- 'stripe', 'lemon_squeezy', 'manual'
  payment_id       text,                             -- provider transaction / order ID
  customer_email   text not null,
  customer_name    text,
  customer_country text,
  notes            text,
  purchased_at     timestamptz not null default now(),
  activated_at     timestamptz
);

-- Connected Google accounts (primary + secondary)
create table public.connected_accounts (
  id           uuid default uuid_generate_v4() primary key,
  user_id      uuid references public.profiles(id) on delete cascade not null,
  google_email text not null,
  google_id    text not null,
  role         text not null check (role in ('primary', 'secondary')),
  display_name text,
  avatar_url   text,
  access_token  text not null,
  refresh_token text not null,
  token_expiry  timestamptz not null,
  scopes        text[] not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique(user_id, google_id)
);

-- External cloud accounts (Mega, Drime) — Pro plan only
create table public.external_accounts (
  id                   uuid default uuid_generate_v4() primary key,
  user_id              uuid references public.profiles(id) on delete cascade not null,
  provider             text not null check (provider in ('mega', 'drime')),
  email                text not null,
  display_name         text,
  encrypted_credentials text not null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique(user_id, provider, email)
);

-- Transfer jobs
create table public.transfer_jobs (
  id                    uuid default uuid_generate_v4() primary key,
  user_id               uuid references public.profiles(id) on delete cascade not null,
  type                  text not null check (type in ('drive', 'photos', 'gmail_attachment', 'drive_to_mega', 'drive_to_drime')),
  action                text not null check (action in ('copy', 'move')),
  source_account_id     uuid references public.connected_accounts(id) on delete set null,
  destination_account_id uuid references public.connected_accounts(id) on delete set null,
  external_account_id   uuid references public.external_accounts(id) on delete set null,
  source_items          jsonb not null default '[]',
  status                text not null default 'pending' check (status in ('pending', 'running', 'completed', 'failed', 'cancelled')),
  total_files           integer not null default 0,
  transferred_files     integer not null default 0,
  total_bytes           bigint not null default 0,
  transferred_bytes     bigint not null default 0,
  error_message         text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  completed_at          timestamptz
);

-- Row Level Security
alter table public.profiles          enable row level security;
alter table public.purchases         enable row level security;
alter table public.connected_accounts enable row level security;
alter table public.external_accounts  enable row level security;
alter table public.transfer_jobs      enable row level security;

-- Policies: users only see their own data
create policy "Users can view own profile"   on public.profiles  for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles  for update using (auth.uid() = id);

create policy "Users can view own purchases" on public.purchases for select using (auth.uid() = user_id);

create policy "Users can manage own connected accounts" on public.connected_accounts for all using (auth.uid() = user_id);
create policy "Users can manage own external accounts"  on public.external_accounts  for all using (auth.uid() = user_id);
create policy "Users can manage own transfer jobs"      on public.transfer_jobs       for all using (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Atomic increment for free-tier email usage tracking
create or replace function public.increment_email_bytes(p_user_id uuid, p_bytes bigint)
returns void language sql security definer set search_path = public as $$
  update public.profiles
  set email_transfer_bytes = email_transfer_bytes + p_bytes
  where id = p_user_id;
$$;

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at  before update on public.profiles          for each row execute function public.set_updated_at();
create trigger set_accounts_updated_at  before update on public.connected_accounts for each row execute function public.set_updated_at();
create trigger set_external_updated_at  before update on public.external_accounts  for each row execute function public.set_updated_at();
create trigger set_jobs_updated_at      before update on public.transfer_jobs       for each row execute function public.set_updated_at();
