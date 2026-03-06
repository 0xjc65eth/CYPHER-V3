-- ============================================================================
-- CYPHER V3 - BTCPay Server Billing
-- Migration 008: BTCPay Invoices & User Subscriptions (Bitcoin payments)
-- ============================================================================

create table if not exists public.btcpay_invoices (
  id            uuid        default gen_random_uuid() primary key,
  invoice_id    text        unique not null,
  user_id       uuid        references auth.users(id) on delete cascade not null,
  plan          text        not null check (plan in ('pro', 'elite')),
  amount        text        not null,
  currency      text        not null default 'USD',
  status        text        not null default 'pending'
                            check (status in ('pending', 'processing', 'settled', 'expired', 'invalid')),
  checkout_link text,
  paid_at       timestamptz,
  created_at    timestamptz default now() not null
);

create table if not exists public.user_subscriptions (
  id              uuid        default gen_random_uuid() primary key,
  user_id         uuid        references auth.users(id) on delete cascade unique not null,
  plan            text        not null check (plan in ('free', 'pro', 'elite')),
  status          text        not null default 'active'
                              check (status in ('active', 'expired', 'cancelled')),
  expires_at      timestamptz not null,
  last_invoice_id text,
  updated_at      timestamptz default now() not null,
  created_at      timestamptz default now() not null
);

alter table public.btcpay_invoices    enable row level security;
alter table public.user_subscriptions enable row level security;

create policy "users_view_own_invoices"
  on public.btcpay_invoices for select using (auth.uid() = user_id);

create policy "users_view_own_subscription"
  on public.user_subscriptions for select using (auth.uid() = user_id);

create policy "service_role_all_invoices"
  on public.btcpay_invoices for all using (auth.role() = 'service_role');

create policy "service_role_all_subscriptions"
  on public.user_subscriptions for all using (auth.role() = 'service_role');
