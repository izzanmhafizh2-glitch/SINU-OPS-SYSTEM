-- ============================================================
-- MIGRASI DATA ABSENSI Agustus - Oktober 2026
-- Dari spreadsheet Google Sheets ke tabel absensi Supabase
-- Jalankan di Supabase SQL Editor
-- ============================================================
-- Mapping:
--   DIVISI "Customer Service" → role = 'cs'
--   DIVISI "Teknisi"          → role = 'teknisi'
--   SHIFT  "Pagi"             → shift = 'Shift1'
--   SHIFT  "Siang"            → shift = 'Shift2'
--   TEPAT WAKTU → point = 100
--   TERLAMBAT   → point = 70 (default, < 30 menit)
-- ============================================================

-- Hindari duplikat jika dijalankan ulang
DELETE FROM absensi
WHERE tanggal BETWEEN '2026-08-11' AND '2026-10-01'
  AND nama IN ('Nursiyah','Inyang safitri','Taryana','Ujang Dira','Deni Rusdiana','Dede Faisal');

-- ── AGUSTUS 2026 ──────────────────────────────────────────────
INSERT INTO absensi (nama, role, shift, status_kehadiran, mnt_terlambat, alasan_keterlambatan, jam_masuk_aktual, tanggal, lat, lng, point, timezone) VALUES
('Inyang safitri','cs','Shift1','TEPAT WAKTU',0,NULL,'2026-08-11T06:57:18+07:00','2026-08-11',-6.2341669,107.3607933,100,'Asia/Jakarta'),
('Taryana','teknisi','Shift1','TERLAMBAT',65,NULL,'2026-08-11T09:05:00+07:00','2026-08-11',-6.2342421,107.3608656,70,'Asia/Jakarta'),
('Nursiyah','cs','Shift2','TEPAT WAKTU',0,NULL,'2026-08-11T13:12:58+07:00','2026-08-11',-6.2341654,107.3608017,100,'Asia/Jakarta'),
('Ujang Dira','teknisi','Shift2','TEPAT WAKTU',0,NULL,'2026-08-11T14:01:47+07:00','2026-08-11',-6.2338917,107.3607617,100,'Asia/Jakarta'),
('Deni Rusdiana','teknisi','Shift2','TERLAMBAT',22,NULL,'2026-08-11T14:22:49+07:00','2026-08-11',-6.23432,107.360917,70,'Asia/Jakarta'),

('Inyang safitri','cs','Shift1','TEPAT WAKTU',0,NULL,'2026-08-12T06:58:48+07:00','2026-08-12',-6.2342955,107.3607982,100,'Asia/Jakarta'),
('Dede Faisal','teknisi','Shift1','TEPAT WAKTU',0,NULL,'2026-08-12T08:16:43+07:00','2026-08-12',-6.2342617,107.3608479,100,'Asia/Jakarta'),
('Nursiyah','cs','Shift2','TEPAT WAKTU',0,NULL,'2026-08-12T12:41:11+07:00','2026-08-12',-6.2341906,107.3608082,100,'Asia/Jakarta'),
('Ujang Dira','teknisi','Shift2','TEPAT WAKTU',0,NULL,'2026-08-12T14:00:44+07:00','2026-08-12',-6.2342033,107.36088,100,'Asia/Jakarta'),
('Deni Rusdiana','teknisi','Shift2','TERLAMBAT',22,NULL,'2026-08-12T14:22:50+07:00','2026-08-12',-6.234195,107.360855,70,'Asia/Jakarta'),

('Inyang safitri','cs','Shift1','TEPAT WAKTU',0,NULL,'2026-08-13T06:49:41+07:00','2026-08-13',-6.2341589,107.3608354,100,'Asia/Jakarta'),
('Dede Faisal','teknisi','Shift1','TERLAMBAT',27,NULL,'2026-08-13T08:27:29+07:00','2026-08-13',-6.2342769,107.3608075,70,'Asia/Jakarta'),
('Nursiyah','cs','Shift2','TEPAT WAKTU',0,NULL,'2026-08-13T12:55:49+07:00','2026-08-13',-6.2342239,107.3608406,100,'Asia/Jakarta'),
('Ujang Dira','teknisi','Shift2','TEPAT WAKTU',0,NULL,'2026-08-13T13:53:50+07:00','2026-08-13',-6.2342116,107.3608522,100,'Asia/Jakarta'),
('Deni Rusdiana','teknisi','Shift2','TERLAMBAT',25,'Macet','2026-08-13T14:25:13+07:00','2026-08-13',-6.2341733,107.360755,70,'Asia/Jakarta'),

('Dede Faisal','teknisi','Shift1','TERLAMBAT',31,'Kaberangan','2026-08-14T08:31:55+07:00','2026-08-14',-6.2342214,107.3608388,70,'Asia/Jakarta'),
('Taryana','teknisi','Shift1','TERLAMBAT',64,'Motor di pakai ade sekolah','2026-08-14T09:04:07+07:00','2026-08-14',-6.2342326,107.3608651,70,'Asia/Jakarta'),
('Nursiyah','cs','Shift2','TEPAT WAKTU',0,NULL,'2026-08-14T13:00:29+07:00','2026-08-14',-6.2342469,107.3608596,100,'Asia/Jakarta'),
('Ujang Dira','teknisi','Shift2','TEPAT WAKTU',0,NULL,'2026-08-14T13:34:09+07:00','2026-08-14',-6.2341816,107.3608314,100,'Asia/Jakarta'),
('Deni Rusdiana','teknisi','Shift2','TERLAMBAT',46,'Lupa absensi','2026-08-14T14:46:15+07:00','2026-08-14',-6.2341729,107.3608941,70,'Asia/Jakarta'),

('Inyang safitri','cs','Shift1','TEPAT WAKTU',0,'Operasional Sabtu dan Minggu jam 09:00','2026-08-15T09:00:52+07:00','2026-08-15',-6.2342057,107.3608459,100,'Asia/Jakarta'),
('Taryana','teknisi','Shift1','TERLAMBAT',11,'Mandi kesiangan','2026-08-15T09:11:15+07:00','2026-08-15',-6.2342399,107.360853,70,'Asia/Jakarta'),
('Dede Faisal','teknisi','Shift1','TERLAMBAT',29,'Telat','2026-08-15T09:29:12+07:00','2026-08-15',-6.2341908,107.3608374,70,'Asia/Jakarta'),

