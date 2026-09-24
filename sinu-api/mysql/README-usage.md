# SINU OPS SYSTEM - Usage Guide

**Versi:** 2.0  
**Last Updated:** September 2026  
**Status:** Fully Operational

---

## 📋 Daftar Isi

1. [Pengenalan](#pengenalan)
2. [Akses ke Sistem](#akses-ke-sistem)
3. [API Endpoints](#api-endpoints)
4. [Contoh Penggunaan](#contoh-penggunaan)
5. [Manajemen Server](#manajemen-server)
6. [Troubleshooting](#troubleshooting)

---

## Pengenalan

SINU OPS SYSTEM adalah aplikasi untuk manajemen operasi ISP dengan fitur:
- **Work Orders** - Manajemen tiket instalasi, perluasan, maintenance
- **Absensi** - Rekap absensi harian teknisi
- **ODP Management** - Monitoring inventaris ODP
- **Material** - Tracking perangkat dan kabel teknisi
- **User Management** - Login dan role-based access

Database: MySQL (lokal)  
Backend: Node.js + Express.js  
Frontend: HTML/CSS/JavaScript

---

## Akses ke Sistem

### 1. Start MySQL API Server

```bash
cd "/home/sinu/CONTOH APK/Deploy netifly"
node mysql/server.js
```

Output yang diharapkan:
```
MySQL connected successfully
MySQL API Server running on port 3000
Health check: http://localhost:3000/health
```

### 2. Buka Aplikasi

Buka browser: `http://localhost:3000`

### 3. Login

Gunakan kredensial admin default:

| Field | Value |
|-------|-------|
| Username | `admin` |
| Password | `admin123` |

---

## API Endpoints

### Authentication

#### POST `/api/login`
Login ke sistem.

**Request:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response (Success):**
```json
{
  "success": true,
  "user": {
    "username": "admin",
    "role": "supervisor",
    "displayName": "Administrator",
    "avatar": "AD"
  }
}
```

---

### Work Orders

#### GET `/api/work-orders`
List semua work orders.

**Query Parameters:**
- `status` - Filter by status (e.g., RELEASE, COMPLETED)
- `tipe` - Filter by type (e.g., INSTALASI, MAINTENANCE)
- `bulan` - Filter by month
- `tahun` - Filter by year

**Example:**
```
GET /api/work-orders?status=RELEASE&tipe=INSTALASI
```

#### POST `/api/work-orders`
Create work order baru.

**Request:**
```json
{
  "wo_id": "WO-2026-001",
  "pelanggan": "PT. Customer Indah",
  "tipe": "INSTALASI",
  "cs_name": "CS - Jane",
  "teknisi_1": "John Doe",
  "teknisi_2": "Bob Smith",
  "t1": "2026-09-15T08:00:00",
  "t2": "2026-09-15T09:30:00",
  "status": "RELEASE",
  "bulan": 9,
  "tahun": 2026,
  "alamat": "Jl. Merdeka No. 123",
  "registrasi": 500000,
  "paket": 150000,
  "nama_paket": "Business Plus",
  "marketing": "Marketing A",
  "username_pppoe": "cp_001",
  "password_pppoe": "pass123",
  "status_koneksi": "Rumahan",
  "nohp": "081234567890",
  "koordinat": "-6.200000,106.816666"
}
```

#### PUT `/api/work-orders/:id/status`
Update status work order.

**Request:**
```json
{
  "status": "COMPLETED",
  "t4": "2026-09-15T14:00:00"
}
```

---

### Attendance (Absensi)

#### POST `/api/attendance`
Simpan data absensi.

**Request:**
```json
{
  "nama": "John Doe",
  "role": "teknisi",
  "shift": "Morning",
  "status_kehadiran": "Hadir",
  "mnt_terlambat": 0,
  "point": 100,
  "lat": -6.200000,
  "lng": 106.816666,
  "tanggal": "2026-09-15"
}
```

---

### ODP

#### GET `/api/odp`
List semua ODP.

#### POST `/api/odp`
Create/Update ODP.

**Request:**
```json
{
  "id": "ODP-001",
  "lokasi": "Gedung A Lantai 2",
  "kapasitas": 144,
  "terisi": 45,
  "lat": -6.200000,
  "lng": 106.816666
}
```

---

### Materials

#### GET `/api/materials`
List semua material di gudang.

#### GET `/api/materials/teknisi/:teknisi`
List material teknisi tertentu.

#### POST `/api/materials`
Create material baru.

**Request:**
```json
{
  "sn": "ONT-12345",
  "jenis": "ONT",
  "kondisi": "Baru",
  "lokasi_gudang": "Gudang A"
}
```

---

### Pickup Requests

#### POST `/api/pickup-requests`
Buat pickup request.

**Request:**
```json
{
  "teknisi_name": "John Doe",
  "sn": "ONT-12345",
  "jenis": "ONT",
  "meter_dari": 100,
  "meter_sampai": 150
}
```

---

## Contoh Penggunaan

### 1. Login via cURL
```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### 2. Create Work Order
```bash
curl -X POST http://localhost:3000/api/work-orders \
  -H "Content-Type: application/json" \
  -d @work_order.json
```

### 3. List Work Orders
```bash
curl http://localhost:3000/api/work-orders
```

### 4. Update Status WO
```bash
curl -X PUT http://localhost:3000/api/work-orders/WO-2026-001/status \
  -H "Content-Type: application/json" \
  -d '{"status":"COMPLETED","t4":"2026-09-15T14:00:00"}'
```

### 5. Save Attendance
```bash
curl -X POST http://localhost:3000/api/attendance \
  -H "Content-Type: application/json" \
  -d @attendance.json
```

---

## Manajemen Server

### Start Server
```bash
cd "/home/sinu/CONTOH APK/Deploy netifly"
node mysql/server.js
```

### Stop Server
```bash
pkill -f "node mysql/server.js"
```

### Run dengan PM2 (Recommended untuk Production)
```bash
# Install PM2
npm install -g pm2

# Start dengan PM2
pm2 start mysql/server.js --name sinu-api

# Cek status
pm2 status

# Restart
pm2 restart sinu-api

# Stop
pm2 stop sinu-api

# Log
pm2 logs sinu-api
```

### Run dengan Systemd
```bash
sudo nano /etc/systemd/system/sinu-api.service
```

Paste config:
```ini
[Unit]
Description=SINU OPS API Server
After=network.target mysql.service

[Service]
Type=simple
User=sinu
WorkingDirectory=/home/sinu/CONTOH APK/Deploy netifly
ExecStart=/usr/bin/node mysql/server.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable sinu-api
sudo systemctl start sinu-api
sudo systemctl status sinu-api
```

---

## Troubleshooting

### Server tidak bisa start
```bash
# Cek apakah port 3000 sudah dipakai
sudo lsof -i :3000

# Cek log error
tail -f mysql/server.log
```

### MySQL connection failed
```bash
# Cek MySQL service
sudo systemctl status mysql

# Test koneksi
mysql -u sinu_user -psinu_password sinu_ops -e "SELECT 1"
```

### Error: Column count doesn't match
Pastikan jumlah parameter di request body sesuai dengan kolom di tabel work_orders.

### Lupa Password
```sql
-- Masuk MySQL
sudo mysql

-- Update password
USE sinu_ops;
UPDATE akun SET password='password_baru' WHERE username='admin';

-- Keluar
EXIT;
```

---

## File Structure

```
Deploy netifly/
├── index.html              # Main application
├── css/
│   └── main.css
├── js/
│   ├── config.js
│   └── ...
├── mysql/
│   ├── schema.sql
│   ├── config.js
│   ├── server.js
│   ├── README-usage.md     # This file
│   └── README-editing.md   # Database editing guide
└── package.json
```

---

## Kontak & Dukungan

Jika ada pertanyaan atau masalah, hubungi:
- **Email:** support@sinu.co.id
- **Developer:** sinu@admin
