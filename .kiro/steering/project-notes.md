---
inclusion: manual
name: project-notes
description: Catatan lengkap proyek SINU OPS SYSTEM — arsitektur, riwayat perubahan, dan rencana migrasi ke server pribadi. Pelajari ini sebelum memulai pekerjaan apapun.
---

# SINU OPS SYSTEM — Catatan Proyek Lengkap

> Dibuat untuk Kiro. Bila memulai sesi baru, baca seluruh catatan ini sebelum mengerjakan apapun.
> Perintah untuk memuat: **"pelajari catatan saya"**

---

## 1. Identitas Proyek

| Item | Detail |
|------|--------|
| Nama Aplikasi | SINU OPS SYSTEM |
| Perusahaan | PT. Sinergi Internet Nusantara (PT SINu) |
| Jenis | PWA (Progressive Web App) — pure frontend |
| Stack | HTML + Tailwind CSS + Vanilla JavaScript |
| Backend saat ini | Supabase (cloud) |
| Hosting saat ini | Netlify |
| Folder kerja | `Deploy netifly/` |

---

## 2. Struktur File Penting

```
Deploy netifly/
├── index.html              ← Satu-satunya halaman (SPA)
├── manifest.json           ← PWA manifest
├── css/
│   └── main.css            ← Styling custom + animasi
├── js/
│   ├── config.js           ← State global, data master default kosong
│   ├── supabase-init.js    ← Koneksi Supabase + semua fungsi CRUD utama
│   ├── supabase-extended.js← Query kompleks (dashboard WO, absensi raw)
│   ├── app.js              ← Logic utama aplikasi, router, auth session
│   ├── dashboard.js        ← Render dashboard: podium, KPI, donut chart, tabel rekap
│   ├── kpi.js              ← Halaman KPI lengkap (tabel individu, Tim Admin, Tim Teknisi)
│   ├── absensi.js          ← Fitur absensi (GPS, foto, jadwal)
│   ├── tugas.js            ← Work Order: pickup, proses, selesai (role Teknisi)
│   ├── noc.js              ← Halaman NOC: ambil & selesaikan tugas maintenance
│   ├── admin.js            ← Buat WO, list tiket, manajemen ODP
│   ├── material.js         ← Manajemen perangkat (ONT, kabel, gudang)
│   ├── jadwal.js           ← Penjadwalan shift karyawan
│   ├── rekap.js            ← Rekapitulasi kehadiran
│   ├── mitra.js            ← Manajemen mitra/vendor
│   ├── pelanggan.js        ← Data pelanggan
│   ├── owner.js            ← Dashboard Owner
│   ├── dismantle.js        ← Proses bongkar instalasi
│   ├── invoice-mitra.js    ← Invoice untuk mitra
│   ├── baps-manager.js     ← BAPS manager
│   ├── rl-radius.js        ← Input nomor layanan RL Radius
│   ├── notifications.js    ← Notifikasi in-app
│   ├── push.js             ← Web Push Notification
│   ├── tukar-shift.js      ← Pengajuan tukar shift
│   ├── shift-swap-approval.js ← Approval tukar shift
│   └── splash.js           ← Animasi splash screen
└── supabase/
    ├── *.sql               ← Schema & migration PostgreSQL
    └── functions/          ← Edge Functions (send-push, auto-alpha-cron)
```

---

## 3. Koneksi Supabase Saat Ini

**File:** `Deploy netifly/js/supabase-init.js` baris 1-4

```javascript
const SUPABASE_URL = 'https://pasmdewdganfgdnntwam.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
const supa = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

> ⚠️ JANGAN hardcode URL/key baru langsung di file. Saat migrasi, buat file `js/api-config.js` terpisah.

---

## 4. Tabel Database (Supabase / PostgreSQL)

| Tabel | Kegunaan |
|-------|----------|
| `akun` | Login user — username, password (plain), role, division, display_name |
| `karyawan` | Daftar karyawan untuk dropdown & rekap |
| `absensi` | Data kehadiran harian (nama, shift, status, jam_masuk, point, lat/lng) |
| `work_orders` | Semua WO — instalasi, maintenance, reseller, dismantle |
| `odp` | Data ODP (jaringan fiber) — lokasi, kapasitas, terisi |
| `perangkat` | Inventory perangkat (ONT, kabel) di gudang |
| `device_history` | Riwayat pemakaian perangkat per WO |
| `jadwal` | Jadwal shift karyawan |
| `shift_swap_requests` | Pengajuan tukar shift |
| `pelanggan` | Data pelanggan aktif |
| `mitra` | Data mitra/vendor |
| `invoice_mitra` | Invoice untuk mitra |
| `wo_photos` | Foto dokumentasi WO (base64 atau URL storage) |
| `push_subscriptions` | Langganan Web Push per device |
| `notifications` | Log notifikasi |
| `rl_radius` | Data nomor layanan RL Radius per WO |

---

## 5. Sistem Login

- **Tidak pakai Supabase Auth** — login manual via query tabel `akun`
- Password disimpan plain text di kolom `password`
- Session disimpan di localStorage (`sinuPersistentSession`)
- Fallback: array `ACCOUNTS` di `config.js` (saat ini kosong)
- File utama: `supabase-init.js` fungsi `handleLogin()`

**Role yang ada:**
| Role | Akses |
|------|-------|
| `owner` | Semua fitur + dashboard owner |
| `admin` | Buat WO, kelola tiket, ODP |
| `supervisor` | KPI, jadwal, rekap, approve |
| `teknisi` | Ambil & kerjakan WO |
| `noc` | Ambil & selesaikan maintenance |
| `cs` | Buat WO, input data pelanggan |
| `finance` | Invoice, laporan keuangan |

---

## 6. Alur Work Order (WO)

```
Admin/CS buat WO → status: RELEASE
        ↓