('Nursiyah','cs','Shift1','TEPAT WAKTU',0,'Operasional hari minggu dimulai pukul 09:00','2026-08-16T08:51:59+07:00','2026-08-16',-6.2342532,107.3608624,100,'Asia/Jakarta'),
('Ujang Dira','teknisi','Shift1','TEPAT WAKTU',0,NULL,'2026-08-16T08:56:25+07:00','2026-08-16',-6.2343533,107.3609617,100,'Asia/Jakarta'),

('Nursiyah','cs','Shift1','TEPAT WAKTU',0,NULL,'2026-08-18T06:59:32+07:00','2026-08-18',-6.2342051,107.3608395,100,'Asia/Jakarta'),
('Ujang Dira','teknisi','Shift1','TEPAT WAKTU',0,NULL,'2026-08-18T07:52:15+07:00','2026-08-18',-6.2340867,107.360695,100,'Asia/Jakarta'),
('Deni Rusdiana','teknisi','Shift1','TERLAMBAT',50,'Kesiangan macet di jalan','2026-08-18T08:50:05+07:00','2026-08-18',-6.2342384,107.3608693,70,'Asia/Jakarta'),
('Inyang safitri','cs','Shift2','TEPAT WAKTU',0,NULL,'2026-08-18T13:07:34+07:00','2026-08-18',-6.2342677,107.3606365,100,'Asia/Jakarta'),
('Dede Faisal','teknisi','Shift2','TEPAT WAKTU',0,NULL,'2026-08-18T13:46:54+07:00','2026-08-18',-6.2341849,107.3607865,100,'Asia/Jakarta'),
('Taryana','teknisi','Shift2','TEPAT WAKTU',0,NULL,'2026-08-18T14:07:23+07:00','2026-08-18',-6.2341851,107.3608811,100,'Asia/Jakarta'),

('Nursiyah','cs','Shift1','TEPAT WAKTU',0,NULL,'2026-08-19T06:59:33+07:00','2026-08-19',-6.2342056,107.3608144,100,'Asia/Jakarta'),
('Deni Rusdiana','teknisi','Shift1','TEPAT WAKTU',0,NULL,'2026-08-19T08:00:56+07:00','2026-08-19',-6.23417,107.3608883,100,'Asia/Jakarta'),
('Ujang Dira','teknisi','Shift1','TEPAT WAKTU',0,NULL,'2026-08-19T08:01:02+07:00','2026-08-19',-6.2341867,107.3608733,100,'Asia/Jakarta'),
('Inyang safitri','cs','Shift2','TEPAT WAKTU',0,NULL,'2026-08-19T12:53:46+07:00','2026-08-19',-6.2341731,107.3608152,100,'Asia/Jakarta'),
('Dede Faisal','teknisi','Shift2','TEPAT WAKTU',0,NULL,'2026-08-19T13:44:39+07:00','2026-08-19',-6.2342368,107.3608679,100,'Asia/Jakarta'),
('Taryana','teknisi','Shift2','TEPAT WAKTU',0,NULL,'2026-08-19T13:44:48+07:00','2026-08-19',-6.2342032,107.3608509,100,'Asia/Jakarta'),

('Nursiyah','cs','Shift1','TEPAT WAKTU',0,NULL,'2026-08-20T07:00:27+07:00','2026-08-20',-6.2341898,107.3607522,100,'Asia/Jakarta'),
('Ujang Dira','teknisi','Shift1','TEPAT WAKTU',0,NULL,'2026-08-20T08:02:03+07:00','2026-08-20',-6.2341987,107.3610528,100,'Asia/Jakarta'),
('Deni Rusdiana','teknisi','Shift2','TEPAT WAKTU',0,'Terlambat',  '2026-08-20T09:11:20+07:00','2026-08-20',-6.234255,107.3608717,100,'Asia/Jakarta'),
('Inyang safitri','cs','Shift2','TEPAT WAKTU',0,NULL,'2026-08-20T12:15:22+07:00','2026-08-20',-6.2342397,107.3608652,100,'Asia/Jakarta'),
('Dede Faisal','teknisi','Shift2','TERLAMBAT',16,'Lupa','2026-08-20T14:16:51+07:00','2026-08-20',-6.234232,107.3608634,70,'Asia/Jakarta'),
('Taryana','teknisi','Shift2','TERLAMBAT',18,'Bakar ikan','2026-08-20T14:18:26+07:00','2026-08-20',-6.2342516,107.3608723,70,'Asia/Jakarta'),

('Nursiyah','cs','Shift1','TEPAT WAKTU',0,NULL,'2026-08-21T06:57:00+07:00','2026-08-21',-6.2342466,107.3607485,100,'Asia/Jakarta'),
('Ujang Dira','teknisi','Shift1','TEPAT WAKTU',0,NULL,'2026-08-21T08:06:53+07:00','2026-08-21',-6.23425,107.3609083,100,'Asia/Jakarta'),
('Deni Rusdiana','teknisi','Shift1','TEPAT WAKTU',0,'Baru beres menerin kabel putus, tdk absen dlu','2026-08-21T09:11:57+07:00','2026-08-21',-6.2342206,107.360851,100,'Asia/Jakarta'),
('Inyang safitri','cs','Shift2','TEPAT WAKTU',0,NULL,'2026-08-21T13:09:18+07:00','2026-08-21',-6.2341851,107.3608091,100,'Asia/Jakarta'),
('Taryana','teknisi','Shift2','TEPAT WAKTU',0,NULL,'2026-08-21T13:48:32+07:00','2026-08-21',-6.2342091,107.360822,100,'Asia/Jakarta'),
('Dede Faisal','teknisi','Shift2','TEPAT WAKTU',0,NULL,'2026-08-21T13:49:17+07:00','2026-08-21',-6.2342605,107.3608688,100,'Asia/Jakarta'),

('Nursiyah','cs','Shift1','TEPAT WAKTU',0,'Operasional hari sabtu pukul 09:00','2026-08-22T08:46:52+07:00','2026-08-22',-6.2341312,107.3607853,100,'Asia/Jakarta'),
('Ujang Dira','teknisi','Shift1','TEPAT WAKTU',0,'macet hajatan','2026-08-22T09:02:34+07:00','2026-08-22',-6.2342524,107.3608707,100,'Asia/Jakarta'),

