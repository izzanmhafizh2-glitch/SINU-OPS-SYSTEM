// ===================== MENU VISIBILITY CONTROL =====================
// Dikelola dari panel Super Admin (Owner)
// Menyimpan config ke tabel menu_visibility di Supabase
// item_key format:
//   menu:{tabId}
//   submenu:{tabId}:{subId}
//   konten:{tabId}:{subId}:{contentId}

// ── DEFINISI TREE MENU PER ROLE ──────────────────────────────────────
const MENU_TREE = {
  teknisi: {
    label: 'Teknisi',
    icon: 'fa-screwdriver-wrench',
    menus: [
      {
        id: 'dashboard', label: 'Dashboard', icon: 'fa-chart-pie',
        submenus: [],
        konten: [
          { id: 'dash-wo-section',         label: 'Work Order Hari Ini' },
          { id: 'dash-komposisi-kehadiran', label: 'Komposisi Kehadiran' },
          { id: 'dash-top3-employee',       label: 'Top 3 Employee of the Month' },
          { id: 'dash-kpi-klasemen',        label: 'Klasemen KPI Singkat' },
          { id: 'dash-tren-kehadiran',      label: 'Tren Kehadiran & Rekapitulasi' },
        ]
      },
      {
        id: 'absensi', label: 'Absensi', icon: 'fa-user-check',
        submenus: [
          { id: 'absen-form',       label: 'Form Absensi',  konten: [] },
          { id: 'izin-sakit',       label: 'Izin Sakit',    konten: [] },
          { id: 'izin-cuti',        label: 'Izin Cuti',     konten: [] },
          { id: 'point-absensi',    label: 'Point Saya',    konten: [] },
          { id: 'jadwal-absensi',   label: 'Jadwal',        konten: [] },
          { id: 'tukar-shift',      label: 'Tukar Shift',   konten: [] },
        ]
      },
      {
        id: 'tugas', label: 'Tugas', icon: 'fa-list-check',
        submenus: [
          { id: 'pickup-tugas',      label: 'Pickup',           konten: [] },
          { id: 'tugas-saya',        label: 'Tugas Saya',       konten: [
            { id: 'form-work-instalasi',  label: 'Form Instalasi Baru' },
            { id: 'form-work-maintenance',label: 'Form Maintenance' },
            { id: 'form-work-perluasan',  label: 'Form Perluasan Reseller' },
          ]},
          { id: 'pickup-dismantle',  label: 'Pickup Dismantle', konten: [] },
          { id: 'tugas-dismantle',   label: 'Dismantle',        konten: [] },
          { id: 'riwayat-tugas',     label: 'Riwayat',          konten: [] },
        ]
      },
      {
        id: 'material', label: 'Material', icon: 'fa-boxes-packing',
        submenus: [
          { id: 'pickup-perangkat',       label: 'Pickup',         konten: [] },
          { id: 'waiting-approval',       label: 'Waiting',        konten: [] },
          { id: 'list-perangkat-saya',    label: 'Perangkat Saya', konten: [] },
          { id: 'send-perangkat',         label: 'Send',           konten: [] },
          { id: 'return-perangkat',       label: 'Return',         konten: [] },
        ]
      },
    ]
  },

  cs: {
    label: 'CS',
    icon: 'fa-headset',
    menus: [
      {
        id: 'absensi', label: 'Absensi', icon: 'fa-user-check',
        submenus: [
          { id: 'absen-form',     label: 'Form Absensi', konten: [] },
          { id: 'izin-sakit',     label: 'Izin Sakit',   konten: [] },
          { id: 'izin-cuti',      label: 'Izin Cuti',    konten: [] },
          { id: 'point-absensi',  label: 'Point Saya',   konten: [] },
          { id: 'jadwal-absensi', label: 'Jadwal',       konten: [] },
          { id: 'tukar-shift',    label: 'Tukar Shift',  konten: [] },
        ]
      },
      {
        id: 'baru', label: 'CS / Buat WO', icon: 'fa-headset',
        submenus: [
          { id: 'buat-tugas',              label: 'Buat WO',         konten: [
            { id: 'wo-fields-instalasi',   label: 'Form Instalasi Baru' },
            { id: 'wo-fields-reseller',    label: 'Form Instalasi Reseller' },
            { id: 'wo-fields-perluasan',   label: 'Form Perluasan Reseller' },
            { id: 'wo-fields-maintenance', label: 'Form Maintenance' },
          ]},
          { id: 'buat-dismantle',          label: 'Buat Dismantle',  konten: [] },
          { id: 'list-tiket',              label: 'List Tiket',      konten: [] },
          { id: 'list-tiket-dismantle',    label: 'List Dismantle',  konten: [] },
          { id: 'data-pelanggan',          label: 'Data Pelanggan',  konten: [] },
          { id: 'pembayaran',              label: 'Pembayaran',      konten: [] },
          { id: 'registrasi',              label: 'Registrasi',      konten: [] },
        ]
      },
    ]
  },

  admin: {
    label: 'Admin',
    icon: 'fa-user-gear',
    menus: [
      {
        id: 'dashboard', label: 'Dashboard', icon: 'fa-chart-pie',
        submenus: [],
        konten: [
          { id: 'dash-wo-section',         label: 'Work Order Hari Ini' },
          { id: 'dash-komposisi-kehadiran', label: 'Komposisi Kehadiran' },
          { id: 'dash-top3-employee',       label: 'Top 3 Employee of the Month' },
          { id: 'dash-kpi-klasemen',        label: 'Klasemen KPI Singkat' },
          { id: 'dash-tren-kehadiran',      label: 'Tren Kehadiran & Rekapitulasi' },
        ]
      },
      {
        id: 'absensi', label: 'Absensi', icon: 'fa-user-check',
        submenus: [
          { id: 'absen-form',     label: 'Form Absensi', konten: [] },
          { id: 'izin-sakit',     label: 'Izin Sakit',   konten: [] },
          { id: 'izin-cuti',      label: 'Izin Cuti',    konten: [] },
          { id: 'point-absensi',  label: 'Point Saya',   konten: [] },
          { id: 'jadwal-absensi', label: 'Jadwal',       konten: [] },
          { id: 'monitoring',     label: 'Monitoring',   konten: [] },
        ]
      },
      {
        id: 'admin-tugas', label: 'Admin › Tugas', icon: 'fa-list-check',
        submenus: [
          { id: 'list-tiket',           label: 'List Tiket',     konten: [] },
          { id: 'list-tiket-dismantle', label: 'List Dismantle', konten: [] },
          { id: 'data-pelanggan',       label: 'Data Pelanggan', konten: [] },
          { id: 'pembayaran',           label: 'Pembayaran',     konten: [] },
          { id: 'rl-radius',            label: 'RL Radius',      konten: [] },
        ]
      },
      {
        id: 'admin-asset', label: 'Admin › Asset', icon: 'fa-boxes-packing',
        submenus: [
          { id: 'tambah-perangkat',  label: 'Tambah Perangkat', konten: [] },
          { id: 'list-perangkat',    label: 'List Perangkat',   konten: [] },
          { id: 'list-rusak',        label: 'Rusak',            konten: [] },
          { id: 'dismantle-items',   label: 'Dismantle Items',  konten: [] },
          { id: 'approval-pickup',   label: 'Approval Pickup',  konten: [] },
        ]
      },
      {
        id: 'admin-jadwal', label: 'Admin › Jadwal', icon: 'fa-calendar-days',
        submenus: [
          { id: 'jadwal-shift',          label: 'Jadwal Shift',       konten: [] },
          { id: 'pengaturan-jam-kerja',  label: 'Pengaturan Jam',     konten: [] },
          { id: 'approval-tukar-shift',  label: 'Approval Tukar Shift', konten: [] },
        ]
      },
      {
        id: 'odp', label: 'ODP', icon: 'fa-tower-broadcast',
        submenus: []
      },
      {
        id: 'admin-konfirmasi-bayar', label: 'Konfirmasi Bayar', icon: 'fa-check-circle',
        submenus: []
      },
      {
        id: 'admin-area-mitra', label: 'Area Mitra', icon: 'fa-map-location-dot',
        submenus: []
      },
    ]
  },

  noc: {
    label: 'NOC',
    icon: 'fa-tower-cell',
    menus: [
      {
        id: 'dashboard', label: 'Dashboard', icon: 'fa-chart-pie',
        submenus: [],
        konten: [
          { id: 'dash-wo-section',         label: 'Work Order Hari Ini' },
          { id: 'dash-komposisi-kehadiran', label: 'Komposisi Kehadiran' },
          { id: 'dash-top3-employee',       label: 'Top 3 Employee of the Month' },
          { id: 'dash-kpi-klasemen',        label: 'Klasemen KPI Singkat' },
          { id: 'dash-tren-kehadiran',      label: 'Tren Kehadiran & Rekapitulasi' },
        ]
      },
      {
        id: 'absensi', label: 'Absensi', icon: 'fa-user-check',
        submenus: [
          { id: 'absen-form',     label: 'Form Absensi', konten: [] },
          { id: 'izin-sakit',     label: 'Izin Sakit',   konten: [] },
          { id: 'izin-cuti',      label: 'Izin Cuti',    konten: [] },
          { id: 'point-absensi',  label: 'Point Saya',   konten: [] },
          { id: 'jadwal-absensi', label: 'Jadwal',       konten: [] },
          { id: 'tukar-shift',    label: 'Tukar Shift',  konten: [] },
        ]
      },
      {
        id: 'noc', label: 'NOC', icon: 'fa-headset',
        submenus: [
          { id: 'pickup-noc',          label: 'Pickup',      konten: [] },
          { id: 'tugas-noc',           label: 'Tugas Saya',  konten: [] },
          { id: 'registrasi-noc',      label: 'Registrasi',  konten: [] },
          { id: 'checking-dismantle',  label: 'Checking',    konten: [] },
          { id: 'riwayat-noc',         label: 'Riwayat',     konten: [] },
        ]
      },
      {
        id: 'noc-asset', label: 'Asset', icon: 'fa-boxes-packing',
        submenus: [
          { id: 'list-perangkat',   label: 'List Perangkat',  konten: [] },
          { id: 'list-rusak',       label: 'Rusak',           konten: [] },
          { id: 'dismantle-items',  label: 'Dismantle Items', konten: [] },
          { id: 'logperangkat',     label: 'Log Aset',        konten: [] },
        ]
      },
    ]
  }
};

