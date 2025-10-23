-- Supabase schema setup for bes-codex

-- Enable required extensions
create extension if not exists "pgcrypto";

-- Users table (aligns with NextAuth credentials flow)
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  phone text,
  bio text,
  photo_url text,
  photo_path text,
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Clients and related data
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  first_savings numeric(14,2) not null default 0,
  current_savings numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint clients_owner_email_unique unique (owner_id, email)
);

create index if not exists idx_clients_owner on public.clients(owner_id);
create index if not exists idx_clients_email on public.clients(email);

create table if not exists public.savings_snapshots (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  amount numeric(14,2) not null,
  recorded_at timestamptz not null default now()
);

create index if not exists idx_snapshots_client on public.savings_snapshots(client_id);

-- Upload logs
create table if not exists public.uploads (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  filename text not null,
  total_records integer not null,
  processed_at timestamptz not null default now()
);

create index if not exists idx_uploads_owner on public.uploads(owner_id);

-- Email logs
create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  subject text not null,
  body_preview text not null,
  recipients integer not null,
  sent_at timestamptz not null default now()
);

create index if not exists idx_email_logs_owner on public.email_logs(owner_id);

-- Email template (one per owner)
create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.users(id) on delete cascade,
  subject text not null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Communication campaign tables
create table if not exists public.communication_campaigns (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  subject text not null,
  body_html text not null,
  body_text text not null,
  reasons_json jsonb not null,
  scheduled_at timestamptz,
  status text not null default 'SCHEDULED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_campaigns_owner on public.communication_campaigns(owner_id);
create index if not exists idx_campaigns_scheduled_at on public.communication_campaigns(scheduled_at);

create table if not exists public.communication_recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.communication_campaigns(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  client_name text not null,
  client_email text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_recipients_campaign on public.communication_recipients(campaign_id);
create index if not exists idx_recipients_client on public.communication_recipients(client_id);

create table if not exists public.communication_channel_statuses (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.communication_campaigns(id) on delete cascade,
  channel text not null,
  status text not null default 'PENDING',
  scheduled_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_channel_status_campaign on public.communication_channel_statuses(campaign_id);
create index if not exists idx_channel_status_channel on public.communication_channel_statuses(channel);

-- -----------------------------------------------------------
-- Sample data (remove if you only need empty schema)
-- -----------------------------------------------------------

insert into public.users (id, email, name, phone, bio, photo_url, photo_path, password_hash)
values
  (
    '7bde3b6a-0f48-4387-8f8c-3a65f47fa601',
    'aylin@firma.com',
    'Aylin Korkmaz',
    '+90 555 111 22 33',
    'Portföy planlama uzmanı.',
    null,
    null,
    '$2b$10$examplehashA'
  ),
  (
    'b1e860ff-4191-49dd-9be4-8f57e20bd0d4',
    'emre@firma.com',
    'Emre Yalçın',
    '+90 555 999 88 77',
    'Fon performans analisti.',
    null,
    null,
    '$2b$10$examplehashB'
  )
on conflict (email) do nothing;

insert into public.clients (id, owner_id, name, email, phone, first_savings, current_savings, created_at, updated_at, deleted_at)
values
  ('c1fbd0f1-0c77-4f9d-8a8d-3f4de7b6a101', '7bde3b6a-0f48-4387-8f8c-3a65f47fa601', 'Merve Tan', 'merve.tan@example.com', '+905551112233', 25000, 31500, timestamp '2024-05-15 09:30:00+03', timestamp '2024-06-10 18:00:00+03', null),
  ('3aa7c1ac-768e-4e02-8a75-1e74f0164ed1', '7bde3b6a-0f48-4387-8f8c-3a65f47fa601', 'Orhun Demir', 'orhun.demir@example.com', '+905559998877', 18000, 21450, timestamp '2024-05-21 11:45:00+03', timestamp '2024-06-11 08:30:00+03', null),
  ('0130ef9c-7f9a-4dc0-8fbb-68b681cf7dbe', 'b1e860ff-4191-49dd-9be4-8f57e20bd0d4', 'Burak Aksoy', 'burak.aksoy@example.com', '+905336667788', 46000, 50200, timestamp '2024-06-01 13:20:00+03', timestamp '2024-06-11 09:45:00+03', null)
on conflict (id) do nothing;

insert into public.savings_snapshots (id, client_id, amount, recorded_at)
values
  ('6a9fd522-0f01-4b36-aee6-1fe0e5cf2001', 'c1fbd0f1-0c77-4f9d-8a8d-3f4de7b6a101', 25000, timestamp '2024-05-15 09:30:00+03'),
  ('37293f15-6b4c-459a-8b70-3e5d82dbc0e7', 'c1fbd0f1-0c77-4f9d-8a8d-3f4de7b6a101', 31500, timestamp '2024-06-10 18:00:00+03'),
  ('f4b35d12-99aa-4c4a-a1d6-eeb5de4a62bf', '3aa7c1ac-768e-4e02-8a75-1e74f0164ed1', 18000, timestamp '2024-05-21 11:45:00+03')
on conflict (id) do nothing;

insert into public.uploads (id, owner_id, filename, total_records, processed_at)
values
  ('0a92a5a4-3a2a-4d88-8fa5-41e4fc6d31af', '7bde3b6a-0f48-4387-8f8c-3a65f47fa601', 'clients_may2024.csv', 48, timestamp '2024-06-05 17:20:00+03')
on conflict (id) do nothing;

insert into public.email_templates (id, owner_id, subject, body, created_at, updated_at)
values
  ('b5e7412d-cfed-495f-b9a3-13d3cf20a9cb', '7bde3b6a-0f48-4387-8f8c-3a65f47fa601', 'Tasarruf Özetiniz', '<h1>Merhaba {{name}}</h1>', now(), now())
on conflict (owner_id) do update set subject = excluded.subject, body = excluded.body, updated_at = now();

insert into public.email_logs (id, owner_id, subject, body_preview, recipients, sent_at)
values
  ('f1c14da5-6323-4b31-b6d3-6b0023c37db0', '7bde3b6a-0f48-4387-8f8c-3a65f47fa601', 'Tasarruf Özeti - Haziran', 'Son ay tasarruf değişimi özetiniz…', 17, timestamp '2024-06-09 10:30:00+03')
on conflict (id) do nothing;

insert into public.communication_campaigns (id, owner_id, subject, body_html, body_text, reasons_json, scheduled_at, status, created_at, updated_at)
values
  ('40f7d109-8240-4189-9c16-7d40f1b4bdaa', '7bde3b6a-0f48-4387-8f8c-3a65f47fa601', 'Haziran Tasarruf Uyarısı', '<p>Selam {{name}}, bakiyeniz %12 arttı.</p>', 'Selam {{name}}, bakiyeniz %12 arttı.', '["growth_gt_10"]', timestamp '2024-06-12 09:00:00+03', 'SCHEDULED', timestamp '2024-06-10 12:00:00+03', timestamp '2024-06-11 10:00:00+03')
on conflict (id) do nothing;

insert into public.communication_recipients (id, campaign_id, client_id, client_name, client_email, created_at)
values
  ('eb2d4514-42d5-4d3c-87a5-29090b1ca0d1', '40f7d109-8240-4189-9c16-7d40f1b4bdaa', 'c1fbd0f1-0c77-4f9d-8a8d-3f4de7b6a101', 'Merve Tan', 'merve.tan@example.com', now())
on conflict (id) do nothing;

insert into public.communication_channel_statuses (id, campaign_id, channel, status, scheduled_at, completed_at, created_at, updated_at)
values
  ('c2fd5136-24f2-4d3b-9b5b-8f122e2e13ea', '40f7d109-8240-4189-9c16-7d40f1b4bdaa', 'EMAIL', 'PENDING', timestamp '2024-06-12 09:00:00+03', null, now(), now())
on conflict (id) do nothing;

-- Optional: create public bucket for profile photos
-- select storage.create_bucket('avatars', public => true);
