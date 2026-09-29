-- ============================================================
-- MIGRATION: Tabel tiket_dismantle & dismantle_items
-- Jalankan di Supabase SQL Editor
-- VERSI 3: drop & recreate bersih
-- ============================================================

-- Drop dulu kalau sudah ada (urutan: anak dulu, baru induk)
drop table if exists public.dismantle_items cascade;
drop table if exists public.tiket_dismantle cascade;

-- 1. Tabel tiket_dismantle
create table public.tiket_dismantle (
  id              bigint generated always as identity primary key,
  wo_id           text,
  nama_pelanggan  text,
  no_layanan      text,
  no_telp         text,
  alamat          text,
  koordinat       text,
  cs_name         text,
  teknisi         jsonb default '[]'::jsonb,
  status          text not null default 'RELEASE',
  tanggal         date default current_date,
  catatan         text,
  noc_name        text,
  hasil_noc       text,
  checked_at      timestamptz,
  completed_at    timestamptz,
  is_auto         boolean not null default false,
  created_at      timestamptz not null default now()
);

create index idx_td_wo     on public.tiket_dismantle(wo_id);
create index idx_td_status on public.tiket_dismantle(status);

alter table public.tiket_dismantle enable row level security;
create policy "Allow all tiket_dismantle"
  on public.tiket_dismantle for all using (true) with check (true);

-- 2. Tabel dismantle_items
create table public.dismantle_items (
  id            bigint generated always as identity primary key,
  dismantle_id  bigint not null
                  references public.tiket_dismantle(id) on delete cascade,
  sn            text,
  jenis         text,
  kondisi_awal  text,
  kondisi_akhir text,
  hasil_noc     text,
  panjang       numeric(10,2),
  keterangan    text,
  created_at    timestamptz not null default now()
);

create index idx_di_dismantle on public.dismantle_items(dismantle_id);

alter table public.dismantle_items enable row level security;
create policy "Allow all dismantle_items"
  on public.dismantle_items for all using (true) with check (true);