('Taryana','teknisi','Shift1','TERLAMBAT',112,'Nonton sule','2026-08-23T10:52:08+07:00','2026-08-23',-6.2341725,107.3607932,30,'Asia/Jakarta'),

('Inyang safitri','cs','Shift1','TEPAT WAKTU',0,NULL,'2026-08-24T06:52:58+07:00','2026-08-24',-6.2341696,107.3607855,100,'Asia/Jakarta'),
('Taryana','teknisi','Shift1','TEPAT WAKTU',0,NULL,'2026-08-24T08:07:03+07:00','2026-08-24',-6.2342382,107.3608614,100,'Asia/Jakarta'),
('Deni Rusdiana','teknisi','Shift1','TEPAT WAKTU',0,NULL,'2026-08-24T08:08:54+07:00','2026-08-24',-6.2342018,107.3608162,100,'Asia/Jakarta'),
('Nursiyah','cs','Shift2','TEPAT WAKTU',0,NULL,'2026-08-24T12:41:43+07:00','2026-08-24',-6.2340117,107.3609713,100,'Asia/Jakarta'),
('Dede Faisal','teknisi','Shift2','TEPAT WAKTU',0,NULL,'2026-08-24T13:39:58+07:00','2026-08-24',-6.2342156,107.3608344,100,'Asia/Jakarta'),
('Ujang Dira','teknisi','Shift2','TEPAT WAKTU',0,NULL,'2026-08-24T13:59:32+07:00','2026-08-24',-6.2342133,107.3609283,100,'Asia/Jakarta'),

('Inyang safitri','cs','Shift1','TEPAT WAKTU',0,NULL,'2026-08-25T06:58:16+07:00','2026-08-25',-6.2342271,107.3608429,100,'Asia/Jakarta'),
('Deni Rusdiana','teknisi','Shift1','TERLAMBAT',7,'Kesiangan','2026-08-25T09:07:18+07:00','2026-08-25',-6.2341845,107.3608109,70,'Asia/Jakarta'),
('Taryana','teknisi','Shift1','TERLAMBAT',28,'Bergadang','2026-08-25T09:28:15+07:00','2026-08-25',-6.2343367,107.3608067,70,'Asia/Jakarta'),
('Ujang Dira','teknisi','Shift2','TEPAT WAKTU',0,NULL,'2026-08-25T12:58:31+07:00','2026-08-25',-6.2342522,107.3608604,100,'Asia/Jakarta'),
('Nursiyah','cs','Shift2','TEPAT WAKTU',0,NULL,'2026-08-25T12:59:09+07:00','2026-08-25',-6.2341785,107.3608092,100,'Asia/Jakarta'),
('Dede Faisal','teknisi','Shift2','TEPAT WAKTU',0,NULL,'2026-08-25T13:57:11+07:00','2026-08-25',-6.2342256,107.3608578,100,'Asia/Jakarta'),

('Inyang safitri','cs','Shift2','TEPAT WAKTU',0,NULL,'2026-08-26T06:45:37+07:00','2026-08-26',-6.2341603,107.3607966,100,'Asia/Jakarta'),
('Taryana','teknisi','Shift1','TERLAMBAT',34,'Bergadang','2026-08-26T08:34:58+07:00','2026-08-26',-6.2341817,107.3609783,70,'Asia/Jakarta'),
('Nursiyah','cs','Shift2','TEPAT WAKTU',0,NULL,'2026-08-26T13:02:50+07:00','2026-08-26',-6.2342079,107.3607955,100,'Asia/Jakarta'),
('Dede Faisal','teknisi','Shift2','TEPAT WAKTU',0,NULL,'2026-08-26T14:02:49+07:00','2026-08-26',-6.2341854,107.3607986,100,'Asia/Jakarta'),
('Ujang Dira','teknisi','Shift1','TERLAMBAT',3,'macet','2026-08-26T14:03:22+07:00','2026-08-26',-6.2342603,107.3608724,70,'Asia/Jakarta'),

('Inyang safitri','cs','Shift1','TEPAT WAKTU',0,NULL,'2026-08-27T06:55:15+07:00','2026-08-27',-6.2341577,107.3607834,100,'Asia/Jakarta'),
('Deni Rusdiana','teknisi','Shift1','TERLAMBAT',19,'Macet','2026-08-27T08:19:40+07:00','2026-08-27',-6.2343349,107.3609267,70,'Asia/Jakarta'),
('Taryana','teknisi','Shift1','TERLAMBAT',137,'Kurang disiplin','2026-08-27T10:17:25+07:00','2026-08-27',-6.2342495,107.3608721,30,'Asia/Jakarta'),
('Nursiyah','cs','Shift2','TEPAT WAKTU',0,NULL,'2026-08-27T12:51:58+07:00','2026-08-27',-6.2341739,107.3608052,100,'Asia/Jakarta'),
('Ujang Dira','teknisi','Shift1','TERLAMBAT',3,'absen muter terus','2026-08-27T14:03:14+07:00','2026-08-27',-6.234185,107.36092,70,'Asia/Jakarta'),
('Dede Faisal','teknisi','Shift2','TERLAMBAT',17,'Lupa','2026-08-27T14:17:51+07:00','2026-08-27',-6.2341606,107.3609404,70,'Asia/Jakarta'),

('Inyang safitri','cs','Shift1','TEPAT WAKTU',0,NULL,'2026-08-28T06:43:47+07:00','2026-08-28',-6.2341591,107.3607985,100,'Asia/Jakarta'),
('Taryana','teknisi','Shift1','TERLAMBAT',49,'Tidak disiplin','2026-08-28T08:49:26+07:00','2026-08-28',-6.2341896,107.3608353,70,'Asia/Jakarta'),
('Deni Rusdiana','teknisi','Shift1','TERLAMBAT',64,'Jalanan macet','2026-08-28T09:04:08+07:00','2026-08-28',-6.2341333,107.3608083,70,'Asia/Jakarta'),
('Nursiyah','cs','Shift2','TEPAT WAKTU',0,NULL,'2026-08-28T13:05:17+07:00','2026-08-28',-6.2342934,107.3608719,100,'Asia/Jakarta'),
('Dede Faisal','teknisi','Shift2','TEPAT WAKTU',0,NULL,'2026-08-28T13:53:33+07:00','2026-08-28',-6.2341898,107.3608698,100,'Asia/Jakarta'),
('Ujang Dira','teknisi','Shift2','TEPAT WAKTU',0,NULL,'2026-08-28T14:03:13+07:00','2026-08-28',-6.2341267,107.3608817,100,'Asia/Jakarta'),

