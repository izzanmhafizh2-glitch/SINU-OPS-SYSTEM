# Catatan Migrasi: Supabase → Self-Hosted Server

## Status: PENDING (masih dalam fase testing dengan Supabase)

---

## Tabel Database Supabase yang Digunakan

| Tabel | Fungsi |
|-------|--------|
| `akun` | Login user (username, password, role, display_name) |
| `karyawan` | Data karyawan (nama, role, avatar) |
| `absensi` | Rekap absensi harian |
| `odp` | Data ODP (lokasi, kapasitas, terisi, lat, lng) |
| `work_orders` | Semua tiket WO (status, tipe, pelanggan, dll) |
| `perangkat` | Inventaris perangkat di gudang |
| `perangkat_teknisi` | Perangkat yang sedang di tangan teknisi |
| `device_history` | Riwayat perpindahan perangkat |
| `pickup_requests` | Request pickup material dari teknisi |
| `material_requests` | Request send/return perangkat |
| `provisioning_requests` | Antrian registrasi provisioning |
| `wo_photos` | Foto dokumentasi WO (base64 / URL storage) |

## Fitur Supabase yang Dipakai

- **Database REST API** — query, insert, update, delete
- **Realtime** — 5 channel aktif (work_orders, perangkat, provisioning, pickup, material)
- **Storage** — bucket `wo-media` untuk foto/video kendala maintenance

## File yang Perlu Diupdate Saat Migrasi

- `js/supabase-init.js` — hapus Supabase client, ganti dengan fetch() ke API
- `js/supabase-extended.js` — semua query Supabase → fetch() ke endpoint
- `js/noc.js` — query work_orders & wo_photos
- `js/tugas.js` — query perangkat_teknisi & work_orders
- `js/rekap.js` — query absensi
- `js/kpi.js` — query work_orders
- `js/dashboard.js` — query karyawan & absensi
- `js/config.js` — update URL base API

## Stack Self-Hosted yang Direkomendasikan

```
Proxmox LXC/VM
├── Backend: Node.js (Express) atau Python (FastAPI)
├── Database: PostgreSQL
├── Storage (foto/video): MinIO (S3-compatible)
├── Realtime: Socket.io atau Server-Sent Events
├── Web server: Nginx
└── Process manager: PM2 (Node) atau Systemd
```

## Pola Penggantian Kode

### Sebelum (Supabase):
```javascript
const { data, error } = await supa
  .from('work_orders')
  .select('*')
  .eq('status', 'RELEASE');
```

### Sesudah (Self-hosted API):
```javascript
const res = await fetch('/api/work-orders?status=RELEASE');
const data = await res.json();
```

### Realtime Sebelum (Supabase):
```javascript
supa.channel('realtime-wo')
  .on('postgres_changes', { event: '*', table: 'work_orders' }, callback)
  .subscribe();
```

### Realtime Sesudah (Socket.io):
```javascript
socket.on('work_orders:change', callback);
```

## Skema PostgreSQL (sama dengan Supabase)

Jalankan `pg_dump` dari Supabase untuk export skema + data:
```bash
pg_dump "postgresql://postgres:[password]@db.pasmdewdganfgdnntwam.supabase.co:5432/postgres" \
  --schema-only -f schema.sql

pg_dump "postgresql://postgres:[password]@db.pasmdewdganfgdnntwam.supabase.co:5432/postgres" \
  --data-only -f data.sql
```

## Checklist Migrasi

- [ ] Setup VM di Proxmox (Ubuntu 22.04)
- [ ] Install PostgreSQL, Node.js, MinIO, Nginx
- [ ] Buat backend API (Express.js)
- [ ] Buat semua endpoint REST (auth, work-orders, perangkat, dll)
- [ ] Setup Socket.io untuk realtime
- [ ] Migrasi data dari Supabase ke PostgreSQL
- [ ] Upload foto lama dari Supabase Storage ke MinIO
- [ ] Update semua `supa.from(...)` ke `fetch('/api/...')`
- [ ] Testing semua fitur
- [ ] Setup SSL (Let's Encrypt) + domain/subdomain
- [ ] Setup backup otomatis PostgreSQL
- [ ] Setup VPN (opsional, untuk akses dari luar)
