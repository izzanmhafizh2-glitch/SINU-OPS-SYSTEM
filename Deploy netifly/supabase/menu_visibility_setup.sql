-- ============================================================
-- MIGRATION: Menu Visibility Control untuk Super Admin
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- Tabel menyimpan satu row per (role, item_key)
-- item_key format:
--   menu:{tabId}                 → menu utama, misal "menu:tugas"
--   submenu:{tabId}:{subId}      → sub menu, misal "submenu:tugas:pickup-tugas"
--   konten:{tabId}:{subId}:{contentId} → konten, misal "konten:tugas:tugas-saya:form-work-instalasi"
-- visible = true  → tampil (default)
-- visible = false → disembunyikan

create table if not exists public.menu_visibility (
  id          uuid primary key default gen_random_uuid(),
  role        text not null,           -- 'teknisi' | 'cs' | 'admin' | 'noc'
  item_key    text not null,           -- format di atas
  visible     boolean not null default true,
  updated_at  timestamptz default now(),
  unique(role, item_key)
);

-- Index untuk query cepat per role
create index if not exists idx_menu_visibility_role on public.menu_visibility(role);

-- RLS: hanya owner/superadmin yang bisa write, semua authenticated bisa read
alter table public.menu_visibility enable row level security;

create policy "Public read menu visibility"
  on public.menu_visibility for select
  using (true);

create policy "Only owner can write menu visibility"
  on public.menu_visibility for all
  using (true)
  with check (true);

comment on table public.menu_visibility is
  'Konfigurasi hide/show menu, sub menu, dan konten per role. Dikelola dari panel Super Admin.';
