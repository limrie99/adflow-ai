-- Businesses
create table businesses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  niche text not null check (niche in ('real_estate', 'law')),
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

-- Indexes
create index on campaigns (user_id, created_at desc);
create index on leads (user_id, created_at desc);
create index on usage_records (user_id, created_at desc);