// ── STATE: config yang sudah di-load dari DB ──────────────────────────
// { 'teknisi': { 'menu:tugas': false, 'submenu:tugas:pickup-tugas': false, ... }, ... }
let _menuVisibilityConfig = {};
let _menuVisibilityLoaded = false;

// ── LOAD CONFIG DARI SUPABASE ─────────────────────────────────────────
async function loadMenuVisibilityConfig() {
  if(typeof supa === 'undefined') return;
  try {
    const { data, error } = await supa.from('menu_visibility').select('role,item_key,visible');
    if(error) throw error;
    _menuVisibilityConfig = {};
    (data || []).forEach(row => {
      if(!_menuVisibilityConfig[row.role]) _menuVisibilityConfig[row.role] = {};
      _menuVisibilityConfig[row.role][row.item_key] = row.visible;
    });
    _menuVisibilityLoaded = true;
  } catch(e) {
    console.warn('[MenuVisibility] Gagal load config:', e.message);
    _menuVisibilityLoaded = true; // tetap lanjut dengan default visible semua
  }
}

// ── CEK APAKAH ITEM VISIBLE ───────────────────────────────────────────
function isMenuItemVisible(role, itemKey) {
  if(!_menuVisibilityConfig[role]) return true; // default: visible
  const val = _menuVisibilityConfig[role][itemKey];
  return val === undefined ? true : val; // jika tidak ada entry → visible
}

