-- ============================================================
-- MIGRATION: Foto Absensi ke Supabase Storage
-- Jalankan file ini di Supabase SQL Editor
-- ============================================================

-- 1. Tambah kolom foto_url di tabel absensi
alter table public.absensi
  add column if not exists foto_url text default null;

comment on column public.absensi.foto_url is
  'URL foto selfie absensi di Supabase Storage bucket foto-absensi';

-- ============================================================
-- 2. Buat Storage Bucket "foto-absensi"
-- JALANKAN MANUAL DI: Supabase Dashboard → Storage → New Bucket
-- Nama bucket : foto-absensi
-- Public      : TRUE  (agar URL foto bisa diakses langsung)
-- File size   : 5 MB  (foto sudah dikompress ~80-100KB, batas aman)
-- ============================================================

-- 3. Storage Policy — izinkan user yang login untuk upload
-- (Jalankan di SQL Editor setelah bucket dibuat)

-- Policy: siapapun yang terautentikasi boleh upload
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'foto-absensi',
  'foto-absensi',
  true,
  5242880,  -- 5 MB
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

-- Policy: allow public read (karena bucket public)
create policy "Public read foto absensi"
  on storage.objects for select
  using ( bucket_id = 'foto-absensi' );

-- Policy: allow insert dari anon (aplikasi pakai anon key)
create policy "Allow upload foto absensi"
  on storage.objects for insert
  with check ( bucket_id = 'foto-absensi' );

-- Policy: allow update/overwrite (upsert saat absensi ulang)
create policy "Allow update foto absensi"
  on storage.objects for update
  using ( bucket_id = 'foto-absensi' );

-- ============================================================
-- CATATAN STRUKTUR FOLDER DI STORAGE:
--
-- foto-absensi/
-- └── 2026/
--     └── 09 - September/
--         └── 28-Sep-2026/
--             ├── wulan_28092026_0800.jpg
--             └── izzan_28092026_0802.jpg
--
-- Foto otomatis dikompress ke ~80-100KB sebelum upload.
-- Estimasi storage: 15 karyawan × 300 hari = ~450MB/tahun
-- Free tier Supabase Storage: 1GB (cukup untuk ~2 tahun)
-- ============================================================

-- ============================================================
-- MIGRATION: Kolom absensi lapangan
-- Tambahkan ke tabel absensi yang sudah ada
-- ============================================================
alter table public.absensi
  add column if not exists lapangan            boolean default false,
  add column if not exists lapangan_wo_id      text default null,
  add column if not exists lapangan_keterangan text default null,
  add column if not exists foto_lapangan_url   text default null;

comment on column public.absensi.lapangan            is 'True jika absensi dilakukan di luar radius kantor';
comment on column public.absensi.lapangan_wo_id      is 'ID tiket WO yang sedang dikerjakan saat absensi lapangan';
comment on column public.absensi.lapangan_keterangan is 'Keterangan lokasi lapangan dari karyawan';
comment on column public.absensi.foto_lapangan_url   is 'URL foto lokasi/rumah pelanggan di Supabase Storage';
