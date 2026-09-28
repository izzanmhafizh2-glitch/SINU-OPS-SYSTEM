// ===================== NOTIFICATION CENTER =====================
// Notifikasi client-side real-time untuk tugas baru dan provisioning.
// Riwayat disimpan lokal per user sampai tabel notifications/server push tersedia.
const SINU_NOTIFICATION_LIMIT = 60;
let sinuNotifications = [];
let sinuNotificationChannelWO = null;
let sinuNotificationChannelProvisioning = null;
let sinuNotificationChannelDismantle = null;
let sinuNotificationChannelDismantleItems = null;
let sinuNotificationChannelDeviceHistory = null;
let sinuNotificationUserKey = '';
let sinuNotificationTimer = null;

function sinuNotificationStorageKey() {
  const username = currentUser && (currentUser.username || currentUser.displayName);
  return 'sinu_notifications_' + String(username || 'guest').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
}

function sinuNotificationEscape(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
}

function sinuNotificationLoad() {
  try {
    const saved = localStorage.getItem(sinuNotificationStorageKey());
    const parsed = saved ? JSON.parse(saved) : [];
    sinuNotifications = Array.isArray(parsed) ? parsed.slice(0, SINU_NOTIFICATION_LIMIT) : [];
  } catch (error) {
    sinuNotifications = [];
    console.warn('[Notification] Gagal membaca riwayat lokal:', error.message);
  }
}

function sinuNotificationSave() {
  try {
    localStorage.setItem(sinuNotificationStorageKey(), JSON.stringify(sinuNotifications.slice(0, SINU_NOTIFICATION_LIMIT)));
  } catch (error) {
    console.warn('[Notification] Gagal menyimpan riwayat lokal:', error.message);
  }
}

function sinuNotificationRecipient(type) {
  const role = String(currentUser?.role || '').toLowerCase();
  if (type === 'task') return role === 'teknisi';
  if (type === 'task-dismantle') return role === 'teknisi';
  if (type === 'maintenance-noc') return role === 'noc';
  if (type === 'provisioning') return ['admin', 'cs', 'noc'].includes(role);
  if (type === 'provisioning-done') return role === 'teknisi';
  if (type === 'rl-radius') return ['admin', 'cs'].includes(role);
  // Tugas diambil & selesai dilaporkan ke pihak pemantau operasional.
  if (type === 'task-picked') return ['admin', 'cs', 'supervisor'].includes(role);
  if (type === 'task-done') return ['admin', 'cs', 'supervisor'].includes(role);
  // Pergerakan perangkat & update maintenance/dismantle → NOC, Admin/CS, Supervisor.
  const pemantau = ['noc', 'admin', 'cs', 'supervisor'].includes(role);
  if (type === 'device-movement') return pemantau;
  if (type === 'dismantle-update') return pemantau;
  if (type === 'dismantle-item') return pemantau;
  if (type === 'maintenance-update') return pemantau;
  return false;
}

function sinuIsTechnicianTask(row) {
  if (!row || row.status !== 'RELEASE') return false;
  const tipe = String(row.tipe || '').toUpperCase();
  // Maintenance baru masuk ke teknisi setelah diproses/release oleh NOC.
  if (tipe !== 'MAINTENANCE') return true;
  return !Object.prototype.hasOwnProperty.call(row, 'noc_name') || Boolean(row.noc_name);
}