// ── APPLY VISIBILITY KE DOM (dipanggil setelah buildNavigation) ───────
function applyMenuVisibility() {
  if(!currentUser || !_menuVisibilityLoaded) return;
  const role = String(currentUser.role || '').toLowerCase();

  // Hanya berlaku untuk 4 role ini
  if(!['teknisi','cs','admin','noc'].includes(role)) return;

  const cfg = _menuVisibilityConfig[role] || {};

  // 1. Menu utama — sembunyikan tab button di nav
  const menuTree = MENU_TREE[role];
  if(!menuTree) return;

  menuTree.menus.forEach(menu => {
    const menuKey = `menu:${menu.id}`;
    const visible = isMenuItemVisible(role, menuKey);

    // Tab button di nav
    const tabBtn = document.getElementById('main-tab-' + menu.id);
    if(tabBtn) tabBtn.style.display = visible ? '' : 'none';

    // Untuk menu admin yang dipecah (admin-tugas, admin-asset, admin-jadwal)
    // mapping ke button di subnav admin
    const adminMenuMap = {
      'admin-tugas':            'admin-menu-tugas',
      'admin-asset':            'admin-menu-asset',
      'admin-jadwal':           'admin-menu-jadwal',
      'odp':                    'admin-menu-odp',
      'noc-asset':              'admin-menu-asset',
      'admin-konfirmasi-bayar': 'admin-menu-konfirmasi-bayar',
      'admin-area-mitra':       'admin-menu-area-mitra',
    };
    if(adminMenuMap[menu.id]) {
      const btn = document.getElementById(adminMenuMap[menu.id]);
      if(btn) btn.style.display = visible ? '' : 'none';
    }

    // Sembunyikan content panel juga kalau menu di-hide
    const adminContentMap = {
      'admin-konfirmasi-bayar': 'admin-sub-konfirmasi-bayar',
      'admin-area-mitra':       'admin-sub-area-mitra',
    };
    if(adminContentMap[menu.id] && !visible) {
      const contentEl = document.getElementById(adminContentMap[menu.id]);
      if(contentEl) contentEl.classList.add('hidden');
    }

    // 2. Sub menu
    menu.submenus.forEach(sub => {
      const subKey = `submenu:${menu.id}:${sub.id}`;
      const subVisible = isMenuItemVisible(role, subKey);

      // Tentukan ID button sub menu berdasarkan role/menu
      let subBtnId = '';
      if(menu.id === 'absensi')       subBtnId = 'sub-abs-' + sub.id;
      else if(menu.id === 'tugas')    subBtnId = 'sub-tugas-' + sub.id;
      else if(menu.id === 'material') subBtnId = 'sub-mat-' + sub.id;
      else if(menu.id === 'noc')      subBtnId = 'sub-noc-' + sub.id;
      else if(menu.id === 'baru' || menu.id === 'admin-tugas' || menu.id === 'admin-asset' || menu.id === 'admin-jadwal' || menu.id === 'noc-asset')
                                      subBtnId = 'sub-adm-' + sub.id;

      const subBtn = document.getElementById(subBtnId);
      if(subBtn) subBtn.style.display = subVisible ? '' : 'none';

      // Sub content juga disembunyikan kalau sub menu hidden
      let subContentId = '';
      if(menu.id === 'absensi')       subContentId = 'sub-abs-content-' + sub.id;
      else if(menu.id === 'tugas')    subContentId = 'sub-content-' + sub.id;
      else if(menu.id === 'material') subContentId = 'sub-mat-content-' + sub.id;
      else if(menu.id === 'noc')      subContentId = 'sub-content-' + sub.id;
      else if(menu.id === 'baru' || menu.id === 'admin-tugas' || menu.id === 'admin-asset' || menu.id === 'admin-jadwal' || menu.id === 'noc-asset')
                                      subContentId = 'sub-adm-content-' + sub.id;

      if(!subVisible && subContentId) {
        const subContent = document.getElementById(subContentId);
        if(subContent) subContent.classList.add('hidden');
      }

      // 3. Konten dalam sub menu
      sub.konten.forEach(konten => {
        const kontenKey = `konten:${menu.id}:${sub.id}:${konten.id}`;
        const kontenVisible = isMenuItemVisible(role, kontenKey);
        const kontenEl = document.getElementById(konten.id);
        if(kontenEl) kontenEl.style.display = kontenVisible ? '' : 'none';
      });
    });

    // 4. Konten langsung di level menu (misal konten dashboard)
    (menu.konten || []).forEach(function(konten) {
      var kontenKey = 'konten:' + menu.id + ':' + konten.id;
      var kontenVisible = isMenuItemVisible(role, kontenKey);
      var kontenEl = document.getElementById(konten.id);
      if(kontenEl) kontenEl.style.display = kontenVisible ? '' : 'none';
    });
  });
}

