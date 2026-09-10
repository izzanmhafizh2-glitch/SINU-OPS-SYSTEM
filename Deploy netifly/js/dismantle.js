// ===================== DISMANTLE MODULE =====================
// Menangani semua logika tiket dismantle, pickup, form teknisi, checking NOC

// ── ADMIN: INIT FORM BUAT DISMANTLE ─────────────────────────────────
function initBuatDismantle() {
  var now = new Date();
  var avatar = document.getElementById('dis-cs-avatar');
  var name   = document.getElementById('dis-cs-name');
  var ts     = document.getElementById('dis-timestamp-now');
  if(avatar && currentUser) avatar.textContent = currentUser.avatar || '--';
  if(name   && currentUser) name.textContent   = currentUser.displayName || '--';
  if(ts) ts.textContent = now.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}) + ' WIB';
  loadTiketDismantleAdmin();
}

// ── ADMIN: BUAT TIKET DISMANTLE ──────────────────────────────────────
async function handleCreateDismantle(e) {
  e.preventDefault();
  var nama      = document.getElementById('dis-nama-pelanggan').value.trim();
  var noLayanan = document.getElementById('dis-no-layanan').value.trim();
  var noTelp    = document.getElementById('dis-no-telp').value.trim();
  var alamat    = document.getElementById('dis-alamat').value.trim();
  var koord     = document.getElementById('dis-koordinat').value.trim();
  if(!nama || !alamat || !koord) { showAlert('Nama, Alamat, dan Koordinat wajib diisi.','Validasi'); return; }

  showLoading('Membuat tiket dismantle...');
  var now = new Date();
  var woId = 'DIS-' + String(now.getFullYear()).slice(-2)
    + String(now.getMonth()+1).padStart(2,'0')
    + String(now.getDate()).padStart(2,'0')
    + '-' + String(Math.floor(Math.random()*900)+100);

  try {
    var payload = {
      wo_id          : woId,
      nama_pelanggan : nama,
      no_layanan     : noLayanan || null,
      no_telp        : noTelp || null,
      alamat         : alamat,
      koordinat      : koord,
      cs_name        : currentUser ? currentUser.displayName : '',
      status         : 'RELEASE'
    };
    var res = await supa.from('tiket_dismantle').insert(payload);

    // Kompatibilitas tabel lama sebelum kolom no_layanan ditambahkan.
    if(res.error && /no_layanan|column .*schema cache/i.test(res.error.message || '')) {
      var legacyPayload = Object.assign({}, payload);
      delete legacyPayload.no_layanan;
      legacyPayload.id_pelanggan = noLayanan || null;
      res = await supa.from('tiket_dismantle').insert(legacyPayload);
    }
    if(res.error) throw res.error;
    hideLoading();
    showAlert('Tiket Dismantle ' + woId + ' berhasil dibuat!\nAkan muncul di Pickup Tugas Dismantle teknisi.', 'Dismantle Dibuat');
    document.getElementById('form-buat-dismantle').reset();
    loadTiketDismantleAdmin();
  } catch(err) {
    hideLoading();
    showAlert('Gagal membuat tiket: ' + err.message, 'Error');
  }
}

