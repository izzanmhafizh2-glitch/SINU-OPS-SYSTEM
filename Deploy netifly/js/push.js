// ===================== WEB PUSH NOTIFICATION — PT SINu =====================
// Mendaftarkan Service Worker, meminta izin, membuat subscription push,
// dan menyimpannya ke tabel Supabase 'push_subscriptions'.
//
// PENTING: ganti VAPID_PUBLIC_KEY dengan public key VAPID milik Anda.
// (Lihat panduan setup di bawah / instruksi dari chat.)

const VAPID_PUBLIC_KEY = 'BEX2HOv3KKC4Ctoq4HjTGV2gIbfX1N1F_ADVwl0YWiAyNJ_2ox0qvIM5LzS_DfTlV6tbk5B1M8Re0NICR-PgJdI';

let sinuSwRegistration = null;

// Ubah VAPID public key (base64url) menjadi Uint8Array yang dibutuhkan browser.
function sinuUrlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

function sinuPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

// Daftarkan service worker sekali saat aplikasi dibuka.
async function sinuRegisterServiceWorker() {
  if (!sinuPushSupported()) {
    console.warn('[Push] Browser tidak mendukung Web Push.');
    return null;
  }
  try {
    sinuSwRegistration = await navigator.serviceWorker.register('sw.js');
    return sinuSwRegistration;
  } catch (e) {
    console.warn('[Push] Gagal registrasi Service Worker:', e.message);
    return null;
  }
}

// Simpan subscription ke Supabase agar server bisa mengirim push ke user ini.
async function sinuSavePushSubscription(subscription) {
  if (typeof supa === 'undefined' || !currentUser) return;
  const raw = subscription.toJSON();
  const username = (currentUser.username || currentUser.displayName || '').toLowerCase();
  const payload = {
    username: username,
    role: currentUser.role || null,
    endpoint: raw.endpoint,
    p256dh: raw.keys ? raw.keys.p256dh : null,
    auth: raw.keys ? raw.keys.auth : null,
    user_agent: navigator.userAgent
  };
  try {
    // onConflict endpoint → 1 device 1 baris, tidak duplikat.
    const { error } = await supa.from('push_subscriptions').upsert(payload, { onConflict: 'endpoint' });
    if (error) throw error;
    console.log('[Push] Subscription tersimpan untuk', username);
  } catch (e) {
    console.warn('[Push] Gagal simpan subscription:', e.message);
  }
}

// Minta izin + buat subscription. Dipanggil dari tombol "Aktifkan Notifikasi HP".
async function sinuEnablePushNotification() {
  if (!sinuPushSupported()) {
    if (typeof showAlert === 'function') showAlert('Browser ini tidak mendukung notifikasi HP.\nGunakan Chrome (Android) atau Safari (iOS 16.4+) dengan Add to Home Screen.', 'Tidak Didukung');
    return;
  }
  if (VAPID_PUBLIC_KEY.startsWith('GANTI_')) {
    if (typeof showAlert === 'function') showAlert('VAPID public key belum diisi di js/push.js.\nSelesaikan setup server dulu.', 'Belum Dikonfigurasi');
    return;
  }
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      if (typeof showAlert === 'function') showAlert('Izin notifikasi ditolak. Aktifkan lewat pengaturan browser bila ingin menerima notif HP.', 'Izin Ditolak');
      return;
    }

    const reg = sinuSwRegistration || await sinuRegisterServiceWorker();
    if (!reg) return;
    await navigator.serviceWorker.ready;

    let subscription = await reg.pushManager.getSubscription();
    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: sinuUrlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
    }

    await sinuSavePushSubscription(subscription);
    sinuRenderPushButton();
    if (typeof showAlert === 'function') showAlert('Notifikasi HP aktif untuk perangkat ini.\nAnda akan menerima notif walau aplikasi ditutup.', 'Notifikasi Aktif');
  } catch (e) {
    console.warn('[Push] Gagal mengaktifkan:', e);
    if (typeof showAlert === 'function') showAlert('Gagal mengaktifkan notifikasi HP: ' + (e.message || ''), 'Error');
  }
}

// Matikan push untuk perangkat ini.
async function sinuDisablePushNotification() {
  try {
    const reg = sinuSwRegistration || await navigator.serviceWorker.getRegistration();
    if (!reg) return;
    const subscription = await reg.pushManager.getSubscription();
    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      if (typeof supa !== 'undefined') {
        await supa.from('push_subscriptions').delete().eq('endpoint', endpoint);
      }
    }
    sinuRenderPushButton();
    if (typeof showAlert === 'function') showAlert('Notifikasi HP dimatikan untuk perangkat ini.', 'Notifikasi Nonaktif');
  } catch (e) {
    console.warn('[Push] Gagal menonaktifkan:', e.message);
  }
}

// Perbarui tampilan tombol sesuai status langganan saat ini.
async function sinuRenderPushButton() {
  const btn = document.getElementById('btn-enable-push');
  if (!btn) return;
  if (!sinuPushSupported()) {
    btn.classList.add('hidden');
    return;
  }
  btn.classList.remove('hidden');
  let subscribed = false;
  try {
    const reg = sinuSwRegistration || await navigator.serviceWorker.getRegistration();
    if (reg) subscribed = Boolean(await reg.pushManager.getSubscription());
  } catch (e) { /* abaikan */ }

  if (subscribed) {
    btn.innerHTML = '<i class="fa-solid fa-bell-slash"></i> Matikan Notifikasi HP';
    btn.onclick = sinuDisablePushNotification;
    btn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
    btn.classList.add('bg-slate-500', 'hover:bg-slate-600');
  } else {
    btn.innerHTML = '<i class="fa-solid fa-bell"></i> Aktifkan Notifikasi HP';
    btn.onclick = sinuEnablePushNotification;
    btn.classList.remove('bg-slate-500', 'hover:bg-slate-600');
    btn.classList.add('bg-blue-600', 'hover:bg-blue-700');
  }
}

window.addEventListener('load', function() {
  sinuRegisterServiceWorker().then(function() {
    setTimeout(sinuRenderPushButton, 800);
  });
});