function sinuNotificationTime(timestamp) {
  const date = timestamp ? new Date(timestamp) : new Date();
  if (Number.isNaN(date.getTime())) return 'Baru saja';
  const diff = Math.max(0, Date.now() - date.getTime());
  const minute = Math.floor(diff / 60000);
  if (minute < 1) return 'Baru saja';
  if (minute < 60) return minute + ' menit lalu';
  const hour = Math.floor(minute / 60);
  if (hour < 24) return hour + ' jam lalu';
  return date.toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function sinuNotificationIcon(type) {
  if (type === 'task') return '<i class="fa-solid fa-list-check text-blue-500"></i>';
  if (type === 'task-dismantle') return '<i class="fa-solid fa-screwdriver-wrench text-orange-500"></i>';
  if (type === 'maintenance-noc') return '<i class="fa-solid fa-headset text-indigo-500"></i>';
  if (type === 'provisioning') return '<i class="fa-solid fa-server text-indigo-500"></i>';
  if (type === 'provisioning-done') return '<i class="fa-solid fa-circle-check text-emerald-500"></i>';
  if (type === 'rl-radius') return '<i class="fa-solid fa-network-wired text-violet-500"></i>';
  if (type === 'task-picked') return '<i class="fa-solid fa-hand-holding-hand text-amber-500"></i>';
  if (type === 'task-done') return '<i class="fa-solid fa-clipboard-check text-emerald-500"></i>';
  if (type === 'device-movement') return '<i class="fa-solid fa-truck-fast text-blue-500"></i>';
  if (type === 'dismantle-update') return '<i class="fa-solid fa-screwdriver-wrench text-orange-500"></i>';
  if (type === 'dismantle-item') return '<i class="fa-solid fa-box-open text-orange-500"></i>';
  if (type === 'maintenance-update') return '<i class="fa-solid fa-wrench text-amber-500"></i>';
  return '<i class="fa-solid fa-bell text-blue-500"></i>';
}

function sinuNotificationRender() {
  const badge = document.getElementById('notification-unread-badge');
  const list = document.getElementById('notification-list');
  const unread = sinuNotifications.filter(item => !item.read).length;

  if (badge) {
    badge.textContent = unread > 99 ? '99+' : String(unread);
    badge.classList.toggle('hidden', unread === 0);
  }
  if (!list) return;

  if (!sinuNotifications.length) {
    list.innerHTML = '<div class="flex flex-col items-center justify-center py-10 text-slate-400"><i class="fa-regular fa-bell-slash text-3xl mb-2"></i><p class="text-xs font-semibold">Belum ada notifikasi</p></div>';
    return;
  }

  list.innerHTML = sinuNotifications.map(item => `
    <button type="button" data-notification-id="${sinuNotificationEscape(item.id)}" class="w-full text-left flex gap-3 p-3 border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors ${item.read ? '' : 'bg-blue-50/70 dark:bg-blue-950/20'}">
      <span class="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 flex items-center justify-center shrink-0">${sinuNotificationIcon(item.type)}</span>
      <span class="min-w-0 flex-1">
        <span class="flex items-start justify-between gap-2"><strong class="text-xs font-extrabold text-slate-800 dark:text-slate-100">${sinuNotificationEscape(item.title)}</strong>${item.read ? '' : '<span class="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1"></span>'}</span>
        <span class="block text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">${sinuNotificationEscape(item.message)}</span>
        <span class="block text-[10px] text-slate-400 mt-1">${sinuNotificationTime(item.createdAt)}</span>
      </span>
    </button>`).join('');

  list.querySelectorAll('[data-notification-id]').forEach(button => {
    button.addEventListener('click', () => {
      markSinuNotificationRead(button.getAttribute('data-notification-id'));
    });
  });
}

function sinuNotificationAdd(item, browserAlert = true) {
  const exists = sinuNotifications.some(notification => notification.id === item.id);
  if (exists) return;

  sinuNotifications.unshift({
    id: item.id,
    type: item.type || 'info',
    title: item.title || 'Notifikasi Baru',
    message: item.message || '',
    entityId: item.entityId || '',
    createdAt: item.createdAt || new Date().toISOString(),
    read: false
  });
  sinuNotifications = sinuNotifications.slice(0, SINU_NOTIFICATION_LIMIT);
  sinuNotificationSave();
  sinuNotificationRender();

  const title = sinuNotificationEscape(item.title || 'Notifikasi Baru');
  const message = sinuNotificationEscape(item.message || '');
  const successTypes = ['provisioning-done', 'task-done'];
  if (typeof showToast === 'function') showToast(title, message, successTypes.includes(item.type) ? 'success' : 'info', 7000);
  if (browserAlert) showSinuBrowserNotification(item);
}

function showSinuBrowserNotification(item) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    const browserNotification = new Notification(item.title || 'SINU OPS', {
      body: item.message || 'Ada notifikasi baru di SINU OPS.',
      icon: 'assets/logo-s.png?v=1000182',
      tag: item.id
    });
    browserNotification.onclick = () => {
      window.focus();
      openSinuNotificationPanel();
      markSinuNotificationRead(item.id);
      browserNotification.close();
    };
  } catch (error) {
    console.warn('[Notification] Browser notification gagal:', error.message);
  }
}

