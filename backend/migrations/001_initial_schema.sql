-- Ledger initial schema

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  auth0_id text unique not null,
  email text,
  name text,
  backboard_assistant_id text,
  preferences jsonb default '{"briefing_frequency":"weekly","communication_style":"brief","agent_strictness":"balanced"}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists linked_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  plaid_access_token text not null,
  plaid_item_id text not null,
  institution_name text,
  accounts jsonb default '[]'::jsonb,
  last_synced_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  plaid_transaction_id text,
  account_id text,
  amount numeric(12,2) not null,
  date date not null,
  merchant_name text,
  category text,
  type text default 'expense',
  is_recurring boolean default false,
  recurring_stream_id text,
  created_at timestamptz default now()
);

create table if not exists recurring_charges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  merchant_name text not null,
  average_amount numeric(12,2),
  frequency text default 'monthly',
  category text,
  value_score integer default 3,
  status text default 'active',
  decision_reason text,
  last_charge_date date,
  price_history jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  name text not null,
  target_amount numeric(12,2) not null,
  current_amount numeric(12,2) default 0,
  target_date date,
  priority integer default 1,
  status text default 'active',
  monthly_contribution numeric(12,2) default 0,
  feasibility text default 'on_track',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists action_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  agent_source text not null,
  type text not null,
  title text not null,
  description text,
  suggested_action jsonb,
  amount numeric(12,2),
  status text default 'pending',
  created_at timestamptz default now(),
  resolved_at timestamptz
);

create table if not exists briefings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  type text default 'weekly',
  content text not null,
  audio_url text,
  created_at timestamptz default now()
);

-- Indexes for common queries
create index if not exists idx_transactions_user_date on transactions(user_id, date desc);
create index if not exists idx_recurring_charges_user on recurring_charges(user_id);
create index if not exists idx_goals_user on goals(user_id);
create index if not exists idx_action_queue_user_status on action_queue(user_id, status);
create index if not exists idx_briefings_user on briefings(user_id, created_at desc);

-- Enable RLS (Row Level Security)
alter table users enable row level security;
alter table linked_accounts enable row level security;
alter table transactions enable row level security;
alter table recurring_charges enable row level security;
alter table goals enable row level security;
alter table action_queue enable row level security;
alter table briefings enable row level security;
