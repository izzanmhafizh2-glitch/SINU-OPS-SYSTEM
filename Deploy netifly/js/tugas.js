// ===================== TUGAS =====================

// ── HELPER: tandai SN terpasang (kabel hanya habis jika seluruh stok habis) ───────
async function tandaiTerpasang(sn, teknisi, pelanggan, ket) {
  if(typeof supa === 'undefined') return;

  try {
    const { data: ptData, error: ptError } = await supa.from('perangkat_teknisi')
      .select('jenis,panjang_sisa')
      .eq('sn', sn).eq('teknisi_name', teknisi).maybeSingle();
    if(ptError) throw ptError;

    const isKabel = sn && (sn.startsWith('KBL') || ptData?.jenis?.toLowerCase().includes('kabel'));
    if(isKabel) {
      const { data: globalData, error: globalError } = await supa.from('perangkat')
        .select('status,lokasi,panjang_sisa')
        .eq('sn', sn).maybeSingle();
      if(globalError) throw globalError;

      const stokGudang = Number(globalData?.panjang_sisa || 0);
      const sisaTeknisi = Number(ptData?.panjang_sisa || 0);
      if(sisaTeknisi <= 0) {
        const { error: deleteError } = await supa.from('perangkat_teknisi')
          .delete().eq('sn', sn).eq('teknisi_name', teknisi);
        if(deleteError) throw deleteError;
      }

      // Stok gudang dan alokasi teknisi adalah dua stok berbeda. SN baru
      // menjadi Terpasang jika keduanya sudah habis.
      const globalUpdate = stokGudang > 0
        ? { status:'Gudang', lokasi:'Gudang Utama' }
        : sisaTeknisi > 0
          ? { status:teknisi, lokasi:teknisi }
          : { status:'Terpasang', lokasi:'Pelanggan: '+pelanggan };
      const { error: updateError } = await supa.from('perangkat')
        .update(globalUpdate).eq('sn', sn);
      if(updateError) throw updateError;
    } else {
      // ONT/AP/STB — langsung tandai terpasang.
      const { error: updateError } = await supa.from('perangkat')
        .update({ status:'Terpasang', lokasi:'Pelanggan: '+pelanggan }).eq('sn', sn);
      if(updateError) throw updateError;
      const { error: deleteError } = await supa.from('perangkat_teknisi')
        .delete().eq('sn', sn).eq('teknisi_name', teknisi);
      if(deleteError) throw deleteError;
    }

    if(typeof catatHistory === 'function')
      await catatHistory(sn, teknisi, 'Pelanggan: '+pelanggan, isKabel ? 'DIPAKAI' : 'TERPASANG', ket);
  } catch(e) {
    console.warn('[tandaiTerpasang]', e.message);
    throw e;
  }
}

async function kurangiSisaKabel(snKabel, panjangTerpakai, teknisiName) {
  const panjang = Number(panjangTerpakai);
  if(!snKabel || !Number.isFinite(panjang) || panjang <= 0) return;
  if(typeof supa === 'undefined') return;

  try {
    const { data: ptData, error: ptError } = await supa.from('perangkat_teknisi')
      .select('panjang_sisa, panjang_awal')
      .eq('sn', snKabel).eq('teknisi_name', teknisiName).maybeSingle();
    if(ptError) throw ptError;

    if(ptData) {
      // Setelah pickup, stok global sudah dikurangi. Pemakaian teknisi hanya
      // mengurangi alokasi di perangkat_teknisi agar stok gudang tidak terpotong dua kali.
      const tersedia = Number(ptData.panjang_sisa || 0);
      if(panjang > tersedia) {
        throw new Error(`Pemakaian kabel ${panjang}m melebihi alokasi ${tersedia}m untuk ${snKabel}.`);
      }
      const sisaBaru = tersedia - panjang;
      const { error: updateError } = await supa.from('perangkat_teknisi')
        .update({ panjang_sisa: sisaBaru })
        .eq('sn', snKabel).eq('teknisi_name', teknisiName);
      if(updateError) throw updateError;
      console.log('[Kabel] SN', snKabel, 'alokasi teknisi tersisa:', sisaBaru, 'm (terpakai', panjang, 'm)');
      return;
    }

    // Fallback untuk data lama yang belum memiliki baris perangkat_teknisi.
    const { data: pData, error: pError } = await supa.from('perangkat')
      .select('panjang_sisa').eq('sn', snKabel).maybeSingle();
    if(pError) throw pError;
    if(!pData) throw new Error('Kabel SN tidak ditemukan: '+snKabel);
    const tersediaGudang = Number(pData.panjang_sisa || 0);
    if(panjang > tersediaGudang) {
      throw new Error(`Pemakaian kabel ${panjang}m melebihi stok ${tersediaGudang}m untuk ${snKabel}.`);
    }
    const { error: updateError } = await supa.from('perangkat')
      .update({ panjang_sisa: tersediaGudang - panjang }).eq('sn', snKabel);
    if(updateError) throw updateError;
  } catch(e) {
    console.warn('[kurangiSisaKabel]', e.message);
    throw e;
  }
}

// ── FORM WO: show/hide fields berdasarkan tipe ───────
function syncWORequiredFields(tipe){
  const allIds=[
    'wo-t1-time','wo-tipe',
    'wo-pelanggan','wo-nohp','wo-alamat','wo-registrasi','wo-paket','wo-nama-paket','wo-marketing','wo-koordinat-instalasi','wo-username-pppoe','wo-password-pppoe','wo-status-koneksi',
    'wo-nama-reseller','wo-nohp-reseller','wo-alamat-reseller','wo-registrasi-reseller','wo-paket-voucher','wo-marketing-reseller','wo-koordinat-reseller','wo-status-koneksi-reseller',
    'wo-reseller-perluasan','wo-nohp-perluasan','wo-pelanggan-perluasan','wo-alamat-perluasan','wo-titik-perluasan','wo-koordinat-perluasan',
    'wo-pelanggan-maint','wo-nohp-maint','wo-alamat-maint','wo-koordinat-maint','wo-kendala-maint'
  ];
  const byType={
    INSTALASI:['wo-pelanggan','wo-nohp','wo-alamat','wo-registrasi','wo-paket','wo-nama-paket','wo-marketing','wo-koordinat-instalasi','wo-username-pppoe','wo-password-pppoe','wo-status-koneksi'],
    INSTALASI_RESELLER:['wo-nama-reseller','wo-nohp-reseller','wo-alamat-reseller','wo-registrasi-reseller','wo-paket-voucher','wo-marketing-reseller','wo-koordinat-reseller','wo-status-koneksi-reseller'],
    PERLUASAN_RESELLER:['wo-reseller-perluasan','wo-nohp-perluasan','wo-pelanggan-perluasan','wo-alamat-perluasan','wo-titik-perluasan','wo-koordinat-perluasan'],
    MAINTENANCE:['wo-pelanggan-maint','wo-nohp-maint','wo-alamat-maint','wo-koordinat-maint','wo-kendala-maint']
  };
  const requiredIds=['wo-t1-time','wo-tipe'].concat(byType[tipe]||byType.INSTALASI);
  allIds.forEach(id=>{const el=document.getElementById(id);if(el)el.required=requiredIds.includes(id);});
}
function onWoTipeChange() {
  var tipe = (document.getElementById('wo-tipe')||{value:'INSTALASI'}).value;
  var panels = ['instalasi','reseller','perluasan','maintenance'];
  panels.forEach(function(p) {
    var el = document.getElementById('wo-fields-'+p);
    if (el) el.classList.add('hidden');
  });
  var mapPanel = {
    INSTALASI:          'instalasi',
    INSTALASI_RESELLER: 'reseller',
    PERLUASAN_RESELLER: 'perluasan',
    MAINTENANCE:        'maintenance'
  };
  var active = mapPanel[tipe] || 'instalasi';
  var actEl = document.getElementById('wo-fields-'+active);
  if (actEl) actEl.classList.remove('hidden');
  syncWORequiredFields(tipe);
  // Auto hitung total reseller saat panel muncul
  if (tipe === 'INSTALASI_RESELLER') hitungTotalWOReseller();
}

function parseRupiahValue(value, fallback=0) {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits ? Number(digits) : fallback;
}

function formatRupiahValue(value) {
  const amount = Number(value) || 0;
  return 'Rp ' + amount.toLocaleString('id-ID');
}

function formatRupiahInput(input) {
  if(!input) return;
  const raw = String(input.value || '');
  if(!raw.trim()) { input.value = ''; return; }
  input.value = formatRupiahValue(parseRupiahValue(raw));
}

