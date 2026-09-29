-- ============================================================
-- MIGRATION: Tabel izin_cuti
-- Jalankan di Supabase SQL Editor
-- ============================================================

create table if not exists public.izin_cuti (
  id                bigint generated always as identity primary key,
  nama              text not null,
  username          text,
  jenis_cuti        text not null,
  tanggal_mulai     date not null,
  tanggal_selesai   date not null,
  jumlah_hari       text,
  masuk_kembali     text,
  alasan            text,
  delegasi_nama     text,
  kontak_cuti       text,
  nomor_formulir    text,
  status            text not null default 'MENUNGGU',  -- MENUNGGU | DISETUJUI | DITOLAK
  catatan_hrd       text,
  approved_by       text,
  approved_at       timestamptz,
  created_at        timestamptz not null default now()
);

create index if not exists idx_ic_nama   on public.izin_cuti(nama);
create index if not exists idx_ic_status on public.izin_cuti(status);

alter table public.izin_cuti enable row level security;

create policy "Allow all izin_cuti"
  on public.izin_cuti for all
  using (true) with check (true);

comment on table public.izin_cuti is
  'Pengajuan cuti karyawan. Generate formulir PDF dari aplikasi.';
