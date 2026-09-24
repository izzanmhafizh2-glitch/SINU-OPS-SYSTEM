// ===================== RL RADIUS MODULE =====================
// Menu untuk admin input No. Layanan & konfirmasi RL Radius per tiket

var _allRLRadiusData = [];
var _activeRLFilter = 'BELUM';
var _activeRLWoId = null;

// ── LOAD LIST TIKET UNTUK RL RADIUS ─────────────────────────────────
async function loadRLRadiusList() {
  var el = document.getElementById('rl-radius-list');
  if(!el) return;
  el.innerHTML = '<p class="text-xs text-slate-400 text-center py-4"><i class="fa-solid fa-spinner animate-spin mr-2"></i>Memuat...</p>';
  try {
    // Ambil WO instalasi (yang butuh No Layanan & RL Radius)
    var res = await supa.from('work_orders')
      .select('*')
      .in('tipe', ['INSTALASI', 'INSTALASI_RESELLER', 'PERLUASAN_RESELLER'])
      .order('created_at', { ascending: false })
      .limit(200);
    if(res.error) throw res.error;
    _allRLRadiusData = res.data || [];
    renderRLRadiusList(_activeRLFilter);
  } catch(e) {
    el.innerHTML = '<p class="text-xs text-rose-500 text-center py-4">Gagal: ' + e.message + '</p>';
  }
}

function filterRLRadius(filter) {
  _activeRLFilter = filter;
  document.querySelectorAll('.filter-rl-btn').forEach(function(b){
    b.classList.remove('active','bg-slate-800','text-white','border-slate-800');
    b.classList.add('border-slate-200');
  });
  var btn = document.getElementById('filter-rl-' + filter);
  if(btn) { btn.classList.add('active','bg-slate-800','text-white','border-slate-800'); btn.classList.remove('border-slate-200'); }
  renderRLRadiusList(filter);
}

