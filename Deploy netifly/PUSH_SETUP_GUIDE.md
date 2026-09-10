# Panduan Setup Web Push Notification (Notif masuk ke HP)

Notif HP butuh 2 bagian: **sisi aplikasi** (sudah dibuat) dan **sisi server Supabase** (Anda setup sekali). Ikuti urut.

## Ringkasan yang sudah dibuat di aplikasi
- `manifest.json` + `sw.js` → aplikasi jadi PWA & bisa terima push.
- `js/push.js` → tombol "Aktifkan Notifikasi HP" di panel notifikasi, simpan langganan ke tabel `push_subscriptions`.
- `supabase/push_setup.sql` → SQL tabel langganan.
- `supabase/functions/send-push/index.ts` → fungsi pengirim push.

## Langkah 1 — Buat tabel di Supabase
1. Buka Supabase Dashboard → SQL Editor.
2. Copy isi `supabase/push_setup.sql`, jalankan.

## Langkah 2 — Generate VAPID key
Butuh Node.js. Di terminal:
```powershell
npx web-push generate-vapid-keys
```
Simpan **Public Key** dan **Private Key** yang muncul.

## Langkah 3 — Pasang Public Key di aplikasi
1. Buka `js/push.js`.
2. Ganti nilai `VAPID_PUBLIC_KEY` dengan Public Key dari Langkah 2.

## Langkah 4 — Deploy Edge Function
Butuh Supabase CLI dan sudah `supabase login` + `supabase link`.
```powershell
supabase functions deploy send-push --no-verify-jwt
supabase secrets set VAPID_PUBLIC_KEY=PUBLIC_KEY_ANDA VAPID_PRIVATE_KEY=PRIVATE_KEY_ANDA VAPID_SUBJECT=mailto:admin@ptsinu.com
```

## Langkah 5 — Otomatiskan push saat ada WO baru (Database Webhook)
Agar teknisi dapat notif HP otomatis saat ada WO baru:
1. Supabase Dashboard → Database → Webhooks → Create.
2. Table: `work_orders`, Event: `INSERT`.
3. Type: Supabase Edge Function → pilih `send-push`.
4. Untuk isi payload spesifik (role + judul), buat sebagai HTTP Request ke URL fungsi dengan body:
   ```json
   { "roles": ["teknisi"], "title": "WO Baru", "body": "Ada tugas baru untuk diambil", "url": "/" }
   ```
   Ulangi webhook serupa untuk tabel lain (`provisioning_requests`, `tiket_dismantle`, dll) sesuai penerima.

## Langkah 6 — Deploy aplikasi ke Netlify
Push notification WAJIB lewat HTTPS (Netlify sudah HTTPS). Deploy folder `Deploy netifly`.

## Langkah 7 — Aktifkan di HP
1. Buka aplikasi di HP lewat URL Netlify.
2. Android (Chrome): buka panel Notifikasi → **Aktifkan Notifikasi HP** → izinkan.
3. iPhone (Safari, iOS 16.4+): menu Share → **Add to Home Screen**, buka dari ikon home, baru **Aktifkan Notifikasi HP**.

## Uji coba manual
Panggil fungsi untuk tes:
```powershell
curl -X POST "https://<project-ref>.supabase.co/functions/v1/send-push" -H "Content-Type: application/json" -d "{\"roles\":[\"teknisi\"],\"title\":\"Tes\",\"body\":\"Notif HP berhasil\"}"
```

## Catatan penting
- Notif HP hanya jalan di HTTPS (Netlify), bukan `file://` atau IP lokal tanpa TLS.
- iPhone wajib mode PWA (Add to Home Screen).
- Tiap HP harus menekan "Aktifkan Notifikasi HP" satu kali.