Teknisi pickup    → status: PICKUP
        ↓
Teknisi proses    → status: PROSES
        ↓
Teknisi selesai   → status: SELESAI
        ↓ (jika ada masalah)
Return ke NOC     → status: RETURN / NOC
```

**Tipe WO:**
- `INSTALASI` — instalasi pelanggan baru
- `INSTALASI_RESELLER` — instalasi reseller
- `PERLUASAN_RESELLER` — perluasan jaringan reseller
- `MAINTENANCE` — perbaikan/gangguan (masuk ke NOC dulu)
- `DISMANTLE` — bongkar instalasi

---

## 7. Sistem Poin KPI

### Poin Kehadiran (absensi)
- Tepat waktu → +10 poin
- Terlambat < 15 mnt → +7 poin
- Terlambat > 15 mnt → +5 poin
- Izin sakit/cuti → +3 poin
- Alpa → 0 poin
- Maksimum per bulan: 100 poin (10 poin × hari kerja, capped)

### Poin Kinerja Teknisi (`hitungPointTeknisi`)
- Berdasarkan durasi pengerjaan WO (T2 pickup → T4 selesai)
- Makin cepat = poin lebih tinggi
- Dibagi rata jika ada 2 teknisi

### Poin Kinerja CS/Admin (`hitungPointAdmin`)
- Berdasarkan durasi respon (T1 permintaan → T2 buat WO)
- Target SLA: < 5 menit

### Top 3 Employee of the Month
- Ranking berdasarkan **total poin = poin kehadiran + poin kinerja**
- Fungsi: `renderPodium()` di `dashboard.js`
- Menggunakan `calcTotalPoint(emp)` yang sudah memperhitungkan keduanya

---

## 8. Dashboard — Bagian-bagian Utama

| Bagian | File | Fungsi Utama |
|--------|------|--------------|
| WO Summary | `supabase-extended.js` | `loadWOSummaryDashboard()` |
| Top 3 Podium | `dashboard.js` | `renderPodium()` |
| Komposisi Kehadiran | `dashboard.js` | `renderDonutChart()` |
| KPI Klasemen | `dashboard.js` | `renderKPIKlasemen()` |
| Tren Kehadiran | `dashboard.js` | `renderMainChart()` |
| Rekap Karyawan | `dashboard.js` | `updateRecapTable()` |
| Filter Global | `index.html` | `recapMonthSelect`, `recapYearSelect` |

**NOC Count:** Query langsung `status=PICKUP AND tipe=MAINTENANCE` dari tabel `work_orders`.

---

## 9. Riwayat Perubahan Penting (Sesi Terakhir)

| # | Perubahan | File |
|---|-----------|------|
| 1 | Hapus filter DIVISI dari header dashboard | `index.html` |
| 2 | Hapus filter Semua/Teknisi/CS/Admin/NOC — sisakan filter bulan & tahun | `index.html` |
| 3 | Filter bulan+tahun terhubung ke semua konten dashboard | `dashboard.js` |
| 4 | WO dipisah: Status Pengerjaan (5 kartu) + Kategori Pekerjaan (5 kartu) | `index.html`, `supabase-extended.js` |
| 5 | NOC count query langsung: `status=PICKUP AND tipe=MAINTENANCE` | `supabase-extended.js` |
| 6 | Redesign WO cards: gradients, icons, hover animation | `index.html` |
| 7 | Komposisi Kehadiran + Top 3 Employee berdampingan (grid) | `index.html` |
| 8 | Hapus tombol Tambah dan kolom Aksi dari tabel Rekap Karyawan | `index.html`, `dashboard.js` |
| 9 | Tabel Rekap scrollable dengan sticky header (max-h 500px) | `index.html` |
| 10 | Kartu Komposisi Kehadiran diisi penuh: tambah 3 stat card (Tepat/Lambat/Izin) | `index.html`, `dashboard.js` |
| 11 | Fix kolom KPI tabel kebalik (hapus header "Grade Hadir" yang tidak ada di JS) | `index.html` |
| 12 | Top 3 Podium sekarang ranking + tampilkan poin TOTAL (hadir + kinerja) | `dashboard.js` |
| 13 | Cache buster versi `2026092303` untuk `dashboard.js` dan `supabase-extended.js` | `index.html` |

---

## 10. Rencana Migrasi ke Server Pribadi

### Tujuan
Pindah dari Supabase cloud ke server Proxmox di kantor karena:
- Butuh penyimpanan lebih luas (Supabase free: 500MB DB, 1GB storage)
- Data sensitif perusahaan lebih aman di server sendiri
- Tim NOC yang maintain server

### Spesifikasi Server Target
- **Hypervisor:** Proxmox (mini PC di kantor)
- **Database:** MySQL (bukan PostgreSQL)
- **Lokasi:** On-premise, belum ada IP publik
- **Docker:** Sudah tersedia di Proxmox

### Arsitektur Target

```
Pengguna (browser/HP dari luar kantor)
          ↓ HTTPS
    Cloudflare Tunnel  ← GRATIS, tidak butuh IP publik
          ↓
    VM Ubuntu di Proxmox
    ├── Nginx          ← Serve file HTML/JS/CSS frontend
    ├── Node.js API    ← Express REST API (ganti Supabase)
    │   └── Port 3000
    └── MySQL          ← Database (ganti PostgreSQL Supabase)
        └── Port 3306
