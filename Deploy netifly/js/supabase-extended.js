// =====================================================================
// supabase-extended.js
// Fungsi DB tambahan yang memperluas koneksi Supabase:
//   - renderPickupListFromDB  : tampilkan tiket release dari DB
//   - loadWaitingApproval     : antrian approval per teknisi
//   - loadListPerangkatSaya   : perangkat approved per teknisi
//   - loadApprovalList        : antrian approval untuk admin
//   - loadWOSummaryDashboard  : update stat cards dashboard
//   - loadAbsensiPointFromDB  : point kehadiran real-time
//   - loadAllAbsensiPoints    : agregasi semua karyawan
//   - addDynamicContainerIds  : inisialisasi ID container dinamis
// =====================================================================

// ── RENDER PICKUP LIST DARI SUPABASE ─────────────────────────────────
async function renderPickupListFromDB() {
  const el = document.getElementById('pickup-list');
  if(!el) return;

  const cMap = {
    INSTALASI: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    MAINTENANCE: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    GANGGUAN: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
  };

  try {
    console.log('[Pickup] Query WO dengan status RELEASE...');
    const { data, error } = await supa
      .from('work_orders')
      .select('*')
      .eq('status', 'RELEASE')
      .order('created_at', {ascending: false});

    console.log('[Pickup] Hasil query:', data);
    if(error) throw error;

    // Filter: MAINTENANCE yang belum diproses NOC (noc_name kosong) tidak masuk pickup teknisi
    // MAINTENANCE yang sudah di-release dari NOC (noc_name ada) → boleh masuk
    const hasNocColumn = (data||[]).some(d => Object.prototype.hasOwnProperty.call(d, 'noc_name'));
    const dbTickets = (data||[])
      .filter(d => d.tipe !== 'MAINTENANCE' || !hasNocColumn || d.noc_name)
      .map(d => ({
        woId: d.wo_id, customer: d.pelanggan,
        tipe: d.tipe, alamat: d.alamat||''
      }));
    console.log('[Pickup] Total tiket RELEASE:', dbTickets.length);

    // Gabung dengan data lokal yang belum ada di DB
    const allTickets = [...dbTickets];
    if(typeof releaseTickets !== 'undefined') {
      releaseTickets.forEach(t => {
        if(!allTickets.find(x => x.woId === t.woId)) allTickets.push(t);
      });
    }

    if(!allTickets.length){
      el.innerHTML = '<p class="text-xs text-slate-400 text-center py-6">Tidak ada tiket release saat ini.</p>';
      return;
    }

    el.innerHTML = allTickets.map(t => `
      <div class="bg-slate-50 dark:bg-slate-700/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${cMap[t.tipe]||cMap.INSTALASI}">${t.tipe}</span>
            <span class="text-xs font-black text-slate-800 dark:text-slate-200">${t.woId}</span>
          </div>
          <h3 class="text-sm font-extrabold text-slate-900 dark:text-white">${t.customer}</h3>
          <p class="text-xs text-slate-500 dark:text-slate-400"><i class="fa-solid fa-location-dot text-rose-500 mr-1"></i>${t.alamat||'-'}</p>
        </div>
        <button type="button" onclick="pickupTask('${t.woId}','${t.customer}','${t.tipe}')"
          class="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shrink-0 flex items-center justify-center gap-2 active:scale-95">
          <i class="fa-solid fa-hand-holding-hand"></i>Pickup
        </button>
      </div>`).join('');

  } catch(e) {
    // Fallback: tampilkan pesan error saja, jangan rekursif
    const el2 = document.getElementById('pickup-list');
    if(el2) el2.innerHTML = '<p class="text-xs text-slate-400 text-center py-6">Gagal memuat tiket. Cek koneksi.</p>';
  }
}

// Override renderPickupList agar default pakai DB
(function() {
  var _orig = typeof renderPickupList === 'function' ? renderPickupList : null;
  window.renderPickupList = function(filter) {
    if(typeof filter !== 'undefined' && filter !== '') {
      if(_orig) _orig(filter);
    } else {
      renderPickupListFromDB();
    }
  };
})();

// ── LOAD WAITING APPROVAL ─────────────────────────────────────────────
async function loadWaitingApproval() {
  const container = document.getElementById('waiting-approval-list');
  if(!container) return;
  const teknisiName = currentUser ? currentUser.displayName : '';
  try {
    const { data, error } = await supa
      .from('pickup_requests')
      .select('*')
      .eq('teknisi_name', teknisiName)
      .order('created_at', {ascending: false});
    if(error) throw error;

    // Hanya tampilkan yang WAITING (hilangkan yang sudah APPROVED/REJECTED)
    const pending = (data||[]).filter(r => r.status === 'WAITING');

    if(!pending.length){
      container.innerHTML = '<p class="text-xs text-slate-400 text-center py-4">Tidak ada request yang menunggu.</p>';
      return;
    }
    container.innerHTML = pending.map(r => `
      <div class="flex items-center justify-between p-3.5 bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-800">
        <div>
          <p class="text-xs font-black text-slate-800 dark:text-slate-100">${r.sn} ${r.jenis?'('+r.jenis+')':''}</p>
          <p class="text-[10px] text-slate-400">Waktu Pickup: ${new Date(r.created_at).toLocaleString('id-ID',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})} WIB</p>
        </div>
        <span class="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 animate-pulse">Waiting</span>
      </div>`).join('');
  } catch(e) {
    container.innerHTML = '<p class="text-xs text-slate-400 text-center py-4">Gagal memuat data.</p>';
  }
}

// ── LOAD LIST PERANGKAT SAYA ──────────────────────────────────────────
async function loadListPerangkatSaya() {
  const container = document.getElementById('list-perangkat-saya-content');
  if(!container) return;
  const teknisiName = currentUser ? currentUser.displayName : '';
  try {
    const { data, error } = await supa
      .from('perangkat_teknisi')
      .select('sn, jenis, kondisi, panjang_awal, panjang_sisa')
      .eq('teknisi_name', teknisiName)
      .eq('status', 'READY');
    if(error) throw error;
    if(!data || !data.length){
      container.innerHTML = '<p class="text-xs text-slate-400 text-center py-4">Belum ada perangkat yang diapprove.</p>';
      return;
    }
    container.innerHTML = data.map(p => {
      const isKabel = p.jenis && p.jenis.toLowerCase().includes('kabel');
      const sisaBar = isKabel && p.panjang_awal > 0
        ? `<div class="mt-1.5 space-y-1">
            <div class="flex justify-between text-[10px] font-bold">
              <span class="text-slate-500">Sisa Kabel</span>
              <span class="${p.panjang_sisa <= 0 ? 'text-rose-500' : p.panjang_sisa < p.panjang_awal*0.2 ? 'text-amber-500' : 'text-emerald-600'} font-extrabold">${p.panjang_sisa||0}m / ${p.panjang_awal}m</span>
            </div>
            <div class="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-1.5 overflow-hidden">
              <div class="h-1.5 rounded-full ${p.panjang_sisa <= 0 ? 'bg-rose-500' : p.panjang_sisa < p.panjang_awal*0.2 ? 'bg-amber-400' : 'bg-emerald-500'} transition-all"
                style="width:${p.panjang_awal > 0 ? Math.max(0,Math.round((p.panjang_sisa/p.panjang_awal)*100)) : 0}%"></div>
            </div>
          </div>`
        : '';
      return `<div class="p-3.5 bg-slate-50 dark:bg-slate-700/40 rounded-2xl border border-slate-200 dark:border-slate-600">
        <div class="flex justify-between items-start">
          <div>
            <p class="text-xs font-bold text-slate-800 dark:text-slate-100">${p.sn}${p.jenis && p.jenis !== '-' ? ' <span class="text-slate-400 font-normal">('+p.jenis+')</span>' : ''}</p>
            <p class="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5"><i class="fa-solid fa-check-circle mr-1"></i>Ready — ${p.kondisi||'Baru'}</p>
          </div>
          <span class="text-[10px] font-extrabold px-2 py-0.5 rounded-full ${isKabel ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'}">${isKabel ? 'Kabel' : 'Perangkat'}</span>
        </div>
        ${sisaBar}
      </div>`;
    }).join('');
  } catch(e) {
    container.innerHTML = '<p class="text-xs text-slate-400 text-center py-4">Gagal memuat data.</p>';
  }
}

// ── LOAD APPROVAL LIST (Admin) ────────────────────────────────────────
async function loadApprovalList() {
  const container = document.getElementById('approval-pickup-content');
  if(!container) return;
  try {
    const { data, error } = await supa
      .from('pickup_requests')
      .select('*')
      .eq('status', 'WAITING')
      .order('created_at', {ascending: false});
    if(error) throw error;
    if(!data || !data.length){
      container.innerHTML = '<p class="text-xs text-slate-400 text-center py-6">Tidak ada request pickup yang menunggu.</p>';
      return;
    }
    container.innerHTML = data.map((r,index) => {
      const isKabel = r.jenis && r.jenis.toLowerCase().includes('kabel');
      const meterInfo = isKabel && r.meter_dari != null && r.meter_sampai != null
        ? `<div class="mt-1.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700 rounded-xl px-2.5 py-1.5 flex items-center gap-2">
            <i class="fa-solid fa-ruler text-amber-500 text-[10px]"></i>
            <span class="text-[11px] font-bold text-amber-700 dark:text-amber-300">
              Meter ${r.meter_dari}m → ${r.meter_sampai}m
              <span class="ml-1 px-1.5 py-0.5 bg-amber-200 dark:bg-amber-800 rounded-md text-[10px]">
                ${r.meter_sampai - r.meter_dari}m diambil
              </span>
            </span>
           </div>`
        : '';
      const batchLabel = r.batch_id ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">Batch</span>` : '';
      const isFirstBatchItem = !!r.batch_id && data.findIndex(item => item.batch_id === r.batch_id) === index;
      const batchActions = isFirstBatchItem ? `<button type="button" onclick="handleAdminBatchApproval('${r.batch_id}',true)" class="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md">Approve Batch</button><button type="button" onclick="handleAdminBatchApproval('${r.batch_id}',false)" class="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl">Reject Batch</button>` : '';
      return `
      <div class="p-4 bg-slate-50 dark:bg-slate-700/40 rounded-2xl border border-slate-200 dark:border-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="flex-1 min-w-0">
          <p class="text-xs font-black text-slate-900 dark:text-white">${batchLabel} Request: Pickup ${r.sn}${r.jenis?' <span class="font-normal text-slate-500">('+r.jenis+')</span>':''}</p>
          <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Diminta oleh: <span class="font-bold text-blue-600">${r.teknisi_name}</span> • ${new Date(r.created_at).toLocaleString('id-ID',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</p>
          ${meterInfo}
        </div>
        <div class="flex items-center gap-2 shrink-0">
          ${batchActions}
          <button type="button" onclick="handleAdminApproval('${r.id}','${r.sn}','${r.jenis||''}','${r.teknisi_name}',false)"
            class="px-3 py-2 bg-rose-100 hover:bg-rose-200 text-rose-600 text-xs font-bold rounded-xl transition-all">Reject</button>
          <button type="button" onclick="handleAdminApproval('${r.id}','${r.sn}','${r.jenis||''}','${r.teknisi_name}',true)"
            class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md">Approve</button>
        </div>
      </div>`;
    }).join('');
  } catch(e) {
    container.innerHTML = '<p class="text-xs text-slate-400 text-center py-4">Gagal memuat data.</p>';
  }
}