('Taryana','teknisi','Shift1','TERLAMBAT',137,'Kurang disiplin','2026-08-29T10:17:04+07:00','2026-08-29',-6.2342015,107.3608176,30,'Asia/Jakarta'),

('Nursiyah','cs','Shift1','TERLAMBAT',50,'Operasional minggu','2026-08-30T08:50:48+07:00','2026-08-30',-6.2341008,107.360886,70,'Asia/Jakarta'),

('Nursiyah','cs','Shift1','TEPAT WAKTU',0,NULL,'2026-08-31T06:58:59+07:00','2026-08-31',-6.2340036,107.3608264,100,'Asia/Jakarta'),
('Inyang safitri','cs','Shift2','TEPAT WAKTU',0,NULL,'2026-08-31T13:01:13+07:00','2026-08-31',-6.2341566,107.3608078,100,'Asia/Jakarta'),
('Taryana','teknisi','Shift2','TEPAT WAKTU',0,NULL,'2026-08-31T13:09:57+07:00','2026-08-31',-6.2342196,107.3608306,100,'Asia/Jakarta'),
('Deni Rusdiana','teknisi','Shift2','TERLAMBAT',17,'Macet','2026-08-31T14:17:53+07:00','2026-08-31',-6.234215,107.3608,70,'Asia/Jakarta'),

-- ── SEPTEMBER 2026 ────────────────────────────────────────────
('Nursiyah','cs','Shift1','TEPAT WAKTU',0,NULL,'2026-09-01T07:00:22+07:00','2026-09-01',-6.2341863,107.3608573,100,'Asia/Jakarta'),
('Ujang Dira','teknisi','Shift1','TEPAT WAKTU',0,NULL,'2026-09-01T08:05:02+07:00','2026-09-01',-6.2343417,107.36089,100,'Asia/Jakarta'),
('Inyang safitri','cs','Shift2','TEPAT WAKTU',0,NULL,'2026-09-01T13:07:17+07:00','2026-09-01',-6.2341479,107.3608577,100,'Asia/Jakarta'),
('Taryana','teknisi','Shift2','TEPAT WAKTU',0,NULL,'2026-09-01T13:07:55+07:00','2026-09-01',-6.2341579,107.360787,100,'Asia/Jakarta'),
('Deni Rusdiana','teknisi','Shift2','TERLAMBAT',29,'Terlambat','2026-09-01T14:29:49+07:00','2026-09-01',-6.2342185,107.36084,70,'Asia/Jakarta'),

('Nursiyah','cs','Shift1','TEPAT WAKTU',0,NULL,'2026-09-02T07:05:02+07:00','2026-09-02',-6.2344058,107.3607933,100,'Asia/Jakarta'),
('Ujang Dira','teknisi','Shift1','TERLAMBAT',22,'beli sarapan','2026-09-02T08:22:24+07:00','2026-09-02',-6.2341949,107.3608211,70,'Asia/Jakarta'),
('Inyang safitri','cs','Shift2','TEPAT WAKTU',0,NULL,'2026-09-02T12:58:00+07:00','2026-09-02',-6.2341943,107.3608303,100,'Asia/Jakarta'),
('Deni Rusdiana','teknisi','Shift2','TEPAT WAKTU',0,NULL,'2026-09-02T14:14:38+07:00','2026-09-02',-6.2341935,107.3608204,100,'Asia/Jakarta'),

('Nursiyah','cs','Shift1','TEPAT WAKTU',0,NULL,'2026-09-03T07:08:22+07:00','2026-09-03',-6.2342522,107.3608872,100,'Asia/Jakarta'),
('Dede Faisal','teknisi','Shift1','TERLAMBAT',28,'Karak bangun','2026-09-03T08:28:57+07:00','2026-09-03',-6.2342447,107.3608677,70,'Asia/Jakarta'),
('Inyang safitri','cs','Shift2','TEPAT WAKTU',0,NULL,'2026-09-03T12:48:34+07:00','2026-09-03',-6.2341756,107.3608023,100,'Asia/Jakarta'),
('Taryana','teknisi','Shift2','TEPAT WAKTU',0,NULL,'2026-09-03T13:30:02+07:00','2026-09-03',-6.2342458,107.3608671,100,'Asia/Jakarta'),
('Deni Rusdiana','teknisi','Shift2','TEPAT WAKTU',0,NULL,'2026-09-03T14:15:23+07:00','2026-09-03',-6.2342621,107.3608791,100,'Asia/Jakarta'),

('Nursiyah','cs','Shift1','TEPAT WAKTU',0,NULL,'2026-09-04T07:05:42+07:00','2026-09-04',-6.2342639,107.360876,100,'Asia/Jakarta'),
('Ujang Dira','teknisi','Shift1','TEPAT WAKTU',0,NULL,'2026-09-04T08:04:51+07:00','2026-09-04',-6.2341767,107.360915,100,'Asia/Jakarta'),
('Dede Faisal','teknisi','Shift1','TEPAT WAKTU',0,NULL,'2026-09-04T08:12:12+07:00','2026-09-04',-6.2342451,107.3608765,100,'Asia/Jakarta'),
('Inyang safitri','cs','Shift2','TEPAT WAKTU',0,NULL,'2026-09-04T13:02:51+07:00','2026-09-04',-6.2341467,107.3607892,100,'Asia/Jakarta'),
('Taryana','teknisi','Shift2','TEPAT WAKTU',0,NULL,'2026-09-04T14:01:56+07:00','2026-09-04',-6.2342612,107.3608718,100,'Asia/Jakarta'),
('Deni Rusdiana','teknisi','Shift2','TERLAMBAT',16,'Macet','2026-09-04T14:16:50+07:00','2026-09-04',-6.2341965,107.3608188,70,'Asia/Jakarta'),