```

### Tahapan Migrasi

#### FASE 1 — Setup Server (dikerjakan oleh NOC/admin server)
- [ ] Buat VM baru di Proxmox: Ubuntu Server 22.04 LTS
- [ ] Spesifikasi VM minimal: 2 vCPU, 4GB RAM, 50GB disk
- [ ] Install di VM:
  ```bash
  sudo apt update && sudo apt upgrade -y
  sudo apt install -y mysql-server nginx
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt install -y nodejs
  sudo npm install -g pm2
  ```
- [ ] Buat database MySQL: `CREATE DATABASE sinuops CHARACTER SET utf8mb4;`
- [ ] Setup Cloudflare Tunnel:
  - Daftar/login ke Cloudflare Zero Trust
  - Install `cloudflared` di VM
  - Buat tunnel → arahkan ke `http://localhost:80`
  - Dapatkan domain publik (misal: `app.sinuops.com`)

#### FASE 2 — Backend API Node.js (Kiro yang kerjakan)
File yang akan dibuat: `backend/` (folder baru di luar `Deploy netifly/`)

```
backend/
├── server.js           ← Entry point Express
├── package.json
├── .env                ← DB credentials (JANGAN di-commit ke GitHub)
├── middleware/
│   ├── auth.js         ← JWT-based auth (ganti Supabase Auth)
│   └── cors.js
├── routes/
│   ├── auth.js         ← POST /api/login, POST /api/logout
│   ├── akun.js         ← GET/POST/PUT /api/akun
│   ├── karyawan.js     ← GET/POST /api/karyawan
│   ├── absensi.js      ← GET/POST /api/absensi
│   ├── work-orders.js  ← GET/POST/PUT /api/work-orders
│   ├── odp.js          ← GET/POST/PUT /api/odp
│   ├── perangkat.js    ← GET/POST/PUT /api/perangkat
│   ├── jadwal.js       ← GET/POST /api/jadwal
│   ├── pelanggan.js    ← GET/POST /api/pelanggan
│   └── ...             ← satu file per tabel
└── db/
    ├── mysql.js        ← Koneksi pool MySQL (mysql2)
    └── schema.sql      ← Schema MySQL (dikonversi dari PostgreSQL)
```

**Endpoint penting yang harus ada:**