// ── WO SUMMARY DASHBOARD ──────────────────────────────────────────────
async function loadWOSummaryDashboard() {
  try {
    const { data } = await supa.from('work_orders').select('status');
    const all = data || kpiWOData;
    const total = all.length;
    const selesai = all.filter(d => d.status === 'SELESAI').length;
    const proses = all.filter(d => d.status === 'PROSES' || d.status === 'PICKUP').length;
    const ret = all.filter(d => d.status === 'RETURN').length;
    document.querySelectorAll('.wo-summary-total').forEach(el => el.textContent = total || '--');
    document.querySelectorAll('.wo-summary-selesai').forEach(el => el.textContent = selesai || '--');
    document.querySelectorAll('.wo-summary-proses').forEach(el => el.textContent = proses || '--');
    document.querySelectorAll('.wo-summary-return').forEach(el => el.textContent = ret || '--');
  } catch(e) {
    document.querySelectorAll('.wo-summary-total').forEach(el => el.textContent = kpiWOData.length);
    document.querySelectorAll('.wo-summary-selesai').forEach(el => el.textContent = kpiWOData.filter(d=>d.status==='SELESAI').length);
  }
}

// ── POINT ABSENSI PER USER ────────────────────────────────────────────
// Helper: update tampilan point di UI absensi
function updatePointDisplay(userName, total, max, perfect) {
  const elPt = document.getElementById('my-attendance-point');
  const elMax = document.getElementById('my-max-point');
  const elGrade = document.getElementById('my-grade-badge');
  if (!elPt) return;
  elPt.textContent = total + (perfect ? ' ⭐' : '');
  if (elMax) elMax.textContent = max + ' poin';
  if (elGrade) {
    const pct = Math.round((total / max) * 100);
    const grade = pct >= 90 ? 'A' : pct >= 75 ? 'B' : pct >= 60 ? 'C' : 'D';
    const gColor = pct >= 90 ? 'text-emerald-300' : pct >= 75 ? 'text-blue-300' : pct >= 60 ? 'text-amber-300' : 'text-rose-300';
    elGrade.innerHTML = `<span class="${gColor} font-black">Grade ${grade}</span>`;
  }
}
async function loadAbsensiPointFromDB() {
  if(!currentUser) return;
  const userName = currentUser.displayName;
  const now = new Date();
  const bulan = now.getMonth(), tahun = now.getFullYear();
  const hk = hitungHariKerja(tahun, bulan);
  const maxPoint = hk * 10;
  try {
    const { data, error } = await supa
      .from('absensi')
      .select('point, status_kehadiran, tanggal')
      .eq('nama', userName);
    if(error || !data) { updatePointDisplay(userName, 0, maxPoint, false); return; }
    const bulanIni = data.filter(d => {
      if(!d.tanggal) return false;
      const tgl = new Date(d.tanggal);
      return tgl.getMonth() === bulan && tgl.getFullYear() === tahun;
    });
    const total = bulanIni.reduce((s,d) => s+(d.point||0), 0);
    const perfect = bulanIni.length >= hk && bulanIni.every(d => d.status_kehadiran === 'TEPAT WAKTU');
    const bonus = perfect ? 10 : 0;
    absensiPoints[userName] = {total: total+bonus, max: maxPoint, perfect};
    updatePointDisplay(userName, total+bonus, maxPoint, perfect);
  } catch(e) { updatePointDisplay(userName, 0, maxPoint, false); }
}

// ── AGREGASI POINT SEMUA KARYAWAN ─────────────────────────────────────
async function loadAllAbsensiPoints(bulan, tahun, requestId) {
  const isCurrentRequest = () => requestId === undefined || typeof kpiPeriodRequest === 'undefined' || requestId === kpiPeriodRequest;
  if(requestId === undefined) absensiPoints = {};
  if(typeof supa === 'undefined') return;
  bulan=Number(bulan);tahun=Number(tahun);
  try {
    const { data, error } = await supa.from('absensi').select('nama, point, status_kehadiran, tanggal');
    if(!isCurrentRequest()) return;
    absensiPoints = {};
    if(error || !data) return;
    const bulanIniData = data.filter(d => {
      if(!d.tanggal) return false;
      const [year,month] = String(d.tanggal).substring(0,10).split('-').map(Number);
      return month-1 === bulan && year === tahun;
    });
    const grouped = {};
    bulanIniData.forEach(d => {
      if(!grouped[d.nama]) grouped[d.nama] = {total:0, count:0, allTepat:true};
      grouped[d.nama].total += Number(d.point)||0;
      grouped[d.nama].count++;
      if(d.status_kehadiran !== 'TEPAT WAKTU') grouped[d.nama].allTepat = false;
    });
    const hk = hitungHariKerja(tahun, bulan);
    Object.entries(grouped).forEach(([nama, val]) => {
      const bonus = (val.count >= hk && val.allTepat) ? 10 : 0;
      absensiPoints[nama] = {total: val.total+bonus, max: hk*10, perfect: val.count>=hk&&val.allTepat};
    });
  } catch(e) { console.warn('loadAllAbsensiPoints failed:', e); }
}

// ── HITUNG HARI KERJA DALAM SATU BULAN ───────────────────────────────
// Hanya menghitung Senin–Jumat (bukan Sabtu/Minggu)
function hitungHariKerja(tahun, bulan) {
  const daysInMonth = new Date(tahun, bulan + 1, 0).getDate();
  let count = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const day = new Date(tahun, bulan, d).getDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count;
}

// ── INISIALISASI ID CONTAINER DINAMIS ────────────────────────────────
function addDynamicContainerIds() {
  const matWait = document.querySelector('#sub-mat-content-waiting-approval .space-y-2');
  if(matWait && !matWait.id) matWait.id = 'waiting-approval-list';
  const listSaya = document.querySelector('#sub-mat-content-list-perangkat-saya .space-y-2');
  if(listSaya && !listSaya.id) listSaya.id = 'list-perangkat-saya-content';
  const approvalCont = document.querySelector('#sub-adm-content-approval-pickup .space-y-3');
  if(approvalCont && !approvalCont.id) approvalCont.id = 'approval-pickup-content';
}

// ── HOOK: switchSubMaterial → load data dari DB ──────────────────────
(function() {
  var _orig = typeof switchSubMaterial === 'function' ? switchSubMaterial : null;
  window.switchSubMaterial = function(sub) {
    if(_orig) _orig(sub);
    if(sub === 'waiting-approval') loadWaitingApproval();
    if(sub === 'list-perangkat-saya') loadListPerangkatSaya();
    if(sub === 'send-perangkat' || sub === 'return-perangkat') {
      if(typeof loadSendReturnDropdowns === 'function') loadSendReturnDropdowns();
    }
  };
})();

// ── HOOK: switchSubAdmin → load data dari DB ─────────────────────────
(function() {
  var _orig = typeof switchSubAdmin === 'function' ? switchSubAdmin : null;
  window.switchSubAdmin = function(sub) {
    if(_orig) _orig(sub);
    if(sub === 'approval-pickup') { loadApprovalList(); loadMaterialRequests(); }
    if(sub === 'registrasi') loadProvisioningQueue();
    if(sub === 'tracking-perangkat') loadLogPerangkat();
    // 'list-perangkat' sudah ditangani oleh app.js via _orig
  };
})();

// ── HOOK: window load → inisialisasi + load semua data ───────────────
window.addEventListener('load', function() {
  // Tunggu sebentar agar semua script lain selesai load
  setTimeout(async () => {
    addDynamicContainerIds();
    if(!currentUser) return;
    await loadWOSummaryDashboard();
    if(currentUser.role === 'teknisi') {
      await loadAbsensiPointFromDB();
      await restoreMyPickedTasks(); // Pulihkan tugas yang sedang dikerjakan
      // Pulihkan form yang sedang aktif (setelah myPickedTasks terisi)
      setTimeout(() => {
        if(typeof restoreActiveWork === 'function') restoreActiveWork();
      }, 500);
    } else {
      await loadAllAbsensiPoints(new Date().getMonth(), new Date().getFullYear());
      if(typeof renderPodium === 'function') renderPodium();
      if(typeof renderKPIKlasemen === 'function') renderKPIKlasemen();
    }
  }, 1500);
});

// ── HOOK: handleCreateTask → update pickup list setelah buat WO ──────
// Ini berjalan SETELAH window.handleCreateTask dari supabase-init.js
// Kita tidak override lagi agar tidak terjadi infinite chain
// Cukup tambahkan listener sekali saja via custom event
document.addEventListener('wo-created', async function() {
  await renderPickupListFromDB();
  await loadWOSummaryDashboard();
});

// ── KELOLA AKUN (Supervisor) ──────────────────────────────────────────

// Tambah akun baru ke Supabase
async function handleTambahAkun(e) {
  e.preventDefault();
  const username  = document.getElementById('akun-username').value.trim().toLowerCase();
  const password  = document.getElementById('akun-password').value.trim();
  const nama      = document.getElementById('akun-displayname').value.trim();
  const role      = document.getElementById('akun-role').value;
  const division  = document.getElementById('akun-division').value.trim();

  if(!username || !password || !nama || !role) {
    showAlert('Lengkapi semua field yang wajib diisi.', 'Form Tidak Lengkap');
    return;
  }

  const btn = document.getElementById('btn-submit-akun');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner animate-spin"></i> Menyimpan...';

  // Auto-generate avatar dari 2 huruf pertama nama
  const avatar = nama.trim().split(' ')
    .map(w => w[0]).join('').substring(0, 2).toUpperCase();

  try {
    // Cek apakah username sudah ada
    const { data: existing } = await supa
      .from('akun')
      .select('username')
      .ilike('username', username)
      .maybeSingle();

    if(existing) {
      showAlert(`Username "${username}" sudah digunakan. Pilih username lain.`, 'Username Duplikat');
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-user-plus"></i>Buat Akun';
      return;
    }

    const { error } = await supa.from('akun').insert({
      username, password, role,
      display_name: nama,
      avatar,
      division: division || role
    });

    if(error) throw error;

    showAlert(`Akun "${nama}" (${username}) berhasil dibuat!\nRole: ${role}`, 'Akun Dibuat ✅');
    document.getElementById('form-tambah-akun').reset();
    loadDaftarAkun(); // Refresh list

  } catch(err) {
    showAlert('Gagal membuat akun: ' + (err.message || 'Cek koneksi Supabase.'), 'Error');
  }

  btn.disabled = false;
  btn.innerHTML = '<i class="fa-solid fa-user-plus"></i>Buat Akun';
}

