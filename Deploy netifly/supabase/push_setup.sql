-- ============================================================
-- WEB PUSH — Tabel penyimpanan subscription perangkat
-- Jalankan di Supabase Dashboard → SQL Editor
-- ============================================================

create table if not exists push_subscriptions (
  id          bigint generated always as identity primary key,
  username    text not null,
  role        text,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now()
);

create index if not exists idx_push_subscriptions_username on push_subscriptions (username);
create index if not exists idx_push_subscriptions_role on push_subscriptions (role);

-- Izinkan aplikasi (anon) menyimpan & menghapus subscription miliknya.
alter table push_subscriptions enable row level security;

drop policy if exists "push insert" on push_subscriptions;
create policy "push insert" on push_subscriptions
  for insert to anon, authenticated with check (true);

drop policy if exists "push update" on push_subscriptions;
create policy "push update" on push_subscriptions
  for update to anon, authenticated using (true) with check (true);

drop policy if exists "push delete" on push_subscriptions;
create policy "push delete" on push_subscriptions
  for delete to anon, authenticated using (true);

drop policy if exists "push select" on push_subscriptions;
create policy "push select" on push_subscriptions
  for select to anon, authenticated using (true);