function hitungTotalWO() {
  var reg  = parseRupiahValue((document.getElementById('wo-registrasi')||{value:''}).value);
  var pak  = parseRupiahValue((document.getElementById('wo-paket')||{value:''}).value);
  var tot  = document.getElementById('wo-total');
  if (tot) tot.value = formatRupiahValue(reg + pak);
}

function hitungTotalWOReseller() {
  var regInput = document.getElementById('wo-registrasi-reseller');
  var pakInput = document.getElementById('wo-paket-voucher');
  var regRaw = String((regInput||{value:''}).value || '').trim();
  var pakRaw = String((pakInput||{value:''}).value || '').trim();
  var reg  = parseRupiahValue(regRaw, 250000);
  var pak  = parseRupiahValue(pakRaw, 240000);
  if(regInput && !regRaw) regInput.value = formatRupiahValue(reg);
  if(pakInput && !pakRaw) pakInput.value = formatRupiahValue(pak);
  var tot  = document.getElementById('wo-total-reseller');
  if (tot) tot.value = formatRupiahValue(reg + pak);
}

function renderPickupList(filter=''){
  const el=document.getElementById('pickup-list');if(!el)return;
  const q=filter.toLowerCase();
  const f=releaseTickets.filter(t=>!q||t.customer.toLowerCase().includes(q)||t.woId.toLowerCase().includes(q));
  if(!f.length){el.innerHTML='<p class="text-xs text-slate-400 text-center py-6">Tidak ada tiket yang cocok.</p>';return;}
  const cMap={
    INSTALASI:'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    INSTALASI_RESELLER:'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300',
    PERLUASAN_RESELLER:'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300',
    MAINTENANCE:'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    GANGGUAN:'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
  };
  el.innerHTML=f.map(t=>`<div class="bg-slate-50 dark:bg-slate-700/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
    <div class="space-y-1">
      <div class="flex items-center gap-2"><span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${cMap[t.tipe]||cMap.INSTALASI}">${t.tipe}</span><span class="text-xs font-black text-slate-800 dark:text-slate-200">${t.woId}</span></div>
      <h3 class="text-sm font-extrabold text-slate-900 dark:text-white">${t.customer}</h3>
      <p class="text-xs text-slate-500 dark:text-slate-400"><i class="fa-solid fa-location-dot text-rose-500 mr-1"></i>${t.alamat}</p>
    </div>
    <button type="button" onclick="pickupTask('${t.woId}','${t.customer}','${t.tipe}')" class="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shrink-0 flex items-center justify-center gap-2 active:scale-95"><i class="fa-solid fa-hand-holding-hand"></i>Pickup</button>
  </div>`).join('');
}
function filterPickupList(){renderPickupList(document.getElementById('pickup-search').value);}

// Array untuk menyimpan tugas selesai (riwayat lokal)
let completedTasks = [];
// woId yang sedang dikerjakan saat ini
let activeWoId = null;

function pickupTask(woId, customer, tipe){
  // Cegah double pickup
  if(myPickedTasks.find(t=>t.woId===woId)){
    showAlert('Tiket '+woId+' sudah ada di Tugas Saya.','Sudah Dipickup');
    switchSubTugas('tugas-saya');
    return;
  }
  myPickedTasks.push({woId, customer, tipe, teknisi1: currentUser ? currentUser.displayName : '', teknisi2: '', koordinat: null});
  renderMyTaskList();
  renderReturnSelect();

  // Hapus card dari DOM langsung tanpa tunggu alert
  const allCards = document.querySelectorAll('#pickup-list > div');
  allCards.forEach(card => {
    if(card.textContent.includes(woId)) card.remove();
  });

  // Update status di Supabase → PICKUP + simpan nama teknisi dan waktu pickup
  const teknisiName = currentUser ? currentUser.displayName : '';
  const pickupAt = new Date().toISOString();
  if(typeof supa !== 'undefined') {
    const pickupUpdate = {
      status: 'PICKUP',
      teknisi_1: teknisiName,
      teknisi_2: null,
      teknisi: [teknisiName],
      picked_up_at: pickupAt
    };
    supa.from('work_orders').update(pickupUpdate).eq('wo_id', woId).then(async ({error}) => {
      if(error && /picked_up_at|column/i.test(error.message||'')) {
        delete pickupUpdate.picked_up_at;
        const retry = await supa.from('work_orders').update(pickupUpdate).eq('wo_id', woId);
        error = retry.error;
      }
      if(error) {
        console.warn('[Pickup] Gagal update DB:', error.message);
      } else {
        const local = Array.isArray(kpiWOData) ? kpiWOData.find(item=>item.id===woId) : null;
        if(local) local.picked_up_at = pickupAt;
        console.log('[Pickup] WO', woId, 'di-pickup oleh', teknisiName);
        if(typeof renderPickupListFromDB==='function') renderPickupListFromDB();
      }
    });

    // Ambil koordinat + RL Radius dari DB
    supa.from('work_orders')
      .select('*')
      .eq('wo_id', woId).maybeSingle()
      .then(({data}) => {
        if(data) {
          const task = myPickedTasks.find(t => t.woId === woId);
          if(task) {
            task.koordinat = data.koordinat || null;
            task.alamat = data.alamat || null;
            task.noLayanan = data.no_layanan || null;
            task.rlRadiusDone = data.rl_radius_done || false;
            renderMyTaskList();
          }
        }
      });
  }
  showAlert('Berhasil pickup tiket '+woId+'.','Pickup Berhasil');
}

function renderReturnSelect(){
  const sel=document.getElementById('return-wo-select');if(!sel)return;
  if(!myPickedTasks.length){sel.innerHTML='<option value="" disabled selected>-- Tidak ada tugas aktif --</option>';return;}
  sel.innerHTML=myPickedTasks.map(t=>`<option value="${t.woId}">${t.woId} — ${t.customer}</option>`).join('');
}

function renderMyTaskList(){
  const el=document.getElementById('my-task-list');if(!el)return;
  if(!myPickedTasks.length){el.innerHTML='<p class="text-xs text-slate-400 text-center py-6">Belum ada tugas. Pickup WO terlebih dahulu.</p>';return;}
  const cMap={
    INSTALASI:         ['bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',  'bg-emerald-600 hover:bg-emerald-700','fa-play'],
    INSTALASI_RESELLER:['bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300',   'bg-emerald-600 hover:bg-emerald-700','fa-play'],
    PERLUASAN_RESELLER:['bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300',   'bg-emerald-600 hover:bg-emerald-700','fa-play'],
    MAINTENANCE:       ['bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300','bg-amber-600 hover:bg-amber-700',  'fa-wrench'],
    GANGGUAN:          ['bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',   'bg-rose-600 hover:bg-rose-700',    'fa-bolt']
  };
  el.innerHTML=myPickedTasks.map(t=>{
    const c=cMap[t.tipe]||cMap.INSTALASI;
    // Buat URL Google Maps dari koordinat atau alamat
    var mapsBtn = '';
    if(t.koordinat && t.koordinat.trim()) {
      // Format: "-6.xxxx, 106.xxxx" → langsung ke koordinat
      const coord = t.koordinat.trim().replace(/\s/g,'');
      const mapsUrl = 'https://www.google.com/maps?q=' + encodeURIComponent(t.koordinat.trim());
      mapsBtn = `<a href="${mapsUrl}" target="_blank" rel="noopener"
        class="px-3 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-red-50 hover:border-red-300 dark:hover:bg-red-950/30 text-slate-600 dark:text-slate-300 hover:text-red-600 text-xs font-bold rounded-xl transition-all shadow-sm shrink-0 flex items-center justify-center gap-1.5"
        title="Buka di Google Maps: ${t.koordinat}">
        <i class="fa-solid fa-location-dot text-red-500 text-sm"></i>
      </a>`;
    } else if(t.alamat && t.alamat.trim()) {
      // Fallback ke alamat teks
      const mapsUrl = 'https://www.google.com/maps/search/' + encodeURIComponent(t.alamat.trim());
      mapsBtn = `<a href="${mapsUrl}" target="_blank" rel="noopener"
        class="px-3 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-red-50 hover:border-red-300 dark:hover:bg-red-950/30 text-slate-600 dark:text-slate-300 hover:text-red-600 text-xs font-bold rounded-xl transition-all shadow-sm shrink-0 flex items-center justify-center gap-1.5"
        title="Cari di Google Maps: ${t.alamat}">
        <i class="fa-solid fa-location-dot text-slate-400 text-sm"></i>
      </a>`;
    }
    // Badge RL Radius / No Layanan untuk tipe instalasi
    let rlBadge = '';
    const isInstalasi = ['INSTALASI','INSTALASI_RESELLER','PERLUASAN_RESELLER'].includes(t.tipe);
    if(isInstalasi) {
      if(t.rlRadiusDone && t.noLayanan) {
        rlBadge = `<p class="text-[10px] font-bold text-emerald-600 mt-0.5"><i class="fa-solid fa-id-card mr-1"></i>No. Layanan: ${t.noLayanan}</p>`;
      } else {
        rlBadge = `<p class="text-[10px] font-bold text-rose-500 mt-0.5"><i class="fa-solid fa-triangle-exclamation mr-1"></i>Belum Input RL Radius</p>`;
      }
    }
    return `<div class="bg-slate-50 dark:bg-slate-700/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${c[0]}">${t.tipe}</span>
          <span class="text-xs font-black text-slate-800 dark:text-slate-200">${t.woId}</span>
        </div>
        <h3 class="text-sm font-extrabold text-slate-900 dark:text-white">${t.customer}</h3>
        ${t.alamat ? `<p class="text-[10px] text-slate-400"><i class="fa-solid fa-location-dot text-rose-400 mr-1"></i>${t.alamat}</p>` : ''}
        ${rlBadge}
      </div>
      <div class="flex items-center gap-2 shrink-0">
        ${mapsBtn}
        <button type="button" onclick="returnTaskLangsung('${t.woId}')" title="Kembalikan tiket ke Pickup"
          class="px-3 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-rose-50 hover:border-rose-300 dark:hover:bg-rose-950/30 text-slate-500 hover:text-rose-600 text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5">
          <i class="fa-solid fa-rotate-left text-sm"></i>
        </button>
        <button type="button" onclick="startWork('${t.tipe}','${t.woId}','${t.customer}')" class="px-4 py-2.5 ${c[1]} text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 active:scale-95">
          <i class="fa-solid ${c[2]}"></i>Kerjakan
        </button>
      </div>
    </div>`;
  }).join('');
}

