-- ============================================================
-- INSERT DATA KARYAWAN ke tabel karyawan
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- Hapus dulu jika sudah ada (untuk re-run)
DELETE FROM karyawan WHERE nama IN (
  'Nursiyah','Inyang safitri','Taryana',
  'Ujang Dira','Deni Rusdiana','Dede Faisal'
);

INSERT INTO karyawan (nama, role, avatar) VALUES
  ('Nursiyah',        'cs',       'NU'),
  ('Inyang safitri',  'cs',       'IS'),
  ('Taryana',         'teknisi',  'TA'),
  ('Ujang Dira',      'teknisi',  'UD'),
  ('Deni Rusdiana',   'teknisi',  'DR'),
  ('Dede Faisal',     'teknisi',  'DF');

-- Verifikasi
SELECT * FROM karyawan ORDER BY role, nama;