| Method | Endpoint | Keterangan |
|--------|----------|------------|
| POST | `/api/login` | Auth, return JWT token |
| GET | `/api/akun` | Daftar akun |
| GET | `/api/karyawan` | Daftar karyawan |
| GET | `/api/absensi?bulan=&tahun=` | Data absensi per periode |
| POST | `/api/absensi` | Simpan absensi |
| GET | `/api/work-orders` | Semua WO |
| POST | `/api/work-orders` | Buat WO baru |
| PUT | `/api/work-orders/:id` | Update status WO |
| GET | `/api/odp` | Data ODP |
| POST | `/api/odp` | Tambah ODP |
| GET | `/api/perangkat` | Inventory perangkat |
| POST | `/api/perangkat` | Tambah perangkat |
| GET | `/api/jadwal` | Data jadwal shift |
| GET | `/api/dashboard/wo-summary?bulan=&tahun=` | Ringkasan WO untuk dashboard |

#### FASE 3 — Konversi Frontend (Kiro yang kerjakan)
File yang diubah:

1. **`js/supabase-init.js`** → Ganti semua `supa.from(...).select(...)` dengan `fetch('/api/...')`
2. **`js/supabase-extended.js`** → Sama, ganti semua Supabase query
3. **`js/api-config.js`** (BARU) → Ganti `supabase-init.js` untuk config koneksi:
   ```javascript
   const API_BASE = 'https://app.sinuops.com/api'; // dari Cloudflare Tunnel
   const getAuthHeaders = () => ({
     'Content-Type': 'application/json',
     'Authorization': 'Bearer ' + localStorage.getItem('sinuToken')
   });
   ```
4. **`index.html`** → Hapus script tag Supabase SDK, tambah `api-config.js`

#### FASE 4 — Migrasi Data
```bash
# Export dari Supabase
supabase db dump -f backup.sql --db-url "postgresql://..."

# Konversi PostgreSQL → MySQL (pakai pgloader atau manual)
# Import ke MySQL
mysql -u root -p sinuops < schema_mysql.sql
mysql -u root -p sinuops < data_converted.sql
```

### Perbedaan PostgreSQL vs MySQL yang Perlu Diperhatikan

| PostgreSQL (Supabase) | MySQL (Target) |
|-----------------------|----------------|
| `SERIAL` / `BIGSERIAL` | `INT AUTO_INCREMENT` |
| `BOOLEAN` | `TINYINT(1)` |
| `JSONB` | `JSON` |
| `TEXT[]` (array) | `JSON` atau tabel relasi |
| `NOW()` | `NOW()` (sama) |
| `ilike` | `LIKE` (MySQL tidak case-sensitive by default) |
| `upsert` (ON CONFLICT) | `INSERT ... ON DUPLICATE KEY UPDATE` |
| Row Level Security (RLS) | Handled di backend API layer |

### Hal yang HILANG saat migrasi (butuh alternatif)
| Fitur Supabase | Alternatif |
|----------------|------------|
| Realtime subscriptions | Socket.io di Node.js backend |
| Edge Functions (push notif) | Node.js scheduled job (node-cron) |
| Supabase Storage (foto WO) | MinIO self-hosted atau folder di server |
| Auth JWT otomatis | jsonwebtoken library di Node.js |

---

## 11. File yang Tidak Boleh di-Commit ke GitHub

Buat file `.gitignore` di root project dengan isi:

```
# Credentials
.env
backend/.env
js/api-config.local.js

# Supabase temp
Deploy netifly/supabase/.temp/

# OS
.DS_Store
Thumbs.db
node_modules/
```

> ⚠️ `supabase-init.js` mengandung SUPABASE_ANON_KEY — ini public key (bukan secret), aman di GitHub. Tapi saat migrasi ke server pribadi, jangan taruh JWT_SECRET atau DB_PASSWORD di file JS.

---

## 12. Checklist Sebelum Mulai Migrasi

- [ ] Export semua data dari Supabase dashboard (backup dulu)
- [ ] VM Ubuntu sudah running di Proxmox
- [ ] MySQL sudah terinstall dan bisa diakses
- [ ] Node.js v20+ sudah terinstall
- [ ] Cloudflare account sudah dibuat, domain sudah diarahkan
- [ ] Cloudflare Tunnel sudah berjalan
- [ ] Backend API sudah bisa diakses dari browser via URL tunnel
- [ ] Test login berhasil via API baru
- [ ] Test CRUD work order berhasil
- [ ] Test absensi berhasil
- [ ] Semua data dari Supabase sudah berhasil diimport ke MySQL

---

## 13. Perintah Penting untuk Kiro

Bila melanjutkan pekerjaan di sesi baru:

```
"pelajari catatan saya"
→ Kiro membaca file ini (.kiro/steering/project-notes.md)

"lanjutkan migrasi backend"
→ Mulai dari Fase 2: buat folder backend/ dan file-file Node.js API

"lanjutkan konversi frontend"
→ Mulai dari Fase 3: ganti Supabase query di JS files

"cek status migrasi"
→ Review checklist di bagian 12
```