// Return tiket langsung dari card Tugas Saya (dengan konfirmasi)
async function returnTaskLangsung(woId) {
  const alasan = prompt('Kembalikan tiket ' + woId + ' ke Pickup?\n\nIsi alasan pengembalian:');
  if(alasan === null) return;
  if(!alasan.trim()) { showAlert('Alasan pengembalian wajib diisi.', 'Validasi'); return; }
  myPickedTasks = myPickedTasks.filter(t => t.woId !== woId);
  renderMyTaskList();
  if(typeof supa !== 'undefined') {
    const releaseData={status:'RELEASE',released_at:new Date().toISOString(),picked_up_at:null,teknisi:[],teknisi_1:null,teknisi_2:null};
    let releaseResult=await supa.from('work_orders').update(releaseData).eq('wo_id',woId);
    if(releaseResult.error && /released_at|picked_up_at|completed_at|column/i.test(releaseResult.error.message||'')){delete releaseData.released_at;delete releaseData.picked_up_at;releaseResult=await supa.from('work_orders').update(releaseData).eq('wo_id',woId);}
    const { error } = releaseResult;
    if(error) { showAlert('Gagal return: ' + error.message, 'Error'); return; }
  }
  showAlert('WO ' + woId + ' dikembalikan ke Pickup Tugas.\nAlasan: ' + alasan, 'Return Berhasil');
  if(typeof renderPickupListFromDB === 'function') renderPickupListFromDB();
}

// Isi info box read-only di form teknisi (No Tiket, Nama, No Layanan)
function fillInfoBoxTeknisi(woId, customer) {
  const noTiketEl = document.getElementById('info-no-tiket');
  const namaEl    = document.getElementById('info-nama-pelanggan');
  const noLayEl   = document.getElementById('info-no-layanan');
  if(noTiketEl) noTiketEl.value = woId;
  if(namaEl)    namaEl.value = customer;

  // Ambil No Layanan & status RL Radius dari task atau DB
  const task = myPickedTasks.find(t => t.woId === woId);
  function applyNoLayanan(noLayanan, rlDone) {
    if(!noLayEl) return;
    if(noLayanan) {
      noLayEl.value = noLayanan;
      noLayEl.style.background = rlDone ? '#ecfdf5' : '#fffbeb';
      noLayEl.style.borderColor = rlDone ? '#6ee7b7' : '#fcd34d';
      noLayEl.style.color = rlDone ? '#059669' : '#b45309';
    } else {
      noLayEl.value = '⚠ Belum Input RL Radius';
      noLayEl.style.background = '#fef2f2';
      noLayEl.style.borderColor = '#fca5a5';
      noLayEl.style.color = '#dc2626';
    }
  }

  if(task && task.noLayanan !== undefined) {
    applyNoLayanan(task.noLayanan, task.rlRadiusDone);
  } else if(typeof supa !== 'undefined') {
    // Fetch dari DB
    supa.from('work_orders').select('*').eq('wo_id', woId).maybeSingle()
      .then(({data}) => { if(data) applyNoLayanan(data.no_layanan, data.rl_radius_done); });
  }
}

// Isi info read-only Perluasan seperti Instalasi Baru.
function fillPerluasanInfoBox(woId, customer) {
  const noTiketEl = document.getElementById('perluasan-info-no-tiket');
  const namaEl = document.getElementById('perluasan-info-nama-pelanggan');
  const noLayEl = document.getElementById('perluasan-info-no-layanan');
  const hiddenNoLayEl = document.getElementById('perluasan-no-layanan');
  if(noTiketEl) noTiketEl.value = woId;
  if(namaEl) namaEl.value = customer;

  function applyNoLayanan(noLayanan, rlDone) {
    const value = noLayanan ? String(noLayanan) : '';
    if(hiddenNoLayEl) hiddenNoLayEl.value = value;
    if(!noLayEl) return;
    noLayEl.value = value || '⚠ Belum Input RL Radius';
    noLayEl.style.background = value && rlDone ? '#ecfdf5' : (value ? '#fffbeb' : '#fef2f2');
    noLayEl.style.borderColor = value && rlDone ? '#6ee7b7' : (value ? '#fcd34d' : '#fca5a5');
    noLayEl.style.color = value && rlDone ? '#059669' : (value ? '#b45309' : '#dc2626');
  }

  const task = myPickedTasks.find(t => t.woId === woId);
  if(task && task.noLayanan !== undefined) {
    applyNoLayanan(task.noLayanan, task.rlRadiusDone);
  } else if(typeof supa !== 'undefined') {
    supa.from('work_orders').select('no_layanan,rl_radius_done').eq('wo_id', woId).maybeSingle()
      .then(({data}) => { if(data) applyNoLayanan(data.no_layanan, data.rl_radius_done); });
  }
}

async function loadTeknisiTeamFields(woId, prefix){
  const input1=document.getElementById(prefix+'-teknisi-1');
  const select2=document.getElementById(prefix+'-teknisi-2');
  if(!input1 || !select2) return;
  const namaSaya=currentUser ? currentUser.displayName : '';
  if(input1) input1.value=namaSaya;
  try{
    const {data:akun,error:akunError}=await supa.from('akun')
      .select('username,display_name').eq('role','teknisi').order('display_name');
    if(akunError) throw akunError;
    const partners=(akun||[]).filter(a=>(a.display_name||'').toLowerCase()!==namaSaya.toLowerCase());
    select2.innerHTML='<option value="">-- Pilih Partner Teknisi (Opsional) --</option>'+
      partners.map(a=>`<option value="${a.display_name}">${a.display_name}</option>`).join('');

    let {data:wo,error}=await supa.from('work_orders')
      .select('*').eq('wo_id',woId).maybeSingle();
    if(error) throw error;
    const legacy=Array.isArray(wo?.teknisi) ? wo.teknisi : [];
    const teknisi1=wo?.teknisi_1 || legacy[0] || namaSaya;
    const teknisi2=wo?.teknisi_2 || legacy[1] || '';
    input1.value=teknisi1;
    if(teknisi2 && !Array.from(select2.options).some(option=>option.value===teknisi2)){
      select2.insertAdjacentHTML('beforeend',`<option value="${teknisi2}">${teknisi2}</option>`);
    }
    select2.value=teknisi2;
    const task=myPickedTasks.find(item=>item.woId===woId);
    if(task){ task.teknisi1=teknisi1; task.teknisi2=teknisi2; }
  }catch(e){
    select2.innerHTML='<option value="">Gagal memuat teknisi</option>';
    console.warn('[loadTeknisiTeamFields]',e.message);
  }
}