('Nursiyah','cs','Shift1','TERLAMBAT',51,'Operasional hari sabtu','2026-09-05T08:51:27+07:00','2026-09-05',-6.234217,107.3608185,70,'Asia/Jakarta'),

('Inyang safitri','cs','Shift1','TEPAT WAKTU',0,NULL,'2026-09-07T07:04:18+07:00','2026-09-07',-6.2341471,107.3607838,100,'Asia/Jakarta'),
('Ujang Dira','teknisi','Shift1','TEPAT WAKTU',0,NULL,'2026-09-07T08:05:58+07:00','2026-09-07',-6.2341358,107.3608066,100,'Asia/Jakarta'),
('Taryana','teknisi','Shift1','TERLAMBAT',48,'Kurang disiplin','2026-09-07T08:48:48+07:00','2026-09-07',-6.234199,107.3608549,70,'Asia/Jakarta'),
('Nursiyah','cs','Shift2','TEPAT WAKTU',0,NULL,'2026-09-07T12:47:16+07:00','2026-09-07',-6.2342284,107.3609579,100,'Asia/Jakarta'),
('Dede Faisal','teknisi','Shift2','TEPAT WAKTU',0,NULL,'2026-09-07T13:54:37+07:00','2026-09-07',-6.2342441,107.3608517,100,'Asia/Jakarta'),

('Inyang safitri','cs','Shift1','TEPAT WAKTU',0,NULL,'2026-09-08T07:12:12+07:00','2026-09-08',-6.2341658,107.3608451,100,'Asia/Jakarta'),
('Ujang Dira','teknisi','Shift1','TEPAT WAKTU',0,NULL,'2026-09-08T08:00:10+07:00','2026-09-08',-6.2342422,107.3608771,100,'Asia/Jakarta'),
('Taryana','teknisi','Shift1','TERLAMBAT',36,'Kurang disiplin','2026-09-08T08:36:02+07:00','2026-09-08',-6.2341685,107.3608444,70,'Asia/Jakarta'),
('Nursiyah','cs','Shift2','TEPAT WAKTU',0,NULL,'2026-09-08T12:55:16+07:00','2026-09-08',-6.2342394,107.3608647,100,'Asia/Jakarta'),
('Dede Faisal','teknisi','Shift2','TEPAT WAKTU',0,NULL,'2026-09-08T13:58:22+07:00','2026-09-08',-6.234152,107.3608303,100,'Asia/Jakarta'),
('Deni Rusdiana','teknisi','Shift2','TERLAMBAT',27,'Poho absen','2026-09-08T14:27:47+07:00','2026-09-08',-6.2341904,107.3608255,70,'Asia/Jakarta'),

('Inyang safitri','cs','Shift1','TEPAT WAKTU',0,NULL,'2026-09-09T07:12:49+07:00','2026-09-09',-6.2341814,107.3608531,100,'Asia/Jakarta'),
('Ujang Dira','teknisi','Shift1','TEPAT WAKTU',0,NULL,'2026-09-09T08:02:43+07:00','2026-09-09',-6.2341382,107.3607829,100,'Asia/Jakarta'),
('Taryana','teknisi','Shift1','TERLAMBAT',38,'Bingung euy alasannya naon deui','2026-09-09T08:38:30+07:00','2026-09-09',-6.2341464,107.3608043,70,'Asia/Jakarta'),
('Nursiyah','cs','Shift2','TEPAT WAKTU',0,NULL,'2026-09-09T12:48:16+07:00','2026-09-09',-6.2341505,107.360801,100,'Asia/Jakarta'),
('Deni Rusdiana','teknisi','Shift2','TERLAMBAT',25,'Macet','2026-09-09T14:25:39+07:00','2026-09-09',-6.2342606,107.3608818,70,'Asia/Jakarta'),
('Dede Faisal','teknisi','Shift2','TERLAMBAT',33,'Lupa absen','2026-09-09T14:33:05+07:00','2026-09-09',-6.2341284,107.3607936,70,'Asia/Jakarta'),

('Inyang safitri','cs','Shift1','TEPAT WAKTU',0,NULL,'2026-09-10T06:54:08+07:00','2026-09-10',-6.2341579,107.3608004,100,'Asia/Jakarta'),
('Ujang Dira','teknisi','Shift1','TEPAT WAKTU',0,NULL,'2026-09-10T07:56:55+07:00','2026-09-10',-6.2341669,107.3608481,100,'Asia/Jakarta'),
('Taryana','teknisi','Shift1','TERLAMBAT',35,'Tidak disiplin','2026-09-10T08:35:27+07:00','2026-09-10',-6.2341811,107.3609059,70,'Asia/Jakarta'),
('Nursiyah','cs','Shift2','TEPAT WAKTU',0,NULL,'2026-09-10T12:59:09+07:00','2026-09-10',-6.2342168,107.3608553,100,'Asia/Jakarta'),
('Dede Faisal','teknisi','Shift2','TEPAT WAKTU',0,NULL,'2026-09-10T14:07:56+07:00','2026-09-10',-6.2341551,107.3608279,100,'Asia/Jakarta'),
('Deni Rusdiana','teknisi','Shift2','TERLAMBAT',34,'Macet','2026-09-10T14:34:39+07:00','2026-09-10',-6.2342441,107.3608677,70,'Asia/Jakarta'),

('Inyang safitri','cs','Shift1','TEPAT WAKTU',0,NULL,'2026-09-11T06:56:24+07:00','2026-09-11',-6.2342058,107.3608339,100,'Asia/Jakarta'),
('Ujang Dira','teknisi','Shift1','TEPAT WAKTU',0,NULL,'2026-09-11T08:05:27+07:00','2026-09-11',-6.2342667,107.3608783,100,'Asia/Jakarta'),
('Nursiyah','cs','Shift2','TEPAT WAKTU',0,NULL,'2026-09-11T12:57:40+07:00','2026-09-11',-6.2342231,107.3608239,100,'Asia/Jakarta'),
('Dede Faisal','teknisi','Shift2','TEPAT WAKTU',0,NULL,'2026-09-11T14:09:03+07:00','2026-09-11',-6.2342102,107.3608303,100,'Asia/Jakarta'),
('Deni Rusdiana','teknisi','Shift2','TERLAMBAT',21,'Mcet','2026-09-11T14:21:15+07:00','2026-09-11',-6.2342059,107.3608288,70,'Asia/Jakarta'),

