-- Businesses
create table businesses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  niche text not null check (niche in ('real_estate', 'law', 'home_services', 'medical_dental', 'local_services', 'automotive', 'wedding')),
  location text not null,
  website text,
  phone text,
  meta_access_token text,
  meta_ad_account_id text,
  meta_page_id text,
  google_customer_id text,
  created_at timestamptz default now()
);
alter table businesses enable row level security;
create policy "Users own their businesses" on businesses
  for all using (auth.uid() = user_id);

-- Campaigns
create table campaigns (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses,
  user_id uuid references auth.users not null,
  name text not null,
  niche text not null,
  platform text not null check (platform in ('meta', 'google')),
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'completed')),
  ad_copy jsonb not null default '{}',
  targeting jsonb not null default '{}',
  meta_campaign_id text,
  google_campaign_id text,
  impressions integer default 0,
  clicks integer default 0,
  leads integer default 0,
  spend numeric(10,2) default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table campaigns enable row level security;
create policy "Users own their campaigns" on campaigns
  for all using (auth.uid() = user_id);

-- Leads
create table leads (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses,
  user_id uuid references auth.users not null,
  name text,
  email text,
  instagram_handle text,
  platform text not null default 'instagram',
  status text not null default 'pending' check (status in ('pending', 'sent', 'replied', 'converted')),
  message_sent text,
  replied_at timestamptz,
  created_at timestamptz default now()
);
alter table leads enable row level security;
create policy "Users own their leads" on leads
  for all using (auth.uid() = user_id);

-- Usage records
create table usage_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  action text not null check (action in ('ad_generated', 'ad_deployed', 'lead_outreach')),
  credits_used integer not null,
  created_at timestamptz default now()
);
alter table usage_records enable row level security;
create policy "Users see their own usage" on usage_records
  for all using (auth.uid() = user_id);

-- User credits
create table user_credits (
  user_id uuid primary key references auth.users not null,
  credits integer not null default 0,
  whop_user_id text,
  updated_at timestamptz default now()
);
alter table user_credits enable row level security;
create policy "Users see their own credits" on user_credits
  for select using (auth.uid() = user_id);

-- Auto-grant credits on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.user_credits (user_id, credits)
  values (new.id, 50)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Website monitors (auto-monitoring)
create table website_monitors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  business_name text not null,
  website_url text not null,
  niche text not null,
  location text not null,
  platform text not null default 'meta' check (platform in ('meta', 'google')),
  check_interval_hours integer not null default 1,
  is_active boolean not null default true,
  last_checked_at timestamptz,
  last_snapshot text,
  created_at timestamptz default now()
);
alter table website_monitors enable row level security;
create policy "Users own their monitors" on website_monitors
  for all using (auth.uid() = user_id);

-- Indexes
create index on campaigns (user_id, created_at desc);
create index on leads (user_id, created_at desc);
create index on usage_records (user_id, created_at desc);
create index on website_monitors (user_id, is_active);

-- Scraped ads from Meta Ad Library
create table scraped_ads (
  id uuid primary key default gen_random_uuid(),
  external_id text,
  advertiser_name text not null,
  niche text not null,
  location_query text not null,
  country_code text default 'US',
  headline text,
  body_text text,
  cta text,
  platforms text[] default '{}',
  media_type text,
  ad_delivery_start date,
  ad_delivery_stop date,
  is_active boolean default true,
  spend_lower integer,
  spend_upper integer,
  impressions_lower integer,
  impressions_upper integer,
  performance_score numeric(5,2),
  raw_data jsonb default '{}',
  source text default 'api',
  scraped_at timestamptz default now(),
  week_of date,
  created_at timestamptz default now()
);

alter table scraped_ads enable row level security;
create policy "Service role full access to scraped_ads" on scraped_ads for all using (true);
create index idx_scraped_ads_niche_week on scraped_ads(niche, week_of desc);
create index idx_scraped_ads_performance on scraped_ads(niche, performance_score desc nulls last);