function getTeknisiTeam(prefix,showMessage=true){
  const teknisi1=(document.getElementById(prefix+'-teknisi-1')?.value||'').trim();
  const teknisi2=(document.getElementById(prefix+'-teknisi-2')?.value||'').trim();
  if(!teknisi1){
    if(showMessage) showAlert('Teknisi 1 belum terisi.','Tim Teknisi');
    return null;
  }
  if(teknisi2 && teknisi1.toLowerCase()===teknisi2.toLowerCase()){
    if(showMessage) showAlert('Teknisi 2 tidak boleh sama dengan Teknisi 1.','Tim Teknisi');
    return null;
  }
  return {teknisi1,teknisi2:teknisi2||null,teknisi:[teknisi1].concat(teknisi2?[teknisi2]:[])};
}

async function saveTeknisiTeam(woId,prefix){
  const team=getTeknisiTeam(prefix);
  if(!team) return null;
  const {error}=await supa.from('work_orders').update({
    teknisi_1:team.teknisi1, teknisi_2:team.teknisi2, teknisi:team.teknisi
  }).eq('wo_id',woId);
  if(error){
    showAlert('Gagal menyimpan Teknisi 1/2: '+error.message+'\nPastikan SQL kolom teknisi_1 dan teknisi_2 sudah dijalankan.','Error');
    throw error;
  }
  const task=myPickedTasks.find(item=>item.woId===woId);
  if(task){ task.teknisi1=team.teknisi1; task.teknisi2=team.teknisi2; }
  const local=kpiWOData.find(item=>item.id===woId);
  if(local){ local.teknisi_1=team.teknisi1; local.teknisi_2=team.teknisi2; local.teknisi=team.teknisi; }
  return team;
}

function startWork(type,woId,customer){
  activeWoId=woId;
  // Selalu bersihkan foto dari WO sebelumnya sebelum mulai WO baru
  clearSavedCamPhotos();
  sessionStorage.removeItem('sinu_cam_photos');
  document.getElementById('view-tugas-saya-list').classList.add('hidden');
  sessionStorage.setItem('sinu_active_work', JSON.stringify({woId,customer,type}));
  if(type==='INSTALASI'||type==='INSTALASI_RESELLER'){
    document.getElementById('form-work-instalasi').classList.remove('hidden');
    // Isi info box (No Tiket, Nama, No Layanan)
    fillInfoBoxTeknisi(woId, customer);
    loadTeknisiTeamFields(woId,'instalasi');
    goToInstalasiStep1();
    setTimeout(restoreCamPhotos, 100);
  } else if(type==='PERLUASAN_RESELLER'){
    document.getElementById('perluasan-wo-info').innerText='WO: '+woId+' — '+customer;
    fillPerluasanInfoBox(woId, customer);
    document.getElementById('form-work-perluasan').classList.remove('hidden');
    loadTeknisiTeamFields(woId,'perluasan');
    // Load SN dropdown perluasan (ONT/AP + Kabel)
    if(typeof loadSNDropdownsPerluasan === 'function') loadSNDropdownsPerluasan();
    setTimeout(restoreCamPhotos, 100);
  } else {
    document.getElementById('maint-wo-info').innerText='WO: '+woId+' — '+customer;
    document.getElementById('form-work-maintenance').classList.remove('hidden');
    loadTeknisiTeamFields(woId,'maintenance');
    if(typeof loadSNDropdownsMaintenance === 'function') loadSNDropdownsMaintenance();
    setTimeout(restoreCamPhotos, 100);
  }
}