async function requestSinuNotificationPermission() {
  if (!('Notification' in window)) {
    if (typeof showToast === 'function') showToast('Browser Tidak Mendukung', 'Gunakan Chrome/Edge terbaru untuk notifikasi browser.', 'warning', 6000);
    return;
  }
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      if (typeof showToast === 'function') showToast('Notifikasi Aktif', 'Notifikasi browser SINU OPS sudah diaktifkan.', 'success', 5000);
    } else if (typeof showToast === 'function') {
      showToast('Notifikasi Belum Aktif', 'Izin notifikasi ditolak atau belum diberikan.', 'warning', 6000);
    }
    sinuNotificationRenderPermission();
  } catch (error) {
    if (typeof showToast === 'function') showToast('Gagal Mengaktifkan', error.message || 'Izin notifikasi tidak dapat diproses.', 'error', 6000);
  }
}

function sinuNotificationRenderPermission() {
  const button = document.getElementById('notification-permission-button');
  if (!button) return;
  const supported = 'Notification' in window;
  const granted = supported && Notification.permission === 'granted';
  button.classList.toggle('hidden', granted);
  if (!supported) button.textContent = 'Browser tidak mendukung notifikasi';
}

function markSinuNotificationRead(id) {
  const item = sinuNotifications.find(notification => notification.id === id);
  if (!item) return;
  item.read = true;
  sinuNotificationSave();
  sinuNotificationRender();
}

function markAllSinuNotificationsRead() {
  sinuNotifications.forEach(item => { item.read = true; });
  sinuNotificationSave();
  sinuNotificationRender();
}

function openSinuNotificationPanel() {
  const panel = document.getElementById('notification-panel');
  if (!panel) return;
  panel.classList.remove('hidden');
  sinuNotificationRender();
  sinuNotificationRenderPermission();
}

function toggleSinuNotificationPanel() {
  const panel = document.getElementById('notification-panel');
  if (!panel) return;
  panel.classList.toggle('hidden');
  if (!panel.classList.contains('hidden')) {
    sinuNotificationRender();
    sinuNotificationRenderPermission();
  }
}

