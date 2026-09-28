// ===================== NOC MODULE =====================
// Menangani semua logika untuk role NOC

let activeNocWoId = null;

// ── PICKUP MAINTENANCE NOC ───────────────────────────
async function loadNOCPickup() {
  var el = document.getElementById('noc-pickup-list');
  if (!el) return;
  el.innerHTML = '<p class="text-xs text-slate-400 text-center py-6"><i class="fa-solid fa-spinner animate-spin mr-2"></i>Memuat...</p>';
  try {
    var res = await supa.from('work_orders')
      .select('*')
      .eq('status', 'RELEASE')
      .eq('tipe', 'MAINTENANCE')
      .order('created_at', { ascending: false });
    if(res.error) throw res.error;
    console.log('[NOC Pickup] Query RELEASE+MAINTENANCE:', res.data);
    // RELEASE baru tanpa noc_name = menunggu pickup NOC.
    // RELEASE dengan noc_name = sudah dilepas NOC ke teknisi, jangan tampil di pickup NOC.
    var data = (res.data || []).filter(function(t) {
      return !t.noc_name || !String(t.noc_name).trim();
    });
    if (!data.length) {
      el.innerHTML = '<p class="text-xs text-slate-400 text-center py-6"><i class="fa-solid fa-circle-check text-emerald-500 mr-2"></i>Tidak ada tiket masuk saat ini.</p>';
      return;
    }
    el.innerHTML = data.map(function(t) {
      var tgl = t.tanggal || (t.created_at ? t.created_at.substring(0,10) : '-');
      return '<div class="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-2xl border border-amber-200 dark:border-amber-800 space-y-2">' +
        '<div class="flex items-center justify-between">' +
          '<span class="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 font-mono">' + t.wo_id + '</span>' +
          '<span class="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 px-2 py-0.5 rounded-full font-bold border border-amber-200">MAINTENANCE</span>' +
        '</div>' +
        '<p class="text-sm font-extrabold text-slate-900 dark:text-white">' + (t.pelanggan||'-') + '</p>' +
        '<p class="text-xs text-slate-500 dark:text-slate-400"><i class="fa-solid fa-location-dot text-rose-500 mr-1"></i>' + (t.alamat||'-') + '</p>' +
        (t.kendala ? '<div class="bg-white dark:bg-slate-800 rounded-xl px-2.5 py-1.5 border border-amber-200 dark:border-amber-700"><p class="text-[11px] text-amber-700 dark:text-amber-300"><i class="fa-solid fa-triangle-exclamation mr-1"></i>' + t.kendala + '</p></div>' : '') +
        '<div class="flex items-center justify-between pt-1">' +
          '<div class="space-y-0.5">' +
            '<p class="text-[10px] text-slate-400"><i class="fa-regular fa-calendar mr-1"></i>' + tgl + ' • CS: ' + (t.cs_name||'-') + '</p>' +
          '</div>' +
          '<button type="button" onclick="pickupNOCTask(\'' + t.wo_id + '\',\'' + (t.pelanggan||'').replace(/'/g,"\\'") + '\',\'' + (t.kendala||'').replace(/'/g,"\\'") + '\')" class="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-bold rounded-xl flex items-center gap-1.5 active:scale-95 transition-all">' +
            '<i class="fa-solid fa-hand-pointer"></i>Pickup' +
          '</button>' +
        '</div>' +
      '</div>';
    }).join('');
  } catch(e) {
    console.error('[NOC Pickup] Error:', e);
    el.innerHTML = '<p class="text-xs text-rose-500 text-center py-4"><i class="fa-solid fa-circle-xmark mr-1"></i>Gagal memuat: ' + e.message + '</p>';
  }
}

// ── PICKUP NOC TASK ───────────────────────────────────
async function pickupNOCTask(woId, pelanggan, kendala) {
  const nocName = currentUser ? currentUser.displayName : '';
  const pickupAt = new Date().toISOString();
  try {
    var pickupUpdate = { status: 'PICKUP', noc_name: nocName, teknisi: [nocName], picked_up_at: pickupAt };
    var res = await supa.from('work_orders').update(pickupUpdate).eq('wo_id', woId);
    if(res.error && /picked_up_at|column/i.test(res.error.message||'')) {
      delete pickupUpdate.picked_up_at;
      res = await supa.from('work_orders').update(pickupUpdate).eq('wo_id', woId);
    }
    if (res.error) throw res.error;
    var localPickup = Array.isArray(kpiWOData) ? kpiWOData.find(function(d){return d.id===woId;}) : null;
    if(localPickup) localPickup.picked_up_at = pickupAt;
    console.log('[NOC] Pickup berhasil:', woId, 'oleh', nocName);
    showAlert('Tiket ' + woId + ' berhasil di-pickup!', 'Pickup NOC');
    loadNOCPickup();
    switchSubNOC('tugas-noc');
    startNOCWork(woId, pelanggan, kendala);
  } catch(e) {
    showAlert('Gagal pickup: ' + e.message, 'Error');
  }
}

// ── LOAD TUGAS NOC ───────────────────────────────────
async function loadNOCTasks() {
  console.log('[NOC] loadNOCTasks() dipanggil');
  var el = document.getElementById('noc-task-list');
  console.log('[NOC] Element noc-task-list:', el);
  if (!el) {
    console.error('[NOC] Element noc-task-list tidak ditemukan! User mungkin bukan role NOC.');
    return;
  }
  el.innerHTML = '<p class="text-xs text-slate-400 text-center py-6"><i class="fa-solid fa-spinner animate-spin mr-2"></i>Memuat...</p>';
  try {
    console.log('[NOC] Query WO dengan status=NOC...');
    var res = await supa.from('work_orders')
      .select('*')
      .eq('status', 'PICKUP')
      .eq('tipe', 'MAINTENANCE')
      .order('created_at', { ascending: false });
    console.log('[NOC] Hasil query:', res.data);
    var data = res.data || [];
    if (!data.length) {
      el.innerHTML = '<p class="text-xs text-slate-400 text-center py-6">Tidak ada tugas masuk saat ini.</p>';
      return;
    }
    el.innerHTML = data.map(function(t) {
      var tgl = t.tanggal || (t.created_at ? t.created_at.substring(0,10) : '-');
      var nocLabel = t.noc_name ? '<span class="text-[10px] bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300 px-2 py-0.5 rounded-full font-bold"><i class="fa-solid fa-headset mr-1"></i>' + t.noc_name + '</span>' : '';
      return '<div class="bg-slate-50 dark:bg-slate-700/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-600 space-y-2">' +
        '<div class="flex items-center justify-between gap-2 flex-wrap">' +
          '<span class="text-[10px] font-extrabold text-violet-600 dark:text-violet-400 font-mono">' + t.wo_id + '</span>' +
          '<div class="flex items-center gap-1.5">' + nocLabel +
            '<span class="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 px-2 py-0.5 rounded-full font-bold">PICKUP</span>' +
          '</div>' +
        '</div>' +
        '<p class="text-sm font-extrabold text-slate-900 dark:text-white">' + (t.pelanggan||'-') + '</p>' +
        '<p class="text-xs text-slate-500"><i class="fa-solid fa-location-dot text-rose-500 mr-1"></i>' + (t.alamat||'-') + '</p>' +
        (t.kendala ? '<p class="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 rounded-xl px-2.5 py-1.5 border border-amber-200 dark:border-amber-800"><i class="fa-solid fa-triangle-exclamation mr-1"></i>' + t.kendala + '</p>' : '') +
        '<p class="text-[10px] text-slate-400">' + tgl + '</p>' +
        '<button type="button" onclick="startNOCWork(\'' + t.wo_id + '\',\'' + (t.pelanggan||'').replace(/'/g,"\\'") + '\',\'' + (t.kendala||'').replace(/'/g,"\\'") + '\')" class="w-full mt-1 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95">' +
          '<i class="fa-solid fa-play"></i>Kerjakan' +
        '</button>' +
      '</div>';
    }).join('');
    console.log('[NOC] Berhasil render', data.length, 'tiket NOC');
  } catch(e) {
    console.error('[NOC] Error:', e);
    el.innerHTML = '<p class="text-xs text-rose-500 text-center py-4">Gagal memuat: ' + e.message + '</p>';
  }
}

// ── MULAI KERJAKAN NOC ───────────────────────────────
function startNOCWork(woId, pelanggan, kendala) {
  activeNocWoId = woId;
  var infoEl = document.getElementById('noc-wo-info-form');
  if (infoEl) infoEl.textContent = 'WO: ' + woId + ' — ' + pelanggan;
  var kendalaEl = document.getElementById('noc-kendala-info-form');
  if (kendalaEl) kendalaEl.textContent = kendala || '(tidak ada catatan kendala)';
  // Reset form
  var diag = document.getElementById('noc-diagnosa-form');
  var penan = document.getElementById('noc-penanganan-form');
  if (diag) diag.value = '';
  if (penan) penan.value = '';
  // Load foto kendala dari CS
  loadFotoKendalaNOC(woId);
  // Load SN dropdown
  loadNOCSNDropdowns();
  // Tampilkan form
  var listView = document.getElementById('view-noc-list');
  var formView = document.getElementById('view-noc-form');
  if (listView) listView.classList.add('hidden');
  if (formView) formView.classList.remove('hidden');
}

async function loadFotoKendalaNOC(woId) {
  var el = document.getElementById('noc-foto-kendala');
  if(!el) return;
  el.innerHTML = '<p class="text-[10px] text-slate-400"><i class="fa-solid fa-spinner animate-spin mr-1"></i>Memuat...</p>';
  try {
    var res = await supa.from('wo_photos')
      .select('key, label, photo_base64')
      .eq('wo_id', woId)
      .eq('step', 'kendala');
    if(res.error) throw res.error;
    var data = res.data || [];
    if(!data.length) { el.innerHTML = '<p class="text-[10px] text-slate-400">Tidak ada media kendala dari CS.</p>'; return; }
    el.innerHTML = data.map(function(f) {
      var isVideo = f.key === 'video';
      var src = f.photo_base64; // bisa URL storage atau base64
      if(isVideo) {
        return '<div class="space-y-1">'
          + '<p class="text-[10px] text-slate-500 font-bold truncate"><i class="fa-solid fa-video text-blue-500 mr-1"></i>' + f.label + '</p>'
          + '<video src="' + src + '" controls class="w-full rounded-xl border border-slate-200 dark:border-slate-600" style="max-height:200px;"></video>'
          + '</div>';
      } else {
        return '<div class="cam-cell">'
          + '<label>' + f.label + '</label>'
          + '<img src="' + src + '" alt="' + f.label + '" title="Klik untuk melihat detail foto" class="w-full rounded-xl border border-slate-200 dark:border-slate-600 cursor-zoom-in" onclick="openPhotoFullscreen(this.src)" style="aspect-ratio:1;min-height:90px;object-fit:cover;">'
          + '</div>';
      }
    }).join('');
  } catch(e) { el.innerHTML = '<p class="text-[10px] text-rose-500">Gagal load media: ' + e.message + '</p>'; }
}

// ── LOAD SN DROPDOWN NOC ────────────────────────────
async function loadNOCSNDropdowns() {
  // NOC tidak perlu SN dropdown — perangkat diganti ada di form teknisi
}

// ── SUBMIT NOC SELESAI ───────────────────────────────
async function submitWorkNOC() {
  var woId     = activeNocWoId;
  var diagnosa = (document.getElementById('noc-diagnosa-form')||{value:''}).value.trim();
  var penan    = (document.getElementById('noc-penanganan-form')||{value:''}).value.trim();
  if (!woId)    { showAlert('Tidak ada WO aktif.','Error'); return; }
  if (!diagnosa){ showAlert('Diagnosa wajib diisi.','Validasi'); return; }
  if (!penan)   { showAlert('Penanganan wajib diisi.','Validasi'); return; }
  if(typeof _isSubmitting !== 'undefined' && _isSubmitting){ showAlert('Sedang menyimpan, harap tunggu...','Harap Tunggu'); return; }
  if(typeof _isSubmitting !== 'undefined') _isSubmitting = true;
  showLoading('Menyimpan laporan NOC...');

  var snOnt   = '';
  var snKabel = '';
  var nocName = currentUser ? currentUser.displayName : '';
  var now     = new Date();
  var completedAt = now.toISOString();
  var t4      = now.toTimeString().substring(0,5);

  try {
    var updateNoc = {
      status: 'SELESAI',
      diagnosa: diagnosa,
      penanganan: penan,
      noc_name: nocName,
      t4: t4,
      completed_at: completedAt,
      sn_ont:   snOnt   || null,
      sn_kabel: snKabel || null
    };
    var updateResult = await supa.from('work_orders').update(updateNoc).eq('wo_id', woId);
    if(updateResult.error && /released_at|completed_at|column/i.test(updateResult.error.message||'')) {
      delete updateNoc.completed_at;
      updateResult = await supa.from('work_orders').update(updateNoc).eq('wo_id', woId);
    }
    if(updateResult.error) throw updateResult.error;

    var localNoc = Array.isArray(kpiWOData) ? kpiWOData.find(function(d){return d.id===woId;}) : null;
    if(localNoc){ localNoc.status='SELESAI'; localNoc.t4=t4; localNoc.completed_at=completedAt; }

    // Simpan foto NOC
    var fotoNOC = [{key:'nf1',label:'Foto 1'},{key:'nf2',label:'Foto 2'}];
    for(var i=0; i<fotoNOC.length; i++) {
      var fk = fotoNOC[i];
      var img = document.getElementById('cam-img-'+fk.key);
      if(img && img.src && img.src.startsWith('data:image')) {
        try { await supa.from('wo_photos').insert({ wo_id:woId, step:'noc', key:fk.key, label:fk.label, photo_base64:img.src }); }
        catch(fe){ console.warn('Foto NOC '+fk.key+' gagal:', fe.message); }
      }
    }

    showAlert('WO ' + woId + ' selesai ditangani NOC!','NOC Selesai');
    closeNOCForm();
    loadNOCTasks();
    loadRiwayatNOC();
  } catch(e) {
    showAlert('Gagal menyimpan: ' + e.message,'Error');
  } finally {
    hideLoading();
    if(typeof _isSubmitting !== 'undefined') _isSubmitting = false;
  }
}

// ── RELEASE KE TEKNISI ───────────────────────────────
async function nocReleaseToTeknisi() {
  var woId   = activeNocWoId;
  var diag   = (document.getElementById('noc-diagnosa-form')||{value:''}).value.trim();
  var penan  = (document.getElementById('noc-penanganan-form')||{value:''}).value.trim();
  if (!woId)  { showAlert('Tidak ada WO aktif.','Error'); return; }
  if (!diag)  { showAlert('Isi diagnosa terlebih dahulu sebelum release.','Validasi'); return; }
  var nocName = currentUser ? currentUser.displayName : '';
  var releasedAt = new Date().toISOString();
  try {
    var releaseData = {
      status: 'RELEASE',
      diagnosa: diag,
      penanganan: penan||null,
      noc_name: nocName,
      released_at: releasedAt,
      picked_up_at: null
    };
    var releaseResult = await supa.from('work_orders').update(releaseData).eq('wo_id', woId);
    if(releaseResult.error && /released_at|completed_at|column/i.test(releaseResult.error.message||'')) {
      delete releaseData.released_at;
      delete releaseData.picked_up_at;
      releaseResult = await supa.from('work_orders').update(releaseData).eq('wo_id', woId);
    }
    if(releaseResult.error) throw releaseResult.error;
    var localRelease = Array.isArray(kpiWOData) ? kpiWOData.find(function(d){return d.id===woId;}) : null;
    if(localRelease){ localRelease.status='RELEASE'; localRelease.released_at=releasedAt; localRelease.picked_up_at=null; localRelease.completed_at=null; localRelease.t4=null; }
    showAlert('WO ' + woId + ' dirilis ke teknisi. Akan muncul di Pickup Tugas.','Release ke Teknisi ✅');
    closeNOCForm();
    loadNOCTasks();
    if (typeof renderPickupListFromDB === 'function') renderPickupListFromDB();
  } catch(e) {
    showAlert('Gagal release: ' + e.message,'Error');
  }
}

// ── TUTUP FORM NOC ───────────────────────────────────
function closeNOCForm() {
  activeNocWoId = null;
  var listView = document.getElementById('view-noc-list');
  var formView = document.getElementById('view-noc-form');
  if (formView) formView.classList.add('hidden');
  if (listView) listView.classList.remove('hidden');
}

// ── RIWAYAT NOC ──────────────────────────────────────
async function loadRiwayatNOC() {
  var el = document.getElementById('riwayat-noc-list');
  if (!el) return;
  el.innerHTML = '<p class="text-xs text-slate-400 text-center py-4"><i class="fa-solid fa-spinner animate-spin mr-2"></i>Memuat...</p>';
  var nocName = currentUser ? currentUser.displayName : '';
  try {
    var res = await supa.from('work_orders')
      .select('*')
      .eq('tipe','MAINTENANCE')
      .order('created_at',{ascending:false})
      .limit(50);
    var data = (res.data||[]).filter(function(d){ return d.diagnosa && (d.noc_name===nocName || !d.noc_name); });
    if(!data.length){ el.innerHTML='<p class="text-xs text-slate-400 text-center py-6">Belum ada riwayat.</p>'; return; }
    el.innerHTML = data.map(function(t){
      var stCls = t.status==='SELESAI' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700';
      return '<div class="bg-slate-50 dark:bg-slate-700/40 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-600 space-y-1">' +
        '<div class="flex items-center justify-between">' +
          '<span class="text-[10px] font-extrabold text-violet-600 font-mono">' + t.wo_id + '</span>' +
          '<span class="text-[10px] '+stCls+' px-2 py-0.5 rounded-full font-bold">' + t.status + '</span>' +
        '</div>' +
        '<p class="text-xs font-bold text-slate-800 dark:text-slate-100">' + (t.pelanggan||'-') + '</p>' +
        (t.diagnosa ? '<p class="text-[11px] text-slate-500"><span class="font-bold text-slate-600 dark:text-slate-300">Diagnosa:</span> ' + t.diagnosa + '</p>' : '') +
        (t.penanganan ? '<p class="text-[11px] text-slate-500"><span class="font-bold text-slate-600 dark:text-slate-300">Penanganan:</span> ' + t.penanganan + '</p>' : '') +
      '</div>';
    }).join('');
  } catch(e) { el.innerHTML = '<p class="text-xs text-rose-500 text-center py-4">Gagal memuat.</p>'; }
}

// ── INISIALISASI NOC SAAT SECTION AKTIF ─────────────
document.addEventListener('section-noc-activated', function() {
  if(typeof loadNOCPickup==='function') loadNOCPickup();
});

// ── REGISTRASI PROVISIONING (NOC) ────────────────────
async function loadProvisioningQueueNOC() {
  var el = document.getElementById('noc-provisioning-queue-list');
  if (!el) return;
  el.innerHTML = '<p class="text-center py-4"><i class="fa-solid fa-spinner animate-spin text-indigo-500 mr-2"></i>Memuat...</p>';
  try {
    var res = await supa.from('provisioning_requests')
      .select('*')
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false });
    if(res.error) throw res.error;
    var data = res.data || [];
    if(!data.length) {
      el.innerHTML = '<div class="flex flex-col items-center py-8 gap-2"><i class="fa-solid fa-circle-check text-emerald-400 text-3xl"></i><p class="text-xs text-slate-400 font-semibold">Tidak ada antrian provisioning saat ini.</p></div>';
      return;
    }
    el.innerHTML = data.map(function(r) {
      var tgl = new Date(r.created_at).toLocaleString('id-ID', {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
      var pppoe = r.username_pppoe ? '<div><p class="font-bold text-slate-500 uppercase text-[10px]">Username PPPOE</p><p class="font-extrabold font-mono">' + r.username_pppoe + '</p></div><div><p class="font-bold text-slate-500 uppercase text-[10px]">Password PPPOE</p><p class="font-extrabold font-mono">' + (r.password_pppoe||'-') + '</p></div>' : '';
      return '<div class="p-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-200 dark:border-indigo-800 space-y-3">'
        + '<div class="flex items-center justify-between">'
          + '<div><p class="text-xs font-black text-slate-900 dark:text-white">' + r.wo_id + ' — ' + (r.pelanggan||'-') + '</p>'
          + '<p class="text-[10px] text-slate-400">' + (r.teknisi_name||'-') + ' • ' + tgl + ' WIB</p></div>'
          + '<span class="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 flex items-center gap-1"><i class="fa-solid fa-spinner animate-spin text-xs"></i>On Going</span>'
        + '</div>'
        + '<div class="grid grid-cols-2 gap-2 text-xs">'
          + '<div><p class="font-bold text-slate-500 uppercase text-[10px]">SN ONT</p><p class="font-extrabold font-mono">' + (r.sn_ont||'-') + '</p></div>'
          + '<div><p class="font-bold text-slate-500 uppercase text-[10px]">SN Kabel</p><p class="font-extrabold font-mono">' + (r.sn_kabel||'-') + '</p></div>'
          + pppoe
        + '</div>'
        + '<button type="button" onclick="completeProvisioningNOC(\'' + r.id + '\',\'' + r.wo_id + '\')" class="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md">'
          + '<i class="fa-solid fa-circle-check"></i>Tandai Selesai'
        + '</button>'
      + '</div>';
    }).join('');
  } catch(e) {
    el.innerHTML = '<p class="text-xs text-rose-500 text-center py-4">Gagal load: ' + e.message + '</p>';
  }
}

async function completeProvisioningNOC(id, woId) {
  var btn = event.target.closest('button');
  if(btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner animate-spin"></i> Memproses...'; }
  try {
    var res = await supa.from('provisioning_requests').update({ status: 'DONE' }).eq('id', id);
    if(res.error) throw res.error;
    var completedAt = new Date().toISOString();
    var woUpdate = { status: 'SELESAI', verified: true, completed_at: completedAt };
    var woResult = await supa.from('work_orders').update(woUpdate).eq('wo_id', woId);
    if(woResult.error && /released_at|completed_at|column/i.test(woResult.error.message||'')) {
      delete woUpdate.completed_at;
      woResult = await supa.from('work_orders').update(woUpdate).eq('wo_id', woId);
    }
    if(woResult.error) throw woResult.error;
    var localProvision = Array.isArray(kpiWOData) ? kpiWOData.find(function(d){return d.id===woId;}) : null;
    if(localProvision){ localProvision.status='SELESAI'; localProvision.completed_at=completedAt; }
    showAlert('Provisioning WO ' + woId + ' berhasil diselesaikan!', 'Registrasi Selesai');
    loadProvisioningQueueNOC();
  } catch(e) {
    showAlert('Gagal: ' + e.message, 'Error');
    if(btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-circle-check"></i>Tandai Selesai'; }
  }
}