async function completeTask(woId,team){
  const task=myPickedTasks.find(t=>t.woId===woId);
  const now=new Date();
  const completedAt=now.toISOString();
  const t4=now.toTimeString().substring(0,5);

  if(typeof supa !== 'undefined') {
    const updateData={status:'SELESAI',t4:t4,completed_at:completedAt};
    if(team){ updateData.teknisi_1=team.teknisi1; updateData.teknisi_2=team.teknisi2; updateData.teknisi=team.teknisi; }
    let result=await supa.from('work_orders').update(updateData).eq('wo_id',woId);
    if(result.error && /released_at|completed_at|column/i.test(result.error.message||'')) {
      delete updateData.completed_at;
      result=await supa.from('work_orders').update(updateData).eq('wo_id',woId);
    }
    if(result.error) throw result.error;
    console.log('[Complete] WO',woId,'selesai dengan tim',team?.teknisi?.join(', ')||'-');
  }

  // Hapus dari tugas aktif hanya setelah update database berhasil.
  myPickedTasks=myPickedTasks.filter(t=>t.woId!==woId);
  if(task) completedTasks.unshift({...task, teknisi1:team?.teknisi1, teknisi2:team?.teknisi2, t4, completed_at:completedAt, tanggal: now.toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'}), waktuSelesai:now.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})});
  const wo=kpiWOData.find(d=>d.id===woId);if(wo){wo.status='SELESAI';wo.t4=t4;wo.completed_at=completedAt;wo.teknisi_1=team?.teknisi1||wo.teknisi_1;wo.teknisi_2=team?.teknisi2||wo.teknisi_2;wo.teknisi=team?.teknisi||wo.teknisi||[];}
  renderMyTaskList();renderReturnSelect();renderRiwayatTugas();
}

// Data riwayat tersimpan untuk filter
let _riwayatData = [];

function renderRiwayatTugas(){
  const el=document.getElementById('riwayat-tugas-list');if(!el)return;
  el.innerHTML='<p class="text-xs text-slate-400 text-center py-4"><i class="fa-solid fa-spinner animate-spin mr-2"></i>Memuat...</p>';

  const teknisiName = currentUser ? currentUser.displayName : '';

  if(typeof supa !== 'undefined') {
    supa.from('work_orders')
      .select('*')
      .eq('status', 'SELESAI')
      .order('created_at', {ascending: false}) // terbaru di atas
      .limit(50)
      .then(({data, error}) => {
        if(error) { renderRiwayatLokal(); return; }
        // Filter milik teknisi ini
        const milik = (data||[]).filter(d => {
          if(!d.teknisi) return false;
          const arr = Array.isArray(d.teknisi) ? d.teknisi : [d.teknisi];
          return arr.some(t => typeof t==='string' && t.toLowerCase()===teknisiName.toLowerCase());
        });
        // Gabung dengan completedTasks lokal sesi ini (yang mungkin belum di DB)
        const lokal = completedTasks.filter(t => !milik.find(d => d.wo_id===t.woId));
        const lokalFormatted = lokal.map(t => ({
          wo_id: t.woId, pelanggan: t.customer, tipe: t.tipe,
          t4: t.t4, created_at: new Date().toISOString(), _lokal: true,
          _tanggal: t.tanggal, _waktu: t.waktuSelesai
        }));
        // Gabung dan urutkan terbaru di atas
        _riwayatData = [...lokalFormatted, ...milik];
        renderRiwayatList(_riwayatData);
      });
  } else {
    renderRiwayatLokal();
  }
}

function renderRiwayatList(data) {
  const el = document.getElementById('riwayat-tugas-list');
  if(!el) return;
  if(!data || !data.length){
    el.innerHTML='<p class="text-xs text-slate-400 text-center py-6">Belum ada tugas selesai.</p>';
    return;
  }
  el.innerHTML = data.map(d => {
    const tgl = d._lokal ? d._tanggal :
      new Date(d.created_at).toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
    const waktu = d._lokal ? d._waktu : (d.t4 || '--');
    return `<div class="p-4 bg-slate-50 dark:bg-slate-700/40 rounded-2xl border border-slate-200 dark:border-slate-600 space-y-1.5">
      <div class="flex justify-between items-center">
        <span class="text-xs font-black text-blue-600 dark:text-blue-400 font-mono">${d.wo_id}</span>
        <span class="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 px-2.5 py-0.5 rounded-full font-bold">SELESAI</span>
      </div>
      <p class="text-xs font-bold text-slate-800 dark:text-slate-100">${d.pelanggan||'-'} — <span class="text-indigo-600 dark:text-indigo-400">${d.tipe||'-'}</span></p>
      <p class="text-[11px] text-slate-400">
        <i class="fa-solid fa-circle-check text-emerald-500 mr-1"></i>
        ${tgl}${waktu && waktu!=='--' ? ' • T4: '+waktu : ''}
      </p>
    </div>`;
  }).join('');
}

function filterRiwayat() {
  const q = (document.getElementById('riwayat-search')?.value||'').toLowerCase();
  const tgl = document.getElementById('riwayat-filter-date')?.value || '';
  const tipe = document.getElementById('riwayat-filter-tipe')?.value || 'ALL';

  let filtered = _riwayatData;
  if(q) filtered = filtered.filter(d =>
    (d.pelanggan||'').toLowerCase().includes(q) ||
    (d.wo_id||'').toLowerCase().includes(q)
  );
  if(tipe !== 'ALL') filtered = filtered.filter(d => d.tipe === tipe);
  if(tgl) filtered = filtered.filter(d => {
    const tglData = new Date(d.created_at).toISOString().substring(0,10);
    return tglData === tgl;
  });
  renderRiwayatList(filtered);
}

function renderRiwayatLokal(){
  const el=document.getElementById('riwayat-tugas-list');if(!el)return;
  if(!completedTasks.length){el.innerHTML='<p class="text-xs text-slate-400 text-center py-6">Belum ada tugas selesai.</p>';return;}
  _riwayatData = completedTasks.map(t => ({
    wo_id: t.woId, pelanggan: t.customer, tipe: t.tipe,
    t4: t.t4, created_at: new Date().toISOString(),
    _lokal: true, _tanggal: t.tanggal, _waktu: t.waktuSelesai
  }));
  renderRiwayatList(_riwayatData);
}

function goToInstalasiStep1(){
  document.getElementById('instalasi-step-1-content').classList.remove('hidden');
  document.getElementById('instalasi-step-2-content').classList.add('hidden');
  document.getElementById('step-btn-1').className='step-indicator active p-2.5 rounded-2xl border text-center cursor-pointer transition-all';
  document.getElementById('step-btn-2').className='step-indicator p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-400 text-center cursor-pointer transition-all';
  // Reset provisioning status agar tidak tampil di step 1
  const provStatus = document.getElementById('provisioning-status');
  const provBtn    = document.getElementById('btn-request-provisioning');
  const submitBtn  = document.getElementById('btn-submit-aktivasi');
  if(provStatus) { provStatus.classList.add('hidden'); provStatus.innerHTML=''; delete provStatus.dataset.status; }
  if(provBtn)    { provBtn.classList.remove('hidden'); provBtn.disabled=false; provBtn.style.display=''; provBtn.innerHTML='<i class="fa-solid fa-paper-plane"></i>Kirim Request Registrasi'; }
  if(submitBtn)  submitBtn.disabled=true;
}
async function goToInstalasiStep2(){
  const team=await saveTeknisiTeam(activeWoId,'instalasi');
  if(!team) return;
  const submitBtn=document.getElementById('btn-submit-aktivasi');
  if(submitBtn) submitBtn.disabled=true;
  document.getElementById('instalasi-step-1-content').classList.add('hidden');
  document.getElementById('instalasi-step-2-content').classList.remove('hidden');
  document.getElementById('step-btn-2').className='step-indicator active p-2.5 rounded-2xl border text-center cursor-pointer transition-all';
  document.getElementById('step-btn-1').className='step-indicator p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-400 text-center cursor-pointer transition-all';
  // Load SN dropdown dari perangkat yang sudah di-pickup teknisi
  if(typeof loadSNDropdowns === 'function') loadSNDropdowns();
}

// Flag global mencegah double submit
let _isSubmitting = false;

async function submitWorkInstalasi(){
  if(_isSubmitting){ showAlert('Sedang menyimpan, harap tunggu...','Harap Tunggu'); return; }
  const provStatus=document.getElementById('provisioning-status');
  if(!provStatus || provStatus.dataset.status!=='DONE'){
    showAlert('Tunggu sampai status Provisioning Selesai sebelum menekan Submit & Aktifkan.','Provisioning Belum Selesai');
    return;
  }
  _isSubmitting = true;
  showLoading('Menyimpan data instalasi...');
  try {
  const woId = activeWoId;
  const task = myPickedTasks.find(t => t.woId === woId);
  const pelanggan = task ? task.customer : '-';
  const snOnt   = document.getElementById('sn-ont-select')?.value   || '';
  const snKabel = document.getElementById('sn-kabel-select')?.value || '';
  const odpId   = document.getElementById('select-odp-instalasi')?.value || '';

  // Peringatan kalau SN ONT belum dipilih (perangkat belum di-pickup)
  if(!snOnt) {
    const lanjut = confirm('SN ONT belum dipilih!\n\nPastikan Anda sudah pickup perangkat di menu Material.\n\nLanjutkan submit tanpa SN ONT?');
    if(!lanjut) { _isSubmitting = false; hideLoading(); return; }
  }
  const catatan = document.getElementById('instalasi-catatan')?.value || '';
  const panjangKabel = parseFloat(document.getElementById('instalasi-panjang-kabel')?.value)||0;
  const noLayanan = (document.getElementById('instalasi-no-layanan')?.value||'').trim();
  const usernamePPPOE = ''; // sudah diisi CS saat buat WO
  const passwordPPPOE = ''; // sudah diisi CS saat buat WO
  const statusKoneksi = ''; // sudah diisi CS saat buat WO

  const team = await saveTeknisiTeam(woId,'instalasi');
  if(!team) return;
  await completeTask(woId,team);

  if(typeof supa !== 'undefined') {
    const teknisi = currentUser ? currentUser.displayName : '';
    const ketInstalasi = 'Terpasang di pelanggan: '+pelanggan+' | WO: '+woId;

    // Simpan detail ke work_orders
    // Bangun objek update — hanya sertakan field yang ada isinya
    var updateData = {
      catatan: catatan, teknisi: team.teknisi,
      teknisi_1: team.teknisi1, teknisi_2: team.teknisi2,
      panjang_kabel: panjangKabel
    };
    if(snOnt)   updateData.sn_ont   = snOnt;
    if(snKabel) updateData.sn_kabel = snKabel;
    if(odpId)   updateData.odp_id   = odpId;
    // no_layanan TIDAK diupdate di sini (diisi admin lewat RL Radius)
    if(noLayanan) updateData.no_layanan = noLayanan;

    console.log('[Instalasi] Update WO', woId, updateData);
    var resUpd = await supa.from('work_orders').update(updateData).eq('wo_id', woId);
    if(resUpd.error) console.error('[Instalasi] Gagal update:', resUpd.error);

    // Kurangi sisa kabel jika ada panjang yang dipakai
    if(snKabel && panjangKabel > 0) {
      await kurangiSisaKabel(snKabel, panjangKabel, teknisi);
    }

    // Simpan foto ke wo_photos
    const fotoMap = {
      step1: [{key:'s1f1',label:'Briefing Awal'},{key:'s1f2',label:'ODP Tertutup'},{key:'s1f3',label:'ODP Terbuka'},{key:'s1f4',label:'Label Pelanggan'},{key:'s1f5',label:'Ban Kabel Awal'}],
      step2: [{key:'s2f1',label:'Rumah Pelanggan'},{key:'s2f2',label:'SN ONT'},{key:'s2f3',label:'SN Kabel'},{key:'s2f4',label:'ONT Terpasang'},{key:'s2f5',label:'Speed Test'},{key:'s2f6',label:'Briefing Akhir'}]
    };
    for(const [step, keys] of Object.entries(fotoMap)) {
      for(const fk of keys) {
        const img = document.getElementById('cam-img-'+fk.key);
        if(img && img.src && img.src.startsWith('data:image')) {
          try {
            const {error: photoError}=await supa.from('wo_photos').insert({
              wo_id: woId, step, key: fk.key, label: fk.label, photo_base64: img.src
            });
            if(photoError) throw photoError;
          } catch(e) { throw new Error('Foto '+fk.label+' gagal disimpan: '+e.message); }
        }
      }
    }

    // Tandai perangkat terpasang (kabel hanya hapus kalau sisa habis)
    for(const sn of [snOnt, snKabel].filter(s => s && s !== '')) {
      await tandaiTerpasang(sn, teknisi, pelanggan, ketInstalasi);
    }
  }

  // Setelah seluruh foto dan detail tersimpan, baru bersihkan preview/session.
  clearSavedCamPhotos();
  sessionStorage.removeItem('sinu_active_work');

  showAlert('Data instalasi berhasil disimpan!', 'Tugas Selesai');
  document.getElementById('form-work-instalasi').classList.add('hidden');
  document.getElementById('view-tugas-saya-list').classList.remove('hidden');
  switchSubTugas('riwayat-tugas');
  activeWoId = null;
  // Auto refresh data terkait tanpa perlu reload halaman
  if(typeof renderPickupListFromDB==='function') renderPickupListFromDB();
  if(typeof renderRiwayatTugas==='function') renderRiwayatTugas();
  } catch(e) { console.error('[submitWorkInstalasi]', e); showAlert('Gagal menyimpan: '+e.message,'Error'); }
  finally { _isSubmitting = false; hideLoading(); }
}
async function submitWorkMaintenance(){
  if(_isSubmitting){ showAlert('Sedang menyimpan, harap tunggu...','Harap Tunggu'); return; }
  _isSubmitting = true;
  showLoading('Menyimpan laporan maintenance...');
  try {
  const woId = activeWoId;
  if(!woId){ showAlert('Tidak ada WO aktif.','Error'); _isSubmitting=false; hideLoading(); return; }
  const panjangKabel = parseFloat(document.getElementById('maint-panjang-kabel')?.value)||0;
  const keterangan = (document.getElementById('maint-keterangan')?.value || '').trim();
  if(!keterangan){
    const keteranganEl=document.getElementById('maint-keterangan');
    if(keteranganEl) keteranganEl.focus();
    showAlert('Keterangan Penanganan Teknisi wajib diisi sebelum maintenance disubmit.','Validasi Maintenance');
    return;
  }
  const snOnt   = document.getElementById('maint-sn-ont')?.value  || '';
  const snKabel = document.getElementById('maint-sn-kabel')?.value || '';
  const teknisi = currentUser ? currentUser.displayName : '';
  const team = await saveTeknisiTeam(woId,'maintenance');
  if(!team) return;

  if(typeof supa !== 'undefined') {
    await supa.from('work_orders').update({
      panjang_kabel: panjangKabel,
      catatan: keterangan || null,
      sn_ont:   snOnt   || null,
      sn_kabel: snKabel || null,
      teknisi:  team.teknisi,
      teknisi_1: team.teknisi1,
      teknisi_2: team.teknisi2
    }).eq('wo_id', woId);

    // Kurangi sisa kabel jika ada panjang terpakai
    if(snKabel && panjangKabel > 0) {
      await kurangiSisaKabel(snKabel, panjangKabel, teknisi);
    }

    const task = myPickedTasks.find(t => t.woId === woId);
    const pelanggan = task ? task.customer : '-';
    const ket = 'Penggantian Maintenance: '+pelanggan+' | WO: '+woId;

    // AUTO-UPDATE SN ONT di WO Instalasi asal pelanggan (jika ada penggantian ONT)
    if(snOnt) {
      try {
        // Cari WO Instalasi terbaru milik pelanggan ini
        const { data: woInstalasi } = await supa.from('work_orders')
          .select('wo_id, sn_ont')
          .eq('pelanggan', pelanggan)
          .in('tipe', ['INSTALASI', 'INSTALASI_RESELLER', 'PERLUASAN_RESELLER'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if(woInstalasi) {
          const snLama = woInstalasi.sn_ont;
          // Catat riwayat pergantian ONT ke device_history
          if(snLama && snLama !== snOnt) {
            await catatHistory(snLama, pelanggan, 'Diganti', 'REPLACE',
              'ONT diganti oleh teknisi ' + teknisi + ' | WO Maintenance: ' + woId + ' | ONT baru: ' + snOnt);
          }
          // Update SN ONT baru di WO instalasi
          await supa.from('work_orders')
            .update({ sn_ont: snOnt })
            .eq('wo_id', woInstalasi.wo_id);
          console.log('[Maint] SN ONT pelanggan', pelanggan, 'diupdate:', snLama, '→', snOnt);
        }
      } catch(e) { console.warn('[Maint] Gagal update SN ONT:', e.message); }
    }

    for(const sn of [snOnt, snKabel].filter(s => s && s !== '')) {
      await tandaiTerpasang(sn, teknisi, pelanggan, ket);
    }

    // Simpan foto maintenance
    const fotoMap = [{key:'mf1',label:'Teknisi Selfie'},{key:'mf2',label:'Sebelum'},{key:'mf3',label:'Sesudah'}];
    for(const fk of fotoMap) {
      const img = document.getElementById('cam-img-'+fk.key);
      if(img && img.src && img.src.startsWith('data:image')) {
        try {
          const {error: photoError}=await supa.from('wo_photos').insert({ wo_id:woId, step:'maintenance', key:fk.key, label:fk.label, photo_base64:img.src });
          if(photoError) throw photoError;
        } catch(e){ throw new Error('Foto '+fk.label+' gagal disimpan: '+e.message); }
      }
    }
  }

  await completeTask(woId,team);
  clearSavedCamPhotos();
  sessionStorage.removeItem('sinu_active_work');
  showAlert('Pelaporan Maintenance berhasil! Masuk ke Log Tugas.','Tugas Selesai');
  document.getElementById('form-work-maintenance').classList.add('hidden');
  document.getElementById('view-tugas-saya-list').classList.remove('hidden');
  switchSubTugas('riwayat-tugas');
  activeWoId = null;
  if(typeof renderPickupListFromDB==='function') renderPickupListFromDB();
  if(typeof renderRiwayatTugas==='function') renderRiwayatTugas();
  } catch(e) { console.error('[submitWorkMaintenance]', e); showAlert('Gagal menyimpan: '+e.message,'Error'); }
  finally { _isSubmitting = false; hideLoading(); }
}

// Load SN dropdown untuk form maintenance
async function loadSNDropdownsMaintenance() {
  const selOnt   = document.getElementById('maint-sn-ont');
  const selKabel = document.getElementById('maint-sn-kabel');
  if (!selOnt && !selKabel) return;
  const nama = currentUser ? currentUser.displayName : '';
  try {
    const { data } = await supa.from('perangkat_teknisi')
      .select('sn,jenis,kondisi,panjang_sisa').eq('teknisi_name', nama).eq('status','READY');
    const onts   = (data||[]).filter(d => d.jenis==='Modem/ONT' || d.jenis==='Access Point');
    const kabels = (data||[]).filter(d =>
      (d.jenis==='Kabel Dropcore' || d.jenis==='Kabel RJ45') && Number(d.panjang_sisa || 0) > 0
    );
    const emptyOpt = '<option value="">-- Tidak ada --</option>';
    if(selOnt)   selOnt.innerHTML   = emptyOpt + onts.map(d=>`<option value="${d.sn}">${d.sn} (${d.jenis})</option>`).join('');
    if(selKabel) selKabel.innerHTML = emptyOpt + kabels.map(d=>{
      const sisa = d.panjang_sisa != null ? ` — ${d.panjang_sisa}m sisa` : '';
      return `<option value="${d.sn}">${d.sn} (${d.jenis})${sisa}</option>`;
    }).join('');
  } catch(e) { console.warn('[loadSNDropdownsMaintenance]', e.message); }
}

// ── LOAD SN DROPDOWN PERLUASAN ────────────────────────
async function loadSNDropdownsPerluasan() {
  const selOnt   = document.getElementById('perluasan-sn-ont');
  const selKabel = document.getElementById('perluasan-sn-kabel');
  if (!selOnt && !selKabel) return;
  const nama = currentUser ? currentUser.displayName : '';
  try {
    const { data } = await supa.from('perangkat_teknisi')
      .select('sn,jenis,kondisi,panjang_sisa').eq('teknisi_name', nama).eq('status','READY');
    const onts   = (data||[]).filter(d => d.jenis==='Modem/ONT' || d.jenis==='Access Point');
    const kabels = (data||[]).filter(d =>
      (d.jenis==='Kabel Dropcore' || d.jenis==='Kabel RJ45') && Number(d.panjang_sisa || 0) > 0
    );
    const emptyOpt = '<option value="" disabled selected>-- Pilih SN --</option>';
    const emptyKbl = '<option value="">-- Tidak ada --</option>';
    if(selOnt)   selOnt.innerHTML   = emptyOpt  + onts.map(d=>`<option value="${d.sn}">${d.sn} (${d.jenis})</option>`).join('');
    if(selKabel) selKabel.innerHTML = emptyKbl + kabels.map(d=>{
      const sisa = ` — ${d.panjang_sisa}m sisa`;
      return `<option value="${d.sn}">${d.sn} (${d.jenis})${sisa}</option>`;
    }).join('');
  } catch(e) { console.warn('[loadSNDropdownsPerluasan]', e.message); }
}

// ── SUBMIT PERLUASAN RESELLER ─────────────────────────
async function submitWorkPerluasan() {
  if(_isSubmitting){ showAlert('Sedang menyimpan, harap tunggu...','Harap Tunggu'); return; }
  _isSubmitting = true;
  showLoading('Menyimpan data perluasan...');
  try {
  const woId       = activeWoId;
  const task       = myPickedTasks.find(t => t.woId === woId);
  const pelanggan  = task ? task.customer : '-';
  const snOnt      = document.getElementById('perluasan-sn-ont')?.value || '';
  const snKabel    = document.getElementById('perluasan-sn-kabel')?.value || '';
  const panjang    = parseFloat(document.getElementById('perluasan-panjang-kabel')?.value)||0;
  const catatan    = document.getElementById('perluasan-catatan')?.value || '';
  const noLayanan  = (document.getElementById('perluasan-no-layanan')?.value||'').trim();
  const teknisi    = currentUser ? currentUser.displayName : '';
  const team       = await saveTeknisiTeam(woId,'perluasan');
  if(!team) return;

  await completeTask(woId,team);

  if(typeof supa !== 'undefined') {
    await supa.from('work_orders').update({
      sn_ont:       snOnt   || null,
      sn_kabel:     snKabel || null,
      panjang_kabel: panjang,
      catatan:      catatan,
      no_layanan:   noLayanan || null,
      teknisi:      team.teknisi,
      teknisi_1:    team.teknisi1,
      teknisi_2:    team.teknisi2
    }).eq('wo_id', woId);

    // Kurangi sisa kabel jika ada panjang terpakai
    if(snKabel && panjang > 0) {
      await kurangiSisaKabel(snKabel, panjang, teknisi);
    }

    // Tandai perangkat terpasang (kabel hanya hapus kalau sisa habis)
    const ket = 'Terpasang Perluasan Reseller: '+pelanggan+' | WO: '+woId;
    for(const sn of [snOnt, snKabel].filter(s => s && s !== '')) {
      await tandaiTerpasang(sn, teknisi, pelanggan, ket);
    }

    // Simpan foto perluasan
    const fotoMap = [
      {key:'pf1',label:'ODP'},{key:'pf2',label:'Lokasi Instalasi'},
      {key:'pf3',label:'SN Perangkat'},{key:'pf4',label:'Perangkat Terpasang'},{key:'pf5',label:'Speed Test'}
    ];
    for(const fk of fotoMap) {
      const img = document.getElementById('cam-img-'+fk.key);
      if(img && img.src && img.src.startsWith('data:image')) {
        try {
          const {error: photoError}=await supa.from('wo_photos').insert({ wo_id:woId, step:'perluasan', key:fk.key, label:fk.label, photo_base64:img.src });
          if(photoError) throw photoError;
        } catch(e){ throw new Error('Foto '+fk.label+' gagal disimpan: '+e.message); }
      }
    }
    // Setelah seluruh foto tersimpan, baru bersihkan preview dan session pekerjaan.
    clearSavedCamPhotos();
    sessionStorage.removeItem('sinu_active_work');
  }

  showAlert('Perluasan Reseller '+woId+' berhasil disimpan!','Tugas Selesai');
  document.getElementById('form-work-perluasan').classList.add('hidden');
  document.getElementById('view-tugas-saya-list').classList.remove('hidden');
  switchSubTugas('riwayat-tugas');
  activeWoId = null;
  if(typeof renderPickupListFromDB==='function') renderPickupListFromDB();
  if(typeof renderRiwayatTugas==='function') renderRiwayatTugas();
  } catch(e) { console.error('[submitWorkPerluasan]', e); showAlert('Gagal menyimpan: '+e.message,'Error'); }
  finally { _isSubmitting = false; hideLoading(); }
}
async function executeReturnTask(){
  const wo=document.getElementById('return-wo-select').value;
  if(!wo){showAlert('Pilih WO yang akan dikembalikan.');return;}
  const reason=document.getElementById('return-wo-reason').value;
  if(!reason.trim()){showAlert('Isi alasan pengembalian terlebih dahulu.');return;}
  myPickedTasks=myPickedTasks.filter(t=>t.woId!==wo);
  renderMyTaskList();renderReturnSelect();
  // Reset status RELEASE dan kosongkan teknisi
  if(typeof supa!=='undefined') {
    const releaseData={status:'RELEASE',released_at:new Date().toISOString(),teknisi:[],teknisi_1:null,teknisi_2:null};
    let releaseResult=await supa.from('work_orders').update(releaseData).eq('wo_id', wo);
    if(releaseResult.error && /released_at|completed_at|column/i.test(releaseResult.error.message||'')){delete releaseData.released_at;releaseResult=await supa.from('work_orders').update(releaseData).eq('wo_id', wo);}
    const {error} = releaseResult;
    if(error) {
      console.error('[Return] Gagal update DB:', error.message);
      showAlert('Return berhasil lokal tapi gagal update DB: '+error.message, 'Peringatan');
    } else {
      console.log('[Return] WO '+wo+' berhasil di-return ke RELEASE');
    }
  }
  showAlert('WO '+wo+' berhasil dikembalikan ke Pickup Tugas.','Return Berhasil');
  document.getElementById('return-wo-reason').value='';
  switchSubTugas('pickup-tugas');
  renderPickupListFromDB();
}
function showCancelWOModal(type){activeCancelWOType=type;document.getElementById('cancel-wo-modal').classList.remove('hidden');}

// Kembali ke Tugas Saya tanpa membatalkan WO (WO tetap di-pickup)
function backToTugasSaya(formType) {
  const formMap = {
    maintenance:  'form-work-maintenance',
    instalasi:    'form-work-instalasi',
    perluasan:    'form-work-perluasan'
  };
  const formId = formMap[formType] || 'form-work-maintenance';
  const el = document.getElementById(formId);
  if(el) el.classList.add('hidden');
  const listEl = document.getElementById('view-tugas-saya-list');
  if(listEl) listEl.classList.remove('hidden');
  switchSubTugas('tugas-saya');
}
function closeCancelWOModal(){document.getElementById('cancel-modal-reason').value='';document.getElementById('cancel-wo-modal').classList.add('hidden');}
function confirmCancelWO(){
  const r=document.getElementById('cancel-modal-reason').value;if(!r.trim()){showAlert('Harap isi alasan pembatalan!');return;}
  closeCancelWOModal();
  clearSavedCamPhotos();
  sessionStorage.removeItem('sinu_active_work');
  // Hapus dari myPickedTasks
  if(activeWoId) myPickedTasks=myPickedTasks.filter(t=>t.woId!==activeWoId);
  renderMyTaskList();renderReturnSelect();
  ['form-work-instalasi','form-work-maintenance','form-work-perluasan'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.classList.add('hidden');
  });
  document.getElementById('view-tugas-saya-list').classList.remove('hidden');
  if(activeWoId) {
    if(typeof supa!=='undefined') {
      supa.from('work_orders').update({ status:'RELEASE', teknisi:[] }).eq('wo_id', activeWoId);
    }
  }
  activeWoId=null;
  showAlert('WO dibatalkan dan dikembalikan ke Pickup Tugas.','WO Dibatalkan');
  switchSubTugas('pickup-tugas');
  renderPickupListFromDB();
}

// FOTO COMPACT
function triggerCam(key){document.getElementById('cam-'+key).click();}
function onCamChange(event,key){
  const file=event.target.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    const box=document.getElementById('cam-box-'+key);
    const img=document.getElementById('cam-img-'+key);
    if(box&&img){
      img.src=e.target.result;
      img.style.display='';           // hapus inline display:none dari reset sebelumnya
      box.classList.add('has-photo');
      // Auto-save foto ke sessionStorage agar tidak hilang saat refresh.
      // Disimpan per-WO agar foto WO lain tidak ikut terpulihkan.
      try {
        const saved = JSON.parse(sessionStorage.getItem('sinu_cam_photos')||'{}');
        saved.woId = activeWoId;
        if(!saved.photos || saved.woId !== activeWoId) saved.photos = {};
        saved.woId = activeWoId;
        saved.photos[key] = e.target.result;
        sessionStorage.setItem('sinu_cam_photos', JSON.stringify(saved));
      } catch(ex) { console.warn('Foto tidak bisa disimpan sementara:', ex.message); }
    }
  };
  reader.readAsDataURL(file);
}

// Pulihkan foto dari sessionStorage setelah refresh.
// Hanya memulihkan foto milik WO yang sedang aktif.
function restoreCamPhotos(){
  try {
    const saved = JSON.parse(sessionStorage.getItem('sinu_cam_photos')||'{}');
    if(!saved || saved.woId !== activeWoId || !saved.photos) return;
    Object.entries(saved.photos).forEach(([key, dataUrl]) => {
      const box = document.getElementById('cam-box-'+key);
      const img = document.getElementById('cam-img-'+key);
      if(box && img && dataUrl) {
        img.src = dataUrl;
        img.style.display='';
        box.classList.add('has-photo');
      }
    });
  } catch(e) { /* silent */ }
}

// Hapus foto tersimpan saat form di-reset (tugas selesai/cancel)
function clearSavedCamPhotos(){
  sessionStorage.removeItem('sinu_cam_photos');

  // Reset semua elemen foto di DOM — hapus src, class preview, dan tampilkan placeholder
  const allCamKeys = [
    // Instalasi Step 1
    's1f1','s1f2','s1f3','s1f4','s1f5',
    // Instalasi Step 2
    's2f1','s2f2','s2f3','s2f4','s2f5','s2f6',
    // Maintenance
    'mf1','mf2','mf3',
    // Perluasan
    'pf1','pf2','pf3','pf4','pf5',
    // NOC
    'nf1','nf2'
  ];
  allCamKeys.forEach(function(key) {
    const img = document.getElementById('cam-img-' + key);
    // Kosongkan gambar dan hapus inline display agar tidak ada sisa foto dari WO sebelumnya.
    if(img) { img.removeAttribute('src'); img.style.removeProperty('display'); }
    const box = document.getElementById('cam-box-' + key);
    if(box) {
      box.classList.remove('has-photo');
      const ph = box.querySelector('.cam-ph');
      if(ph) ph.style.removeProperty('display');
    }
    const inp = document.getElementById('cam-' + key);
    if(inp) inp.value = '';
  });
}

// PETA LEAFLET
let taskMap=null,taskMapMaint=null;
function getTaskLocation(type){
  if(!navigator.geolocation){showAlert('Browser tidak mendukung Geolocation.');return;}
  const statusEl=document.getElementById(type+'-coord-status');if(statusEl)statusEl.innerText='Mendeteksi GPS...';
  navigator.geolocation.getCurrentPosition(pos=>{
    const lat=pos.coords.latitude,lng=pos.coords.longitude;
    if(statusEl)statusEl.innerHTML='<span class="text-emerald-600 font-bold">✓ '+lat.toFixed(6)+', '+lng.toFixed(6)+'</span>';
    const mapId=type+'-map';const mapEl=document.getElementById(mapId);
    if(mapEl){mapEl.classList.remove('hidden');
      if(type==='instalasi'){
        if(!taskMap){taskMap=L.map(mapId).setView([lat,lng],16);}else taskMap.setView([lat,lng],16);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OSM'}).addTo(taskMap);
        L.marker([lat,lng]).addTo(taskMap).bindPopup('Lokasi Pelanggan').openPopup();
        odpMaster.filter(o=>calculateDistance(lat,lng,o.lat,o.lng)<=150).forEach(o=>{
          const pct=Math.round((o.terisi/o.kapasitas)*100);
          L.circleMarker([o.lat,o.lng],{color:getODPColor(pct),radius:8,fillColor:getODPColor(pct),fillOpacity:.8}).addTo(taskMap).bindPopup(`<b>${o.id}</b><br>${o.lokasi}<br>${o.terisi}/${o.kapasitas} port`);
        });
        updateODPDropdown(lat,lng);
        const nearby=odpMaster.filter(o=>calculateDistance(lat,lng,o.lat,o.lng)<=150);
        const nbEl=document.getElementById('instalasi-odp-nearby'),lsEl=document.getElementById('instalasi-odp-list');
        if(nearby.length&&nbEl&&lsEl){nbEl.classList.remove('hidden');lsEl.innerHTML=nearby.map(o=>{const d=Math.round(calculateDistance(lat,lng,o.lat,o.lng));return`<div class="flex items-center justify-between bg-white dark:bg-slate-800 rounded-xl px-3 py-2 border border-blue-100 dark:border-blue-900"><div><p class="text-xs font-extrabold text-blue-700 dark:text-blue-300">${o.id}</p><p class="text-[10px] text-slate-500">${o.lokasi} • ${d}m</p></div><p class="text-[10px] font-bold" style="color:${getODPColor(Math.round((o.terisi/o.kapasitas)*100))}">${o.terisi}/${o.kapasitas}</p></div>`;}).join('');}
        setTimeout(()=>{if(taskMap)taskMap.invalidateSize();},300);
      } else {
        if(!taskMapMaint){taskMapMaint=L.map(mapId).setView([lat,lng],16);}else taskMapMaint.setView([lat,lng],16);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OSM'}).addTo(taskMapMaint);
        L.marker([lat,lng]).addTo(taskMapMaint).bindPopup('Lokasi Maintenance').openPopup();
        setTimeout(()=>{if(taskMapMaint)taskMapMaint.invalidateSize();},300);
      }
    }
  },()=>{if(statusEl)statusEl.innerHTML="<span class='text-rose-500 font-semibold'>Gagal ambil GPS.</span>";});
}
function updateODPDropdown(lat,lng){
  const sel=document.getElementById('select-odp-instalasi');if(!sel)return;
  const nearby=odpMaster.filter(o=>calculateDistance(lat,lng,o.lat,o.lng)<=150);
  if(!nearby.length){sel.innerHTML='<option value="" disabled selected>-- Tidak ada ODP dalam radius 150m --</option>';return;}
  sel.innerHTML='<option value="" disabled selected>-- Pilih ODP --</option>'+nearby.map(o=>{const d=Math.round(calculateDistance(lat,lng,o.lat,o.lng));return`<option value="${o.id}">${o.id} (${d}m) — ${o.kapasitas-o.terisi} port sisa</option>`;}).join('');
}

async function requestProvisioning(){
  const statusEl=document.getElementById('provisioning-status'),btnEl=document.getElementById('btn-request-provisioning');
  if(!statusEl||!btnEl)return;
  btnEl.disabled=true;
  btnEl.innerHTML='<i class="fa-solid fa-spinner animate-spin"></i>Mengirim...';
  statusEl.dataset.status='PENDING';
  const submitBtn=document.getElementById('btn-submit-aktivasi');
  if(submitBtn) submitBtn.disabled=true;
  statusEl.className='flex items-center gap-3 p-3 rounded-xl border bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800';
  statusEl.classList.remove('hidden');
  statusEl.innerHTML='<i class="fa-solid fa-spinner animate-spin text-amber-500 text-lg"></i><div><p class="text-xs font-extrabold text-amber-700 dark:text-amber-300">On Going</p><p class="text-[11px] text-slate-500">Menunggu proses Admin...</p></div>';
  btnEl.style.display='none';

  // Ambil data dari form
  const snOntEl   = document.getElementById('sn-ont-select');
  const snKabelEl = document.getElementById('sn-kabel-select');
  const snOnt   = snOntEl   ? snOntEl.value   : '-';
  const snKabel = snKabelEl ? snKabelEl.value  : '-';
  const woId    = activeWoId || '--';
  const task    = myPickedTasks.find(t => t.woId === woId);
  const pelanggan = task ? task.customer : '';

  // Simpan ke Supabase + mulai polling
  if(typeof supa !== 'undefined') {
    supa.from('provisioning_requests').insert({
      wo_id:        woId,
      teknisi_name: currentUser ? currentUser.displayName : '',
      pelanggan:    pelanggan,
      sn_ont:       snOnt || '-',
      sn_kabel:     snKabel || '-',
      status:       'PENDING'
    }).select('id').then(({data, error}) => {
      if(error) {
        console.warn('Provisioning tidak tersimpan:', error.message);
        return;
      }
      console.log('[Provisioning] Request terkirim ke DB untuk WO:', woId);
      const insertedId = data && data[0] ? data[0].id : null;
      if(insertedId) startPollingProvisioning(insertedId, statusEl);
    });
  }
}

// Polling cek status provisioning setiap 5 detik
let _provisioningPollInterval = null;
function startPollingProvisioning(id, statusEl) {
  if(_provisioningPollInterval) clearInterval(_provisioningPollInterval);
  _provisioningPollInterval = setInterval(async () => {
    try {
      const { data } = await supa
        .from('provisioning_requests')
        .select('status')
        .eq('id', id)
        .maybeSingle();
      if(data && data.status === 'DONE') {
        clearInterval(_provisioningPollInterval);
        _provisioningPollInterval = null;
        // Toast notif
        if(typeof showToast === 'function')
          showToast('Provisioning Selesai ✅', 'Pelanggan berhasil diaktifkan oleh Admin.', 'success', 6000);
        // Update status card
        if(statusEl) {
          statusEl.dataset.status='DONE';
          statusEl.className = 'flex items-center gap-3 p-3 rounded-xl border bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800';
          statusEl.innerHTML = '<i class="fa-solid fa-circle-check text-emerald-500 text-xl"></i><div><p class="text-xs font-extrabold text-emerald-700 dark:text-emerald-300">Provisioning Selesai ✅</p><p class="text-[11px] text-slate-500">Pelanggan berhasil diaktifkan oleh Admin.</p></div>';
        }
        const submitBtn=document.getElementById('btn-submit-aktivasi');
        if(submitBtn) submitBtn.disabled=false;
      }
    } catch(e) { /* silent */ }
  }, 5000);
}
function completeProvisioning(woId){
  showAlert('Provisioning '+woId+' selesai. Notifikasi terkirim ke teknisi.','Selesai');
  document.getElementById('provisioning-queue-list').innerHTML='<div class="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800"><i class="fa-solid fa-circle-check text-emerald-500 text-2xl"></i><div><p class="text-xs font-extrabold text-emerald-700 dark:text-emerald-300">'+woId+' — Provisioning Selesai</p><p class="text-[11px] text-slate-400">Pelanggan berhasil diaktifkan.</p></div></div>';
}