// ── ADMIN: LOAD TIKET DISMANTLE AKTIF ───────────────────────────────
async function loadTiketDismantleAdmin() {
  var el = document.getElementById('tiket-dismantle-admin-list');
  if(!el) return;
  el.innerHTML = '<p class="text-xs text-slate-400 text-center py-3"><i class="fa-solid fa-spinner animate-spin mr-2"></i>Memuat...</p>';
  try {
    var res = await supa.from('tiket_dismantle')
      .select('*')
      .neq('status','SELESAI')
      .order('created_at', {ascending:false});
    if(res.error) {
      if(res.error.code === 'PGRST106' || res.error.message.includes('does not exist') || res.error.message.includes('Not Found')) {
        el.innerHTML = '<div class="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 text-[11px] text-amber-700 dark:text-amber-300">'
          + '<i class="fa-solid fa-triangle-exclamation mr-1"></i>'
          + 'Tabel belum dibuat. Buka <a href="/setup-dismantle.html" target="_blank" class="font-bold underline">setup-dismantle.html</a> untuk setup.'
          + '</div>';
        return;
      }
      throw res.error;
    }
    var data = res.data || [];
    if(!data.length) { el.innerHTML = '<p class="text-xs text-slate-400 text-center py-4">Belum ada tiket dismantle.</p>'; return; }
    var sCls = { RELEASE:'bg-blue-100 text-blue-700', PICKUP:'bg-indigo-100 text-indigo-700', PROSES:'bg-amber-100 text-amber-700' };
    el.innerHTML = data.map(function(t) {
      return '<div class="p-3.5 bg-orange-50 dark:bg-orange-950/30 rounded-2xl border border-orange-200 dark:border-orange-800 space-y-1.5">'
        + '<div class="flex items-center justify-between">'
          + '<span class="text-[10px] font-extrabold text-orange-600 font-mono">' + t.wo_id + '</span>'
          + '<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold ' + (sCls[t.status]||'bg-slate-100 text-slate-600') + '">' + t.status + '</span>'
        + '</div>'
        + '<p class="text-xs font-extrabold text-slate-800 dark:text-white">' + t.nama_pelanggan + '</p>'
        + ((t.no_layanan || t.id_pelanggan) ? '<p class="text-[10px] text-slate-500">No. Layanan: ' + (t.no_layanan || t.id_pelanggan) + '</p>' : '')
        + '<p class="text-[10px] text-slate-400"><i class="fa-solid fa-location-dot text-rose-400 mr-1"></i>' + t.alamat + '</p>'
        + '<p class="text-[10px] text-slate-400">CS: ' + (t.cs_name||'-') + ' • ' + (t.tanggal||t.created_at?.substring(0,10)||'-') + '</p>'
      + '</div>';
    }).join('');
  } catch(e) {
    el.innerHTML = '<p class="text-xs text-rose-500 text-center py-4">Gagal: ' + e.message + '</p>';
  }
}

