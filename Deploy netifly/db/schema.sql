-- ============================================================
-- SINU OPS SYSTEM — MySQL Schema
-- Konversi dari Supabase/PostgreSQL ke MySQL 8.0+
-- Jalankan sekali di server MySQL: mysql -u root -p sinu_ops < schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS sinu_ops CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sinu_ops;

-- ── 1. AKUN ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS akun (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(100) NOT NULL UNIQUE,
  password      VARCHAR(255) NOT NULL,
  display_name  VARCHAR(150),
  role          VARCHAR(50)  NOT NULL DEFAULT 'teknisi',
  division      VARCHAR(100),
  avatar        VARCHAR(10),
  avatar_url    TEXT,
  account_type  VARCHAR(20)  NOT NULL DEFAULT 'internal',
  mitra_id      BIGINT UNSIGNED,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ── 2. KARYAWAN ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS karyawan (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nama       VARCHAR(150) NOT NULL,
  role       VARCHAR(50)  NOT NULL,
  avatar     VARCHAR(10),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ── 3. ODP ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS odp (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  odp_id     VARCHAR(50)  NOT NULL UNIQUE,
  odc        VARCHAR(50),
  lokasi     VARCHAR(255),
  kapasitas  INT NOT NULL DEFAULT 8,
  terisi     INT NOT NULL DEFAULT 0,
  lat        DOUBLE,
  lng        DOUBLE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ── 4. MITRA ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mitra (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nama         VARCHAR(150) NOT NULL,
  kota         VARCHAR(100),
  kontak       VARCHAR(100),
  alamat       TEXT,
  status       VARCHAR(20) NOT NULL DEFAULT 'aktif',
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ── 5. MITRA ODC ACCESS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS mitra_odc_access (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  mitra_id   BIGINT UNSIGNED NOT NULL,
  odc_kode   VARCHAR(50) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_mitra_odc (mitra_id, odc_kode),
  FOREIGN KEY (mitra_id) REFERENCES mitra(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── 6. WORK ORDERS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS work_orders (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  wo_id             VARCHAR(30)  NOT NULL UNIQUE,
  pelanggan         VARCHAR(200),
  tipe              VARCHAR(50)  NOT NULL,
  cs_name           VARCHAR(150),
  teknisi           JSON,              -- array nama teknisi (legacy)
  teknisi_1         VARCHAR(150),
  teknisi_2         VARCHAR(150),
  t1                VARCHAR(10),
  t2                VARCHAR(10),
  t4                VARCHAR(10),
  status            VARCHAR(20)  NOT NULL DEFAULT 'RELEASE',
  bulan             TINYINT UNSIGNED,
  tahun             SMALLINT UNSIGNED,
  tanggal           DATE,
  alamat            TEXT,
  no_hp             VARCHAR(30),
  koordinat         VARCHAR(100),
  kendala           TEXT,
  diagnosa          TEXT,
  penanganan        TEXT,
  noc_name          VARCHAR(150),
  catatan           TEXT,
  registrasi        DECIMAL(15,2),
  paket             DECIMAL(15,2),
  nama_paket        VARCHAR(100),
  total             DECIMAL(15,2),
  marketing         VARCHAR(150),
  status_koneksi    VARCHAR(50),
  nama_reseller     VARCHAR(150),
  jumlah_titik      INT,
  sn_ont            VARCHAR(100),
  sn_ap             VARCHAR(100),
  sn_kabel          VARCHAR(100),
  jenis_kabel       VARCHAR(100),
  meter_kabel       DECIMAL(10,2),
  panjang_kabel     DECIMAL(10,2),
  odp_id            VARCHAR(50),
  no_layanan        VARCHAR(100),
  username_pppoe    VARCHAR(100),
  password_pppoe    VARCHAR(100),
  rl_radius_done    TINYINT(1)   NOT NULL DEFAULT 0,
  verified          TINYINT(1)   NOT NULL DEFAULT 0,
  is_auto_dismantle TINYINT(1)   NOT NULL DEFAULT 0,
  mitra_id          BIGINT UNSIGNED,
  released_at       DATETIME,
  picked_up_at      DATETIME,
  completed_at      DATETIME,
  created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_wo_status  (status),
  INDEX idx_wo_tipe    (tipe),
  INDEX idx_wo_tanggal (tanggal),
  INDEX idx_wo_mitra   (mitra_id)
) ENGINE=InnoDB;

-- ── 7. WO PHOTOS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wo_photos (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  wo_id        VARCHAR(30) NOT NULL,
  step         VARCHAR(30),
  `key`        VARCHAR(50),
  label        VARCHAR(150),
  photo_base64 MEDIUMTEXT,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_wophotos_wo (wo_id)
) ENGINE=InnoDB;

-- ── 8. ABSENSI ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS absensi (
  id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nama                  VARCHAR(150) NOT NULL,
  username              VARCHAR(100),
  role                  VARCHAR(50),
  shift                 VARCHAR(20),
  schedule_id           BIGINT UNSIGNED,
  status_kehadiran      VARCHAR(30),
  mnt_terlambat         INT NOT NULL DEFAULT 0,
  alasan_keterlambatan  TEXT,
  jam_masuk_aktual      DATETIME,
  timezone              VARCHAR(50) NOT NULL DEFAULT 'Asia/Jakarta',
  point                 DECIMAL(5,2) NOT NULL DEFAULT 0,
  lat                   DOUBLE,
  lng                   DOUBLE,
  tanggal               DATE NOT NULL,
  created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_absensi_username (username),
  INDEX idx_absensi_tanggal  (tanggal)
) ENGINE=InnoDB;

-- ── 9. PERANGKAT ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS perangkat (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sn           VARCHAR(100) NOT NULL UNIQUE,
  merk         VARCHAR(100),
  jenis        VARCHAR(100),
  kondisi      VARCHAR(50),
  status       VARCHAR(50) NOT NULL DEFAULT 'Gudang',
  lokasi       VARCHAR(150),
  panjang_awal DECIMAL(10,2),
  panjang_sisa DECIMAL(10,2),
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ── 10. PERANGKAT TEKNISI ────────────────────────────────────
CREATE TABLE IF NOT EXISTS perangkat_teknisi (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sn          VARCHAR(100) NOT NULL,
  teknisi     VARCHAR(150),
  wo_id       VARCHAR(30),
  status      VARCHAR(50),
  keterangan  TEXT,
  panjang_pakai DECIMAL(10,2),
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_pt_sn      (sn),
  INDEX idx_pt_teknisi (teknisi),
  INDEX idx_pt_wo      (wo_id)
) ENGINE=InnoDB;

-- ── 11. DEVICE HISTORY ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS device_history (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sn         VARCHAR(100) NOT NULL,
  dari       VARCHAR(150),
  ke         VARCHAR(150),
  aksi       VARCHAR(100),
  keterangan TEXT,
  wo_id      VARCHAR(30),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_dh_sn (sn)
) ENGINE=InnoDB;

-- ── 12. PICKUP REQUESTS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS pickup_requests (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  wo_id       VARCHAR(30),
  teknisi     VARCHAR(150),
  sn          VARCHAR(100),
  jenis       VARCHAR(100),
  merk        VARCHAR(100),
  status      VARCHAR(30) NOT NULL DEFAULT 'WAITING',
  keterangan  TEXT,
  approved_by VARCHAR(150),
  approved_at DATETIME,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_pr_wo      (wo_id),
  INDEX idx_pr_teknisi (teknisi),
  INDEX idx_pr_status  (status)
) ENGINE=InnoDB;

-- ── 13. MATERIAL REQUESTS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS material_requests (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  batch_id     VARCHAR(50),
  wo_id        VARCHAR(30),
  teknisi      VARCHAR(150),
  sn           VARCHAR(100),
  jenis        VARCHAR(100),
  dari         VARCHAR(150),
  ke           VARCHAR(150),
  panjang      DECIMAL(10,2),
  status       VARCHAR(30) NOT NULL DEFAULT 'WAITING',
  approved_by  VARCHAR(150),
  approved_at  DATETIME,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_mr_wo      (wo_id),
  INDEX idx_mr_teknisi (teknisi),
  INDEX idx_mr_status  (status),
  INDEX idx_mr_batch   (batch_id)
) ENGINE=InnoDB;

-- ── 14. PROVISIONING REQUESTS ────────────────────────────────
CREATE TABLE IF NOT EXISTS provisioning_requests (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  wo_id       VARCHAR(30),
  tipe        VARCHAR(50),
  pelanggan   VARCHAR(200),
  alamat      TEXT,
  koordinat   VARCHAR(100),
  username_pppoe VARCHAR(100),
  password_pppoe VARCHAR(100),
  status_koneksi VARCHAR(50),
  status      VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  noc_name    VARCHAR(150),
  done_at     DATETIME,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_prov_wo     (wo_id),
  INDEX idx_prov_status (status)
) ENGINE=InnoDB;

-- ── 15. TIKET DISMANTLE ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS tiket_dismantle (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  wo_id           VARCHAR(30),
  pelanggan       VARCHAR(200),
  alamat          TEXT,
  koordinat       VARCHAR(100),
  teknisi         VARCHAR(150),
  status          VARCHAR(30) NOT NULL DEFAULT 'OPEN',
  catatan         TEXT,
  noc_name        VARCHAR(150),
  checked_at      DATETIME,
  completed_at    DATETIME,
  is_auto         TINYINT(1) NOT NULL DEFAULT 0,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_td_wo     (wo_id),
  INDEX idx_td_status (status)
) ENGINE=InnoDB;

-- ── 16. DISMANTLE ITEMS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS dismantle_items (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  dismantle_id  BIGINT UNSIGNED NOT NULL,
  sn            VARCHAR(100),
  jenis         VARCHAR(100),
  kondisi       VARCHAR(50),
  panjang       DECIMAL(10,2),
  keterangan    TEXT,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (dismantle_id) REFERENCES tiket_dismantle(id) ON DELETE CASCADE,
  INDEX idx_di_dismantle (dismantle_id)
) ENGINE=InnoDB;

-- ── 17. PELANGGAN ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pelanggan (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nama           VARCHAR(200) NOT NULL,
  no_hp          VARCHAR(30),
  alamat         TEXT,
  koordinat      VARCHAR(100),
  no_layanan     VARCHAR(100),
  username_pppoe VARCHAR(100),
  paket          VARCHAR(100),
  status         VARCHAR(30) NOT NULL DEFAULT 'aktif',
  mitra_id       BIGINT UNSIGNED,
  wo_id          VARCHAR(30),
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_pel_nama      (nama),
  INDEX idx_pel_layanan   (no_layanan)
) ENGINE=InnoDB;

-- ── 18. PEMBAYARAN ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pembayaran (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  pelanggan_id BIGINT UNSIGNED NOT NULL,
  jumlah       DECIMAL(15,2),
  bulan        TINYINT UNSIGNED,
  tahun        SMALLINT UNSIGNED,
  status       VARCHAR(20) NOT NULL DEFAULT 'lunas',
  keterangan   TEXT,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pelanggan_id) REFERENCES pelanggan(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── 19. MITRA INVOICES ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS mitra_invoices (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  mitra_id   BIGINT UNSIGNED NOT NULL,
  bulan      TINYINT UNSIGNED,
  tahun      SMALLINT UNSIGNED,
  total      DECIMAL(15,2),
  status     VARCHAR(20) NOT NULL DEFAULT 'unpaid',
  keterangan TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (mitra_id) REFERENCES mitra(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── 20. MITRA BAPS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mitra_baps (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  mitra_id   BIGINT UNSIGNED NOT NULL,
  wo_id      VARCHAR(30),
  nominal    DECIMAL(15,2),
  keterangan TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (mitra_id) REFERENCES mitra(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── 21. BAPS CONFIG ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS baps_config (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  kode       VARCHAR(50) NOT NULL UNIQUE,
  label      VARCHAR(150),
  nilai      DECIMAL(15,2),
  keterangan TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ── 22. ATTENDANCE WORK TIME CONFIGS ─────────────────────────
CREATE TABLE IF NOT EXISTS attendance_work_time_configs (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  shift        VARCHAR(20) NOT NULL UNIQUE,
  jam_masuk    VARCHAR(10),
  jam_keluar   VARCHAR(10),
  toleransi    INT NOT NULL DEFAULT 0,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ── 23. ATTENDANCE SCHEDULE PERIODS ─────────────────────────
CREATE TABLE IF NOT EXISTS attendance_schedule_periods (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  bulan      TINYINT UNSIGNED NOT NULL,
  tahun      SMALLINT UNSIGNED NOT NULL,
  keterangan TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_period (bulan, tahun)
) ENGINE=InnoDB;

-- ── 24. ATTENDANCE SCHEDULE ROWS ─────────────────────────────
CREATE TABLE IF NOT EXISTS attendance_schedule_rows (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  period_id   BIGINT UNSIGNED NOT NULL,
  username    VARCHAR(100) NOT NULL,
  tanggal     DATE NOT NULL,
  shift       VARCHAR(20),
  keterangan  TEXT,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (period_id) REFERENCES attendance_schedule_periods(id) ON DELETE CASCADE,
  UNIQUE KEY uq_schedule_row (period_id, username, tanggal),
  INDEX idx_asr_username (username),
  INDEX idx_asr_tanggal  (tanggal)
) ENGINE=InnoDB;

-- ── 25. ATTENDANCE SHIFT SWAP REQUESTS ───────────────────────
CREATE TABLE IF NOT EXISTS attendance_shift_swap_requests (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  requester     VARCHAR(100) NOT NULL,
  target        VARCHAR(100) NOT NULL,
  tanggal_dari  DATE NOT NULL,
  tanggal_ke    DATE NOT NULL,
  shift_dari    VARCHAR(20),
  shift_ke      VARCHAR(20),
  alasan        TEXT,
  status        VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  approved_by   VARCHAR(100),
  approved_at   DATETIME,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_swap_requester (requester),
  INDEX idx_swap_status    (status)
) ENGINE=InnoDB;

-- ── 26. ATTENDANCE REMINDER LOG ──────────────────────────────
CREATE TABLE IF NOT EXISTS attendance_reminder_log (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username   VARCHAR(100) NOT NULL,
  tanggal    DATE NOT NULL,
  jenis      VARCHAR(50),
  sent_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_reminder (username, tanggal, jenis)
) ENGINE=InnoDB;

-- ── 27. PUSH SUBSCRIPTIONS ───────────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username   VARCHAR(100) NOT NULL,
  role       VARCHAR(50),
  endpoint   TEXT NOT NULL,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  user_agent TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_push_endpoint (endpoint(500)),
  INDEX idx_push_username (username),
  INDEX idx_push_role     (role)
) ENGINE=InnoDB;