function handleSinuRealtimeNotification(table, payload) {
  if (!currentUser || !payload) return;
  const row = payload.new || {};
  const previous = payload.old || {};
  const eventType = payload.eventType;

  if (table === 'work_orders') {
    // Tugas baru / kembali di menu Pickup teknisi.
    if (sinuNotificationRecipient('task')) {
      const isNew = eventType === 'INSERT' && sinuIsTechnicianTask(row);
      const isReleasedAgain = eventType === 'UPDATE'
        && previous.status && previous.status !== 'RELEASE'
        && sinuIsTechnicianTask(row);
      if (isNew || isReleasedAgain) {
        const typeText = isReleasedAgain ? 'Tugas Kembali' : 'Tugas Baru';
        sinuNotificationAdd({
          id: `task:${row.wo_id}:${row.status}:${row.released_at || row.created_at || Date.now()}`,
          type: 'task',
          title: typeText,
          message: `${row.wo_id || 'WO'} — ${row.pelanggan || 'Pelanggan baru'} tersedia untuk diambil.`,
          entityId: row.wo_id,
          createdAt: row.released_at || row.created_at
        });
      }
    }

    // Maintenance yang masuk antrian NOC.
    if (sinuNotificationRecipient('maintenance-noc')) {
      const tipe = String(row.tipe || '').toUpperCase();
      const masukNOC = tipe === 'MAINTENANCE' && row.status === 'NOC'
        && (eventType === 'INSERT' || (eventType === 'UPDATE' && previous.status !== 'NOC'));
      if (masukNOC) {
        sinuNotificationAdd({
          id: `maintenance-noc:${row.wo_id}:${row.created_at || Date.now()}`,
          type: 'maintenance-noc',
          title: 'Maintenance Baru (NOC)',
          message: `${row.wo_id || 'WO'} — ${row.pelanggan || 'Pelanggan'} perlu penanganan NOC.`,
          entityId: row.wo_id,
          createdAt: row.created_at
        });
      }
    }

    // Semua pembaruan tugas MAINTENANCE (baru / pindah status) → pemantau.
    if (sinuNotificationRecipient('maintenance-update')) {
      const tipe = String(row.tipe || '').toUpperCase();
      const statusBaru = String(row.status || '').toUpperCase();
      const statusLama = String(previous.status || '').toUpperCase();
      const berubah = eventType === 'INSERT' || (eventType === 'UPDATE' && statusBaru !== statusLama);
      if (tipe === 'MAINTENANCE' && berubah && statusBaru) {
        const statusLabel = {
          NOC: 'masuk antrian NOC', RELEASE: 'dirilis ke teknisi',
          PICKUP: 'diambil teknisi', PROSES: 'sedang dikerjakan',
          SELESAI: 'selesai', RETURN: 'dikembalikan'
        }[statusBaru] || ('status ' + statusBaru);
        sinuNotificationAdd({
          id: `maintenance-update:${row.wo_id}:${statusBaru}:${row.completed_at || row.picked_up_at || row.released_at || row.created_at || Date.now()}`,
          type: 'maintenance-update',
          title: 'Update Maintenance',
          message: `${row.wo_id || 'WO'} — ${row.pelanggan || 'Pelanggan'} ${statusLabel}.`,
          entityId: row.wo_id,
          createdAt: row.completed_at || row.picked_up_at || row.released_at || row.created_at || new Date().toISOString()
        });
      }
    }

    // RL Radius / registrasi: WO instalasi selesai dan belum diinput No. Layanan.
    if (sinuNotificationRecipient('rl-radius')) {
      const tipe = String(row.tipe || '').toUpperCase();
      const isInstalasi = ['INSTALASI', 'INSTALASI_RESELLER', 'PERLUASAN_RESELLER'].includes(tipe);
      const baruSelesai = eventType === 'UPDATE' && previous.status !== 'SELESAI' && row.status === 'SELESAI';
      if (isInstalasi && baruSelesai && !row.rl_radius_done) {
        sinuNotificationAdd({
          id: `rl-radius:${row.wo_id}:${row.completed_at || Date.now()}`,
          type: 'rl-radius',
          title: 'Perlu Input RL Radius',
          message: `${row.wo_id || 'WO'} — ${row.pelanggan || 'Pelanggan'} menunggu No. Layanan / RL Radius.`,
          entityId: row.wo_id,
          createdAt: row.completed_at || new Date().toISOString()
        });
      }
    }

    // Tugas diambil (pickup) → admin / CS / supervisor.
    // previous.status bisa kosong jika REPLICA IDENTITY belum FULL, sehingga
    // deteksi cukup mengandalkan status baru = PICKUP pada event UPDATE.
    if (sinuNotificationRecipient('task-picked')) {
      const baruDiambil = eventType === 'UPDATE' && previous.status !== 'PICKUP' && row.status === 'PICKUP';
      if (baruDiambil) {
        const pengambil = Array.isArray(row.teknisi)
          ? row.teknisi.filter(Boolean).join(', ')
          : (row.teknisi || row.noc_name || '');
        sinuNotificationAdd({
          id: `task-picked:${row.wo_id}:${row.picked_up_at || Date.now()}`,
          type: 'task-picked',
          title: 'Tugas Diambil',
          message: `${row.wo_id || 'WO'} — ${row.pelanggan || 'Pelanggan'} diambil${pengambil ? ' oleh ' + pengambil : ''}.`,
          entityId: row.wo_id,
          createdAt: row.picked_up_at || new Date().toISOString()
        });
      }
    }

    // Tugas selesai → admin / CS / supervisor.
    // previous.status bisa kosong jika REPLICA IDENTITY tabel belum FULL,
    // sehingga cukup andalkan status baru = SELESAI pada event UPDATE.
    if (sinuNotificationRecipient('task-done')) {
      const baruSelesai = eventType === 'UPDATE' && previous.status !== 'SELESAI' && row.status === 'SELESAI';
      if (baruSelesai) {
        const teknisi = Array.isArray(row.teknisi) ? row.teknisi.filter(Boolean).join(', ') : (row.teknisi || '');
        sinuNotificationAdd({
          id: `task-done:${row.wo_id}:${row.completed_at || Date.now()}`,
          type: 'task-done',
          title: 'Tugas Selesai',
          message: `${row.wo_id || 'WO'} — ${row.pelanggan || 'Pelanggan'} selesai${teknisi ? ' oleh ' + teknisi : ''}.`,
          entityId: row.wo_id,
          createdAt: row.completed_at || new Date().toISOString()
        });
      }
    }
  }

  if (table === 'tiket_dismantle') {
    // Teknisi: tiket dismantle baru / kembali di-release.
    if (sinuNotificationRecipient('task-dismantle')) {
      const isNew = eventType === 'INSERT' && row.status === 'RELEASE';
      const isReleasedAgain = eventType === 'UPDATE' && previous.status !== 'RELEASE' && row.status === 'RELEASE';
      if (isNew || isReleasedAgain) {
        sinuNotificationAdd({
          id: `dismantle:${row.wo_id || row.id}:${row.created_at || Date.now()}`,
          type: 'task-dismantle',
          title: 'Tugas Dismantle Baru',
          message: `${row.wo_id || 'DIS'} — ${row.nama_pelanggan || 'Pelanggan'} siap di-pickup.`,
          entityId: row.wo_id || row.id,
          createdAt: row.created_at
        });
      }
    }

    // Pemantau: semua pembaruan tugas dismantle (baru / pindah status).
    if (sinuNotificationRecipient('dismantle-update')) {
      const statusBaru = String(row.status || '').toUpperCase();
      const statusLama = String(previous.status || '').toUpperCase();
      const berubah = eventType === 'INSERT' || (eventType === 'UPDATE' && statusBaru !== statusLama);
      if (berubah && statusBaru) {
        const statusLabel = {
          RELEASE: 'dibuat & siap di-pickup', PICKUP: 'diambil teknisi',
          PROSES: 'sedang dikerjakan', SELESAI: 'selesai'
        }[statusBaru] || ('status ' + statusBaru);
        const teknisi = Array.isArray(row.teknisi) ? row.teknisi.filter(Boolean).join(', ') : (row.teknisi || '');
        sinuNotificationAdd({
          id: `dismantle-update:${row.wo_id || row.id}:${statusBaru}:${row.created_at || Date.now()}`,
          type: 'dismantle-update',
          title: 'Update Dismantle',
          message: `${row.wo_id || 'DIS'} — ${row.nama_pelanggan || 'Pelanggan'} ${statusLabel}${teknisi ? ' (' + teknisi + ')' : ''}.`,
          entityId: row.wo_id || row.id,
          createdAt: row.created_at || new Date().toISOString()
        });
      }
    }
  }

  // Item dismantle: tambahan perangkat hasil dismantle & hasil pengecekan NOC.
  if (table === 'dismantle_items' && sinuNotificationRecipient('dismantle-item')) {
    if (eventType === 'INSERT') {
      sinuNotificationAdd({
        id: `dismantle-item:${row.id}:NEW`,
        type: 'dismantle-item',
        title: 'Perangkat Dismantle Masuk',
        message: `${row.sn || 'SN'} (${row.jenis || 'Perangkat'}) menunggu pengecekan NOC.`,
        entityId: row.id,
        createdAt: row.created_at
      });
    } else if (eventType === 'UPDATE'
      && String(previous.hasil_noc || 'PENDING').toUpperCase() !== String(row.hasil_noc || '').toUpperCase()
      && row.hasil_noc && row.hasil_noc !== 'PENDING') {
      sinuNotificationAdd({
        id: `dismantle-item:${row.id}:${row.hasil_noc}:${row.checked_at || Date.now()}`,
        type: 'dismantle-item',
        title: 'Hasil Cek Perangkat',
        message: `${row.sn || 'SN'} dinyatakan ${row.hasil_noc}${row.noc_name ? ' oleh ' + row.noc_name : ''}.`,
        entityId: row.id,
        createdAt: row.checked_at || new Date().toISOString()
      });
    }
  }

  // Semua pergerakan perangkat (pickup/send/return/terpasang/dipakai/replace).
  if (table === 'device_history' && eventType === 'INSERT' && sinuNotificationRecipient('device-movement')) {
    const aksiLabel = {
      PICKUP: 'Pickup Perangkat', SEND: 'Kirim Perangkat', RETURN: 'Return Perangkat',
      TERPASANG: 'Perangkat Terpasang', DIPAKAI: 'Kabel Dipakai', REPLACE: 'Penggantian Perangkat'
    }[String(row.aksi || '').toUpperCase()] || 'Pergerakan Perangkat';
    const rute = `${row.dari || 'Gudang'} → ${row.ke || '-'}`;
    sinuNotificationAdd({
      id: `device:${row.id || (row.sn + ':' + (row.created_at || Date.now()))}`,
      type: 'device-movement',
      title: aksiLabel,
      message: `${row.sn || 'SN'} — ${rute}${row.keterangan ? ' • ' + row.keterangan : ''}`,
      entityId: row.sn,
      createdAt: row.created_at
    });
  }

  if (table === 'provisioning_requests') {
    if (eventType === 'INSERT' && sinuNotificationRecipient('provisioning')) {
      sinuNotificationAdd({
        id: `provisioning:${row.id}:PENDING`,
        type: 'provisioning',
        title: 'Request Provisioning Baru',
        message: `${row.wo_id || 'WO'} — ${row.teknisi_name || 'Teknisi'} meminta provisioning.`,
        entityId: row.id,
        createdAt: row.created_at
      });
    }

    const isDone = eventType === 'UPDATE' && previous.status !== 'DONE' && row.status === 'DONE';
    const isOwner = String(row.teknisi_name || '').trim().toLowerCase() === String(currentUser.displayName || '').trim().toLowerCase();
    if (isDone && isOwner && sinuNotificationRecipient('provisioning-done')) {
      sinuNotificationAdd({
        id: `provisioning:${row.id}:DONE`,
        type: 'provisioning-done',
        title: 'Provisioning Selesai',
        message: `${row.wo_id || 'WO'} sudah selesai diproses.`,
        entityId: row.id,
        createdAt: new Date().toISOString()
      });
    }
  }
}

