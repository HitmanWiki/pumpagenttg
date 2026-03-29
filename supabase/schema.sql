-- Users table (Telegram users)
create table if not exists users (
  id bigint primary key, -- Telegram user ID
  username text,
  first_name text,
  last_name text,
  photo_url text,
  created_at timestamptz default now()
);

-- Tokens table
create table if not exists tokens (
  id uuid primary key default gen_random_uuid(),
  user_id bigint references users(id) on delete cascade,
  name text not null,
  symbol text not null,
  description text,
  website text,
  telegram_link text,
  image_url text,
  mint_address text unique,
  token_wallet_address text,
  token_wallet_private_key text, -- AES-256 encrypted
  deploy_tx text,
  pump_fun_url text,
  original_message_id bigint,
  original_chat_id bigint,
  status text default 'pending' check (status in ('pending', 'live', 'failed')),
  fees_earned_sol numeric(20, 10) default 0,
  fees_last_synced_at timestamptz,
  created_at timestamptz default now()
);

-- Fee claims table
create table if not exists fee_claims (
  id uuid primary key default gen_random_uuid(),
  user_id bigint references users(id),
  token_id uuid references tokens(id),
  amount_sol numeric(20, 10) not null,
  platform_fee_sol numeric(20, 10) not null,
  user_receives_sol numeric(20, 10) not null,
  destination_wallet text not null,
  tx_signature text,
  status text default 'pending' check (status in ('pending', 'success', 'failed')),
  created_at timestamptz default now()
);

-- Campaigns table
create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  goal_market_cap_usd numeric(20, 2) not null,
  prize_usd numeric(20, 2) not null,
  winner_token_id uuid references tokens(id),
  status text default 'active' check (status in ('active', 'completed', 'cancelled')),
  starts_at timestamptz default now(),
  ends_at timestamptz,
  created_at timestamptz default now()
);

-- Indexes
create index if not exists tokens_user_id_idx on tokens(user_id);
create index if not exists tokens_mint_address_idx on tokens(mint_address);
create index if not exists tokens_status_idx on tokens(status);
create index if not exists fee_claims_user_id_idx on fee_claims(user_id);
create index if not exists fee_claims_token_id_idx on fee_claims(token_id);

-- RLS Policies (enable for production)
alter table users enable row level security;
alter table tokens enable row level security;
alter table fee_claims enable row level security;
alter table campaigns enable row level security;
