# MySQL Database Editing Guide - SINU OPS SYSTEM

**Versi:** 2.0  
**Last Updated:** September 2026

---

## 📋 Daftar Isi

1. [Overview](#overview)
2. [Cara Mengakses MySQL](#cara-mengakses-mysql)
3. [Melihat Struktur Tabel](#melihat-struktur-tabel)
4. [Menambah Kolom Baru](#menambah-kolom-baru)
5. [Menghapus Kolom](#menghapus-kolom)
6. [Mengedit Data](#mengedit-data)
7. [Backup & Restore](#backup--restore)
8. [Common SQL Commands](#common-sql-commands)

---

## Overview

SINU OPS SYSTEM menggunakan MySQL database dengan nama `sinu_ops` dan user `sinu_user`.

**Kredensial Default:**
```
Host: localhost
Port: 3306
User: sinu_user
Password: sinu_password
Database: sinu_ops
```

---

## Cara Mengakses MySQL

### 1. Login via Terminal
```bash
# Sebagai root
sudo mysql

# Sebagai user biasa
mysql -u sinu_user -psinu_password sinu_ops

# Atau tanpa password prompt
MYSQL_PWD=sinu_password mysql -u sinu_user sinu_ops
```

### 2. Login via GUI Tools

**phpMyAdmin:**
```bash
sudo apt install phpmyadmin
```
Akses: `http://localhost/phpmyadmin`

**DBeaver / MySQL Workbench:**
- Host: localhost
- Port: 3306
- User: sinu_user
- Password: sinu_password
- Database: sinu_ops

---

## Melihat Struktur Tabel

### Lihat Semua Tabel
```sql
SHOW TABLES;
```

### Lihat Struktur Tabel
```sql
-- Cara 1
DESCRIBE work_orders;

-- Cara 2
DESC work_orders;

-- Cara 3 (detail)
SHOW CREATE TABLE work_orders;

-- Cara 4 (info lengkap)
SHOW TABLE STATUS LIKE 'work_orders';
```

### Lihat Index
```sql
SHOW INDEX FROM work_orders;
```

### Lihat Kolom Tertentu
```sql
DESCRIBE work_orders WHERE Field = 'status';
```

---

## Menambah Kolom Baru

### Syntax Umum
```sql
ALTER TABLE nama_tabel
ADD COLUMN nama_kolom tipe_data [Atribut];
```

### Contoh Praktis

#### 1. Tambah kolom baru di akhir tabel
```sql
ALTER TABLE work_orders
ADD COLUMN keterangan TEXT;
```

#### 2. Tambah kolom di posisi tertentu (setelah kolom lain)
```sql
ALTER TABLE work_orders
ADD COLUMN priority VARCHAR(20) AFTER status;
```

#### 3. Tambah kolom di posisi pertama
```sql
ALTER TABLE work_orders
ADD COLUMN no_urut INT FIRST;
```

#### 4. Tambah kolom dengan default value
```sql
ALTER TABLE work_orders
ADD COLUMN status_priority VARCHAR(50) DEFAULT 'normal';
```

#### 5. Tambah kolom NOT NULL dengan default
```sql
ALTER TABLE work_orders
ADD COLUMN urgency VARCHAR(50) NOT NULL DEFAULT 'biasa';
```

### Tipe Data MySQL yang Sering Digunakan
| Tipe | Keterangan | Contoh |
|------|------------|--------|
| INT | Bilangan bulat | `INT(11)` |
| VARCHAR(n) | Teks maksimal n karakter | `VARCHAR(255)` |
| TEXT | Teks panjang | `TEXT` |
| DECIMAL(m,d) | Angka desimal | `DECIMAL(15,2)` |
| DATE | Tanggal | `DATE` |
| DATETIME | Tanggal + waktu | `DATETIME` |
| TIMESTAMP | Timestamp otomatis | `TIMESTAMP` |
| BOOLEAN | Boolean (TINYINT(1)) | `BOOLEAN` |
| DECIMAL | Angka presisi | `DECIMAL(10,2)` |

---

## Menghapus Kolom

### Syntax
```sql
ALTER TABLE nama_tabel
DROP COLUMN nama_kolom;
```

### Contoh
```sql
-- Hapus kolom keterangan
ALTER TABLE work_orders
DROP COLUMN keterangan;

-- Hapus kolom priority
ALTER TABLE work_orders
DROP COLUMN priority;
```

**PERINGATAN:** Data dalam kolom yang dihapus akan hilang permanen!

---

## Mengedit Data

### UPDATE - Edit Data yang Ada

#### Syntax
```sql
UPDATE nama_tabel
SET kolom1 = value1, kolom2 = value2
WHERE kondisi;
```

#### Contoh Praktis

**1. Update status work order**
```sql
UPDATE work_orders
SET status = 'COMPLETED', t4 = NOW()
WHERE wo_id = 'WO-2026-001';
```

**2. Update password user**
```sql
UPDATE akun
SET password = 'password_baru'
WHERE username = 'admin';
```

**3. Update banyak kolom sekaligus**
```sql
UPDATE work_orders
SET 
  status = 'COMPLETED',
  completed_at = NOW(),
  t4 = NOW()
WHERE wo_id = 'WO-2026-001';
```

**4. Update dengan kondisi range**
```sql
UPDATE work_orders
SET status = 'CANCELLED'
WHERE status = 'RELEASE' AND created_at < '2026-01-01';
```

### INSERT - Tambah Data Baru

#### Syntax
```sql
INSERT INTO nama_tabel (kolom1, kolom2, ...)
VALUES (value1, value2, ...);
```

#### Contoh

**1. Insert satu baris**
```sql
INSERT INTO karyawan (nama, role, avatar)
VALUES ('Budi Santoso', 'teknisi', 'BS');
```

**2. Insert banyak baris sekaligus**
```sql
INSERT INTO karyawan (nama, role, avatar)
VALUES 
  ('Ana Wati', 'teknisi', 'AW'),
  ('Candra', 'teknisi', 'CA'),
  ('Dewi', 'supervisor', 'DE');
```

**3. Insert dengan kolom spesifik**
```sql
INSERT INTO odp (odp_id, lokasi, kapasitas, terisi)
VALUES ('ODP-002', 'Gedung B', 144, 30);
```

### DELETE - Hapus Data

#### Syntax
```sql
DELETE FROM nama_tabel
WHERE kondisi;
```

#### Contoh

**1. Hapus satu record**
```sql
DELETE FROM karyawan
WHERE nama = 'Budi Santoso';
```

**2. Hapus dengan kondisi**
```sql
DELETE FROM work_orders
WHERE status = 'CANCELLED' AND created_at < '2026-01-01';
```

**3. Hapus semua data (HATI-HATI!)**
```sql
DELETE FROM karyawan;
-- atau
TRUNCATE TABLE karyawan;
```

**PERINGATAN:** `TRUNCATE` lebih cepat tapi tidak bisa di-rollback. `DELETE` dengan `WHERE` bisa di-rollback jika ada transaksi.

---

## Backup & Restore

### Backup Database

#### 1. Backup dengan mysqldump
```bash
# Backup semua database
mysqldump -u sinu_user -psinu_password --all-databases > backup_all.sql

# Backup database sinu_ops saja
mysqldump -u sinu_user -psinu_password sinu_ops > backup_sinu_ops.sql

# Backup single tabel
mysqldump -u sinu_user -psinu_password sinu_ops work_orders > backup_work_orders.sql

# Backup dengan gzip compression
mysqldump -u sinu_user -psinu_password sinu_ops | gzip > backup_sinu_ops.sql.gz
```

#### 2. Backup via MySQL (internal)
```sql
-- Lock tables untuk consistency
FLUSH TABLES WITH READ LOCK;

-- Backup file
-- (Copy file .ibd dan .frm dari /var/lib/mysql/sinu_ops/)

-- Unlock tables
UNLOCK TABLES;
```

### Restore Database

#### 1. Restore dengan mysql
```bash
# Restore database (harus sudah ada)
mysql -u sinu_user -psinu_password sinu_ops < backup_sinu_ops.sql

# Atau create database dulu
mysql -u sinu_user -psinu_password < backup_sinu_ops.sql
```

#### 2. Restore dengan mysqlimport
```bash
mysqlimport -u sinu_user -psinu_password sinu_ops backup_sinu_ops.sql
```

### Schedule Backup Otomatis

Tambahkan ke crontab:
```bash
crontab -e
```

Tambahkan baris:
```bash
# Backup harian jam 2 pagi
0 2 * * * mysqldump -u sinu_user -psinu_password sinu_ops | gzip > /backup/sinu_ops_$(date +\%Y\%m\%d).sql.gz

# Cleanup backup yang lama (7 hari)
0 3 * * * find /backup -name "sinu_ops_*.sql.gz" -mtime +7 -delete
```

Buat folder backup:
```bash
mkdir -p /backup
chmod 700 /backup
```

---

## Common SQL Commands

### Viewing Data
```sql
-- Lihat semua data
SELECT * FROM nama_tabel;

-- Lihat dengan kondisi
SELECT * FROM work_orders WHERE status = 'RELEASE';

-- Lihat dengan limit
SELECT * FROM work_orders LIMIT 10;

-- Lihat dengan offset (pagination)
SELECT * FROM work_orders LIMIT 10 OFFSET 20;

-- Lihat kolom tertentu
SELECT wo_id, pelanggan, status FROM work_orders;

-- Lihat dengan sort
SELECT * FROM work_orders ORDER BY created_at DESC;

-- Lihat dengan grup
SELECT tipe, COUNT(*) as jumlah FROM work_orders GROUP BY tipe;
```

### Count & Aggregation
```sql
-- Hitung jumlah baris
SELECT COUNT(*) FROM work_orders;

-- Hitung dengan kondisi
SELECT COUNT(*) FROM work_orders WHERE status = 'RELEASE';

-- Rata-rata
SELECT AVG(mnt_terlambat) FROM absensi;

-- Total
SELECT SUM(mnt_terlambat) FROM absensi;

-- Max/Min
SELECT MAX(point) FROM absensi;
SELECT MIN(point) FROM absensi;
```

### String Functions
```sql
-- Cari yang mengandung kata
SELECT * FROM work_orders WHERE pelanggan LIKE '%PT%';

-- Cari yang dimulai dengan
SELECT * FROM work_orders WHERE pelanggan LIKE 'PT%';

-- Cari yang diakhiri dengan
SELECT * FROM work_orders WHERE pelanggan LIKE '%Indah';

-- Replace string
UPDATE work_orders SET pelanggan = REPLACE(pelanggan, 'PT.', 'PT');

-- Upper/Lower
SELECT UPPER(pelanggan) FROM work_orders;
SELECT LOWER(pelanggan) FROM work_orders;

-- Length
SELECT pelanggan, LENGTH(pelanggan) as panjang FROM work_orders;
```

### Date Functions
```sql
-- Hari ini
SELECT CURDATE();
SELECT NOW();

-- Filter tanggal
SELECT * FROM work_orders WHERE created_at >= CURDATE();

-- Filter bulan ini
SELECT * FROM work_orders 
WHERE created_at >= DATE_FORMAT(NOW(), '%Y-%m-01');

-- Tambah hari
SELECT DATE_ADD(NOW(), INTERVAL 7 DAY);

-- Selisih hari
SELECT DATEDIFF('2026-09-30', '2026-09-15') as selisih_hari;
```

### Joins (untuk data yang terkait)
```sql
-- Join work_orders dengan karyawan
SELECT wo.*, k.nama as teknisi_nama
FROM work_orders wo
LEFT JOIN karyawan k ON wo.teknisi_1 = k.nama;

-- Join dengan multiple tables
SELECT wo.wo_id, k.nama, o.lokasi
FROM work_orders wo
LEFT JOIN karyawan k ON wo.teknisi_1 = k.nama
LEFT JOIN odp o ON wo.koordinat = o.lokasi;
```

---

## Best Practices

### 1. Selalu Backup Sebelum Edit
```bash
mysqldump -u sinu_user -psinu_password sinu_ops > backup_before_edit.sql
```

### 2. Gunakan Transaksi untuk Update Banyak Data
```sql
START TRANSACTION;

UPDATE work_orders SET status = 'ARCHIVED' WHERE status = 'COMPLETED';
UPDATE karyawan SET role = 'inactive' WHERE nama IN ('Budi', 'Ana');

COMMIT;
-- ROLLBACK;  -- jika ada error
```

### 3. Jangan Edit Password Langsung (untuk production)
Untuk password yang lebih aman, gunakan hashing:
```sql
-- Untuk MySQL 8+
UPDATE akun SET password = SHA2('password_baru', 256) WHERE username = 'admin';
```

### 4. Gunakan WHERE yang Spesifik
```sql
-- ✅ BETUL
UPDATE work_orders SET status = 'COMPLETED' WHERE wo_id = 'WO-2026-001';

-- ❌ SALAH (akan update semua baris!)
UPDATE work_orders SET status = 'COMPLETED';
```

### 5. Test di Environment Development Dulu
Jangan langsung eksekusi query yang berpotensi merusak di production.

### 6. Gunakan Column Types yang Tepat
- Gunakan `INT` untuk ID
- Gunakan `VARCHAR(n)` untuk teks pendek (sesuai kebutuhan)
- Gunakan `TEXT` untuk teks panjang
- Gunakan `DECIMAL(m,d)` untuk uang
- Gunakan `DATETIME` untuk timestamp

---

## Troubleshooting

### Error: Access Denied
```sql
-- Cek privilege
SHOW GRANTS FOR 'sinu_user'@'localhost';

-- Grant privilege jika perlu
GRANT ALL PRIVILEGES ON sinu_ops.* TO 'sinu_user'@'localhost';
FLUSH PRIVILEGES;
```

### Error: Table doesn't exist
```sql
-- Cek tabel yang ada
SHOW TABLES;

-- Cek database yang sedang digunakan
SELECT DATABASE();

-- Pilih database
USE sinu_ops;
```

### Error: Duplicate Entry
```sql
-- Cek data yang sudah ada
SELECT * FROM nama_tabel WHERE kolom = 'value';

-- Update atau delete dulu yang existing
```

### Query Slow
```sql
-- Cek query plan
EXPLAIN SELECT * FROM work_orders WHERE status = 'RELEASE';

-- Tambah index jika perlu
ALTER TABLE work_orders ADD INDEX idx_status (status);
```

---

## Kontak & Dukungan

Jika ada pertanyaan atau masalah, hubungi:
- **Email:** support@sinu.co.id
- **Developer:** sinu@admin