// Load daftar semua akun
async function loadDaftarAkun() {
  const tbody = document.getElementById('daftar-akun-tbody');
  if(!tbody) return;
  tbody.innerHTML = '<tr><td colspan="5" class="text-center py-6"><i class="fa-solid fa-spinner animate-spin text-blue-500 mr-2"></i>Memuat...</td></tr>';

  const roleBadge = {
    supervisor: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
    admin:      'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    cs:         'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    finance:    'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    noc:        'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
    teknisi:    'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
  };
  const roleLabel = {
    supervisor: 'Supervisor',
    admin:      'Admin/CS',
    cs:         'Admin/CS',
    finance:    'Finance',
    noc:        'NOC Engineer',
    teknisi:    'Teknisi Field'
  };

  try {
    const { data, error } = await supa
      .from('akun')
      .select('username, display_name, role, division, avatar')
      .order('role')
      .order('display_name');

    if(error) throw error;
    if(!data || !data.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-slate-400">Belum ada akun.</td></tr>';
      return;
    }

    tbody.innerHTML = data.map(a => `
      <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-700/50 transition-all">
        <td class="py-3 px-4 font-bold font-mono text-slate-800 dark:text-slate-100">${a.username}</td>
        <td class="py-3 px-4">
          <div class="flex items-center gap-2">
            <span class="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-[10px] font-black text-slate-600 dark:text-slate-300 shrink-0">${a.avatar||'??'}</span>
            <span class="font-semibold text-slate-800 dark:text-slate-100">${a.display_name||'-'}</span>
          </div>
        </td>
        <td class="py-3 px-4 text-center">
          <span class="px-2.5 py-1 rounded-full text-[10px] font-extrabold ${roleBadge[(a.role || '').toLowerCase()]||'bg-slate-100 text-slate-600'}">${roleLabel[(a.role || '').toLowerCase()]||a.role||'-'}</span>
        </td>
        <td class="py-3 px-4 text-slate-500 dark:text-slate-400">${a.division||'-'}</td>
        <td class="py-3 px-4 text-center">
          <div class="flex items-center justify-center gap-1.5">
            <button onclick="bukaEditAkun('${a.username}','${(a.display_name||'').replace(/'/g,"\\'")}','${a.role}','${(a.division||'').replace(/'/g,"\\'")}' )"
              class="px-2.5 py-1 bg-blue-100 hover:bg-blue-200 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl text-[10px] font-bold transition-all">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button onclick="hapusAkun('${a.username}')"
              class="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 rounded-xl text-[10px] font-bold transition-all">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </td>
      </tr>`).join('');

  } catch(err) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-6 text-rose-500 text-xs">Gagal load: ${err.message}</td></tr>`;
  }
}

// Hapus akun
async function hapusAkun(username) {
  // Cegah hapus akun sendiri
  if(currentUser && currentUser.username === username) {
    showAlert('Tidak bisa menghapus akun yang sedang digunakan.', 'Tidak Diizinkan');
    return;
  }
  if(!confirm(`Hapus akun "${username}"? Tindakan ini tidak bisa dibatalkan.`)) return;
  try {
    const { error } = await supa.from('akun').delete().eq('username', username);
    if(error) throw error;
    showAlert(`Akun "${username}" berhasil dihapus.`, 'Akun Dihapus');
    loadDaftarAkun();
  } catch(err) {
    showAlert('Gagal hapus akun: ' + (err.message || ''), 'Error');
  }
}

// ── EDIT AKUN ────────────────────────────────────────────────────────

// Buka modal edit akun
function bukaEditAkun(username, displayName, role, division) {
  const modal = document.getElementById('edit-akun-modal');
  if(!modal) return;
  document.getElementById('edit-akun-username-display').textContent = username;
  document.getElementById('edit-akun-username-hidden').value = username;
  document.getElementById('edit-akun-displayname').value = displayName || '';
  document.getElementById('edit-akun-password').value = '';
  document.getElementById('edit-akun-role').value = role || 'teknisi';
  document.getElementById('edit-akun-division').value = division || '';

  // Owner boleh mengganti username akun lain; role lain tetap terkunci.
  const isOwner = currentUser && String(currentUser.role||'').toLowerCase() === 'owner';
  const ownerWrap = document.getElementById('edit-akun-username-owner-wrap');
  const readonlyWrap = document.getElementById('edit-akun-username-readonly');
  const ownerInput = document.getElementById('edit-akun-username-input');
  if(ownerWrap) ownerWrap.classList.toggle('hidden', !isOwner);
  if(readonlyWrap) readonlyWrap.classList.toggle('hidden', isOwner);
  if(ownerInput) ownerInput.value = username;

  modal.classList.remove('hidden');
}

function tutupEditAkun() {
  const modal = document.getElementById('edit-akun-modal');
  if(modal) modal.classList.add('hidden');
}

// Simpan perubahan akun
async function simpanEditAkun(e) {
  e.preventDefault();
  const usernameAsal = document.getElementById('edit-akun-username-hidden').value;
  const nama         = document.getElementById('edit-akun-displayname').value.trim();
  const password     = document.getElementById('edit-akun-password').value.trim();
  const role         = document.getElementById('edit-akun-role').value;
  const division     = document.getElementById('edit-akun-division').value.trim();

  const isOwner = currentUser && String(currentUser.role||'').toLowerCase() === 'owner';
  const usernameBaru = isOwner
    ? (document.getElementById('edit-akun-username-input').value.trim().toLowerCase())
    : usernameAsal;

  if(!nama || !role) {
    showAlert('Nama dan Role tidak boleh kosong.', 'Form Tidak Lengkap');
    return;
  }
  if(isOwner && !usernameBaru) {
    showAlert('Username tidak boleh kosong.', 'Form Tidak Lengkap');
    return;
  }

  const btn = document.getElementById('btn-simpan-edit-akun');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner animate-spin"></i> Menyimpan...';

  const avatar = nama.trim().split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  const update = { display_name: nama, role, division: division || role, avatar };
  if(password) update.password = password; // hanya update password kalau diisi

  try {
    // Owner mengganti username: pastikan username baru belum dipakai akun lain.
    if(isOwner && usernameBaru !== usernameAsal.toLowerCase()) {
      const { data: bentrok } = await supa.from('akun')
        .select('username').ilike('username', usernameBaru).maybeSingle();
      if(bentrok) {
        showAlert(`Username "${usernameBaru}" sudah dipakai akun lain.`, 'Username Duplikat');
        btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Simpan';
        return;
      }
      update.username = usernameBaru;
    }

    const { error } = await supa.from('akun').update(update).eq('username', usernameAsal);
    if(error) throw error;

    // Jika owner mengganti data akunnya sendiri, sinkronkan sesi aktif.
    if(currentUser && currentUser.username === usernameAsal) {
      currentUser.displayName = nama;
      currentUser.role = String(role||'').toLowerCase();
      currentUser.division = division || role;
      currentUser.avatar = avatar;
      if(update.username) currentUser.username = update.username;
      sinuSavePersistentSession(currentUser);
    }

    showAlert(`Akun "${usernameAsal}" berhasil diperbarui!`, 'Akun Diperbarui ✅');
    tutupEditAkun();
    loadDaftarAkun();
  } catch(err) {
    showAlert('Gagal update akun: ' + (err.message || ''), 'Error');
  }

  btn.disabled = false;
  btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Simpan';
}

// ── PROVISIONING REQUESTS (Admin) ────────────────────────────────────