function renderRLRadiusList(filter) {
  var el = document.getElementById('rl-radius-list');
  if(!el) return;
  var data = _allRLRadiusData;
  if(filter === 'BELUM') data = data.filter(function(d){ return !d.rl_radius_done; });
  else if(filter === 'SUDAH') data = data.filter(function(d){ return d.rl_radius_done; });

  if(!data.length) {
    el.innerHTML = '<p class="text-xs text-slate-400 text-center py-6">Tidak ada tiket.</p>';
    return;
  }

  var tipeBadge = {
    INSTALASI: 'bg-blue-100 text-blue-700', INSTALASI_RESELLER: 'bg-cyan-100 text-cyan-700',
    PERLUASAN_RESELLER: 'bg-teal-100 text-teal-700'
  };

  el.innerHTML = data.map(function(t) {
    var done = t.rl_radius_done;
    var statusBadge = done
      ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-700"><i class="fa-solid fa-check mr-0.5"></i>Sudah Input</span>'
      : '<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-700 animate-pulse"><i class="fa-solid fa-clock mr-0.5"></i>Belum Input</span>';
    var noLayananInfo = t.no_layanan
      ? '<p class="text-[11px] text-emerald-600 font-bold mt-0.5"><i class="fa-solid fa-id-card mr-1"></i>No. Layanan: ' + t.no_layanan + '</p>'
      : '<p class="text-[11px] text-rose-500 font-semibold mt-0.5"><i class="fa-solid fa-triangle-exclamation mr-1"></i>Belum ada No. Layanan</p>';

    return '<div class="p-4 bg-slate-50 dark:bg-slate-700/40 rounded-2xl border border-slate-200 dark:border-slate-600 space-y-2">'
      + '<div class="flex items-center justify-between gap-2 flex-wrap">'
        + '<div class="min-w-0">'
          + '<div class="flex items-center gap-2 flex-wrap">'
            + '<span class="text-[10px] font-extrabold text-blue-600 font-mono">' + t.wo_id + '</span>'
            + '<span class="px-1.5 py-0.5 rounded text-[9px] font-extrabold ' + (tipeBadge[t.tipe]||'bg-slate-100 text-slate-600') + '">' + t.tipe + '</span>'
          + '</div>'
          + '<p class="text-xs font-extrabold text-slate-800 dark:text-white mt-0.5">' + (t.pelanggan||'-') + '</p>'
          + noLayananInfo
        + '</div>'
        + statusBadge
      + '</div>'
      + (done
        ? '<p class="text-[10px] text-slate-400">Diinput oleh: ' + (t.rl_radius_by||'-') + '</p>'
        : '<button type="button" onclick="openRLRadiusForm(\'' + t.wo_id + '\',\'' + (t.pelanggan||'').replace(/'/g,"\\'") + '\',\'' + (t.no_layanan||'') + '\')" '
          + 'class="w-full py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95">'
          + '<i class="fa-solid fa-network-wired"></i>Input RL Radius'
        + '</button>')
    + '</div>';
  }).join('');
}

// ── BUKA FORM INPUT RL RADIUS (MODAL) ───────────────────────────────
async function openRLRadiusForm(woId, pelanggan, noLayanan) {
  _activeRLWoId = woId;
  var modal = document.getElementById('rl-radius-modal');
  if(!modal) return;
  document.getElementById('rl-modal-no-layanan').value = noLayanan || '';
  document.getElementById('rl-modal-checklist').checked = false;
  var detailEl = document.getElementById('rl-modal-detail');
  if(detailEl) detailEl.innerHTML = '<p class="text-[10px] text-slate-400 text-center py-2"><i class="fa-solid fa-spinner animate-spin mr-1"></i>Memuat detail...</p>';
  modal.classList.remove('hidden');

  // Ambil semua data yang diisi CS
  try {
    var res = await supa.from('work_orders').select('*').eq('wo_id', woId).maybeSingle();
    var d = res.data;
    if(!d) { if(detailEl) detailEl.innerHTML = '<p class="text-[10px] text-rose-500 text-center">Data tidak ditemukan</p>'; return; }

    function row(label, val) {
      if(val === null || val === undefined || val === '') return '';
      return '<div class="flex items-start justify-between gap-2 py-1 border-b border-slate-100 dark:border-slate-600 last:border-0">'
        + '<span class="text-[10px] text-slate-400 uppercase font-bold shrink-0">' + label + '</span>'
        + '<span class="text-[11px] font-bold text-slate-700 dark:text-slate-200 text-right">' + val + '</span>'
        + '</div>';
    }
    var tipeLabel = { INSTALASI:'Instalasi Baru', INSTALASI_RESELLER:'Instalasi Reseller', PERLUASAN_RESELLER:'Perluasan Reseller' }[d.tipe] || d.tipe;
    var html = ''
      + row('WO ID', '<span class="text-blue-600 font-mono">'+d.wo_id+'</span>')
      + row('Tipe', tipeLabel)
      + row('Pelanggan', d.pelanggan)
      + row('No. HP', d.no_hp)
      + row('Alamat', d.alamat)
      + row('Koordinat', d.koordinat)
      + row('Nama Paket', d.nama_paket)
      + row('Registrasi', d.registrasi ? 'Rp '+Number(d.registrasi).toLocaleString('id-ID') : null)
      + row('Paket', d.paket ? 'Rp '+Number(d.paket).toLocaleString('id-ID') : null)
      + row('Total', d.total ? 'Rp '+Number(d.total).toLocaleString('id-ID') : null)
      + row('Marketing', d.marketing)
      + row('Username PPPOE', d.username_pppoe)
      + row('Password PPPOE', d.password_pppoe)
      + row('Status Koneksi', d.status_koneksi)
      + row('Nama Reseller', d.nama_reseller)
      + row('Jumlah Titik', d.jumlah_titik)
      + row('CS/Admin', d.cs_name);
    if(detailEl) detailEl.innerHTML = html || '<p class="text-[10px] text-slate-400 text-center">Tidak ada detail</p>';
  } catch(e) {
    if(detailEl) detailEl.innerHTML = '<p class="text-[10px] text-rose-500 text-center">Gagal: '+e.message+'</p>';
  }
}

function closeRLRadiusForm() {
  var modal = document.getElementById('rl-radius-modal');
  if(modal) modal.classList.add('hidden');
  _activeRLWoId = null;
}

async function submitRLRadius() {
  if(!_activeRLWoId) return;
  var noLayanan = (document.getElementById('rl-modal-no-layanan').value||'').trim();
  var checklist = document.getElementById('rl-modal-checklist').checked;

  if(!noLayanan) { showAlert('No. Layanan wajib diisi.', 'Validasi'); return; }
  if(!checklist) { showAlert('Harap centang konfirmasi bahwa Anda sudah mengisi RL Radius.', 'Konfirmasi Wajib'); return; }

  showLoading('Menyimpan data RL Radius...');
  try {
    var res = await supa.from('work_orders').update({
      no_layanan     : noLayanan,
      rl_radius_done : true,
      rl_radius_by   : currentUser ? currentUser.displayName : '',
      rl_radius_at   : new Date().toISOString()
    }).eq('wo_id', _activeRLWoId);
    if(res.error) throw res.error;
    hideLoading();
    showAlert('Data RL Radius WO ' + _activeRLWoId + ' berhasil disimpan!\nNo. Layanan: ' + noLayanan, 'Berhasil');
    closeRLRadiusForm();
    loadRLRadiusList();
  } catch(e) {
    hideLoading();
    showAlert('Gagal simpan: ' + e.message, 'Error');
  }
}

// ── LOAD LIST TIKET DISMANTLE (Admin) ───────────────────────────────
async function loadListTiketDismantle() {
  var el = document.getElementById('list-tiket-dismantle');
  if(!el) return;
  el.innerHTML = '<p class="text-xs text-slate-400 text-center py-4"><i class="fa-solid fa-spinner animate-spin mr-2"></i>Memuat...</p>';
  try {
    var res = await supa.from('tiket_dismantle')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if(res.error) {
      if(res.error.message.includes('does not exist') || res.error.message.includes('Not Found') || res.error.code === 'PGRST106') {
        el.innerHTML = '<div class="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 text-[11px] text-amber-700"><i class="fa-solid fa-triangle-exclamation mr-1"></i>Tabel dismantle belum dibuat. Buka <a href="/setup-dismantle.html" target="_blank" class="font-bold underline">setup-dismantle.html</a></div>';
        return;
      }
      throw res.error;
    }
    var data = res.data || [];
    if(!data.length) { el.innerHTML = '<p class="text-xs text-slate-400 text-center py-6">Belum ada tiket dismantle.</p>'; return; }
    var sCls = { RELEASE:'bg-blue-100 text-blue-700', PICKUP:'bg-indigo-100 text-indigo-700', PROSES:'bg-amber-100 text-amber-700', SELESAI:'bg-emerald-100 text-emerald-700' };
    el.innerHTML = data.map(function(t) {
      var tgl = t.tanggal || (t.created_at ? t.created_at.substring(0,10) : '-');
      var tek = Array.isArray(t.teknisi) ? t.teknisi.join(', ') : (t.teknisi||'-');
      return '<div class="p-3.5 bg-slate-50 dark:bg-slate-700/40 rounded-2xl border border-slate-200 dark:border-slate-600 space-y-1.5">'
        + '<div class="flex items-center justify-between gap-1">'
          + '<span class="text-[10px] font-extrabold text-orange-600 font-mono">' + t.wo_id + '</span>'
          + '<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold ' + (sCls[t.status]||'bg-slate-100 text-slate-600') + '">' + t.status + '</span>'
        + '</div>'
        + '<p class="text-xs font-bold text-slate-800 dark:text-white">' + t.nama_pelanggan + '</p>'
        + '<p class="text-[10px] text-slate-400"><i class="fa-solid fa-location-dot text-rose-400 mr-1"></i>' + t.alamat + '</p>'
        + '<p class="text-[10px] text-slate-400">' + tgl + (tek !== '-' ? ' • ' + tek : '') + '</p>'
      + '</div>';
    }).join('');
  } catch(e) {
    el.innerHTML = '<p class="text-xs text-rose-500 text-center py-4">Gagal: ' + e.message + '</p>';
  }
}
