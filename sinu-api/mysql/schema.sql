-- ============================================================
-- MySQL Database Schema for SINU OPS SYSTEM
-- Migration dari Supabase ke MySQL
-- ============================================================

-- Buat database (jalankan di luar schema ini)
-- CREATE DATABASE IF NOT EXISTS sinu_ops CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE sinu_ops;

-- ============================================================
-- TABLE: akun
-- Fungsi: Login user (username, password, role, display_name)
-- ============================================================
CREATE TABLE IF NOT EXISTS akun (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'teknisi',
  display_name VARCHAR(255),
  division VARCHAR(255),
  avatar VARCHAR(255),
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_username (username),
  INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: karyawan
-- Fungsi: Data karyawan (nama, role, avatar)
-- ============================================================
CREATE TABLE IF NOT EXISTS karyawan (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama VARCHAR(255) NOT NULL,
  role VARCHAR(50),
  avatar VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_nama (nama)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: absensi
-- Fungsi: Rekap absensi harian
-- ============================================================
CREATE TABLE IF NOT EXISTS absensi (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama VARCHAR(255) NOT NULL,
  role VARCHAR(50),
  shift VARCHAR(50),
  status_kehadiran VARCHAR(50),
  mnt_terlambat INT DEFAULT 0,
  point INT DEFAULT 0,
  lat DECIMAL(10, 8),
  lng DECIMAL(11, 8),
  tanggal DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_nama (nama),
  INDEX idx_tanggal (tanggal),
  INDEX idx_status (status_kehadiran),
  INDEX idx_tanggal_nama (tanggal, nama)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: odp
-- Fungsi: Data ODP (lokasi, kapasitas, terisi, lat, lng)
-- ============================================================
CREATE TABLE IF NOT EXISTS odp (
  id INT AUTO_INCREMENT PRIMARY KEY,
  odp_id VARCHAR(100) NOT NULL UNIQUE,
  lokasi TEXT,
  kapasitas INT DEFAULT 0,
  terisi INT DEFAULT 0,
  lat DECIMAL(10, 8),
  lng DECIMAL(11, 8),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_odp_id (odp_id),
  INDEX idx_lokasi (lokasi(255))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: work_orders
-- Fungsi: Semua tiket WO (status, tipe, pelanggan, dll)
-- ============================================================
CREATE TABLE IF NOT EXISTS work_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  wo_id VARCHAR(100) NOT NULL UNIQUE,
  pelanggan VARCHAR(255) NOT NULL,
  tipe VARCHAR(100) NOT NULL,
  cs_name VARCHAR(255),
  teknisi TEXT,
  teknisi_1 VARCHAR(255),
  teknisi_2 VARCHAR(255),
  t1 DATETIME,
  t2 DATETIME,
  t4 DATETIME,
  released_at DATETIME,
  picked_up_at DATETIME,
  completed_at DATETIME,
  status VARCHAR(50) DEFAULT 'RELEASE',
  bulan INT,
  tahun INT,
  alamat TEXT,
  
  -- Extra fields untuk INSTALASI
  registrasi DECIMAL(15, 2),
  paket DECIMAL(15, 2),
  nama_paket VARCHAR(255),
  marketing VARCHAR(255),
  username_pppoe VARCHAR(255),
  password_pppoe VARCHAR(255),
  status_koneksi VARCHAR(50),
  nohp VARCHAR(20),
  koordinat VARCHAR(255),
  
  -- Extra fields untuk INSTALASI_RESELLER
  registrasi_reseller DECIMAL(15, 2),
  paket_voucher DECIMAL(15, 2),
  
  -- Extra fields untuk PERLUASAN_RESELLER
  nama_reseller VARCHAR(255),
  jumlah_titik INT,
  
  -- Extra fields untuk MAINTENANCE
  kendala TEXT,
  
  -- NOC specific
  noc_name VARCHAR(255),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_wo_id (wo_id),
  INDEX idx_status (status),
  INDEX idx_tipe (tipe),
  INDEX idx_bulan_tahun (bulan, tahun),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: perangkat
-- Fungsi: Inventaris perangkat di gudang
-- ============================================================
CREATE TABLE IF NOT EXISTS perangkat (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sn VARCHAR(255) NOT NULL UNIQUE,
  jenis VARCHAR(255),
  kondisi VARCHAR(50) DEFAULT 'Baru',
  lokasi_gudang VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_sn (sn),
  INDEX idx_jenis (jenis)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: perangkat_teknisi
-- Fungsi: Perangkat yang sedang di tangan teknisi
-- ============================================================
CREATE TABLE IF NOT EXISTS perangkat_teknisi (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sn VARCHAR(255) NOT NULL,
  jenis VARCHAR(255),
  kondisi VARCHAR(50),
  teknisi_name VARCHAR(255) NOT NULL,
  panjang_awal DECIMAL(10, 2),
  panjang_sisa DECIMAL(10, 2),
  status VARCHAR(50) DEFAULT 'READY',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_sn (sn),
  INDEX idx_teknisi (teknisi_name),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: device_history
-- Fungsi: Riwayat perpindahan perangkat
-- ============================================================
CREATE TABLE IF NOT EXISTS device_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sn VARCHAR(255) NOT NULL,
  teknisi_name VARCHAR(255),
  from_location VARCHAR(255),
  to_location VARCHAR(255),
  action VARCHAR(100),
  timestamp DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sn (sn),
  INDEX idx_teknisi (teknisi_name),
  INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: pickup_requests
-- Fungsi: Request pickup material dari teknisi
-- ============================================================
CREATE TABLE IF NOT EXISTS pickup_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  teknisi_name VARCHAR(255) NOT NULL,
  sn VARCHAR(255) NOT NULL,
  jenis VARCHAR(255),
  meter_dari DECIMAL(10, 2),
  meter_sampai DECIMAL(10, 2),
  status VARCHAR(50) DEFAULT 'WAITING',
  admin_name VARCHAR(255),
  approved_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_teknisi (teknisi_name),
  INDEX idx_sn (sn),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: material_requests
-- Fungsi: Request send/return perangkat
-- ============================================================
CREATE TABLE IF NOT EXISTS material_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  teknisi_name VARCHAR(255) NOT NULL,
  sn VARCHAR(255) NOT NULL,
  jenis VARCHAR(255),
  request_type VARCHAR(50), -- SEND or RETURN
  status VARCHAR(50) DEFAULT 'WAITING',
  admin_name VARCHAR(255),
  approved_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_teknisi (teknisi_name),
  INDEX idx_sn (sn),
  INDEX idx_status (status),
  INDEX idx_request_type (request_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: provisioning_requests
-- Fungsi: Antrian registrasi provisioning
-- ============================================================
CREATE TABLE IF NOT EXISTS provisioning_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  wo_id VARCHAR(100) NOT NULL,
  teknisi_name VARCHAR(255),
  status VARCHAR(50) DEFAULT 'PENDING',
  admin_name VARCHAR(255),
  processed_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_wo_id (wo_id),
  INDEX idx_status (status),
  INDEX idx_teknisi (teknisi_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: wo_photos
-- Fungsi: Foto dokumentasi WO (base64 / URL storage)
-- ============================================================
CREATE TABLE IF NOT EXISTS wo_photos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  wo_id VARCHAR(100) NOT NULL,
  filename VARCHAR(255) NOT NULL,
  data TEXT, -- base64 atau URL
  type VARCHAR(50), -- photo, video, document
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_wo_id (wo_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: push_subscriptions
-- Fungsi: Penyimpanan subscription perangkat untuk Web Push
-- ============================================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) NOT NULL,
  role VARCHAR(50),
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_username (username),
  INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- SAMPLE DATA (optional - for testing)
-- ============================================================

-- Insert sample user (admin)
-- Password: admin123 (plain text, same as Supabase)
INSERT INTO akun (username, password, role, display_name) 
VALUES ('admin', 'admin123', 'supervisor', 'Administrator')
ON DUPLICATE KEY UPDATE username=username;

-- Insert sample employee
INSERT INTO karyawan (nama, role, avatar) 
VALUES ('John Doe', 'teknisi', 'JO')
ON DUPLICATE KEY UPDATE nama=nama;