async function loadProvisioningQueue() {
  const container = document.getElementById('provisioning-queue-list');
  if(!container) return;
  container.innerHTML = '<p class="text-center py-4"><i class="fa-solid fa-spinner animate-spin text-indigo-500 mr-2"></i>Memuat...</p>';

  try {
    const { data, error } = await supa
      .from('provisioning_requests')
      .select('*')
      .eq('status', 'PENDING')
      .order('created_at', {ascending: false});

    if(error) throw error;

    if(!data || !data.length) {
      container.innerHTML = '<div class="flex flex-col items-center py-8 gap-2"><i class="fa-solid fa-circle-check text-emerald-400 text-3xl"></i><p class="text-xs text-slate-400 font-semibold">Tidak ada antrian provisioning saat ini.</p></div>';
      return;
    }

    container.innerHTML = data.map(r => {
      const tgl = new Date(r.created_at).toLocaleString('id-ID', {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
      return `
      <div class="p-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-200 dark:border-indigo-800 space-y-3">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-black text-slate-900 dark:text-white">${r.wo_id} — ${r.pelanggan||'-'}</p>
            <p class="text-[10px] text-slate-400">${r.teknisi_name||'-'} • ${tgl} WIB</p>
          </div>
          <span class="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 flex items-center gap-1">
            <i class="fa-solid fa-spinner animate-spin text-xs"></i>On Going
          </span>
        </div>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div><p class="font-bold text-slate-500 uppercase text-[10px]">SN ONT</p><p class="font-extrabold font-mono">${r.sn_ont||'-'}</p></div>
          <div><p class="font-bold text-slate-500 uppercase text-[10px]">SN Kabel</p><p class="font-extrabold font-mono">${r.sn_kabel||'-'}</p></div>
        </div>
        <button type="button" onclick="completeProvisioning('${r.id}','${r.wo_id}')"
          class="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md">
          <i class="fa-solid fa-circle-check"></i>Tandai Selesai
        </button>
      </div>`;
    }).join('');

  } catch(err) {
    container.innerHTML = `<p class="text-xs text-rose-500 text-center py-4">Gagal load: ${err.message}</p>`;
  }
}

// Tandai provisioning selesai
async function completeProvisioning(id, woId) {
  const btn = event.target.closest('button');
  if(btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner animate-spin"></i> Memproses...'; }

  try {
    const { error } = await supa
      .from('provisioning_requests')
      .update({ status: 'DONE' })
      .eq('id', id);

    if(error) throw error;

    showAlert(`Provisioning ${woId||id} selesai!\nNotifikasi akan muncul di akun teknisi.`, 'Provisioning Selesai ✅');
    loadProvisioningQueue(); // refresh list

  } catch(err) {
    showAlert('Gagal update: ' + err.message, 'Error');
    if(btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-circle-check"></i>Tandai Selesai'; }
  }
}

// ── RESTORE TUGAS SAYA dari DB setelah refresh ───────────────────────
async function restoreMyPickedTasks() {
  if(!currentUser || currentUser.role !== 'teknisi') return;
  const nama = currentUser.displayName;

  try {
    // Query semua WO berstatus PICKUP lalu filter di client
    let { data, error } = await supa
      .from('work_orders')
      .select('*')
      .eq('status', 'PICKUP');

    if(error) { console.warn('[Restore] Query error:', error.message); return; }
    if(!data || !data.length) return;

    // Filter yang milik teknisi ini
    const milik = data.filter(d => {
      const legacy = Array.isArray(d.teknisi) ? d.teknisi : [];
      const owner = d.teknisi_1 || legacy[0];
      return owner && owner.toLowerCase() === nama.toLowerCase();
    });

    if(!milik.length) return;

    myPickedTasks = milik.map(d => ({
      woId: d.wo_id, customer: d.pelanggan,
      tipe: d.tipe, teknisi1: d.teknisi_1 || (Array.isArray(d.teknisi) ? d.teknisi[0] : nama),
      teknisi2: d.teknisi_2 || (Array.isArray(d.teknisi) ? d.teknisi[1] || '' : ''), alamat: d.alamat||'',
      koordinat: d.koordinat||null,
      noLayanan: d.no_layanan||null,
      rlRadiusDone: d.rl_radius_done||false
    }));
    if(typeof renderMyTaskList === 'function') renderMyTaskList();
    if(typeof renderReturnSelect === 'function') renderReturnSelect();
    console.log('[Restore] Tugas dipulihkan:', myPickedTasks.length, 'item');

  } catch(e) {
    console.warn('[Restore] Gagal restore tugas:', e.message);
  }
}

// ── SUPABASE REALTIME ─────────────────────────────────────────────────
// Auto-update data tanpa perlu refresh manual.

// Cek apakah sebuah elemen benar-benar terlihat (bukan hanya cek class hidden
// pada satu container). offsetParent === null berarti elemen/parent-nya hidden.
function _sinuIsVisible(el) {
  return !!(el && el.offsetParent !== null);
}

// Jalankan loader HANYA jika menu/section terkait sedang terlihat.
// Ini membuat menu aktif ter-refresh otomatis tanpa harus pindah tab.
function _sinuRefreshIfVisible(containerId, fnName) {
  const el = document.getElementById(containerId);
  if(_sinuIsVisible(el) && typeof window[fnName] === 'function') {
    try { window[fnName](); } catch(e) { console.warn('[Realtime] refresh', fnName, e.message); }
  }
}

// Refresh seluruh menu yang mungkin bergantung pada work_orders.
function _sinuRefreshWorkOrderViews() {
  if(typeof renderPickupListFromDB === 'function') renderPickupListFromDB(); // pickup tugas teknisi
  if(typeof loadWOSummaryDashboard === 'function') loadWOSummaryDashboard();
  if(typeof refreshAdminTicketList === 'function') refreshAdminTicketList();  // list tiket admin
  // Log tugas berada langsung di section-logtugas (tanpa sub-view wrapper).
  const ltEl = document.getElementById('section-logtugas');
  if(ltEl && !ltEl.classList.contains('hidden') && typeof loadLogTugas === 'function') loadLogTugas();
  if(typeof renderRiwayatTugas === 'function') renderRiwayatTugas(); // riwayat tugas teknisi
  // NOC
  _sinuRefreshIfVisible('sub-content-pickup-noc', 'loadNOCPickup');
  _sinuRefreshIfVisible('sub-content-tugas-noc', 'loadNOCTasks');
  // RL Radius & registrasi admin
  _sinuRefreshIfVisible('sub-adm-content-rl-radius', 'loadRLRadiusList');
  _sinuRefreshIfVisible('sub-adm-content-registrasi', 'loadProvisioningQueue');
}

function initRealtimeListeners() {
  if(typeof supa === 'undefined') return;

  // Channel: work_orders berubah → refresh semua view terkait yang aktif
  supa.channel('realtime-wo')
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'work_orders'
    }, () => { _sinuRefreshWorkOrderViews(); })
    .subscribe();

  // Channel: provisioning_requests → admin & NOC
  supa.channel('realtime-provisioning')
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'provisioning_requests'
    }, () => {
      _sinuRefreshIfVisible('sub-adm-content-registrasi', 'loadProvisioningQueue');
      _sinuRefreshIfVisible('sub-content-registrasi-noc', 'loadProvisioningQueueNOC');
    })
    .subscribe();

  // Channel: tiket_dismantle berubah → refresh pickup/tugas dismantle + list admin
  supa.channel('realtime-dismantle')
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'tiket_dismantle'
    }, () => {
      _sinuRefreshIfVisible('sub-content-pickup-dismantle', 'loadPickupDismantle');
      _sinuRefreshIfVisible('sub-content-tugas-dismantle', 'loadTugasDismantle');
      _sinuRefreshIfVisible('sub-content-checking-dismantle', 'loadCheckingDismantle');
      // Admin: list tiket dismantle aktif + list tiket dismantle
      if(typeof loadTiketDismantleAdmin === 'function' && _sinuIsVisible(document.getElementById('tiket-dismantle-admin-list'))) loadTiketDismantleAdmin();
      _sinuRefreshIfVisible('sub-adm-content-list-tiket-dismantle', 'loadListTiketDismantle');
    })
    .subscribe();

  // Channel: dismantle_items berubah → refresh checking NOC + list item admin
  supa.channel('realtime-dismantle-items')
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'dismantle_items'
    }, () => {
      _sinuRefreshIfVisible('sub-content-checking-dismantle', 'loadCheckingDismantle');
      _sinuRefreshIfVisible('sub-adm-content-dismantle-items', 'loadDismantleItems');
    })
    .subscribe();

  // Channel: pickup_requests berubah → update waiting list teknisi + approval admin
  supa.channel('realtime-pickup')
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'pickup_requests'
    }, (payload) => {
      if(typeof loadWaitingApproval === 'function') loadWaitingApproval();
      if(typeof loadApprovalList === 'function') loadApprovalList();
      if(payload.eventType === 'INSERT' && currentUser && currentUser.role === 'admin') {
        const r = payload.new;
        if(typeof showToast === 'function')
          showToast('📦 Request Pickup Masuk', `${r.teknisi_name} request SN ${r.sn}`, 'info', 6000);
      }
    })
    .subscribe();

  // Channel: material_requests berubah → update Send/Return status teknisi + admin
  supa.channel('realtime-material')
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'material_requests'
    }, (payload) => {
      if(typeof loadMaterialRequests === 'function') loadMaterialRequests();
      if(payload.eventType === 'INSERT' && currentUser && currentUser.role === 'admin') {
        const r = payload.new;
        const typeLabel = r.type === 'SEND' ? '🔄 Request Send' : '↩️ Request Return';
        if(typeof showToast === 'function')
          showToast(typeLabel+' Masuk', `${r.dari_teknisi}: SN ${r.sn}`, 'info', 6000);
      }
    })
    .subscribe();

  // Channel: perangkat berubah → refresh list perangkat + rekap kabel + tracking
  supa.channel('realtime-perangkat')
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'perangkat'
    }, () => {
      if(typeof loadAndRenderListPerangkat === 'function' && _sinuIsVisible(document.getElementById('admin-list-perangkat-tbody'))) loadAndRenderListPerangkat();
      if(typeof loadRekapKabel === 'function') loadRekapKabel();
      if(typeof loadLogPerangkat === 'function' && _sinuIsVisible(document.getElementById('logperangkat-table-body'))) loadLogPerangkat();
      if(typeof loadListPerangkatSaya === 'function') loadListPerangkatSaya();
    })
    .subscribe();

  console.log('[Realtime] Listeners aktif — 7 channels');
}

// Panggil realtime saat app siap
window.addEventListener('load', function() {
  setTimeout(() => {
    if(currentUser) initRealtimeListeners();
  }, 2000);
});

// ── RESTORE STATE FORM TUGAS SETELAH REFRESH ─────────────────────────
function restoreActiveWork() {
  try {
    const saved = sessionStorage.getItem('sinu_active_work');
    if(!saved) return;
    const {woId, customer, type} = JSON.parse(saved);
    if(!woId) return;
    // Pastikan WO masih ada di myPickedTasks
    if(!myPickedTasks.find(t => t.woId === woId)) {
      sessionStorage.removeItem('sinu_active_work');
      return;
    }
    // Buka kembali form yang sedang dikerjakan pada view Tugas Saya.
    // Ini mencegah form terlihat di parent/sub-view yang salah setelah refresh.
    if(typeof switchMainTab === 'function') {
      const tugasSection = document.getElementById('section-tugas');
      if(tugasSection && tugasSection.classList.contains('hidden')) switchMainTab('tugas');
    }
    if(typeof switchSubTugas === 'function') switchSubTugas('tugas-saya');

    activeWoId = woId;
    document.getElementById('view-tugas-saya-list').classList.add('hidden');
    if(type === 'INSTALASI' || type === 'INSTALASI_RESELLER' || type === 'GANGGUAN') {
      const el = document.getElementById('form-work-instalasi');
      if(el) {
        el.classList.remove('hidden');
        if(typeof fillInfoBoxTeknisi === 'function') fillInfoBoxTeknisi(woId, customer);
        if(typeof loadTeknisiTeamFields === 'function') loadTeknisiTeamFields(woId, 'instalasi');
        if(typeof goToInstalasiStep1 === 'function') goToInstalasiStep1();
        setTimeout(restoreCamPhotos, 200);
      }
    } else {
      const el = document.getElementById('form-work-maintenance');
      if(el) {
        document.getElementById('maint-wo-info').innerText = 'WO: '+woId+' — '+customer;
        el.classList.remove('hidden');
        setTimeout(restoreCamPhotos, 200);
      }
    }
    console.log('[Restore] Form aktif dipulihkan untuk WO:', woId);
  } catch(e) {
    sessionStorage.removeItem('sinu_active_work');
  }
}

// ── CEK SN REAL-TIME SAAT INPUT BLUR ─────────────────────────────────
async function checkSNExists(val) {
  const sn = (val || '').trim().toUpperCase();
  const statusEl = document.getElementById('sn-check-status');
  const input = document.getElementById('perangkat-sn');
  if(!statusEl || !sn) return;

  statusEl.className = 'text-[11px] mt-1';
  statusEl.textContent = '⏳ Mengecek...';
  statusEl.classList.remove('hidden');

  try {
    const { data } = await supa.from('perangkat').select('sn,kondisi,status').eq('sn', sn).maybeSingle();
    if(data) {
      statusEl.textContent = `⚠️ SN "${sn}" sudah terdaftar (${data.kondisi} · ${data.status})`;
      statusEl.className = 'text-[11px] mt-1 text-amber-600 dark:text-amber-400 font-semibold';
      if(input) input.classList.add('border-amber-400');
    } else {
      statusEl.textContent = '✅ SN tersedia, belum terdaftar';
      statusEl.className = 'text-[11px] mt-1 text-emerald-600 dark:text-emerald-400 font-semibold';
      if(input) input.classList.remove('border-amber-400');
    }
  } catch(e) {
    statusEl.classList.add('hidden');
  }
}

// ── HANDLE ADMIN APPROVAL PICKUP MATERIAL ────────────────────────────
async function handleAdminBatchApproval(batchId, approve){
  if(!batchId){ showAlert('Batch tidak ditemukan.','Error'); return; }
  try{
    const {data,error}=await supa.from('pickup_requests').select('id,sn,jenis,teknisi_name')
      .eq('batch_id',batchId).eq('status','WAITING').order('created_at',{ascending:true});
    if(error) throw error;
    if(!data?.length){ showAlert('Tidak ada request pickup yang masih menunggu pada batch ini.','Info'); return; }
    for(const row of data){
      await handleAdminApproval(row.id,row.sn,row.jenis||'',row.teknisi_name,approve);
    }
    showAlert(data.length+' request pickup berhasil '+(approve?'di-approve':'ditolak')+'.','Batch Selesai');
    await loadApprovalList();
  }catch(err){ showAlert('Gagal memproses batch pickup: '+(err.message||''),'Error'); }
}