('Inyang safitri','cs','Shift1','TERLAMBAT',40,'Operasional Sabtu Minggu jam 09:00 S/d 17:00','2026-09-12T08:40:51+07:00','2026-09-12',-6.2341926,107.3608664,70,'Asia/Jakarta'),
('Ujang Dira','teknisi','Shift1','TERLAMBAT',3,'sabtu masuk jam 9','2026-09-12T09:03:27+07:00','2026-09-12',-6.2342184,107.3608518,70,'Asia/Jakarta'),
('Dede Faisal','teknisi','Shift1','TERLAMBAT',20,'Lupa','2026-09-12T09:20:10+07:00','2026-09-12',-6.2341827,107.3608309,70,'Asia/Jakarta'),

('Nursiyah','cs','Shift1','TERLAMBAT',53,'Operasional hari minggu','2026-09-13T08:53:13+07:00','2026-09-13',-6.2341866,107.3607987,70,'Asia/Jakarta'),
('Taryana','teknisi','Shift1','TERLAMBAT',85,'Kesiangan','2026-09-13T10:25:11+07:00','2026-09-13',-6.2341953,107.360828,30,'Asia/Jakarta'),

('Nursiyah','cs','Shift1','TEPAT WAKTU',0,NULL,'2026-09-14T07:04:36+07:00','2026-09-14',-6.2342009,107.3608775,100,'Asia/Jakarta'),
('Taryana','teknisi','Shift1','TERLAMBAT',27,'Kurang disiplin','2026-09-14T08:27:52+07:00','2026-09-14',-6.2342303,107.3609051,70,'Asia/Jakarta'),
('Deni Rusdiana','teknisi','Shift1','TERLAMBAT',61,'Lupa absen','2026-09-14T09:01:04+07:00','2026-09-14',-6.2341483,107.3608267,70,'Asia/Jakarta'),
('Inyang safitri','cs','Shift2','TEPAT WAKTU',0,NULL,'2026-09-14T12:49:09+07:00','2026-09-14',-6.2342293,107.3608289,100,'Asia/Jakarta'),
('Ujang Dira','teknisi','Shift2','TEPAT WAKTU',0,NULL,'2026-09-14T13:40:25+07:00','2026-09-14',-6.2341971,107.3608569,100,'Asia/Jakarta'),
('Dede Faisal','teknisi','Shift2','TEPAT WAKTU',0,NULL,'2026-09-14T14:01:03+07:00','2026-09-14',-6.2342369,107.3608932,100,'Asia/Jakarta'),

('Nursiyah','cs','Shift1','TEPAT WAKTU',0,NULL,'2026-09-15T07:04:48+07:00','2026-09-15',-6.234238,107.3608964,100,'Asia/Jakarta'),
('Deni Rusdiana','teknisi','Shift1','TERLAMBAT',9,'Terlambat','2026-09-15T09:09:15+07:00','2026-09-15',-6.2342367,107.3609317,70,'Asia/Jakarta'),
('Taryana','teknisi','Shift1','TERLAMBAT',16,'HP gak bisa di sentuh telat absen','2026-09-15T09:16:10+07:00','2026-09-15',-6.2341782,107.3608414,70,'Asia/Jakarta'),
('Inyang safitri','cs','Shift2','TEPAT WAKTU',0,NULL,'2026-09-15T12:56:17+07:00','2026-09-15',-6.2341729,107.3607961,100,'Asia/Jakarta'),
('Ujang Dira','teknisi','Shift2','TEPAT WAKTU',0,NULL,'2026-09-15T13:49:46+07:00','2026-09-15',-6.2342367,107.36099,100,'Asia/Jakarta'),
('Dede Faisal','teknisi','Shift2','TEPAT WAKTU',0,NULL,'2026-09-15T14:02:38+07:00','2026-09-15',-6.2342016,107.3608191,100,'Asia/Jakarta'),

('Nursiyah','cs','Shift1','TEPAT WAKTU',0,NULL,'2026-09-16T06:56:02+07:00','2026-09-16',-6.2342168,107.3608157,100,'Asia/Jakarta'),
('Inyang safitri','cs','Shift2','TEPAT WAKTU',0,NULL,'2026-09-16T13:00:04+07:00','2026-09-16',-6.2341983,107.3608239,100,'Asia/Jakarta'),
('Ujang Dira','teknisi','Shift2','TEPAT WAKTU',0,NULL,'2026-09-16T13:42:59+07:00','2026-09-16',-6.2342742,107.3608786,100,'Asia/Jakarta'),
('Dede Faisal','teknisi','Shift2','TEPAT WAKTU',0,NULL,'2026-09-16T13:52:26+07:00','2026-09-16',-6.2342611,107.3608781,100,'Asia/Jakarta'),

('Nursiyah','cs','Shift1','TEPAT WAKTU',0,NULL,'2026-09-17T06:57:17+07:00','2026-09-17',-6.2342698,107.3607921,100,'Asia/Jakarta'),
('Taryana','teknisi','Shift1','TERLAMBAT',34,'Langsung ngecek kabel','2026-09-17T09:34:39+07:00','2026-09-17',-6.2342312,107.3608506,70,'Asia/Jakarta'),
('Deni Rusdiana','teknisi','Shift1','TERLAMBAT',36,'Lupa absen','2026-09-17T09:36:44+07:00','2026-09-17',-6.23426,107.360815,70,'Asia/Jakarta'),
('Inyang safitri','cs','Shift2','TEPAT WAKTU',0,NULL,'2026-09-17T13:01:58+07:00','2026-09-17',-6.2341672,107.3608023,100,'Asia/Jakarta'),
('Ujang Dira','teknisi','Shift2','TEPAT WAKTU',0,NULL,'2026-09-17T13:45:42+07:00','2026-09-17',-6.2341796,107.3608084,100,'Asia/Jakarta'),
('Dede Faisal','teknisi','Shift2','TEPAT WAKTU',0,NULL,'2026-09-17T13:54:31+07:00','2026-09-17',-6.2342195,107.3608342,100,'Asia/Jakarta'),