// ── TEKNISI: LOAD PICKUP DISMANTLE ──────────────────────────────────
async function loadPickupDismantle() {
  var el = document.getElementById('pickup-dismantle-list');
  if(!el) return;
  el.innerHTML = '<p class="text-xs text-slate-400 text-center py-4"><i class="fa-solid fa-spinner animate-spin mr-2"></i>Memuat...</p>';
  try {
    var res = await supa.from('tiket_dismantle')
      .select('*').eq('status','RELEASE')
      .order('created_at', {ascending:false});
    var data = res.data || [];
    if(!data.length) { el.innerHTML = '<p class="text-xs text-slate-400 text-center py-6"><i class="fa-solid fa-circle-check text-emerald-500 mr-2"></i>Tidak ada tiket dismantle saat ini.</p>'; return; }
    el.innerHTML = data.map(function(t) {
      var mapsUrl = t.koordinat ? 'https://www.google.com/maps?q=' + encodeURIComponent(t.koordinat) : null;
      return '<div class="bg-orange-50 dark:bg-orange-950/30 p-4 rounded-2xl border border-orange-200 dark:border-orange-800 space-y-2">'
        + '<div class="flex items-center justify-between">'
          + '<span class="text-[10px] font-extrabold text-orange-600 font-mono">' + t.wo_id + '</span>'
          + '<span class="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold border border-orange-200">DISMANTLE</span>'
        + '</div>'
        + '<p class="text-sm font-extrabold text-slate-900 dark:text-white">' + t.nama_pelanggan + '</p>'
        + ((t.no_layanan || t.id_pelanggan) ? '<p class="text-[10px] text-slate-500">No. Layanan: ' + (t.no_layanan || t.id_pelanggan) + '</p>' : '')
        + '<p class="text-xs text-slate-500"><i class="fa-solid fa-location-dot text-rose-500 mr-1"></i>' + t.alamat + '</p>'
        + (t.no_telp ? '<p class="text-[10px] text-slate-400"><i class="fa-solid fa-phone mr-1"></i>' + t.no_telp + '</p>' : '')
        + '<div class="flex items-center gap-2 pt-1">'
          + '<p class="text-[10px] text-slate-400 flex-1">CS: ' + (t.cs_name||'-') + ' • ' + (t.tanggal||'-') + '</p>'
          + (mapsUrl ? '<a href="' + mapsUrl + '" target="_blank" class="px-2.5 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-rose-500 hover:text-red-600 text-[10px] font-bold shrink-0 transition-all"><i class="fa-solid fa-location-dot"></i></a>' : '')
          + '<button type="button" onclick="pickupDismantle(\'' + t.id + '\',\'' + t.wo_id + '\',\'' + (t.nama_pelanggan||'').replace(/'/g,"\\'") + '\',\'' + (t.alamat||'').replace(/'/g,"\\'") + '\')" class="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-bold rounded-xl flex items-center gap-1.5 active:scale-95 transition-all shrink-0">'
            + '<i class="fa-solid fa-hand-pointer"></i>Pickup'
          + '</button>'
        + '</div>'
      + '</div>';
    }).join('');
  } catch(e) {
    el.innerHTML = '<p class="text-xs text-rose-500 text-center py-4">Gagal: ' + e.message + '</p>';
  }
}

// ── TEKNISI: PICKUP DISMANTLE ────────────────────────────────────────
async function pickupDismantle(id, woId, namaPelanggan, alamat) {
  var teknisi = currentUser ? currentUser.displayName : '';
  try {
    var res = await supa.from('tiket_dismantle')
      .update({ status: 'PICKUP', teknisi: [teknisi] })
      .eq('id', id);
    if(res.error) throw res.error;
    // Hapus card dari DOM langsung
    document.querySelectorAll('#pickup-dismantle-list > div').forEach(function(card){
      if(card.textContent.includes(woId)) card.remove();
    });
    showAlert('Tiket ' + woId + ' berhasil di-pickup!', 'Pickup Dismantle');
    switchSubTugas('tugas-dismantle');
    loadTugasDismantle();
  } catch(e) { showAlert('Gagal pickup: ' + e.message, 'Error'); }
}

// ── TEKNISI: LOAD TUGAS DISMANTLE SAYA ──────────────────────────────
async function loadTugasDismantle() {
  var el = document.getElementById('tugas-dismantle-list');
  if(!el) return;
  el.innerHTML = '<p class="text-xs text-slate-400 text-center py-4"><i class="fa-solid fa-spinner animate-spin mr-2"></i>Memuat...</p>';
  var teknisi = currentUser ? currentUser.displayName : '';
  try {
    var res = await supa.from('tiket_dismantle')
      .select('*')
      .eq('status','PICKUP')
      .contains('teknisi', [teknisi])
      .order('created_at', {ascending:false});
    var data = res.data || [];
    if(!data.length) { el.innerHTML = '<p class="text-xs text-slate-400 text-center py-6">Belum ada tugas dismantle yang di-pickup.</p>'; return; }
    el.innerHTML = data.map(function(t) {
      var mapsUrl = t.koordinat ? 'https://www.google.com/maps?q=' + encodeURIComponent(t.koordinat) : null;
      return '<div class="bg-slate-50 dark:bg-slate-700/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-3">'
        + '<div class="space-y-1 min-w-0">'
          + '<div class="flex items-center gap-2 flex-wrap">'
            + '<span class="text-[10px] font-extrabold text-orange-600 font-mono">' + t.wo_id + '</span>'
            + '<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-orange-100 text-orange-700">DISMANTLE</span>'
          + '</div>'
          + '<h3 class="text-sm font-extrabold text-slate-900 dark:text-white">' + t.nama_pelanggan + '</h3>'
          + '<p class="text-[10px] text-slate-400"><i class="fa-solid fa-location-dot text-rose-400 mr-1"></i>' + t.alamat + '</p>'
        + '</div>'
        + '<div class="flex items-center gap-2 shrink-0">'
          + (mapsUrl ? '<a href="' + mapsUrl + '" target="_blank" class="px-2.5 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-rose-500 hover:text-red-600 transition-all"><i class="fa-solid fa-location-dot text-sm"></i></a>' : '')
          + '<button type="button" onclick="startDismantleWork(\'' + t.id + '\',\'' + t.wo_id + '\',\'' + (t.nama_pelanggan||'').replace(/'/g,"\\'") + '\',\'' + (t.alamat||'').replace(/'/g,"\\'") + '\')" class="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 active:scale-95 transition-all">'
            + '<i class="fa-solid fa-screwdriver-wrench"></i>Kerjakan'
          + '</button>'
        + '</div>'
      + '</div>';
    }).join('');
  } catch(e) {
    el.innerHTML = '<p class="text-xs text-rose-500 text-center py-4">Gagal: ' + e.message + '</p>';
  }
}

// ── TEKNISI: MULAI KERJAKAN DISMANTLE ───────────────────────────────
var _activeDismantleId  = null;
var _activeDismantleWoId = null;
var _dismantleItems = []; // array perangkat yang ditambah

function startDismantleWork(id, woId, namaPelanggan, alamat) {
  _activeDismantleId   = id;
  _activeDismantleWoId = woId;
  _dismantleItems      = [];

  var infoEl   = document.getElementById('dis-wo-info-form');
  var plgEl    = document.getElementById('dis-pelanggan-info');
  var alamatEl = document.getElementById('dis-alamat-info');
  if(infoEl)   infoEl.textContent   = 'WO: ' + woId;
  if(plgEl)    plgEl.textContent    = namaPelanggan;
  if(alamatEl) alamatEl.textContent = alamat;

  // Reset form & list
  var snEl = document.getElementById('dis-item-sn');
  var merkEl = document.getElementById('dis-item-merk');
  if(snEl) snEl.value = '';
  if(merkEl) merkEl.value = '';
  renderDismantleItemsList();

  // Auto-fill SN dari WO instalasi pelanggan (bisa diedit)
  autoFillSNDismantle(namaPelanggan);

  // Show form, hide list
  var listView = document.getElementById('view-dismantle-list');
  var formView = document.getElementById('view-dismantle-form');
  if(listView) listView.classList.add('hidden');
  if(formView) formView.classList.remove('hidden');
}

// Ambil SN ONT/Kabel dari WO instalasi pelanggan → auto-fill ke daftar
async function autoFillSNDismantle(namaPelanggan) {
  if(!namaPelanggan || typeof supa === 'undefined') return;
  try {
    var res = await supa.from('work_orders')
      .select('*')
      .eq('pelanggan', namaPelanggan)
      .in('tipe', ['INSTALASI', 'INSTALASI_RESELLER', 'PERLUASAN_RESELLER'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    var d = res.data;
    if(!d) return;

    // Auto-tambah SN ONT & Kabel ke daftar dismantle
    if(d.sn_ont && !_dismantleItems.find(function(i){ return i.sn === d.sn_ont; })) {
      _dismantleItems.push({ sn: d.sn_ont, jenis: 'Modem/ONT', merk: '', kondisi: 'Dismantle' });
    }
    if(d.sn_kabel && !_dismantleItems.find(function(i){ return i.sn === d.sn_kabel; })) {
      _dismantleItems.push({ sn: d.sn_kabel, jenis: 'Kabel Dropcore', merk: '', kondisi: 'Dismantle' });
    }
    if(_dismantleItems.length) {
      renderDismantleItemsList();
      // Info bahwa SN otomatis terisi dari data instalasi
      var infoEl = document.getElementById('dismantle-perangkat-list');
      if(infoEl && _dismantleItems.length) {
        var note = document.createElement('p');
        note.className = 'text-[10px] text-emerald-600 font-bold text-center pt-1';
        note.innerHTML = '<i class="fa-solid fa-circle-check mr-1"></i>SN otomatis diambil dari data instalasi (bisa diedit)';
        infoEl.appendChild(note);
      }
    }
  } catch(e) { console.warn('[autoFillSNDismantle]', e.message); }
}

function backFromDismantleForm() {
  var listView = document.getElementById('view-dismantle-list');
  var formView = document.getElementById('view-dismantle-form');
  if(listView) listView.classList.remove('hidden');
  if(formView) formView.classList.add('hidden');
  loadTugasDismantle();
}

// ── TEKNISI: TAMBAH ITEM PERANGKAT KE DAFTAR ────────────────────────
function addDismantleItem() {
  var sn     = (document.getElementById('dis-item-sn')?.value||'').trim().toUpperCase();
  var jenis  = document.getElementById('dis-item-jenis')?.value || 'Modem/ONT';
  var merk   = (document.getElementById('dis-item-merk')?.value||'').trim();
  var kondisi = document.getElementById('dis-item-kondisi')?.value || 'Dismantle';

  if(!sn) { showAlert('Serial Number wajib diisi.', 'Validasi'); return; }
  if(_dismantleItems.find(function(i){ return i.sn === sn; })) {
    showAlert('SN "' + sn + '" sudah ada dalam daftar.', 'Duplikat'); return;
  }
  _dismantleItems.push({ sn, jenis, merk, kondisi });
  renderDismantleItemsList();
  // Reset input
  document.getElementById('dis-item-sn').value   = '';
  document.getElementById('dis-item-merk').value  = '';
}

function removeDismantleItem(idx) {
  _dismantleItems.splice(idx, 1);
  renderDismantleItemsList();
}

function renderDismantleItemsList() {
  var el = document.getElementById('dismantle-perangkat-list');
  if(!el) return;
  if(!_dismantleItems.length) {
    el.innerHTML = '<p class="text-[11px] text-slate-400 text-center py-3">Belum ada perangkat ditambahkan.</p>';
    return;
  }
  el.innerHTML = _dismantleItems.map(function(item, i) {
    var kCls = item.kondisi === 'Rusak'
      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
      : 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300';
    return '<div class="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-700/40 rounded-xl border border-slate-200 dark:border-slate-600 gap-2">'
      + '<div class="flex-1 min-w-0">'
        + '<p class="text-xs font-extrabold text-slate-800 dark:text-slate-100 font-mono">' + item.sn + '</p>'
        + '<p class="text-[10px] text-slate-400">' + item.jenis + (item.merk ? ' • ' + item.merk : '') + '</p>'
      + '</div>'
      + '<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold ' + kCls + ' shrink-0">' + item.kondisi + '</span>'
      + '<button type="button" onclick="removeDismantleItem(' + i + ')" class="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all shrink-0">'
        + '<i class="fa-solid fa-xmark text-xs"></i>'
      + '</button>'
    + '</div>';
  }).join('');
}

// ── TEKNISI: SUBMIT FORM DISMANTLE ──────────────────────────────────
async function submitDismantleForm() {
  if(!_activeDismantleId) { showAlert('Tidak ada tiket aktif.', 'Error'); return; }
  if(!_dismantleItems.length) { showAlert('Tambahkan minimal 1 perangkat terlebih dahulu.', 'Validasi'); return; }

  showLoading('Mengirim data dismantle ke NOC...');
  var teknisi = currentUser ? currentUser.displayName : '';
  try {
    // Insert semua item ke dismantle_items
    var insertRows = _dismantleItems.map(function(item) {
      return {
        tiket_id    : _activeDismantleId,
        wo_id       : _activeDismantleWoId,
        sn          : item.sn,
        jenis       : item.jenis,
        merk        : item.merk || null,
        kondisi_awal: item.kondisi,
        hasil_noc   : 'PENDING'
      };
    });
    var res = await supa.from('dismantle_items').insert(insertRows);
    if(res.error) throw res.error;

    // Update kondisi perangkat di tabel perangkat → Dismantle
    // ONT yang tadinya "Terpasang" berubah jadi Dismantle & masuk kembali ke gudang
    for(var i = 0; i < _dismantleItems.length; i++) {
      var item = _dismantleItems[i];
      try {
        await supa.from('perangkat').upsert({
          sn      : item.sn,
          jenis   : item.jenis,
          merk    : item.merk || '-',
          kondisi : 'Dismantle',
          status  : 'Gudang',
          lokasi  : 'Gudang Utama'
        }, { onConflict: 'sn' });
        // Catat history: perangkat ditarik dari pelanggan
        if(typeof catatHistory === 'function') {
          await catatHistory(item.sn, 'Pelanggan', 'Gudang', 'DISMANTLE',
            'Ditarik dari pelanggan oleh ' + teknisi + ' | WO Dismantle: ' + _activeDismantleWoId);
        }
      } catch(e) { console.warn('[Dismantle] Gagal update perangkat', item.sn, e.message); }
    }

    // Update status tiket → PROSES (sudah dikerjakan teknisi)
    await supa.from('tiket_dismantle')
      .update({ status: 'PROSES', teknisi: [teknisi] })
      .eq('id', _activeDismantleId);

    hideLoading();
    _dismantleItems = [];
    _activeDismantleId = null;
    _activeDismantleWoId = null;
    showAlert('Data dismantle berhasil dikirim ke NOC untuk pengecekan!', 'Selesai');
    backFromDismantleForm();
  } catch(e) {
    hideLoading();
    showAlert('Gagal kirim: ' + e.message, 'Error');
  }
}

// ── NOC: LOAD CHECKING DISMANTLE ────────────────────────────────────
var _allCheckingData = [];
var _activeCheckingFilter = 'PENDING';

async function loadCheckingDismantle() {
  var el = document.getElementById('checking-dismantle-list');
  if(!el) return;
  el.innerHTML = '<p class="text-xs text-slate-400 text-center py-4"><i class="fa-solid fa-spinner animate-spin mr-2"></i>Memuat...</p>';
  try {
    var res = await supa.from('dismantle_items')
      .select('*, tiket_dismantle(wo_id, nama_pelanggan, alamat, cs_name, tanggal)')
      .order('created_at', {ascending:false});
    _allCheckingData = res.data || [];
    renderCheckingDismantle(_activeCheckingFilter);
  } catch(e) {
    el.innerHTML = '<p class="text-xs text-rose-500 text-center py-4">Gagal: ' + e.message + '</p>';
  }
}

function filterCheckingDismantle(filter) {
  _activeCheckingFilter = filter;
  document.querySelectorAll('.filter-chk-btn').forEach(function(b){ b.classList.remove('active','bg-slate-800','text-white','border-slate-800'); b.classList.add('border-slate-200'); });
  var activeBtn = document.getElementById('filter-chk-' + filter);
  if(activeBtn) { activeBtn.classList.add('active','bg-slate-800','text-white','border-slate-800'); activeBtn.classList.remove('border-slate-200'); }
  renderCheckingDismantle(filter);
}

function renderCheckingDismantle(filter) {
  var el = document.getElementById('checking-dismantle-list');
  if(!el) return;
  var data = filter === 'ALL' ? _allCheckingData : _allCheckingData.filter(function(d){ return d.hasil_noc === filter; });
  if(!data.length) { el.innerHTML = '<p class="text-xs text-slate-400 text-center py-6">Tidak ada data.</p>'; return; }

  el.innerHTML = data.map(function(item) {
    var td = item.tiket_dismantle || {};
    var kCls = item.kondisi_awal === 'Rusak' ? 'bg-rose-100 text-rose-700' : 'bg-orange-100 text-orange-700';
    var hCls = item.hasil_noc === 'BERFUNGSI' ? 'bg-emerald-100 text-emerald-700'
             : item.hasil_noc === 'RUSAK'      ? 'bg-rose-100 text-rose-700'
             : 'bg-amber-100 text-amber-700 animate-pulse';
    var btnBerfungsi = item.hasil_noc === 'PENDING'
      ? '<button type="button" onclick="setHasilNOC(\'' + item.id + '\',\'BERFUNGSI\')" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-xl flex items-center gap-1 transition-all"><i class="fa-solid fa-check"></i>Berfungsi</button>' : '';
    var btnRusak = item.hasil_noc === 'PENDING'
      ? '<button type="button" onclick="setHasilNOC(\'' + item.id + '\',\'RUSAK\')" class="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold rounded-xl flex items-center gap-1 transition-all"><i class="fa-solid fa-xmark"></i>Rusak</button>' : '';

    return '<div class="bg-slate-50 dark:bg-slate-700/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-600 space-y-2">'
      + '<div class="flex items-center justify-between gap-2 flex-wrap">'
        + '<div>'
          + '<p class="text-xs font-extrabold text-orange-600 font-mono">' + (td.wo_id||item.wo_id||'-') + '</p>'
          + '<p class="text-[11px] text-slate-500">' + (td.nama_pelanggan||'-') + ' • ' + (td.alamat||'-') + '</p>'
        + '</div>'
        + '<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold ' + hCls + '">' + item.hasil_noc + '</span>'
      + '</div>'
      + '<div class="flex items-center gap-2 flex-wrap">'
        + '<div class="flex-1">'
          + '<p class="text-xs font-extrabold text-slate-800 dark:text-slate-100 font-mono">' + (item.sn||'-') + '</p>'
          + '<p class="text-[10px] text-slate-400">' + (item.jenis||'-') + (item.merk ? ' • ' + item.merk : '') + '</p>'
        + '</div>'
        + '<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold ' + kCls + '">' + (item.kondisi_awal||'Dismantle') + '</span>'
      + '</div>'
      + (item.hasil_noc === 'PENDING'
        ? '<div class="grid grid-cols-2 gap-2 pt-1">' + btnBerfungsi + btnRusak + '</div>'
        : (item.noc_name ? '<p class="text-[10px] text-slate-400">Dicek oleh: ' + item.noc_name + '</p>' : ''))
    + '</div>';
  }).join('');
}

// ── NOC: SET HASIL CHECKING ──────────────────────────────────────────
async function setHasilNOC(itemId, hasil) {
  var noc = currentUser ? currentUser.displayName : '';
  showLoading('Menyimpan hasil pengecekan...');
  try {
    // Update dismantle_items
    var res = await supa.from('dismantle_items').update({
      hasil_noc  : hasil,
      noc_name   : noc,
      checked_at : new Date().toISOString()
    }).eq('id', itemId);
    if(res.error) throw res.error;

    // Ambil data item untuk dapat SN dan jenis
    var itemRes = await supa.from('dismantle_items').select('sn,jenis,merk,wo_id').eq('id',itemId).maybeSingle();
    var item = itemRes.data;

    if(item && item.sn) {
      if(hasil === 'BERFUNGSI') {
        // Masuk ke list perangkat dengan kondisi Dismantle
        await supa.from('perangkat').upsert({
          sn      : item.sn,
          jenis   : item.jenis || '-',
          merk    : item.merk  || '-',
          kondisi : 'Dismantle',
          status  : 'Gudang',
          lokasi  : 'Gudang Utama'
        }, { onConflict: 'sn' });
      } else {
        // Masuk ke list perangkat dengan kondisi Rusak
        await supa.from('perangkat').upsert({
          sn      : item.sn,
          jenis   : item.jenis || '-',
          merk    : item.merk  || '-',
          kondisi : 'Rusak',
          status  : 'Gudang',
          lokasi  : 'Gudang Utama'
        }, { onConflict: 'sn' });
      }
    }

    hideLoading();
    var msg = hasil === 'BERFUNGSI'
      ? 'Perangkat dinyatakan BERFUNGSI\nMasuk ke List Perangkat (kondisi: Dismantle)'
      : 'Perangkat dinyatakan RUSAK\nMasuk ke List Perangkat Rusak';
    showAlert(msg, 'Hasil Checking');
    // Update local data dan re-render
    var idx = _allCheckingData.findIndex(function(d){ return d.id === itemId; });
    if(idx >= 0) { _allCheckingData[idx].hasil_noc = hasil; _allCheckingData[idx].noc_name = noc; }
    renderCheckingDismantle(_activeCheckingFilter);
  } catch(e) {
    hideLoading();
    showAlert('Gagal: ' + e.message, 'Error');
  }
}

// ── ADMIN/NOC: LOAD DISMANTLE ITEMS ─────────────────────────────────
var _allDismantleItemsData = [];

async function loadDismantleItems() {
  var el = document.getElementById('dismantle-items-list');
  if(!el) return;
  el.innerHTML = '<p class="text-xs text-slate-400 text-center py-4"><i class="fa-solid fa-spinner animate-spin mr-2"></i>Memuat...</p>';
  try {
    var res = await supa.from('dismantle_items')
      .select('*, tiket_dismantle(wo_id,nama_pelanggan,alamat,cs_name)')
      .order('created_at', {ascending:false});
    _allDismantleItemsData = res.data || [];
    renderDismantleItemsTable('ALL');
  } catch(e) {
    el.innerHTML = '<p class="text-xs text-rose-500 text-center py-4">Gagal: ' + e.message + '</p>';
  }
}

function filterDismantleItems(filter) {
  document.querySelectorAll('.filter-dis-btn').forEach(function(b){
    b.className = 'filter-dis-btn px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100';
  });
  var btn = document.getElementById('filter-dis-'+filter);
  if(btn) btn.className = 'filter-dis-btn active px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-800 bg-slate-800 text-white';
  renderDismantleItemsTable(filter);
}

function renderDismantleItemsTable(filter) {
  var el = document.getElementById('dismantle-items-list');
  if(!el) return;
  var data = filter === 'ALL' ? _allDismantleItemsData : _allDismantleItemsData.filter(function(d){ return d.hasil_noc === filter; });
  if(!data.length) { el.innerHTML = '<p class="text-xs text-slate-400 text-center py-6">Tidak ada data.</p>'; return; }
  var hCls = { BERFUNGSI:'bg-emerald-100 text-emerald-700', RUSAK:'bg-rose-100 text-rose-700', PENDING:'bg-amber-100 text-amber-700' };
  el.innerHTML = data.map(function(item) {
    var td = item.tiket_dismantle || {};
    return '<div class="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/40 rounded-2xl border border-slate-200 dark:border-slate-600 gap-2">'
      + '<div class="flex-1 min-w-0 space-y-0.5">'
        + '<p class="text-xs font-extrabold text-slate-800 dark:text-slate-100 font-mono">' + (item.sn||'-') + '</p>'
        + '<p class="text-[10px] text-slate-400">' + (item.jenis||'-') + (item.merk?' • '+item.merk:'') + ' • ' + (td.nama_pelanggan||'-') + '</p>'
      + '</div>'
      + '<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold ' + (hCls[item.hasil_noc]||'bg-slate-100 text-slate-600') + ' shrink-0">' + item.hasil_noc + '</span>'
    + '</div>';
  }).join('');
}

// ── ADMIN: LOAD LIST PERANGKAT RUSAK ────────────────────────────────
async function loadListPerangkatRusak() {
  var el = document.getElementById('list-perangkat-rusak');
  if(!el) return;
  el.innerHTML = '<p class="text-xs text-slate-400 text-center py-4"><i class="fa-solid fa-spinner animate-spin mr-2"></i>Memuat...</p>';
  try {
    var res = await supa.from('perangkat').select('*').eq('kondisi','Rusak').order('created_at',{ascending:false});
    var data = res.data || [];
    if(!data.length) { el.innerHTML = '<p class="text-xs text-slate-400 text-center py-6">Tidak ada perangkat rusak.</p>'; return; }
    el.innerHTML = data.map(function(p) {
      return '<div class="flex items-center justify-between p-3 bg-rose-50 dark:bg-rose-950/30 rounded-2xl border border-rose-200 dark:border-rose-800 gap-2">'
        + '<div class="flex-1 min-w-0">'
          + '<p class="text-xs font-extrabold text-slate-800 dark:text-slate-100 font-mono">' + p.sn + '</p>'
          + '<p class="text-[10px] text-slate-400">' + (p.jenis||'-') + (p.merk?' • '+p.merk:'') + '</p>'
        + '</div>'
        + '<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-700 shrink-0">Rusak</span>'
      + '</div>';
    }).join('');
  } catch(e) {
    el.innerHTML = '<p class="text-xs text-rose-500 text-center py-4">Gagal: ' + e.message + '</p>';
  }
}