async function handleAdminApproval(requestId, sn, jenis, teknisiName, approve) {
  try {
    const { data: reqData, error: reqError } = await supa.from('pickup_requests')
      .select('status,meter_dari,meter_sampai')
      .eq('id', requestId).maybeSingle();
    if(reqError) throw reqError;
    if(!reqData) throw new Error('Request pickup tidak ditemukan.');
    if(reqData.status !== 'WAITING') {
      showAlert(`Request SN "${sn}" sudah diproses sebelumnya (${reqData.status}).`, 'Info');
      await loadApprovalList();
      return;
    }

    if(!approve) {
      const { error: rejectError } = await supa.from('pickup_requests')
        .update({ status: 'REJECTED' }).eq('id', requestId);
      if(rejectError) throw rejectError;
      showAlert(`Request SN "${sn}" dari ${teknisiName} ditolak.`, 'Rejected ❌');
      await loadApprovalList();
      return;
    }

    const meterDari = reqData.meter_dari != null ? Number(reqData.meter_dari) : null;
    const meterSampai = reqData.meter_sampai != null ? Number(reqData.meter_sampai) : null;
    const panjangDiambil = meterDari != null && meterSampai != null
      ? meterSampai - meterDari : null;
    if(panjangDiambil != null && (!Number.isFinite(panjangDiambil) || panjangDiambil <= 0)) {
      throw new Error('Rentang meter pickup tidak valid.');
    }

    const { data: pData, error: pError } = await supa.from('perangkat')
      .select('jenis,merk,kondisi,panjang_awal,panjang_sisa,status,lokasi')
      .eq('sn', sn).maybeSingle();
    if(pError) throw pError;
    if(!pData) throw new Error('SN perangkat tidak ditemukan: '+sn);

    const jenisFinal = pData.jenis || jenis || '-';
    const kondisiFinal = pData.kondisi || 'Baru';
    const isKabel = jenisFinal.toLowerCase().includes('kabel');
    const panjangAwal = pData.panjang_awal != null ? Number(pData.panjang_awal) : null;
    const stokGudang = pData.panjang_sisa != null ? Number(pData.panjang_sisa) : panjangAwal;
    if(isKabel && panjangDiambil != null && panjangDiambil > stokGudang) {
      throw new Error(`Pickup ${panjangDiambil}m melebihi stok gudang ${stokGudang}m untuk ${sn}.`);
    }

    const { data: existing, error: existingError } = await supa.from('perangkat_teknisi')
      .select('id,panjang_awal,panjang_sisa')
      .eq('sn', sn).eq('teknisi_name', teknisiName).maybeSingle();
    if(existingError) throw existingError;

    const alokasiBaru = isKabel && panjangDiambil != null ? panjangDiambil : (isKabel ? stokGudang : null);
    if(existing) {
      if(isKabel && alokasiBaru != null) {
        const panjangAwalTeknisi = Number(existing.panjang_awal || 0) + alokasiBaru;
        const panjangSisaTeknisi = Number(existing.panjang_sisa || 0) + alokasiBaru;
        const { error: mergeError } = await supa.from('perangkat_teknisi')
          .update({ panjang_awal: panjangAwalTeknisi, panjang_sisa: panjangSisaTeknisi })
          .eq('id', existing.id);
        if(mergeError) throw mergeError;
      }
    } else {
      const row = { sn, jenis: jenisFinal, teknisi_name: teknisiName, status: 'READY', kondisi: kondisiFinal };
      if(isKabel && alokasiBaru != null) {
        row.panjang_awal = alokasiBaru;
        row.panjang_sisa = alokasiBaru;
      }
      const { error: insertError } = await supa.from('perangkat_teknisi').insert(row);
      if(insertError) throw insertError;
    }

    if(isKabel) {
      const sisaGudangBaru = panjangDiambil != null ? stokGudang - panjangDiambil : 0;
      const globalUpdate = sisaGudangBaru > 0
        ? { status:'Gudang', lokasi:'Gudang Utama', panjang_sisa:sisaGudangBaru }
        : { status:teknisiName, lokasi:teknisiName, panjang_sisa:0 };
      const { error: updateError } = await supa.from('perangkat')
        .update(globalUpdate).eq('sn', sn);
      if(updateError) throw updateError;
    } else {
      const { error: updateError } = await supa.from('perangkat')
        .update({ status:teknisiName, lokasi:teknisiName }).eq('sn', sn);
      if(updateError) throw updateError;
    }

    const ket = isKabel && panjangDiambil != null
      ? `Pickup oleh ${teknisiName} — meter ${meterDari}m→${meterSampai}m (${panjangDiambil}m)`
      : `Pickup oleh ${teknisiName}`;
    await catatHistory(sn, 'Gudang', teknisiName, 'PICKUP', ket);

    // Status request diubah paling akhir agar kegagalan insert/update tidak
    // membuat request terlihat selesai padahal stok belum berhasil diproses.
    const { error: statusError } = await supa.from('pickup_requests')
      .update({ status: 'APPROVED' }).eq('id', requestId).eq('status', 'WAITING');
    if(statusError) throw statusError;

    let msg = `SN "${sn}" disetujui untuk ${teknisiName}.`;
    if(isKabel && panjangDiambil != null) {
      msg += `\nKabel diambil: ${panjangDiambil}m (meter ${meterDari}→${meterSampai})`;
      msg += `\nSisa di gudang: ${stokGudang - panjangDiambil}m`;
    } else {
      msg += '\nPerangkat siap diambil.';
    }
    showAlert(msg, 'Approved ✅');
    await loadApprovalList();
  } catch(err) {
    showAlert('Gagal update approval: ' + (err.message || ''), 'Error');
  }
}

// ── LOAD DROPDOWN SN ONT & KABEL dari perangkat_teknisi ──────────────
async function loadSNDropdowns() {
  const selONT   = document.getElementById('sn-ont-select');
  const selKabel = document.getElementById('sn-kabel-select');
  if(!selONT && !selKabel) return;

  const teknisiName = currentUser ? currentUser.displayName : '';
  try {
    const { data, error } = await supa
      .from('perangkat_teknisi')
      .select('sn, jenis, kondisi, panjang_sisa')
      .eq('teknisi_name', teknisiName)
      .eq('status', 'READY');

    if(error) throw error;
    const items = data || [];

    // Pisah berdasarkan jenis
    const isONT   = i => i.jenis && (i.jenis.toLowerCase().includes('ont') || i.jenis.toLowerCase().includes('modem'));
    const isKabel = i => i.jenis && (i.jenis.toLowerCase().includes('kabel') || i.jenis.toLowerCase().includes('dropcore'));

    if(selONT) {
      const onts = items.filter(isONT);
      selONT.innerHTML = '<option value="" disabled selected>-- Pilih SN ONT --</option>' +
        (onts.length
          ? onts.map(p => `<option value="${p.sn}">${p.sn}${p.jenis?' ('+p.jenis+')':''}</option>`).join('')
          : '<option disabled>Belum ada ONT yang di-approve</option>');
    }

    if(selKabel) {
      const kabels = items.filter(i => isKabel(i) && Number(i.panjang_sisa || 0) > 0);
      selKabel.innerHTML = '<option value="" disabled selected>-- Pilih SN Kabel --</option>' +
        (kabels.length
          ? kabels.map(p => {
              const sisa = ` — ${p.panjang_sisa}m sisa`;
              return `<option value="${p.sn}">${p.sn}${p.jenis?' ('+p.jenis+')':''}${sisa}</option>`;
            }).join('')
          : '<option disabled>Belum ada Kabel dengan sisa stok</option>');
    }

  } catch(e) {
    console.warn('[loadSNDropdowns] Error:', e.message);
  }
}

// ── FILTER LIST PERANGKAT (ONT vs Kabel) ─────────────────────────────
let _allPerangkatData = [];

// Override loadAndRenderListPerangkat agar simpan data untuk filter
const _origLoadListPerangkat = typeof loadAndRenderListPerangkat === 'function' ? loadAndRenderListPerangkat : null;
async function loadAndRenderListPerangkat() {
  const tbody = document.getElementById('admin-list-perangkat-tbody');
  if(!tbody) return;
  tbody.innerHTML = '<tr><td colspan="5" class="text-center py-6"><i class="fa-solid fa-spinner animate-spin text-blue-500 mr-2"></i>Memuat...</td></tr>';

  const kondisiColor = {
    'Baru': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    'Dismantle': 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    'Rusak': 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
  };
  const lokasiColor = {
    'Gudang': 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    'Gudang Utama': 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    'Terpasang': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
  };

  try {
    const { data, error } = await supa.from('perangkat').select('*').order('created_at', {ascending: false});
    if(error) throw error;

    // Hitung saldo total roll dari pemakaian WO. Field perangkat.panjang_sisa
    // hanya stok gudang, sehingga tidak boleh dipakai sebagai saldo total kabel.
    const kabelSns = (data || [])
      .filter(p => p.jenis && p.jenis.toLowerCase().includes('kabel') && p.sn)
      .map(p => p.sn);
    const pemakaianMap = {};
    if(kabelSns.length) {
      const { data: woKabel, error: woError } = await supa.from('work_orders')
        .select('sn_kabel, panjang_kabel')
        .in('sn_kabel', kabelSns);
      if(!woError) {
        (woKabel || []).forEach(wo => {
          pemakaianMap[wo.sn_kabel] = (pemakaianMap[wo.sn_kabel] || 0) + (Number(wo.panjang_kabel) || 0);
        });
      }
    }

    _allPerangkatData = (data || []).map(p => {
      const isKabel = p.jenis && p.jenis.toLowerCase().includes('kabel');
      if(!isKabel || p.panjang_awal == null) return p;
      const panjangAwal = Number(p.panjang_awal) || 0;
      const totalTerpakai = pemakaianMap[p.sn] || 0;
      return {
        ...p,
        _saldoKabelRekap: Math.max(0, panjangAwal - totalTerpakai)
      };
    });
    renderPerangkatTable(_allPerangkatData, kondisiColor, lokasiColor);
  } catch(e) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-rose-500 text-xs">Gagal load data.</td></tr>';
  }
}