('Nursiyah','cs','Shift1','TEPAT WAKTU',0,NULL,'2026-09-18T06:59:10+07:00','2026-09-18',-6.2343197,107.3607404,100,'Asia/Jakarta'),
('Deni Rusdiana','teknisi','Shift1','TERLAMBAT',12,'Tlat absen','2026-09-18T09:12:29+07:00','2026-09-18',-6.2342614,107.3608731,70,'Asia/Jakarta'),
('Taryana','teknisi','Shift1','TERLAMBAT',13,'Tidak disiplin','2026-09-18T09:13:17+07:00','2026-09-18',-6.2341533,107.3607951,70,'Asia/Jakarta'),
('Inyang safitri','cs','Shift2','TEPAT WAKTU',0,NULL,'2026-09-18T13:06:16+07:00','2026-09-18',-6.234147,107.3608069,100,'Asia/Jakarta'),
('Dede Faisal','teknisi','Shift2','TEPAT WAKTU',0,NULL,'2026-09-18T13:58:50+07:00','2026-09-18',-6.2342071,107.3609346,100,'Asia/Jakarta'),
('Ujang Dira','teknisi','Shift2','TEPAT WAKTU',0,NULL,'2026-09-18T14:11:33+07:00','2026-09-18',-6.2341968,107.3608311,100,'Asia/Jakarta'),

('Taryana','teknisi','Shift1','TERLAMBAT',106,'Tidak disiplin','2026-09-19T09:46:11+07:00','2026-09-19',-6.2342367,107.360854,30,'Asia/Jakarta'),

('Inyang safitri','cs','Shift1','TERLAMBAT',30,'Operasional Sabtu Minggu jam 09:00 S/d 17:00','2026-09-20T08:30:41+07:00','2026-09-20',-6.2341722,107.3608124,70,'Asia/Jakarta'),
('Ujang Dira','teknisi','Shift1','TERLAMBAT',42,'minggu','2026-09-20T08:42:12+07:00','2026-09-20',-6.2342097,107.3607886,70,'Asia/Jakarta'),

('Inyang safitri','cs','Shift1','TEPAT WAKTU',0,NULL,'2026-09-21T06:35:23+07:00','2026-09-21',-6.2341971,107.3608236,100,'Asia/Jakarta'),
('Deni Rusdiana','teknisi','Shift1','TERLAMBAT',57,'Ada kendala absen, baru bisa','2026-09-21T08:57:23+07:00','2026-09-21',-6.2341961,107.3608272,70,'Asia/Jakarta'),
('Nursiyah','cs','Shift2','TEPAT WAKTU',0,NULL,'2026-09-21T13:00:15+07:00','2026-09-21',-6.2341411,107.3608214,100,'Asia/Jakarta'),
('Ujang Dira','teknisi','Shift2','TEPAT WAKTU',0,NULL,'2026-09-21T14:00:13+07:00','2026-09-21',-6.234266,107.3608666,100,'Asia/Jakarta'),

('Inyang safitri','cs','Shift1','TEPAT WAKTU',0,NULL,'2026-09-22T06:40:58+07:00','2026-09-22',-6.2341843,107.3608278,100,'Asia/Jakarta'),
('Dede Faisal','teknisi','Shift1','TERLAMBAT',21,'Kaberangan','2026-09-22T08:21:05+07:00','2026-09-22',-6.234193,107.3608223,70,'Asia/Jakarta'),
('Deni Rusdiana','teknisi','Shift1','TERLAMBAT',26,'Tlat absen','2026-09-22T08:26:35+07:00','2026-09-22',-6.2341948,107.3608487,70,'Asia/Jakarta'),
('Nursiyah','cs','Shift2','TEPAT WAKTU',0,NULL,'2026-09-22T12:51:18+07:00','2026-09-22',-6.2341741,107.3606956,100,'Asia/Jakarta'),
('Taryana','teknisi','Shift2','TEPAT WAKTU',0,NULL,'2026-09-22T13:28:30+07:00','2026-09-22',-6.2341805,107.3608184,100,'Asia/Jakarta'),
('Ujang Dira','teknisi','Shift2','TEPAT WAKTU',0,NULL,'2026-09-22T13:51:38+07:00','2026-09-22',-6.234238,107.3608723,100,'Asia/Jakarta'),

('Inyang safitri','cs','Shift1','TEPAT WAKTU',0,NULL,'2026-09-23T06:51:25+07:00','2026-09-23',-6.2343422,107.3608788,100,'Asia/Jakarta'),
('Nursiyah','cs','Shift2','TEPAT WAKTU',0,NULL,'2026-09-23T12:58:44+07:00','2026-09-23',-6.2342019,107.3608301,100,'Asia/Jakarta'),
('Taryana','teknisi','Shift2','TEPAT WAKTU',0,NULL,'2026-09-23T13:13:55+07:00','2026-09-23',-6.234221,107.3608252,100,'Asia/Jakarta'),
('Ujang Dira','teknisi','Shift2','TEPAT WAKTU',0,NULL,'2026-09-23T13:45:05+07:00','2026-09-23',-6.2342431,107.3608541,100,'Asia/Jakarta'),

('Inyang safitri','cs','Shift1','TEPAT WAKTU',0,NULL,'2026-09-24T06:52:27+07:00','2026-09-24',-6.2342553,107.3608819,100,'Asia/Jakarta'),
('Dede Faisal','teknisi','Shift1','TERLAMBAT',26,'Kaberangan','2026-09-24T08:26:12+07:00','2026-09-24',-6.2342155,107.3607969,70,'Asia/Jakarta'),
('Deni Rusdiana','teknisi','Shift1','TERLAMBAT',51,'Tlat absn','2026-09-24T08:51:33+07:00','2026-09-24',-6.2341947,107.3608281,70,'Asia/Jakarta'),
('Taryana','teknisi','Shift2','TEPAT WAKTU',0,NULL,'2026-09-24T12:52:44+07:00','2026-09-24',-6.2341221,107.3608895,100,'Asia/Jakarta'),
('Ujang Dira','teknisi','Shift2','TEPAT WAKTU',0,NULL,'2026-09-24T13:34:22+07:00','2026-09-24',-6.2342271,107.3608827,100,'Asia/Jakarta'),