function destroySinuNotificationRealtime() {
  if (typeof supa !== 'undefined') {
    if (sinuNotificationChannelWO) supa.removeChannel(sinuNotificationChannelWO);
    if (sinuNotificationChannelProvisioning) supa.removeChannel(sinuNotificationChannelProvisioning);
    if (sinuNotificationChannelDismantle) supa.removeChannel(sinuNotificationChannelDismantle);
    if (sinuNotificationChannelDismantleItems) supa.removeChannel(sinuNotificationChannelDismantleItems);
    if (sinuNotificationChannelDeviceHistory) supa.removeChannel(sinuNotificationChannelDeviceHistory);
  }
  sinuNotificationChannelWO = null;
  sinuNotificationChannelProvisioning = null;
  sinuNotificationChannelDismantle = null;
  sinuNotificationChannelDismantleItems = null;
  sinuNotificationChannelDeviceHistory = null;
  sinuNotificationUserKey = '';
}

function initNotificationSystem() {
  if (typeof supa === 'undefined' || !currentUser) return;
  const userKey = String(currentUser.username || currentUser.displayName || '').toLowerCase();
  if (!userKey) return;
  if (sinuNotificationUserKey === userKey && sinuNotificationChannelWO && sinuNotificationChannelProvisioning
      && sinuNotificationChannelDismantle && sinuNotificationChannelDismantleItems && sinuNotificationChannelDeviceHistory) {
    sinuNotificationRender();
    return;
  }

  destroySinuNotificationRealtime();
  sinuNotificationUserKey = userKey;
  const channelKey = userKey.replace(/[^a-z0-9_-]/g, '-').slice(0, 40);
  sinuNotificationLoad();
  sinuNotificationRender();

  sinuNotificationChannelWO = supa.channel('sinu-notifications-wo-' + channelKey)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'work_orders' }, payload => handleSinuRealtimeNotification('work_orders', payload))
    .subscribe(status => console.log('[Notification] Channel WO:', status));

  sinuNotificationChannelProvisioning = supa.channel('sinu-notifications-provisioning-' + channelKey)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'provisioning_requests' }, payload => handleSinuRealtimeNotification('provisioning_requests', payload))
    .subscribe(status => console.log('[Notification] Channel provisioning:', status));

  sinuNotificationChannelDismantle = supa.channel('sinu-notifications-dismantle-' + channelKey)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tiket_dismantle' }, payload => handleSinuRealtimeNotification('tiket_dismantle', payload))
    .subscribe(status => console.log('[Notification] Channel dismantle:', status));

  sinuNotificationChannelDismantleItems = supa.channel('sinu-notifications-dismantle-items-' + channelKey)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'dismantle_items' }, payload => handleSinuRealtimeNotification('dismantle_items', payload))
    .subscribe(status => console.log('[Notification] Channel dismantle_items:', status));

  sinuNotificationChannelDeviceHistory = supa.channel('sinu-notifications-device-history-' + channelKey)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'device_history' }, payload => handleSinuRealtimeNotification('device_history', payload))
    .subscribe(status => console.log('[Notification] Channel device_history:', status));
}

function monitorSinuNotificationSession() {
  if (currentUser) initNotificationSystem();
  else if (sinuNotificationUserKey) destroySinuNotificationRealtime();
}

function startSinuNotificationSystem() {
  monitorSinuNotificationSession();
  if (sinuNotificationTimer) clearInterval(sinuNotificationTimer);
  sinuNotificationTimer = setInterval(monitorSinuNotificationSession, 1200);
}

document.addEventListener('click', event => {
  const panel = document.getElementById('notification-panel');
  const bell = document.getElementById('notification-bell');
  if (panel && !panel.classList.contains('hidden') && !panel.contains(event.target) && !bell?.contains(event.target)) {
    panel.classList.add('hidden');
  }
});

window.addEventListener('load', startSinuNotificationSystem);