-- Scrape run tracking
create table scrape_runs (
  id uuid primary key default gen_random_uuid(),
  niche text not null,
  location text not null,
  status text default 'pending',
  ads_found integer default 0,
  ads_new integer default 0,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now()
);

alter table scrape_runs enable row level security;
create policy "Service role full access to scrape_runs" on scrape_runs for all using (true);

-- =============================================
-- AGENCY CLIENT PORTAL TABLES
-- =============================================

-- User roles (admin vs client vs saas_user)
create table user_roles (
  user_id uuid primary key references auth.users(id),
  role text not null default 'client' check (role in ('admin', 'client', 'saas_user')),
  created_at timestamptz default now()
);
alter table user_roles enable row level security;
create policy "Users can read their own role" on user_roles for select using (auth.uid() = user_id);
create policy "Service role full access to user_roles" on user_roles for all using (true);

-- Agency clients (businesses the admin manages)
create table agency_clients (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references auth.users(id) not null,
  client_user_id uuid references auth.users(id),
  business_name text not null,
  contact_name text,
  contact_email text,
  contact_phone text,
  niche text,
  website text,
  location text,
  logo_url text,
  monthly_ad_budget numeric(10,2),
  ads_remaining integer default 0,
  stripe_customer_id text,
  status text default 'active' check (status in ('active', 'paused', 'churned')),
  notes text,
  created_at timestamptz default now()
);
alter table agency_clients enable row level security;
create policy "Admins manage their clients" on agency_clients for all using (auth.uid() = admin_user_id);
create policy "Clients see their own record" on agency_clients for select using (auth.uid() = client_user_id);

-- Ads created for clients (approval workflow)
create table client_ads (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references agency_clients(id) on delete cascade not null,
  admin_user_id uuid references auth.users(id) not null,
  title text not null,
  platform text default 'meta' check (platform in ('meta', 'google')),
  ad_copy jsonb not null default '{}',
  targeting jsonb default '{}',
  budget_daily numeric(10,2),
  status text default 'draft' check (status in ('draft', 'pending_approval', 'approved', 'rejected', 'live', 'paused', 'completed')),
  client_feedback text,
  approved_at timestamptz,
  rejected_at timestamptz,
  scheduled_for date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table client_ads enable row level security;
create policy "Admins manage ads they created" on client_ads for all using (auth.uid() = admin_user_id);
create policy "Clients see their ads" on client_ads for select using (
  client_id in (select id from agency_clients where client_user_id = auth.uid())
);
create policy "Clients can update their ads" on client_ads for update using (
  client_id in (select id from agency_clients where client_user_id = auth.uid())
);

-- Ad packages clients can buy
create table ad_packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  ad_count integer not null,
  price numeric(10,2) not null,
  stripe_price_id text,
  is_active boolean default true,
  created_at timestamptz default now()
);
alter table ad_packages enable row level security;
create policy "Anyone can read active packages" on ad_packages for select using (is_active = true);
create policy "Service role full access to ad_packages" on ad_packages for all using (true);

-- Client payments via Stripe
create table client_payments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references agency_clients(id) on delete cascade not null,
  amount numeric(10,2) not null,
  description text,
  status text default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded')),
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  created_at timestamptz default now()
);
alter table client_payments enable row level security;
create policy "Service role full access to client_payments" on client_payments for all using (true);
create policy "Clients see their payments" on client_payments for select using (
  client_id in (select id from agency_clients where client_user_id = auth.uid())
);

-- Indexes for agency tables
create index idx_agency_clients_admin on agency_clients(admin_user_id);
create index idx_agency_clients_client_user on agency_clients(client_user_id);
create index idx_client_ads_client on client_ads(client_id, status);
create index idx_client_ads_admin on client_ads(admin_user_id, created_at desc);
create index idx_client_payments_client on client_payments(client_id, created_at desc);

-- Update handle_new_user to also assign role
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.user_credits (user_id, credits)
  values (new.id, 50)
  on conflict (user_id) do nothing;
  -- First user gets admin role, everyone else gets client
  if (select count(*) from public.user_roles) = 0 then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  else
    insert into public.user_roles (user_id, role) values (new.id, 'client')
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;