('Inyang safitri','cs','Shift1','TEPAT WAKTU',0,NULL,'2026-09-25T06:55:22+07:00','2026-09-25',-6.234161,107.36082,100,'Asia/Jakarta'),
('Nursiyah','cs','Shift2','TERLAMBAT',16,'Loading','2026-09-25T13:16:28+07:00','2026-09-25',-6.234273,107.3607395,70,'Asia/Jakarta'),
('Ujang Dira','teknisi','Shift2','TEPAT WAKTU',0,NULL,'2026-09-25T13:17:06+07:00','2026-09-25',-6.2341506,107.3608309,100,'Asia/Jakarta'),

('Deni Rusdiana','teknisi','Shift1','TERLAMBAT',37,'Tlat','2026-09-26T08:37:23+07:00','2026-09-26',-6.2342446,107.3608908,70,'Asia/Jakarta'),
('Inyang safitri','cs','Shift1','TERLAMBAT',56,'Sabtu dan Minggu operasional jam 09:00','2026-09-26T08:56:08+07:00','2026-09-26',-6.2341471,107.3608212,70,'Asia/Jakarta'),

('Nursiyah','cs','Shift1','TERLAMBAT',45,'Operasional minggu','2026-09-27T08:45:37+07:00','2026-09-27',-6.2342269,107.3609154,70,'Asia/Jakarta'),
('Ujang Dira','teknisi','Shift1','TERLAMBAT',49,'Minggu','2026-09-27T08:49:20+07:00','2026-09-27',-6.2341253,107.3608176,70,'Asia/Jakarta'),

('Nursiyah','cs','Shift1','TEPAT WAKTU',0,NULL,'2026-09-28T06:42:49+07:00','2026-09-28',-6.234245,107.3609006,100,'Asia/Jakarta'),
('Deni Rusdiana','teknisi','Shift2','TEPAT WAKTU',0,NULL,'2026-09-28T13:20:28+07:00','2026-09-28',-6.2342802,107.3609382,100,'Asia/Jakarta'),
('Taryana','teknisi','Shift2','TEPAT WAKTU',0,NULL,'2026-09-28T13:20:48+07:00','2026-09-28',-6.2342317,107.3608885,100,'Asia/Jakarta'),

('Nursiyah','cs','Shift1','TEPAT WAKTU',0,NULL,'2026-09-29T06:54:35+07:00','2026-09-29',-6.2341299,107.3608175,100,'Asia/Jakarta'),
('Dede Faisal','teknisi','Shift1','TERLAMBAT',16,'Poho','2026-09-29T08:16:31+07:00','2026-09-29',-6.2341546,107.3608233,70,'Asia/Jakarta'),
('Ujang Dira','teknisi','Shift1','TERLAMBAT',46,'lupa','2026-09-29T08:46:39+07:00','2026-09-29',-6.2342201,107.3608806,70,'Asia/Jakarta'),
('Inyang safitri','cs','Shift2','TERLAMBAT',41,'Tadi urus berkas sama bersih-bersih karena mamah pulang dari klinik','2026-09-29T13:41:06+07:00','2026-09-29',-6.2342016,107.3608366,70,'Asia/Jakarta'),
('Deni Rusdiana','teknisi','Shift2','TEPAT WAKTU',0,NULL,'2026-09-29T13:53:56+07:00','2026-09-29',-6.2342052,107.360836,100,'Asia/Jakarta'),
('Taryana','teknisi','Shift2','TERLAMBAT',33,'Poho absen','2026-09-29T14:33:31+07:00','2026-09-29',-6.2341587,107.3607906,70,'Asia/Jakarta'),

('Nursiyah','cs','Shift1','TEPAT WAKTU',0,NULL,'2026-09-30T06:52:22+07:00','2026-09-30',-6.234214,107.3608994,100,'Asia/Jakarta'),
('Ujang Dira','teknisi','Shift1','TEPAT WAKTU',0,NULL,'2026-09-30T07:48:09+07:00','2026-09-30',-6.233925,107.3608217,100,'Asia/Jakarta'),
('Inyang safitri','cs','Shift2','TERLAMBAT',38,'Bantu saudara urus berkas buat dirujuk ke rumah sakit','2026-09-30T13:38:41+07:00','2026-09-30',-6.2342161,107.3608303,70,'Asia/Jakarta'),
('Deni Rusdiana','teknisi','Shift2','TEPAT WAKTU',0,NULL,'2026-09-30T14:06:33+07:00','2026-09-30',-6.2342423,107.3608783,100,'Asia/Jakarta'),
('Taryana','teknisi','Shift2','TEPAT WAKTU',0,'Lupa absen','2026-09-30T14:11:12+07:00','2026-09-30',-6.2342012,107.3608472,100,'Asia/Jakarta'),

-- ── OKTOBER 2026 ──────────────────────────────────────────────
('Nursiyah','cs','Shift1','TEPAT WAKTU',0,NULL,'2026-10-01T06:50:33+07:00','2026-10-01',-6.2342665,107.360861,100,'Asia/Jakarta'),
('Ujang Dira','teknisi','Shift1','TEPAT WAKTU',0,NULL,'2026-10-01T08:00:44+07:00','2026-10-01',-6.2342329,107.3608747,100,'Asia/Jakarta'),
('Dede Faisal','teknisi','Shift1','TERLAMBAT',18,'Macet','2026-10-01T08:18:18+07:00','2026-10-01',-6.2341355,107.3608821,70,'Asia/Jakarta'),
('Inyang safitri','cs','Shift2','TEPAT WAKTU',0,NULL,'2026-10-01T13:11:21+07:00','2026-10-01',-6.2342585,107.3608488,100,'Asia/Jakarta');

-- Verifikasi jumlah data yang diinsert
SELECT COUNT(*) as total_inserted, 
       MIN(tanggal) as dari_tanggal, 
       MAX(tanggal) as sampai_tanggal
FROM absensi 
WHERE tanggal BETWEEN '2026-08-11' AND '2026-10-01'
  AND nama IN ('Nursiyah','Inyang safitri','Taryana','Ujang Dira','Deni Rusdiana','Dede Faisal');