function renderPerangkatTable(data, kondisiColor, lokasiColor) {
  const tbody = document.getElementById('admin-list-perangkat-tbody');
  if(!tbody) return;
  const kc = kondisiColor || {'Baru':'bg-emerald-100 text-emerald-700','Dismantle':'bg-amber-100 text-amber-700','Rusak':'bg-rose-100 text-rose-700'};
  const lc = lokasiColor  || {'Gudang Utama':'bg-blue-100 text-blue-700','Terpasang':'bg-emerald-100 text-emerald-700'};
  if(!data.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-6 text-slate-400 text-xs">Tidak ada data.</td></tr>';
    return;
  }
  tbody.innerHTML = data.map(p => {
    const kCls = kc[p.kondisi] || 'bg-slate-100 text-slate-600';
    const lokasi = p.lokasi || p.status || 'Gudang';
    const isPelanggan = lokasi.startsWith('Pelanggan:');
    const namaPlg = lokasi.replace('Pelanggan:','').trim();
    const isKabel = p.jenis && p.jenis.toLowerCase().includes('kabel');
    const panjangAwal = Number(p.panjang_awal) || 0;
    const panjangSisa = isKabel && p._saldoKabelRekap != null
      ? Number(p._saldoKabelRekap)
      : (p.panjang_sisa != null ? Number(p.panjang_sisa) : null);
    const lokasiCell = isPelanggan
      ? `<div class="flex flex-col gap-0.5">
           <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 w-fit">Terpasang</span>
           <span class="text-[9px] text-slate-500 dark:text-slate-400">${namaPlg}</span>
         </div>`
      : `<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold ${lc[lokasi]||'bg-amber-100 text-amber-700'}">${lokasi}</span>`;
    return `<tr class="hover:bg-slate-50/80 dark:hover:bg-slate-700/50 transition-all">
      <td class="py-3 px-4 font-bold font-mono text-slate-900 dark:text-white text-xs">${p.sn}</td>
      <td class="py-3 px-3 text-xs font-semibold text-slate-700 dark:text-slate-200">${p.merk||'-'}</td>
      <td class="py-3 px-3 text-xs">${p.jenis||'-'}${isKabel && panjangSisa != null ? `<br><span class="text-[10px] font-bold ${panjangSisa <= 0 ? 'text-rose-500' : panjangSisa < panjangAwal*0.2 ? 'text-amber-500' : 'text-emerald-600'}">${panjangSisa}m sisa${panjangAwal ? ' / '+panjangAwal+'m' : ''}</span>` : ''}</td>
      <td class="py-3 px-3 text-center">
        <div class="flex items-center justify-center gap-1">
          <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold ${kCls}">${p.kondisi||'-'}</span>
          <button type="button" onclick="editKondisiPerangkat('${p.sn}','${p.kondisi||'Baru'}')" title="Edit kondisi"
            class="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
            <i class="fa-solid fa-pen text-[9px]"></i>
          </button>
        </div>
      </td>
      <td class="py-3 px-3">${lokasiCell}</td>
    </tr>`;
  }).join('');
}

function filterListPerangkat(type) {
  // Update active button style
  document.querySelectorAll('.filter-perangkat-btn').forEach(b => {
    b.className = 'filter-perangkat-btn px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all';
  });
  const activeBtn = document.getElementById('filter-perangkat-' + type);
  if(activeBtn) activeBtn.className = 'filter-perangkat-btn active px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-600 bg-slate-800 text-white transition-all';

  let filtered = _allPerangkatData;
  if(type === 'ont') {
    filtered = _allPerangkatData.filter(p =>
      p.jenis && (p.jenis.toLowerCase().includes('ont') || p.jenis.toLowerCase().includes('modem'))
    );
  } else if(type === 'kabel') {
    filtered = _allPerangkatData.filter(p =>
      p.jenis && (p.jenis.toLowerCase().includes('kabel') || p.jenis.toLowerCase().includes('dropcore'))
    );
  }
  renderPerangkatTable(filtered);
}