// ── SAVE SATU ITEM KE SUPABASE ────────────────────────────────────────
async function saveMenuVisibilityItem(role, itemKey, visible) {
  if(typeof supa === 'undefined') return;
  try {
    const { error } = await supa.from('menu_visibility')
      .upsert({ role, item_key: itemKey, visible, updated_at: new Date().toISOString() },
               { onConflict: 'role,item_key' });
    if(error) throw error;
    if(!_menuVisibilityConfig[role]) _menuVisibilityConfig[role] = {};
    _menuVisibilityConfig[role][itemKey] = visible;
  } catch(e) {
    showAlert('Gagal menyimpan: ' + e.message, 'Error');
    throw e;
  }
}

// ── RENDER PANEL VISIBILITY DI SUPER ADMIN ───────────────────────────
let _mvSelectedRole = 'teknisi';

function _mvToggleHtml(role, key, visible, size) {
  var sizeClass = size === 'sm' ? 'w-9 h-4' : size === 'xs' ? 'w-8 h-3.5' : 'w-10 h-5';
  var thumbSize = size === 'sm' ? 'w-3 h-3' : size === 'xs' ? 'w-2.5 h-2.5' : 'w-4 h-4';
  var translateClass = size === 'xs' ? 'translate-x-[18px]' : 'translate-x-5';
  var safeId = 'mv-label-' + key.replace(/:/g,'-');
  return '<label class="mv-toggle flex items-center gap-2 cursor-pointer">' +
    '<span class="text-[10px] font-semibold ' + (visible ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500') + '" id="' + safeId + '">' + (visible ? 'Tampil' : 'Hidden') + '</span>' +
    '<div class="relative">' +
      '<input type="checkbox" class="sr-only mv-checkbox" data-role="' + role + '" data-key="' + key + '" data-level="' + key.split(':')[0] + '" ' + (visible ? 'checked' : '') + ' onchange="onMVToggleChange(this)">' +
      '<div class="mv-track ' + sizeClass + ' rounded-full transition-colors ' + (visible ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600') + '"></div>' +
      '<div class="mv-thumb absolute top-0.5 left-0.5 ' + thumbSize + ' bg-white rounded-full shadow transition-transform ' + (visible ? translateClass : '') + '"></div>' +
    '</div>' +
  '</label>';
}

function renderMenuVisibilityPanel() {
  var container = document.getElementById('mv-panel-content');
  if(!container) return;

  var roleTree = MENU_TREE[_mvSelectedRole];
  if(!roleTree) return;

  var cfg = _menuVisibilityConfig[_mvSelectedRole] || {};
  var getVal = function(key) { var v = cfg[key]; return v === undefined ? true : v; };
  var role = _mvSelectedRole;

  var html = '';

  roleTree.menus.forEach(function(menu) {
    var menuKey = 'menu:' + menu.id;
    var menuVisible = getVal(menuKey);

    html += '<div class="mv-menu-block border border-slate-200 dark:border-slate-600 rounded-2xl overflow-hidden mb-3">';

    // Header menu utama
    html += '<div class="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-700/60">';
    html += '<div class="flex items-center gap-2">';
    html += '<i class="fa-solid ' + menu.icon + ' text-blue-600 dark:text-blue-400 text-sm w-4"></i>';
    html += '<span class="text-xs font-extrabold text-slate-800 dark:text-slate-100">' + menu.label + '</span>';
    html += '<span class="text-[10px] text-slate-400 font-medium">Menu Utama</span>';
    html += '</div>';
    html += _mvToggleHtml(role, menuKey, menuVisible, 'md');
    html += '</div>';

    if(menu.submenus.length) {
      html += '<div class="divide-y divide-slate-100 dark:divide-slate-700">';

      menu.submenus.forEach(function(sub) {
        var subKey = 'submenu:' + menu.id + ':' + sub.id;
        var subVisible = getVal(subKey);

        html += '<div class="mv-sub-block">';
        // Sub menu row
        html += '<div class="flex items-center justify-between px-4 py-2.5 pl-8 bg-white dark:bg-slate-800">';
        html += '<div class="flex items-center gap-2">';
        html += '<i class="fa-solid fa-chevron-right text-slate-300 text-[9px]"></i>';
        html += '<span class="text-[11px] font-bold text-slate-700 dark:text-slate-200">' + sub.label + '</span>';
        html += '<span class="text-[10px] text-slate-400">Sub Menu</span>';
        html += '</div>';
        html += _mvToggleHtml(role, subKey, subVisible, 'sm');
        html += '</div>';

        if(sub.konten.length) {
          sub.konten.forEach(function(k) {
            var kKey = 'konten:' + menu.id + ':' + sub.id + ':' + k.id;
            var kVisible = getVal(kKey);

            html += '<div class="flex items-center justify-between px-4 py-2 pl-14 bg-slate-50/50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700">';
            html += '<div class="flex items-center gap-2">';
            html += '<i class="fa-solid fa-minus text-slate-200 text-[9px]"></i>';
            html += '<span class="text-[10px] font-semibold text-slate-600 dark:text-slate-300">' + k.label + '</span>';
            html += '<span class="text-[9px] text-slate-400 italic">Konten</span>';
            html += '</div>';
            html += _mvToggleHtml(role, kKey, kVisible, 'xs');
            html += '</div>';
          });
        }

        html += '</div>'; // mv-sub-block
      });

      html += '</div>'; // divide-y
    }

    // 4. Konten langsung di level menu (misal konten dashboard)
    if((menu.konten || []).length) {
      html += '<div class="divide-y divide-slate-100 dark:divide-slate-700">';
      menu.konten.forEach(function(k) {
        var kKey = 'konten:' + menu.id + ':' + k.id;
        var kVisible = getVal(kKey);
        html += '<div class="flex items-center justify-between px-4 py-2 pl-8 bg-white dark:bg-slate-800">';
        html += '<div class="flex items-center gap-2">';
        html += '<i class="fa-solid fa-minus text-slate-300 text-[9px]"></i>';
        html += '<span class="text-[11px] font-bold text-slate-700 dark:text-slate-200">' + k.label + '</span>';
        html += '<span class="text-[10px] text-slate-400 italic">Konten</span>';
        html += '</div>';
        html += _mvToggleHtml(role, kKey, kVisible, 'sm');
        html += '</div>';
      });
      html += '</div>';
    }

    html += '</div>'; // mv-menu-block
  });

  container.innerHTML = html;
}

// ── HANDLER TOGGLE CHANGE ─────────────────────────────────────────────
async function onMVToggleChange(checkbox) {
  const role    = checkbox.dataset.role;
  const itemKey = checkbox.dataset.key;
  const visible = checkbox.checked;
  const labelId = 'mv-label-' + itemKey.replace(/:/g, '-');

  // Update UI label dan track warna langsung
  const label = document.getElementById(labelId);
  const track = checkbox.parentElement.querySelector('.mv-track');
  const thumb = checkbox.parentElement.querySelector('.mv-thumb');

  if(label) {
    label.textContent = visible ? 'Tampil' : 'Hidden';
    label.className = `text-[10px] font-semibold ${visible ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`;
  }
  if(track) {
    track.className = track.className.replace(/bg-\w+-\d+/g, '');
    track.classList.add(visible ? 'bg-emerald-500' : 'bg-slate-300', 'dark:bg-slate-600');
  }
  if(thumb) {
    if(visible) thumb.classList.add('translate-x-5');
    else thumb.classList.remove('translate-x-5');
  }

  // Kalau menu utama di-hide → otomatis hide semua sub menunya juga
  if(checkbox.dataset.level === 'menu' && !visible) {
    const roleTree = MENU_TREE[role];
    const menu = roleTree && roleTree.menus.find(m => `menu:${m.id}` === itemKey);
    if(menu) {
      for(const sub of (menu.submenus || [])) {
        const subKey = `submenu:${menu.id}:${sub.id}`;
        await saveMenuVisibilityItem(role, subKey, false);
        for(const k of (sub.konten || [])) {
          const kKey = `konten:${menu.id}:${sub.id}:${k.id}`;
          await saveMenuVisibilityItem(role, kKey, false);
        }
      }
    }
  }

  // Kalau sub menu di-hide → hide semua konten di dalamnya
  if(checkbox.dataset.level === 'submenu' && !visible) {
    const parts = itemKey.split(':'); // submenu:{menuId}:{subId}
    const menuId = parts[1], subId = parts[2];
    const roleTree = MENU_TREE[role];
    const menu = roleTree && roleTree.menus.find(m => m.id === menuId);
    const sub  = menu && menu.submenus.find(s => s.id === subId);
    if(sub) {
      for(const k of (sub.konten || [])) {
        const kKey = `konten:${menuId}:${subId}:${k.id}`;
        await saveMenuVisibilityItem(role, kKey, false);
      }
    }
  }

  // Simpan item ini
  try {
    await saveMenuVisibilityItem(role, itemKey, visible);
    // Re-render panel untuk sinkronisasi state
    renderMenuVisibilityPanel();
  } catch(e) {
    // Error sudah ditampilkan oleh saveMenuVisibilityItem
    checkbox.checked = !visible; // rollback UI
  }
}

// ── SWITCH ROLE DI PANEL ──────────────────────────────────────────────
function mvSelectRole(role) {
  _mvSelectedRole = role;
  // Update active tab
  document.querySelectorAll('.mv-role-btn').forEach(b => {
    b.classList.remove('active','bg-blue-600','text-white');
    b.classList.add('bg-slate-100','dark:bg-slate-700','text-slate-600','dark:text-slate-300');
  });
  const activeBtn = document.getElementById('mv-role-' + role);
  if(activeBtn) {
    activeBtn.classList.add('active','bg-blue-600','text-white');
    activeBtn.classList.remove('bg-slate-100','dark:bg-slate-700','text-slate-600','dark:text-slate-300');
  }
  renderMenuVisibilityPanel();
}

// ── RESET SEMUA KE DEFAULT (visible semua) untuk satu role ───────────
async function mvResetRole(role) {
  if(!confirm(`Reset semua pengaturan tampilan menu untuk role "${role}" ke default (semua tampil)?`)) return;
  if(typeof supa === 'undefined') return;
  try {
    const { error } = await supa.from('menu_visibility').delete().eq('role', role);
    if(error) throw error;
    _menuVisibilityConfig[role] = {};
    renderMenuVisibilityPanel();
    showAlert(`Pengaturan menu ${role} berhasil direset ke default.`, 'Reset Berhasil');
  } catch(e) {
    showAlert('Gagal reset: ' + e.message, 'Error');
  }
}