// ── LOAD MATERIAL REQUESTS (Send & Return) untuk Admin ───────────────
async function loadMaterialRequests() {
  const container = document.getElementById('material-requests-content');
  if(!container) return;
  container.innerHTML = '<p class="text-center py-4"><i class="fa-solid fa-spinner animate-spin text-blue-500 mr-2"></i>Memuat...</p>';

  try {
    const { data, error } = await supa
      .from('material_requests')
      .select('*')
      .eq('status', 'WAITING')
      .order('created_at', { ascending: false });

    if(error) throw error;
    if(!data || !data.length) {
      container.innerHTML = '<p class="text-xs text-slate-400 text-center py-6">Tidak ada request yang menunggu.</p>';
      return;
    }

    container.innerHTML = data.map((r,index) => {
      const isSend = r.type === 'SEND';
      const tgl = new Date(r.created_at).toLocaleString('id-ID', {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
      const typeBadge = isSend
        ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-100 text-indigo-700">SEND</span>'
        : '<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-700">RETURN</span>';
      const desc = isSend
        ? `${r.sn} → ${r.ke_teknisi}`
        : `${r.sn} → Gudang (${r.alasan||'-'})`;
      const batchLabel = r.batch_id ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">Batch</span>' : '';
      const isFirstBatchItem = !!r.batch_id && data.findIndex(item => item.batch_id === r.batch_id) === index;
      const batchActions = isFirstBatchItem ? `<button onclick="approveMaterialBatch('${r.batch_id}',true)" class="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md">Approve Batch</button><button onclick="approveMaterialBatch('${r.batch_id}',false)" class="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl">Reject Batch</button>` : '';
      return `
      <div class="p-4 bg-slate-50 dark:bg-slate-700/40 rounded-2xl border border-slate-200 dark:border-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="space-y-1">
          <div class="flex items-center gap-2">${typeBadge}${batchLabel}<span class="text-xs font-black text-slate-900 dark:text-white">${desc}</span></div>
          <p class="text-[11px] text-slate-500">Dari: <span class="font-bold text-blue-600">${r.dari_teknisi}</span> • ${tgl}</p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          ${batchActions}
          <button onclick="approveMaterialRequest('${r.id}','${r.type}','${r.sn}','${r.dari_teknisi}','${r.ke_teknisi||''}',false)"
            class="px-3 py-2 bg-rose-100 hover:bg-rose-200 text-rose-600 text-xs font-bold rounded-xl transition-all">Reject</button>
          <button onclick="approveMaterialRequest('${r.id}','${r.type}','${r.sn}','${r.dari_teknisi}','${r.ke_teknisi||''}',true)"
            class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md">Approve</button>
        </div>
      </div>`;
    }).join('');
  } catch(err) {
    container.innerHTML = `<p class="text-xs text-rose-500 text-center py-4">Gagal: ${err.message}</p>`;
  }
}

// Approve/Reject Send & Return
async function approveMaterialBatch(batchId,approve){
  if(!batchId){ showAlert('Batch tidak ditemukan.','Error'); return; }
  try{
    const {data,error}=await supa.from('material_requests').select('id,type,sn,dari_teknisi,ke_teknisi')
      .eq('batch_id',batchId).eq('status','WAITING').order('created_at',{ascending:true});
    if(error) throw error;
    if(!data?.length){ showAlert('Tidak ada request material yang masih menunggu pada batch ini.','Info'); return; }
    for(const row of data){
      await approveMaterialRequest(row.id,row.type,row.sn,row.dari_teknisi,row.ke_teknisi||'',approve);
    }
    showAlert(data.length+' request material berhasil '+(approve?'di-approve':'ditolak')+'.','Batch Selesai');
    await loadMaterialRequests();
  }catch(err){ showAlert('Gagal memproses batch material: '+(err.message||''),'Error'); }
}

async function approveMaterialRequest(id, type, sn, dari, ke, approve) {
  try {
    const { data: request, error: requestError } = await supa.from('material_requests')
      .select('status').eq('id', id).maybeSingle();
    if(requestError) throw requestError;
    if(!request) throw new Error('Request material tidak ditemukan.');
    if(request.status !== 'WAITING') {
      showAlert(`Request ${type} SN "${sn}" sudah diproses sebelumnya (${request.status}).`, 'Info');
      await loadMaterialRequests();
      return;
    }

    if(!approve) {
      const { error: rejectError } = await supa.from('material_requests')
        .update({ status:'REJECTED' }).eq('id', id).eq('status', 'WAITING');
      if(rejectError) throw rejectError;
      showAlert(`Request ${type} SN "${sn}" dari ${dari} ditolak.`, 'Ditolak');
      await loadMaterialRequests();
      return;
    }

    if(type === 'RETURN') {
      const { data: ptReturn, error: ptError } = await supa.from('perangkat_teknisi')
        .select('panjang_sisa, panjang_awal, jenis')
        .eq('sn', sn).eq('teknisi_name', dari).eq('status','READY').maybeSingle();
      if(ptError) throw ptError;
      if(!ptReturn) throw new Error('Alokasi perangkat teknisi tidak ditemukan untuk '+sn+'.');

      const isKabelReturn = ptReturn.jenis?.toLowerCase().includes('kabel');
      const { data: globalData, error: globalError } = await supa.from('perangkat')
        .select('panjang_sisa').eq('sn', sn).maybeSingle();
      if(globalError) throw globalError;
      if(!globalData) throw new Error('Perangkat global tidak ditemukan untuk '+sn+'.');

      // Stok gudang tidak boleh ditimpa oleh sisa teknisi. Sisa alokasi
      // dikembalikan dan dijumlahkan dengan stok gudang yang sudah ada.
      const updateRet = { status:'Gudang', lokasi:'Gudang Utama' };
      if(isKabelReturn) {
        const stokGudang = Number(globalData.panjang_sisa || 0);
        const sisaTeknisi = Number(ptReturn.panjang_sisa || 0);
        updateRet.panjang_sisa = stokGudang + sisaTeknisi;
      }
      const { error: updateError } = await supa.from('perangkat')
        .update(updateRet).eq('sn', sn);
      if(updateError) throw updateError;

      const { error: deleteError } = await supa.from('perangkat_teknisi')
        .delete().eq('sn', sn).eq('teknisi_name', dari);
      if(deleteError) throw deleteError;

      const retSisa = isKabelReturn ? Number(globalData.panjang_sisa || 0) + Number(ptReturn.panjang_sisa || 0) : null;
      const retKet = isKabelReturn
        ? `Return oleh ${dari} — sisa dikembalikan ${ptReturn.panjang_sisa || 0}m, total gudang ${retSisa}m`
        : `Return oleh ${dari}`;
      await catatHistory(sn, dari, 'Gudang', 'RETURN', retKet);
      showAlert(`SN "${sn}" berhasil di-return ke Gudang.${isKabelReturn ? '\nTotal stok kabel: '+retSisa+'m' : ''}`, 'Return Berhasil');
    } else if(type === 'SEND') {
      const { data: ptData, error: ptError } = await supa.from('perangkat_teknisi')
        .select('jenis,kondisi,panjang_awal,panjang_sisa')
        .eq('sn', sn).eq('teknisi_name', dari).eq('status','READY').maybeSingle();
      if(ptError) throw ptError;
      if(!ptData) throw new Error('Alokasi perangkat teknisi tidak ditemukan untuk '+sn+'.');
      const isKabelSend = ptData.jenis?.toLowerCase().includes('kabel');

      const { data: globalData, error: globalError } = await supa.from('perangkat')
        .select('panjang_sisa').eq('sn', sn).maybeSingle();
      if(globalError) throw globalError;
      if(!globalData) throw new Error('Perangkat global tidak ditemukan untuk '+sn+'.');

      const globalUpdate = isKabelSend && Number(globalData.panjang_sisa || 0) > 0
        ? { status:'Gudang', lokasi:'Gudang Utama' }
        : { status:ke, lokasi:ke };
      const { error: globalUpdateError } = await supa.from('perangkat')
        .update(globalUpdate).eq('sn', sn);
      if(globalUpdateError) throw globalUpdateError;

      const { error: deleteError } = await supa.from('perangkat_teknisi')
        .delete().eq('sn', sn).eq('teknisi_name', dari);
      if(deleteError) throw deleteError;

      const newRow = {
        sn, teknisi_name:ke, status:'READY',
        kondisi:ptData.kondisi || 'Baru', jenis:ptData.jenis || '-'
      };
      if(isKabelSend) {
        newRow.panjang_awal = ptData.panjang_awal || null;
        newRow.panjang_sisa = ptData.panjang_sisa || null;
      }
      const { error: upsertError } = await supa.from('perangkat_teknisi').upsert(newRow);
      if(upsertError) throw upsertError;

      const sendKet = isKabelSend && ptData.panjang_sisa != null
        ? `Send dari ${dari} ke ${ke} — sisa ${ptData.panjang_sisa}m`
        : `Send dari ${dari} ke ${ke}`;
      await catatHistory(sn, dari, ke, 'SEND', sendKet);
      showAlert(`SN "${sn}" berhasil dipindahkan ke ${ke}.${isKabelSend && ptData.panjang_sisa != null ? '\nSisa alokasi: '+ptData.panjang_sisa+'m' : ''}`, 'Send Berhasil');
    } else {
      throw new Error('Tipe request material tidak dikenal: '+type);
    }

    // Tandai selesai hanya setelah seluruh perubahan stok/alokasi berhasil.
    const { error: statusError } = await supa.from('material_requests')
      .update({ status:'APPROVED' }).eq('id', id).eq('status', 'WAITING');
    if(statusError) throw statusError;
    await loadMaterialRequests();
  } catch(err) {
    showAlert('Gagal: ' + (err.message || ''), 'Error');
  }
}

// ── DEVICE HISTORY TRACKING ──────────────────────────────────────────

// Catat perpindahan perangkat ke device_history
async function catatHistory(sn, dari, ke, aksi, keterangan) {
  try {
    await supa.from('device_history').insert({ sn, dari: dari||'Gudang', ke, aksi, keterangan: keterangan||'' });
  } catch(e) { console.warn('[History] Gagal catat:', e.message); }
}

// Load tracking log perangkat untuk admin
async function loadLogPerangkat() {
  const tbody = document.getElementById('logperangkat-table-body');
  if(!tbody) return;
  tbody.innerHTML = '<tr><td colspan="6" class="text-center py-6"><i class="fa-solid fa-spinner animate-spin text-blue-500 mr-2"></i>Memuat...</td></tr>';

  const searchQ = (document.getElementById('logperangkat-search')?.value||'').toLowerCase();
  const filterV = document.getElementById('logperangkat-filter')?.value || 'ALL';

  try {
    // Ambil semua perangkat unik dari device_history
    const { data: hist, error } = await supa
      .from('device_history')
      .select('sn, aksi, dari, ke, keterangan, created_at')
      .order('created_at', {ascending: false});
    if(error) throw error;

    // Ambil juga data perangkat untuk jenis dan saldo kabel.
    const { data: perangkats, error: perangkatError } = await supa.from('perangkat')
      .select('sn, jenis, merk, kondisi, status, lokasi, panjang_awal, panjang_sisa');
    if(perangkatError) throw perangkatError;
    const pMap = {};
    (perangkats||[]).forEach(p => pMap[p.sn] = p);

    // Kabel parsial dapat tercatat pernah dipasang, tetapi roll-nya masih
    // memiliki saldo. Hitung saldo total dari pemakaian WO, bukan status global.
    const kabelSns = (perangkats||[])
      .filter(p => p.jenis && p.jenis.toLowerCase().includes('kabel') && p.sn)
      .map(p => p.sn);
    if(kabelSns.length) {
      const { data: woKabel, error: woError } = await supa.from('work_orders')
        .select('sn_kabel, panjang_kabel')
        .in('sn_kabel', kabelSns);
      if(woError) throw woError;
      const pemakaianMap = {};
      (woKabel||[]).forEach(wo => {
        pemakaianMap[wo.sn_kabel] = (pemakaianMap[wo.sn_kabel] || 0) + (Number(wo.panjang_kabel) || 0);
      });
      kabelSns.forEach(sn => {
        const p = pMap[sn];
        const panjangAwal = Number(p?.panjang_awal) || 0;
        p._saldoKabelRekap = Math.max(0, panjangAwal - (pemakaianMap[sn] || 0));
      });
    }

    // Group by SN — ambil event terbaru per SN
    const snMap = {};
    (hist||[]).forEach(h => { if(!snMap[h.sn]) snMap[h.sn] = h; });

    let rows = Object.values(snMap);

    // Filter
    if(searchQ) rows = rows.filter(r => r.sn.toLowerCase().includes(searchQ) || (r.ke||'').toLowerCase().includes(searchQ));
    if(filterV !== 'ALL') {
      if(filterV === 'GUDANG')    rows = rows.filter(r => r.ke === 'Gudang' || r.ke === 'Gudang Utama');
      if(filterV === 'TEKNISI')   rows = rows.filter(r => r.ke !== 'Gudang' && r.ke !== 'Gudang Utama' && r.ke !== 'Terpasang');
      if(filterV === 'TERPASANG') rows = rows.filter(r => r.ke === 'Terpasang');
    }

    // Update stat cards
    const allHist = hist || [];
    const uniqueSNs = [...new Set(allHist.map(h => h.sn))];
    const diGudang  = uniqueSNs.filter(sn => { const p = pMap[sn]; return p && (p.status==='Gudang'||p.lokasi==='Gudang Utama'); });
    const diTeknisi = uniqueSNs.filter(sn => { const p = pMap[sn]; return p && p.status!=='Gudang' && p.lokasi!=='Gudang Utama'; });
    const E = id => document.getElementById(id);
    if(E('lp-total'))    E('lp-total').textContent    = uniqueSNs.length;
    if(E('lp-gudang'))   E('lp-gudang').textContent   = diGudang.length;
    if(E('lp-teknisi'))  E('lp-teknisi').textContent  = diTeknisi.length;
    if(E('lp-terpasang'))E('lp-terpasang').textContent= 0;

    if(!rows.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-slate-400 text-xs">Belum ada riwayat perpindahan.</td></tr>';
      // Admin tracking list juga kosong
      const atl = document.getElementById('admin-tracking-list');
      if(atl) atl.innerHTML = '<p class="text-xs text-slate-400 text-center py-4">Belum ada riwayat.</p>';
      return;
    }

    const aksiColor = {
      PICKUP:    'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
      SEND:      'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
      RETURN:    'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
      TERPASANG: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
    };

    tbody.innerHTML = rows.map(r => {
      const p   = pMap[r.sn] || {};
      const tgl = new Date(r.created_at).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'});
      const jam = new Date(r.created_at).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
      const aCls = aksiColor[r.aksi] || 'bg-slate-100 text-slate-600';
      const rawLokNow = p.lokasi || p.status || r.ke;
      const isKabel = p.jenis && p.jenis.toLowerCase().includes('kabel');
      const saldoKabel = isKabel && p._saldoKabelRekap != null ? Number(p._saldoKabelRekap) : null;
      const adaSaldoKabel = saldoKabel != null && saldoKabel > 0;
      const lokNow = rawLokNow;
      const lokDisplay = adaSaldoKabel
        ? `<div class="flex flex-col gap-0.5">
             <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 w-fit">Kabel parsial — sisa ${saldoKabel}m</span>
             <span class="text-[10px] text-slate-500 dark:text-slate-400">Riwayat terakhir: ${rawLokNow}</span>
           </div>`
        : lokNow.startsWith('Pelanggan:')
          ? `<span class="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">Terpasang — ${lokNow.replace('Pelanggan:','').trim()}</span>`
          : lokNow;
      const lokCls = adaSaldoKabel
        ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
        : (lokNow==='Gudang'||lokNow==='Gudang Utama')
          ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
          : lokNow==='Terpasang'||lokNow.startsWith('Pelanggan:')
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
          : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300';
      return `<tr class="hover:bg-slate-50/80 dark:hover:bg-slate-700/50 transition-all">
        <td class="py-3 px-3 font-extrabold font-mono text-xs text-slate-900 dark:text-white">${r.sn}</td>
        <td class="py-3 px-3 text-xs text-slate-600 dark:text-slate-300">${p.jenis||'-'}${p.merk?' ('+p.merk+')':''}</td>
        <td class="py-3 px-3 text-center"><span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold ${aCls}">${r.aksi}</span></td>
        <td class="py-3 px-3 text-xs text-slate-500">${r.dari||'Gudang'} → ${r.ke}</td>
        <td class="py-3 px-3">
          ${lokDisplay}
        </td>
        <td class="py-3 px-3 text-center">
          <button onclick="showDeviceHistory('${r.sn}')"
            class="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-bold flex items-center gap-1 transition-all">
            <i class="fa-solid fa-timeline"></i>Riwayat
          </button>
        </td>
      </tr>`;
    }).join('');

    // Render juga ke admin tracking card list (compact)
    const atl = document.getElementById('admin-tracking-list');
    if(atl) {
      atl.innerHTML = rows.map(r => {
        const p = pMap[r.sn] || {};
        const tgl = new Date(r.created_at).toLocaleString('id-ID',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
        const rawLokNow = p.lokasi || p.status || r.ke;
        const isKabel = p.jenis && p.jenis.toLowerCase().includes('kabel');
        const saldoKabel = isKabel && p._saldoKabelRekap != null ? Number(p._saldoKabelRekap) : null;
        const lokText = saldoKabel != null && saldoKabel > 0
          ? `Kabel parsial — sisa ${saldoKabel}m (riwayat: ${rawLokNow})`
          : rawLokNow;
        return `
        <div class="p-3.5 bg-slate-50 dark:bg-slate-700/40 rounded-2xl border border-slate-200 dark:border-slate-600 flex items-center justify-between">
          <div class="space-y-0.5">
            <p class="text-xs font-extrabold text-blue-600 dark:text-blue-400 font-mono">${r.sn}</p>
            <p class="text-[11px] text-slate-500">${p.jenis||'-'}${p.merk?' ('+p.merk+')':''} • ${lokText} • ${tgl}</p>
          </div>
          <button onclick="showDeviceHistory('${r.sn}')" class="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-bold flex items-center gap-1">
            <i class="fa-solid fa-timeline"></i>Timeline
          </button>
        </div>`;
      }).join('');
    }
  } catch(e) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-rose-500 text-xs">Gagal: ${e.message}</td></tr>`;
  }
}

// Tampilkan timeline riwayat SN tertentu
async function showDeviceHistory(sn) {
  const modal    = document.getElementById('device-history-modal');
  const snEl     = document.getElementById('device-history-sn');
  const timeline = document.getElementById('device-history-timeline');
  if(!modal) return;

  snEl.textContent = sn;
  timeline.innerHTML = '<p class="text-center py-4"><i class="fa-solid fa-spinner animate-spin text-blue-500"></i></p>';
  modal.classList.remove('hidden');

  try {
    const { data, error } = await supa
      .from('device_history')
      .select('*')
      .eq('sn', sn)
      .order('created_at', {ascending: true});
    if(error) throw error;

    if(!data || !data.length) {
      timeline.innerHTML = '<p class="text-xs text-slate-400 text-center py-4">Belum ada riwayat.</p>';
      return;
    }

    const aksiIcon = {
      PICKUP:    { icon:'fa-hand-holding-hand', color:'bg-blue-500' },
      SEND:      { icon:'fa-share-nodes',       color:'bg-indigo-500' },
      RETURN:    { icon:'fa-rotate-left',       color:'bg-rose-500' },
      TERPASANG: { icon:'fa-plug-circle-check', color:'bg-emerald-500' }
    };

    timeline.innerHTML = `
      <div class="relative pl-6 space-y-4">
        <div class="absolute left-2 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-600"></div>
        ${data.map((h, i) => {
          const cfg = aksiIcon[h.aksi] || {icon:'fa-circle', color:'bg-slate-400'};
          const tgl = new Date(h.created_at).toLocaleString('id-ID',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
          const isLast = i === data.length - 1;
          return `
          <div class="relative flex gap-3 items-start">
            <div class="absolute -left-6 w-4 h-4 ${cfg.color} rounded-full flex items-center justify-center shrink-0 mt-0.5">
              <i class="fa-solid ${cfg.icon} text-white text-[8px]"></i>
            </div>
            <div class="flex-1 ${isLast ? 'bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900' : 'bg-slate-50 dark:bg-slate-700/40 border border-slate-100 dark:border-slate-700'} rounded-xl p-3">
              <div class="flex items-center justify-between gap-2">
                <span class="text-xs font-extrabold text-slate-800 dark:text-slate-100">${h.dari||'Gudang'} → ${h.ke}</span>
                ${isLast ? '<span class="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-blue-100 text-blue-700">Terkini</span>' : ''}
              </div>
              <p class="text-[10px] text-slate-500 mt-0.5">${h.keterangan||h.aksi} • ${tgl}</p>
            </div>
          </div>`;
        }).join('')}
      </div>`;
  } catch(e) {
    timeline.innerHTML = `<p class="text-xs text-rose-500 text-center py-4">Gagal: ${e.message}</p>`;
  }
}

// ── REKAP PENGGUNAAN KABEL ────────────────────────────────────────────
async function loadRekapKabel() {
  // Update kedua container: admin dan supervisor
  const elAdmin = document.getElementById('rekap-kabel-list');
  const elSpv   = document.getElementById('rekap-kabel-list-spv');
  const targets = [elAdmin, elSpv].filter(Boolean);
  if(!targets.length) return;
  const loadingHtml = '<p class="text-center py-4"><i class="fa-solid fa-spinner animate-spin text-emerald-500 mr-2"></i>Memuat rekap...</p>';
  targets.forEach(el => el.innerHTML = loadingHtml);

  try {
    const { data: woData, error: woErr } = await supa
      .from('work_orders')
      .select('*')
      .not('sn_kabel', 'is', null)
      .gt('panjang_kabel', 0)
      .order('created_at', { ascending: false });
    if(woErr) throw woErr;

    const snList = [...new Set((woData||[]).map(d => d.sn_kabel).filter(Boolean))];
    let perangkatMap = {};
    if(snList.length) {
      const { data: pData } = await supa.from('perangkat')
        .select('sn, panjang_awal, panjang_sisa, merk, jenis, kondisi')
        .in('sn', snList);
      (pData||[]).forEach(p => { perangkatMap[p.sn] = p; });
    }

    if(!woData || !woData.length) {
      targets.forEach(el => el.innerHTML = '<p class="text-xs text-slate-400 text-center py-6">Belum ada data pemakaian kabel.</p>');
      return;
    }

    // Group by sn_kabel, simpan tanggal pemakaian terakhir
    const rekapMap = {};
    (woData||[]).forEach(wo => {
      const sn = wo.sn_kabel;
      if(!rekapMap[sn]) rekapMap[sn] = { sn, total: 0, lastDate: '', pemakaian: [] };
      rekapMap[sn].total += Number(wo.panjang_kabel) || 0;
      const tgl = wo.tanggal || (wo.created_at ? wo.created_at.substring(0,10) : '');
      if(tgl > rekapMap[sn].lastDate) rekapMap[sn].lastDate = tgl;
      rekapMap[sn].pemakaian.push({
        woId: wo.wo_id,
        pelanggan: wo.pelanggan,
        meter: wo.panjang_kabel || 0,
        tipe: wo.tipe,
        teknisi: Array.isArray(wo.teknisi) ? wo.teknisi.join(', ') : (wo.teknisi||'-'),
        tanggal: tgl,
        status: wo.status
      });
    });

    // Sort: paling baru dipakai di atas
    const rows = Object.values(rekapMap).sort((a,b) => b.lastDate.localeCompare(a.lastDate));

    targets.forEach(el => {
      // Prefix ID unik per panel agar toggle tidak bentrok antara Admin dan Supervisor.
      const scope = el.id === 'rekap-kabel-list-spv' ? 'spv' : 'admin';
      el.innerHTML = rows.map((r, idx) => {
      const p = perangkatMap[r.sn] || {};
      const panjangAwal = Number(p.panjang_awal) || 0;
      const totalTerpakai = Number(r.total) || 0;
      // perangkat.panjang_sisa adalah stok gudang, bukan saldo seluruh roll.
      // Pickup hanya memindahkan sebagian kabel ke teknisi; yang mengurangi
      // saldo total adalah kabel yang tercatat terpakai pada work order.
      const panjangSisa = Math.max(0, panjangAwal - totalTerpakai);
      const pct = panjangAwal > 0 ? Math.max(0, Math.round((panjangSisa / panjangAwal) * 100)) : 0;
      const barColor = pct <= 10 ? 'bg-rose-500' : pct <= 30 ? 'bg-amber-400' : 'bg-emerald-500';
      const sisaColor = pct <= 10 ? 'text-rose-600' : pct <= 30 ? 'text-amber-600' : 'text-emerald-600';
      const detailId = 'kabel-detail-' + scope + '-' + idx;

      // Sort pemakaian: terbaru di atas
      const sortedPemakaian = r.pemakaian.sort((a,b) => b.tanggal.localeCompare(a.tanggal));

      const pemakaianRows = sortedPemakaian.map(pp => `
        <tr class="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30">
          <td class="py-2 px-3 text-[10px] font-mono text-blue-600 dark:text-blue-400">${pp.woId}</td>
          <td class="py-2 px-3 text-[11px] font-semibold text-slate-700 dark:text-slate-200">${pp.pelanggan||'-'}</td>
          <td class="py-2 px-3 text-[11px] text-slate-500">${pp.tipe}</td>
          <td class="py-2 px-3 text-[11px] font-bold text-emerald-600 text-center">${pp.meter}m</td>
          <td class="py-2 px-3 text-[10px] text-slate-400">${pp.teknisi}</td>
          <td class="py-2 px-3 text-[10px] text-slate-400">${pp.tanggal}</td>
        </tr>`).join('');

      return `<div class="border border-slate-200 dark:border-slate-600 rounded-2xl overflow-hidden">
        <!-- HEADER — klik untuk expand -->
        <div class="p-3.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-all"
             onclick="toggleRekapKabel('${detailId}', this)">
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-2 flex-wrap min-w-0">
              <span class="text-xs font-extrabold text-slate-900 dark:text-white font-mono shrink-0">${r.sn}</span>
              ${p.merk ? `<span class="text-[10px] text-slate-400 hidden sm:inline">${p.merk} ${p.jenis||''}</span>` : ''}
              <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0">${r.pemakaian.length}x pakai</span>
            </div>
            <div class="flex items-center gap-3 shrink-0">
              <div class="text-right text-[11px] hidden sm:block">
                <span class="text-rose-600 font-bold">${r.total}m</span>
                <span class="text-slate-400 mx-1">/</span>
                <span class="text-slate-500">${panjangAwal}m</span>
                <span class="text-slate-400 mx-1">→</span>
                <span class="${sisaColor} font-bold">${panjangSisa}m sisa</span>
              </div>
              <i class="fa-solid fa-chevron-down text-slate-400 text-[10px] transition-transform duration-200" id="${detailId}-icon"></i>
            </div>
          </div>
          <!-- Progress bar selalu tampil -->
          <div class="flex items-center gap-2 mt-2">
            <div class="flex-1 bg-slate-200 dark:bg-slate-600 rounded-full h-1.5 overflow-hidden">
              <div class="h-1.5 rounded-full ${barColor} transition-all" style="width:${pct}%"></div>
            </div>
            <span class="text-[10px] font-bold ${sisaColor} shrink-0">${pct}%</span>
          </div>
          <!-- Info mobile -->
          <div class="flex gap-3 mt-1.5 sm:hidden text-[11px]">
            <span class="text-rose-600 font-bold">${r.total}m terpakai</span>
            <span class="text-slate-400">|</span>
            <span class="${sisaColor} font-bold">${panjangSisa}m sisa</span>
          </div>
        </div>
        <!-- DETAIL — hidden by default -->
        <div id="${detailId}" class="hidden border-t border-slate-100 dark:border-slate-700">
          <div class="overflow-x-auto">
            <table class="w-full text-left">
              <thead><tr class="bg-slate-50 dark:bg-slate-700/30 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                <th class="py-2 px-3">WO ID</th>
                <th class="py-2 px-3">Pelanggan</th>
                <th class="py-2 px-3">Tipe</th>
                <th class="py-2 px-3 text-center">Meter</th>
                <th class="py-2 px-3">Teknisi</th>
                <th class="py-2 px-3">Tanggal</th>
              </tr></thead>
              <tbody>${pemakaianRows}</tbody>
            </table>
          </div>
          <div class="px-3 py-2 border-t border-slate-100 dark:border-slate-700 flex justify-end">
            <button type="button" onclick="toggleRekapKabel('${detailId}', this.closest('.border').querySelector('[onclick*=toggleRekapKabel]'))"
              class="text-[10px] text-slate-400 hover:text-slate-600 font-bold flex items-center gap-1">
              <i class="fa-solid fa-chevron-up text-[9px]"></i>Sembunyikan
            </button>
          </div>
        </div>
      </div>`;
    }).join('');
    });

  } catch(e) {
    targets.forEach(el => el.innerHTML = `<p class="text-xs text-rose-500 text-center py-4">Gagal memuat rekap: ${e.message}</p>`);
  }
}

function toggleRekapKabel(detailId, headerEl) {
  const detail = document.getElementById(detailId);
  const icon = document.getElementById(detailId + '-icon');
  if(!detail) return;
  const isHidden = detail.classList.contains('hidden');
  detail.classList.toggle('hidden', !isHidden);
  if(icon) icon.style.transform = isHidden ? 'rotate(180deg)' : '';
}

// ── EDIT KONDISI PERANGKAT ────────────────────────────────────────────
async function editKondisiPerangkat(sn, kondisiSaat) {
  var pilihan = ['Baru', 'Dismantle', 'Rusak', 'Bekas Pakai'];
  var opsi = pilihan.map(function(k,i){ return (i+1)+'. '+k; }).join('\n');
  var input = prompt('Ubah kondisi SN "'+sn+'"\nKondisi saat ini: '+kondisiSaat+'\n\nPilihan:\n'+opsi+'\n\nKetik nama kondisi baru:');
  if(!input) return;
  var kondisiBaru = input.trim();
  if(!pilihan.includes(kondisiBaru)) { showAlert('Kondisi tidak valid. Pilih: Baru, Dismantle, Rusak, atau Bekas Pakai.', 'Validasi'); return; }
  try {
    var res = await supa.from('perangkat').update({ kondisi: kondisiBaru }).eq('sn', sn);
    if(res.error) throw res.error;
    showAlert('Kondisi SN "'+sn+'" berhasil diubah ke "'+kondisiBaru+'".', 'Update Berhasil');
    loadAndRenderListPerangkat();
  } catch(e) {
    showAlert('Gagal update: ' + e.message, 'Error');
  }
}
