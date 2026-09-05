// ===================== SUPABASE INTEGRATION =====================
const SUPABASE_URL = 'https://pasmdewdganfgdnntwam.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhc21kZXdkZ2FuZmdkbm50d2FtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5Njc3OTgsImV4cCI6MjEwMzU0Mzc5OH0.3NKjbhz0IzVAjMGOGlnvyWptDyNPejzrbIYD1QNT-2U';
const supa = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── LOGIN ─────────────────────────────────────────────────────
async function handleLogin(e) {
  e.preventDefault();
  const u = document.getElementById('login-username').value.trim().toLowerCase();
  const p = document.getElementById('login-password').value;
  const err = document.getElementById('login-error');
  const btn = document.getElementById('btn-login');
  btn.innerHTML = '<i class="fa-solid fa-spinner animate-spin"></i><span>Masuk...</span>';
  btn.disabled = true;
  const doLogin = (acc) => {
    if (!acc) {
      document.getElementById('login-error-msg').textContent = 'Username atau password salah.';
      err.classList.remove('hidden');
      document.getElementById('login-password').value = '';
    } else {
      err.classList.add('hidden');
      currentUser = acc;
      sessionStorage.setItem('sinu_user', JSON.stringify(acc));
      document.getElementById('login-form').reset();
      loadMainApp();
    }
    btn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i><span>Masuk ke Sistem</span>';
    btn.disabled = false;
  };
  try {
    const { data, error } = await supa.from('akun').select('*').ilike('username', u).maybeSingle();
    console.log('LOGIN DEBUG:', { u, queryData: data, queryError: error });
    if (!error && data) {
      console.log('PASSWORD CHECK:', { input: p, stored: data.password, match: data.password === p });
      if (data.password !== p) { doLogin(null); return; }
      doLogin({
        username: data.username,
        role: data.role ? data.role.toLowerCase() : 'teknisi',
        displayName: data.display_name || data.username,
        avatar: data.avatar || data.username.substring(0,2).toUpperCase(),
        division: data.division || '',
        photoUrl: data.avatar_url || null
      });
    } else {
      console.log('Supabase no data, trying local...');
      const acc = ACCOUNTS.find(a => a.username === u && a.password === p);
      doLogin(acc || null);
    }
  } catch(e) {
    console.error('Login error:', e);
    const acc = ACCOUNTS.find(a => a.username === u && a.password === p);
    doLogin(acc || null);
  }
}

// ── LOAD DATA dari Supabase ───────────────────────────────────
async function loadODPFromSupabase() {
  try {
    const { data, error } = await supa.from('odp').select('*').order('odp_id');
    if (!error && data && data.length) {
      odpMaster = data.map(o => ({ id: o.odp_id, lokasi: o.lokasi, kapasitas: o.kapasitas, terisi: o.terisi, lat: o.lat || 0, lng: o.lng || 0 }));
      renderODPGrid();
    }
  } catch(e) { console.warn('ODP load fallback'); }
}

async function loadKaryawanFromSupabase() {
  try {
    const { data, error } = await supa.from('karyawan').select('*').order('nama');
    if (!error && data && data.length) {
      employeeMaster = data.map(k => ({ id: k.avatar || k.nama.substring(0,2).toUpperCase(), name: k.nama, role: k.role, daily:{hariKerja:1,hadir:0,tepatWaktu:0,terlambat:0,izinSakit:0,izinCuti:0}, weekly:{hariKerja:7,hadir:0,tepatWaktu:0,terlambat:0,izinSakit:0,izinCuti:0}, monthly:{hariKerja:30,hadir:0,tepatWaktu:0,terlambat:0,izinSakit:0,izinCuti:0} }));
      populateEmployeeDropdowns();
    }
  } catch(e) { console.warn('Karyawan load fallback'); }
}

async function loadWOFromSupabase() {
  try {
    const { data, error } = await supa.from('work_orders').select('*').order('created_at', { ascending: false });
    if (!error && data && data.length) {
      kpiWOData = data.map(d => ({ id: d.wo_id, pelanggan: d.pelanggan, tipe: d.tipe, cs: d.cs_name, teknisi: d.teknisi || [], t1: d.t1, t2: d.t2, t4: d.t4, status: d.status, bulan: d.bulan, tahun: d.tahun }));
    }
  } catch(e) { console.warn('WO load fallback'); }
}

// ── SIMPAN ke Supabase ────────────────────────────────────────
async function simpanAbsensiKeSupabase(payload) {
  try {
    await supa.from('absensi').insert({ nama: payload.nama, role: payload.role, shift: payload.shift, status_kehadiran: payload.statusKehadiran, mnt_terlambat: payload.mntTerlambat || 0, point: payload.point || 0, lat: payload.lat || null, lng: payload.lng || null, tanggal: new Date().toISOString().substring(0, 10) });
  } catch(e) { console.warn('Absensi tidak tersimpan:', e); }
}

async function simpanWOKeSupabase(woData) {
  try {
    await supa.from('work_orders').insert({ wo_id: woData.id, pelanggan: woData.pelanggan, tipe: woData.tipe, cs_name: woData.cs, teknisi: woData.teknisi || [], t1: woData.t1, t2: woData.t2, t4: woData.t4 || null, status: woData.status || 'RELEASE', bulan: woData.bulan, tahun: woData.tahun, alamat: woData.alamat || '' });
  } catch(e) { console.warn('WO tidak tersimpan:', e); }
}

async function updateStatusWO(woId, status, t4 = null) {
  try {
    const update = { status };
    if (t4) update.t4 = t4;
    await supa.from('work_orders').update(update).eq('wo_id', woId);
  } catch(e) { console.warn('Update WO gagal:', e); }
}

async function simpanODPKeSupabase(odp) {
  try {
    await supa.from('odp').upsert({ odp_id: odp.id, lokasi: odp.lokasi, kapasitas: odp.kapasitas, terisi: odp.terisi, lat: odp.lat, lng: odp.lng });
  } catch(e) { console.warn('ODP tidak tersimpan:', e); }
}

async function simpanKaryawanKeSupabase(nama, role) {
  try {
    await supa.from('karyawan').insert({ nama, role, avatar: nama.substring(0,2).toUpperCase() });
  } catch(e) { console.warn('Karyawan tidak tersimpan:', e); }
}

// ── LOAD SEMUA DATA ───────────────────────────────────────────
async function loadAllDataFromSupabase() {
  await Promise.all([loadODPFromSupabase(), loadKaryawanFromSupabase(), loadWOFromSupabase()]);
  updateDashboardStats();
  if(typeof updateTopEmployee==='function') updateTopEmployee();
  updateRecapTable(); renderMainChart(); renderDonutChart(); renderPodium(); renderKPIKlasemen(); renderODPGrid();
  renderPickupListFromDB();
}

// ── LOAD & RENDER LIST PERANGKAT ──────────────────────────────
// Versi lengkap dengan filter ONT/Kabel ada di supabase-extended.js

// ── HOOK: panggil Supabase saat initApp ───────────────────────
document.addEventListener('DOMContentLoaded', function() {
  var checkInterval = setInterval(function() {
    if (typeof currentUser !== 'undefined') { clearInterval(checkInterval); }
  }, 100);
});

// ── BUAT WO ───────────────────────────────────────────────────
// Helper: ambil nilai field berdasarkan tipe WO
function getWOFields(tipe) {
  var pelanggan='', alamat='', nohp='', extra={};
  if(tipe==='INSTALASI') {
    pelanggan = (document.getElementById('wo-pelanggan')||{value:''}).value;
    alamat    = (document.getElementById('wo-alamat')||{value:''}).value;
    nohp      = (document.getElementById('wo-nohp')||{value:''}).value;
    extra = {
      registrasi: parseFloat((document.getElementById('wo-registrasi')||{value:0}).value)||0,
      paket:       parseFloat((document.getElementById('wo-paket')||{value:0}).value)||0,
      nama_paket:  (document.getElementById('wo-nama-paket')||{value:''}).value,
      total:       parseFloat((document.getElementById('wo-total')||{value:0}).value)||0,
      marketing:   (document.getElementById('wo-marketing')||{value:''}).value,
      koordinat:   (document.getElementById('wo-koordinat-instalasi')||{value:''}).value,
      username_pppoe: (document.getElementById('wo-username-pppoe')||{value:''}).value,
      password_pppoe: (document.getElementById('wo-password-pppoe')||{value:''}).value,
      status_koneksi: (document.getElementById('wo-status-koneksi')||{value:'Rumahan'}).value
    };
  } else if(tipe==='INSTALASI_RESELLER') {
    pelanggan = (document.getElementById('wo-nama-reseller')||{value:''}).value;
    alamat    = (document.getElementById('wo-alamat-reseller')||{value:''}).value;
    nohp      = (document.getElementById('wo-nohp-reseller')||{value:''}).value;
    extra = {
      registrasi:       parseFloat((document.getElementById('wo-registrasi-reseller')||{value:250000}).value)||250000,
      paket:            parseFloat((document.getElementById('wo-paket-voucher')||{value:240000}).value)||240000,
      total:            parseFloat((document.getElementById('wo-total-reseller')||{value:0}).value)||0,
      marketing:        (document.getElementById('wo-marketing-reseller')||{value:''}).value,
      koordinat:        (document.getElementById('wo-koordinat-reseller')||{value:''}).value,
      status_koneksi:   (document.getElementById('wo-status-koneksi-reseller')||{value:'Reseller'}).value
    };
  } else if(tipe==='PERLUASAN_RESELLER') {
    pelanggan = (document.getElementById('wo-pelanggan-perluasan')||{value:''}).value;
    alamat    = (document.getElementById('wo-alamat-perluasan')||{value:''}).value;
    extra = {
      nama_reseller:  (document.getElementById('wo-reseller-perluasan')||{value:''}).value,
      jumlah_titik:   parseInt((document.getElementById('wo-titik-perluasan')||{value:1}).value)||1,
      koordinat:      (document.getElementById('wo-koordinat-perluasan')||{value:''}).value
    };
  } else if(tipe==='MAINTENANCE') {
    pelanggan = (document.getElementById('wo-pelanggan-maint')||{value:''}).value;
    alamat    = (document.getElementById('wo-alamat-maint')||{value:''}).value;
    extra = {
      koordinat: (document.getElementById('wo-koordinat-maint')||{value:''}).value,
      kendala:   (document.getElementById('wo-kendala-maint')||{value:''}).value
    };
  }
  if(!pelanggan) {
    var fb = (document.getElementById('wo-pelanggan')||{value:''}).value;
    if(fb) pelanggan = fb;
  }
  if(!alamat) {
    var fb2 = (document.getElementById('wo-alamat')||{value:''}).value;
    if(fb2) alamat = fb2;
  }
  return {pelanggan, alamat, nohp, extra};
}

// Helper: validasi minimal per tipe
function validateWOFields(tipe, fields) {
  if(!fields.pelanggan) { showAlert('Nama pelanggan wajib diisi.','Validasi'); return false; }
  if(!fields.alamat) { showAlert('Alamat wajib diisi.','Validasi'); return false; }
  if(!fields.extra.koordinat || !fields.extra.koordinat.trim()) {
    showAlert('Titik koordinat wajib diisi.\nKlik ikon 🎯 untuk deteksi otomatis atau input manual.','Koordinat Wajib');
    return false;
  }
  if(tipe==='MAINTENANCE' && !fields.extra.kendala) { showAlert('Kendala wajib diisi untuk WO Maintenance.','Validasi'); return false; }
  if(tipe==='PERLUASAN_RESELLER' && !fields.extra.nama_reseller) { showAlert('Nama reseller wajib diisi.','Validasi'); return false; }
  return true;
}

async function handleCreateTaskWithDB(e) {
  e.preventDefault();
  var t1   = document.getElementById('wo-t1-time').value;
  var tipe = document.getElementById('wo-tipe').value;
  console.log('[WO] Tipe yang dipilih:', tipe);
  if(!t1){showAlert('Harap input jam permintaan masuk (T1).','T1 Wajib Diisi');return;}

  var fields = getWOFields(tipe);
  if(!validateWOFields(tipe, fields)) return;

  var now=new Date(), t2=now.toTimeString().substring(0,5), bulan=now.getMonth(), tahun=now.getFullYear();
  var tanggal = now.toISOString().substring(0,10);
  var woId='WO-'+String(tahun).slice(-2)+String(now.getMonth()+1).padStart(2,'0')+String(now.getDate()).padStart(2,'0')+'-'+String(Math.floor(Math.random()*900)+100);
  var dur=selisihMenit(t1,t2), poin=hitungPointAdmin(Math.max(0,dur||0));

  // Semua WO → status RELEASE. Maintenance difilter di sisi NOC (tipe=MAINTENANCE)
  var statusAwal = 'RELEASE';

  var pelanggan=fields.pelanggan, alamat=fields.alamat;
  var woData={id:woId,pelanggan,tipe,cs:currentUser.displayName,teknisi:[],t1,t2,t4:null,status:statusAwal,bulan,tahun,alamat};
  kpiWOData.push(woData);

  var insertData = {
    wo_id: woId, pelanggan, tipe,
    cs_name: currentUser.displayName,
    teknisi: [], t1, t2, t4: null,
    status: statusAwal,
    bulan, tahun, alamat: alamat||'',
    tanggal,
    no_hp:     fields.nohp||null,
    kendala:   fields.extra.kendala||null,
    koordinat: fields.extra.koordinat||null,
    registrasi: fields.extra.registrasi||null,
    paket:      fields.extra.paket||null,
    nama_paket: fields.extra.nama_paket||null,
    total:      fields.extra.total||null,
    marketing:  fields.extra.marketing||null,
    status_koneksi: fields.extra.status_koneksi||null,
    nama_reseller:  fields.extra.nama_reseller||null,
    jumlah_titik:   fields.extra.jumlah_titik||null,
    sn_ap:          fields.extra.sn_ap||null,
    jenis_kabel:    fields.extra.jenis_kabel||null,
    meter_kabel:    fields.extra.meter_kabel||null,
    username_pppoe: fields.extra.username_pppoe||null,
    password_pppoe: fields.extra.password_pppoe||null
  };

  console.log('[WO] Menyimpan ke Supabase:', insertData);
  console.log('[WO] Status awal:', statusAwal, 'Tipe:', tipe);
  var res = await supa.from('work_orders').insert(insertData);
  if(res.error) { console.error('[WO] Gagal simpan:', res.error); showAlert('Gagal simpan WO: '+res.error.message,'Error'); return; }
  console.log('[WO] Berhasil simpan dengan status:', statusAwal);

  // Simpan foto/video kendala maintenance ke Supabase Storage
  if(tipe === 'MAINTENANCE') {
    showLoading('Mengupload media kendala...');
    var uploadedMedia = await uploadMediaKendalaToStorage(woId);
    if(uploadedMedia.length) {
      // Simpan URL ke wo_photos
      for(var um of uploadedMedia) {
        try {
          await supa.from('wo_photos').insert({
            wo_id: woId, step: 'kendala',
            key: um.type === 'video' ? 'video' : 'foto',
            label: um.name,
            photo_base64: um.url  // reuse kolom sebagai URL storage
          });
        } catch(e) { console.warn('Gagal simpan record media:', e.message); }
      }
    }
    clearMediaKendala();
    hideLoading();
  }
  document.dispatchEvent(new Event('wo-created'));
  if(typeof renderPickupListFromDB==='function') renderPickupListFromDB();
  if(typeof refreshAdminTicketList==='function') refreshAdminTicketList();
  if(statusAwal==='NOC' && typeof loadNOCTasks==='function') {
    setTimeout(function(){ loadNOCTasks(); }, 500);
  }
  var msgTipe = {INSTALASI:'Instalasi Baru',INSTALASI_RESELLER:'Instalasi Reseller',PERLUASAN_RESELLER:'Perluasan Reseller',MAINTENANCE:'Maintenance (→ NOC)'};
  showAlert('Tiket '+woId+' berhasil dibuat!\nTipe: '+(msgTipe[tipe]||tipe)+'\nT1: '+t1+' T2: '+t2+'\nDurasi: '+Math.max(0,dur||0)+' mnt\nPoin Admin: '+poin,'WO Dibuat');
  e.target.reset();
  onWoTipeChange(); // reset tampilan field
  if(typeof initBuatWOForm==='function') initBuatWOForm();
}
window.handleCreateTask = handleCreateTaskWithDB;

// ── ODP ───────────────────────────────────────────────────────
async function addODPWithDB(e) {
  e.preventDefault();
  var id=document.getElementById('odp-id-input').value.trim().toUpperCase(), lokasi=document.getElementById('odp-lokasi-input').value.trim(), kapasitas=parseInt(document.getElementById('odp-kapasitas-input').value)||8, terisi=parseInt(document.getElementById('odp-terisi-input').value)||0, lat=parseFloat(document.getElementById('odp-lat-input').value)||0, lng=parseFloat(document.getElementById('odp-lng-input').value)||0;
  if(odpMaster.find(function(o){return o.id===id;})){showAlert('ODP dengan ID ini sudah ada!');return;}
  var newODP={id,lokasi,kapasitas,terisi,lat,lng};
  odpMaster.push(newODP); renderODPGrid();
  await simpanODPKeSupabase(newODP);
  document.getElementById('add-odp-modal').classList.add('hidden'); e.target.reset(); showAlert('ODP '+id+' berhasil ditambahkan.','ODP Tersimpan');
}
window.addODP = addODPWithDB;

// ── TAMBAH PERANGKAT ──────────────────────────────────────────
async function handleAddDeviceWithDB(e) {
  e.preventDefault();
  var form = e.target;
  var sn = (document.getElementById('perangkat-sn') || form.querySelector('input[type="text"]')).value.trim().toUpperCase();
  var merk = (document.getElementById('perangkat-merk') || {value:''}).value.trim();
  var jenis = (document.getElementById('perangkat-jenis') || form.querySelectorAll('select')[0]) ? (document.getElementById('perangkat-jenis') || form.querySelectorAll('select')[0]).value : '';
  var kondisi = (document.getElementById('perangkat-kondisi') || form.querySelectorAll('select')[1]) ? (document.getElementById('perangkat-kondisi') || form.querySelectorAll('select')[1]).value : '';
  var isKabel = jenis && jenis.toLowerCase().includes('kabel');
  var panjang = isKabel ? (parseFloat((document.getElementById('perangkat-panjang')||{value:0}).value)||0) : null;
  if (!sn) { showAlert('Serial Number tidak boleh kosong.'); return; }
  if (!merk) { showAlert('Merk / Model tidak boleh kosong.'); return; }
  if (isKabel && (!panjang || panjang <= 0)) { showAlert('Masukkan panjang kabel yang valid (> 0 meter).','Panjang Wajib'); return; }
  var btn = form.querySelector('button[type="submit"]');
  var origHtml = btn.innerHTML;
  btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner animate-spin"></i> Menyimpan...';
  try {
    var existing = await supa.from('perangkat').select('sn,kondisi,status').eq('sn', sn).maybeSingle();
    if (existing.data) {
      showAlert('SN "'+sn+'" sudah terdaftar!\nKondisi: '+existing.data.kondisi+'\nLokasi: '+(existing.data.status||'Gudang'), 'SN Sudah Ada');
      btn.disabled = false; btn.innerHTML = origHtml; return;
    }
    var insertRow = { sn, merk, jenis, kondisi, status: 'Gudang', lokasi: 'Gudang Utama' };
    if(isKabel) { insertRow.panjang_awal = panjang; insertRow.panjang_sisa = panjang; }
    var res = await supa.from('perangkat').insert(insertRow);
    if (res.error) throw res.error;
    var msg = isKabel ? 'Kabel '+sn+' ('+panjang+'m) berhasil ditambahkan.' : 'Perangkat '+sn+' berhasil ditambahkan.';
    showAlert(msg, 'Tersimpan');
    form.reset();
    var wrap = document.getElementById('perangkat-panjang-wrap');
    if(wrap) wrap.classList.add('hidden');
    if(typeof loadAndRenderListPerangkat==='function') await loadAndRenderListPerangkat();
  } catch(err) {
    showAlert('Gagal menyimpan: '+(err.message||''), 'Error');
  }
  btn.disabled = false; btn.innerHTML = origHtml;
}
window.handleAddDevice = handleAddDeviceWithDB;

// Show/hide input panjang kabel saat admin isi form tambah perangkat
function togglePanjangKabelInput() {
  var jenis = (document.getElementById('perangkat-jenis')||{value:''}).value;
  var wrap = document.getElementById('perangkat-panjang-wrap');
  var inp  = document.getElementById('perangkat-panjang');
  if(!wrap) return;
  var isKabel = jenis && jenis.toLowerCase().includes('kabel');
  if(isKabel) { wrap.classList.remove('hidden'); if(inp) inp.required = true; }
  else        { wrap.classList.add('hidden');    if(inp) inp.required = false; }
}

// ── REFRESH LIST TIKET ADMIN ──────────────────────────────────
var _adminTicketData = [];

async function refreshAdminTicketList() {
  var el = document.getElementById('admin-ticket-list');
  if (!el) return;
  el.innerHTML = '<p class="text-xs text-slate-400 text-center py-4"><i class="fa-solid fa-spinner animate-spin mr-2"></i>Memuat...</p>';

  var today = new Date().toISOString().substring(0, 10); // YYYY-MM-DD

  try {
    var res = await supa.from('work_orders')
      .select('wo_id,pelanggan,tipe,status,alamat,created_at,teknisi,verified,tanggal')
      .order('created_at', { ascending: false })
      .limit(200);
    var all = res.data || [];

    // Filter default: semua yang belum selesai (kapanpun) + yang selesai hari ini saja
    _adminTicketData = all.filter(function(t) {
      var tglWO = t.tanggal || (t.created_at ? t.created_at.substring(0,10) : '');
      if(t.status !== 'SELESAI') return true;       // belum selesai → selalu tampil
      return tglWO === today;                         // selesai → hanya tampil kalau hari ini
    });
  } catch(e) {
    _adminTicketData = [];
  }
  renderTicketList(_adminTicketData);
}

function filterTicketList() {
  var status = (document.getElementById('ticket-filter-status')||{value:'ALL'}).value;
  var tipe   = (document.getElementById('ticket-filter-tipe')||{value:'ALL'}).value;
  var date   = (document.getElementById('ticket-filter-date')||{value:''}).value;

  // Kalau ada filter tanggal → load semua tiket di tanggal itu dari DB
  if(date) {
    var el = document.getElementById('admin-ticket-list');
    if(el) el.innerHTML = '<p class="text-xs text-slate-400 text-center py-4"><i class="fa-solid fa-spinner animate-spin mr-2"></i>Memuat...</p>';
    supa.from('work_orders')
      .select('wo_id,pelanggan,tipe,status,alamat,created_at,teknisi,verified,tanggal')
      .or('tanggal.eq.'+date+',created_at.gte.'+date+'T00:00:00,created_at.lte.'+date+'T23:59:59')
      .order('created_at', {ascending: false})
      .then(function(res) {
        var filtered = (res.data||[]).filter(function(t) {
          var tglWO = t.tanggal || (t.created_at ? t.created_at.substring(0,10) : '');
          return tglWO === date;
        });
        if(status !== 'ALL') filtered = filtered.filter(function(t){return t.status===status;});
        if(tipe   !== 'ALL') filtered = filtered.filter(function(t){return t.tipe===tipe;});
        renderTicketList(filtered);
      });
    return;
  }

  // Tanpa filter tanggal → pakai data default (hari ini + belum selesai)
  var filtered = _adminTicketData;
  if(status !== 'ALL') filtered = filtered.filter(function(t){return t.status===status;});
  if(tipe   !== 'ALL') filtered = filtered.filter(function(t){return t.tipe===tipe;});
  renderTicketList(filtered);
}

function renderTicketList(tickets) {
  var el = document.getElementById('admin-ticket-list');
  if(!el) return;
  if(!tickets.length) { el.innerHTML = '<p class="text-xs text-slate-400 text-center py-6">Tidak ada tiket yang cocok.</p>'; return; }

  var sCls = { RELEASE:'bg-blue-100 text-blue-700', PICKUP:'bg-indigo-100 text-indigo-700', PROSES:'bg-amber-100 text-amber-700', SELESAI:'bg-emerald-100 text-emerald-700', RETURN:'bg-rose-100 text-rose-700' };
  var tCls = { INSTALASI:'bg-blue-50 border-blue-100', MAINTENANCE:'bg-amber-50 border-amber-100', PERLUASAN_RESELLER:'bg-teal-50 border-teal-100', INSTALASI_RESELLER:'bg-purple-50 border-purple-100' };

  function renderCard(t) {
    var tgl = t.created_at ? new Date(t.created_at).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'}) : '';
    var tek = Array.isArray(t.teknisi) ? t.teknisi.join(', ') : (t.teknisi||'');
    // Jangan tampilkan nama teknisi kalau status RELEASE (sudah di-return)
    if(t.status === 'RELEASE') tek = '';
    var isSelesai = t.status === 'SELESAI';
    var sc = sCls[t.status] || 'bg-slate-100 text-slate-600';
    var tc = tCls[t.tipe] || 'bg-slate-50 border-slate-200';
    var btn = isSelesai ? '<button onclick="showWODetail(\''+t.wo_id+'\')" class="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded-lg flex items-center gap-1"><i class="fa-solid fa-eye text-[9px]"></i>Lihat Detail</button>' : '';
    return '<div class="p-3 rounded-xl border space-y-1.5 '+tc+'">'
      +'<div class="flex items-center justify-between gap-1">'
      +'<span class="text-[10px] font-extrabold text-blue-600 font-mono">'+t.wo_id+'</span>'
      +'<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold '+sc+'">'+t.status+'</span>'
      +'</div>'
      +'<p class="text-xs font-bold text-slate-800">'+t.pelanggan+'</p>'
      +'<p class="text-[10px] text-slate-400">'+t.tipe+(t.alamat?' • '+t.alamat:'')+'</p>'
      +'<div class="flex items-center justify-between pt-0.5">'
      +'<p class="text-[10px] text-slate-400">'+tgl+(tek?' • '+tek:'')+'</p>'
      +btn+'</div></div>';
  }

  var aktif   = tickets.filter(function(t){return t.status!=='SELESAI';});
  var selesai = tickets.filter(function(t){return t.status==='SELESAI';});
  var html = '';
  if(aktif.length)   html += '<p class="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Tiket Aktif ('+aktif.length+')</p>' + aktif.map(renderCard).join('');
  if(selesai.length) html += '<div class="border-t border-slate-100 pt-3 mt-3"><p class="text-[10px] font-extrabold text-emerald-600 uppercase tracking-wider mb-1.5">Selesai ('+selesai.length+')</p>'+selesai.map(renderCard).join('')+'</div>';
  el.innerHTML = html;
}

// Override initBuatWOForm
var _origInitBuatWOForm = typeof initBuatWOForm === 'function' ? initBuatWOForm : null;
function initBuatWOFormWithRefresh() {
  if (_origInitBuatWOForm) _origInitBuatWOForm();
  refreshAdminTicketList();
}
window.initBuatWOForm = initBuatWOFormWithRefresh;

// Override addNewEmployee
async function addNewEmployeeWithDB(e) {
  e.preventDefault();
  var name=document.getElementById('newEmpName').value.trim(), role=document.getElementById('newEmpRole').value, btn=document.getElementById('btn-save-emp');
  if(!name){showAlert('Nama tidak boleh kosong.');return;}
  if(employeeMaster.some(function(x){return x.name.toLowerCase()===name.toLowerCase();})){showAlert('Karyawan sudah ada!');return;}
  btn.disabled=true; btn.innerText='Saving...';
  employeeMaster.push({id:generateInitials(name),name,role,daily:{hariKerja:1,hadir:0,tepatWaktu:0,terlambat:0,izinSakit:0,izinCuti:0},weekly:{hariKerja:7,hadir:0,tepatWaktu:0,terlambat:0,izinSakit:0,izinCuti:0},monthly:{hariKerja:30,hadir:0,tepatWaktu:0,terlambat:0,izinSakit:0,izinCuti:0}});
  populateEmployeeDropdowns(); updateRecapTable(); updateDashboardStats();
  await simpanKaryawanKeSupabase(name, role);
  btn.disabled=false; btn.innerText='Simpan'; closeAddEmployeeModal(); showAlert('Berhasil menambahkan: '+name);
}
window.addNewEmployee = addNewEmployeeWithDB;

// Override handleFormSubmit (absensi)
var _origHandleFormSubmit = window.handleFormSubmit;
window.handleFormSubmitWithDB = async function(event) {
  if(_origHandleFormSubmit) _origHandleFormSubmit(event);
  var empName = document.getElementById('employeeName').value;
  var role = document.getElementById('selectedRole').value;
  var shift = document.getElementById('selectedShift').value;
  var res2 = cekKeterlambatan();
  var point = hitungPointKehadiran(res2.statusKehadiran, res2.mntLate, '', false);
  await simpanAbsensiKeSupabase({ nama:empName, role, shift, statusKehadiran:res2.statusKehadiran, mntTerlambat:res2.mntLate, point, lat:locationData?locationData.lat:null, lng:locationData?locationData.lng:null });
};

// Load data saat halaman pertama kali dibuka
window.addEventListener('load', async function() {
  await loadAllDataFromSupabase();
});

// ── VERIFIKASI WO (Admin) ─────────────────────────────────────
function hitungDurasiMnt(t1, t2) {
  try {
    var m1 = t1.split(':').map(Number);
    var m2 = t2.split(':').map(Number);
    return Math.max(0, (m2[0]*60+m2[1]) - (m1[0]*60+m1[1]));
  } catch(e) { return 0; }
}

async function showWODetail(woId) {
  var modal = document.getElementById('wo-detail-modal');
  var body  = document.getElementById('wo-detail-body');
  if(!modal || !body) return;
  body.innerHTML = '<p class="text-center py-6"><i class="fa-solid fa-spinner animate-spin text-blue-500 mr-2"></i>Memuat data...</p>';
  modal.classList.remove('hidden');
  try {
    var res = await supa.from('work_orders').select('*').eq('wo_id', woId).maybeSingle();
    if(res.error) throw res.error;
    var d = res.data;
    if(!d) { body.innerHTML = '<p class="text-center text-rose-500 text-xs py-4">Data tidak ditemukan.</p>'; return; }
    var tek = Array.isArray(d.teknisi) ? d.teknisi.join(', ') : (d.teknisi||'-');
    var tgl = d.created_at ? new Date(d.created_at).toLocaleString('id-ID',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '-';
    var sCls = {SELESAI:'bg-emerald-100 text-emerald-700',RELEASE:'bg-blue-100 text-blue-700',PICKUP:'bg-indigo-100 text-indigo-700',PROSES:'bg-amber-100 text-amber-700',RETURN:'bg-rose-100 text-rose-700'};
    function row(label, val) {
      return '<div class="flex items-start justify-between py-2 border-b border-slate-100">'
        +'<span class="text-[11px] font-semibold text-slate-500 shrink-0 w-28">'+label+'</span>'
        +'<span class="text-[11px] font-medium text-slate-700 text-right flex-1">'+(val||'-')+'</span></div>';
    }
    var dur = d.t1 && d.t2 ? hitungDurasiMnt(d.t1, d.t2)+' mnt' : null;
    var sc = sCls[d.status] || 'bg-slate-100 text-slate-600';
    var html = '<div>'
      +'<div class="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">'
      +'<span class="text-sm font-black text-blue-600 font-mono">'+d.wo_id+'</span>'
      +'<span class="px-2.5 py-1 rounded-full text-[10px] font-extrabold '+sc+'">'+d.status+'</span>'
      +'</div>'
      +'<p class="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Info WO</p>'
      +row('Pelanggan', d.pelanggan)
      +row('Alamat', d.alamat)
      +row('Tipe', d.tipe)
      +row('Dibuat', tgl)
      +row('CS/Admin', d.cs_name)
      +row('Teknisi', tek)
      +'<p class="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mt-3 mb-1">Waktu</p>'
      +row('T1 (WA Masuk)', d.t1)
      +row('T2 (Tiket Dibuat)', d.t2)
      +row('T4 (Selesai)', d.t4||'-')
      +(dur ? row('Durasi T1 T2', dur) : '');
    if(d.tipe === 'INSTALASI' || d.tipe === 'INSTALASI_RESELLER') {
      html += '<p class="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mt-3 mb-1">Detail Instalasi</p>'
        +row('SN ONT', d.sn_ont) +row('SN Kabel', d.sn_kabel) +row('ODP', d.odp_id)
        +row('Username PPPOE', d.username_pppoe) +row('Password PPPOE', d.password_pppoe)
        +row('Status Koneksi', d.status_koneksi) +row('Panjang Kabel', d.panjang_kabel ? d.panjang_kabel+' meter' : null)
        +row('Catatan', d.catatan);
    } else if(d.tipe === 'MAINTENANCE') {
      html += '<p class="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mt-3 mb-1">Info Maintenance</p>'
        +row('Kendala', d.kendala)
        +row('Koordinat', d.koordinat);
      if(d.noc_name || d.diagnosa) {
        html += '<p class="text-[10px] font-extrabold text-violet-500 uppercase tracking-wider mt-3 mb-1 flex items-center gap-1.5"><i class="fa-solid fa-headset"></i> Penanganan NOC</p>'
          +row('NOC', d.noc_name)
          +row('Diagnosa', d.diagnosa)
          +row('Penanganan', d.penanganan);
      }
      if(d.sn_ont || d.sn_kabel) {
        html += '<p class="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mt-3 mb-1">Perangkat Diganti Teknisi</p>'
          +row('SN ONT', d.sn_ont) +row('SN Kabel', d.sn_kabel)
          +row('Panjang Kabel', d.panjang_kabel ? d.panjang_kabel+' meter' : null);
      }
    } else if(d.tipe === 'PERLUASAN_RESELLER') {
      html += '<p class="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mt-3 mb-1">Detail Perluasan</p>'
        +row('Reseller', d.nama_reseller)
        +row('Jumlah Titik', d.jumlah_titik)
        +row('SN ONT / AP', d.sn_ont||d.sn_ap)
        +row('SN Kabel', d.sn_kabel)
        +row('Jenis Kabel', d.jenis_kabel)
        +row('Meter Kabel', d.meter_kabel ? d.meter_kabel+' m' : null)
        +row('Panjang Terpakai', d.panjang_kabel ? d.panjang_kabel+' m' : null);
    } else if(d.catatan) {
      html += '<p class="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mt-3 mb-1">Catatan</p>'+row('Catatan', d.catatan);
    }
    html += '<div class="mt-4 pt-3 border-t border-slate-100">';
    if(d.verified) {
      html += '<div class="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-200"><i class="fa-solid fa-circle-check text-emerald-500"></i><p class="text-xs font-extrabold text-emerald-700">Sudah Diverifikasi</p></div>';
    } else {
      html += '<button onclick="verifikasiWO(\''+d.wo_id+'\')" class="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow-md"><i class="fa-solid fa-circle-check"></i>Tandai Sudah Diverifikasi</button>';
    }
    html += '</div>';

    // Load foto dari DB
    html += '<p class="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mt-4 mb-2">Foto Dokumentasi</p>';
    html += '<div id="wo-photos-container"><p class="text-xs text-slate-400 text-center py-2"><i class="fa-solid fa-spinner animate-spin mr-1"></i>Memuat foto...</p></div>';
    html += '</div>';
    body.innerHTML = html;

    // Load foto setelah render
    loadWOPhotos(d.wo_id);
  } catch(e) {
    body.innerHTML = '<p class="text-center text-rose-500 text-xs py-4">Error: '+e.message+'</p>';
  }
}

async function verifikasiWO(woId) {
  try {
    await supa.from('work_orders').update({ verified: true }).eq('wo_id', woId);
    showToast('WO Terverifikasi', woId+' berhasil diverifikasi.', 'success');
    showWODetail(woId);
    refreshAdminTicketList();
  } catch(e) {
    showAlert('Gagal verifikasi: '+e.message, 'Error');
  }
}

// ── LOAD FOTO WO ─────────────────────────────────────────────
async function loadWOPhotos(woId) {
  var container = document.getElementById('wo-photos-container');
  if(!container) return;
  try {
    var res = await supa.from('wo_photos').select('key,label,step,photo_base64').eq('wo_id', woId).order('step').order('key');
    var photos = res.data || [];
    if(!photos.length) {
      container.innerHTML = '<p class="text-xs text-slate-400 text-center py-3">Tidak ada foto yang dilampirkan.</p>';
      return;
    }
    // Group by step
    var byStep = {};
    photos.forEach(function(p) {
      var s = p.step || 'other';
      if(!byStep[s]) byStep[s] = [];
      byStep[s].push(p);
    });
    var html = '';
    var stepLabels = { step1:'Step 1 — Dokumentasi', step2:'Step 2 — Evidence Work Done' };
    Object.keys(byStep).forEach(function(step) {
      html += '<p class="text-[10px] font-bold text-slate-400 uppercase mt-2 mb-1">'+(stepLabels[step]||step)+'</p>';
      html += '<div class="grid grid-cols-3 gap-1.5">';
      byStep[step].forEach(function(p) {
        html += '<div class="space-y-0.5">'
          +'<div class="aspect-square rounded-lg overflow-hidden bg-slate-100 border border-slate-200 cursor-pointer" onclick="openPhotoFullscreen(\''+p.photo_base64+'\')">'
          +'<img src="'+p.photo_base64+'" class="w-full h-full object-cover" alt="'+p.label+'">'
          +'</div>'
          +'<p class="text-[9px] text-center text-slate-400 font-semibold truncate">'+p.label+'</p>'
          +'</div>';
      });
      html += '</div>';
    });
    container.innerHTML = html;
  } catch(e) {
    container.innerHTML = '<p class="text-xs text-slate-400 text-center py-2">Tabel foto belum tersedia.</p>';
  }
}

function openPhotoFullscreen(src) {
  var overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 bg-black/90 z-[999] flex items-center justify-center p-4';
  overlay.onclick = function() { overlay.remove(); };
  overlay.innerHTML = '<img src="'+src+'" class="max-w-full max-h-full rounded-xl object-contain">';
  document.body.appendChild(overlay);
}

// ── MEDIA KENDALA MAINTENANCE (Foto + Video) ─────────────────────────
var _mediaKendalaFiles = []; // array of File objects

function addMediaKendala() {
  document.getElementById('wo-media-kendala-input').click();
}

function onMediaKendalaChange(event) {
  var file = event.target.files[0];
  if(!file) return;
  event.target.value = '';

  // Validasi ukuran
  var isVideo = file.type.startsWith('video/');
  var maxSize = isVideo ? 30 * 1024 * 1024 : 5 * 1024 * 1024; // 30MB video, 5MB foto
  if(file.size > maxSize) {
    showAlert((isVideo ? 'Video' : 'Foto') + ' terlalu besar!\nMaksimal ' + (isVideo ? '30MB' : '5MB') + '.', 'File Terlalu Besar');
    return;
  }

  _mediaKendalaFiles.push(file);
  renderMediaKendalaList();
}

function renderMediaKendalaList() {
  var list = document.getElementById('wo-media-kendala-list');
  if(!list) return;
  if(!_mediaKendalaFiles.length) { list.innerHTML = ''; return; }

  list.innerHTML = _mediaKendalaFiles.map(function(f, i) {
    var isVideo = f.type.startsWith('video/');
    var url = URL.createObjectURL(f);
    var preview = isVideo
      ? '<video src="' + url + '" class="w-16 h-16 object-cover rounded-lg" muted></video>'
      : '<img src="' + url + '" class="w-16 h-16 object-cover rounded-lg">';
    var size = (f.size / 1024 / 1024).toFixed(1) + 'MB';
    return '<div class="flex items-center gap-3 bg-slate-50 dark:bg-slate-700/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-600">'
      + preview
      + '<div class="flex-1 min-w-0">'
        + '<p class="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate">' + f.name + '</p>'
        + '<p class="text-[10px] text-slate-400">' + (isVideo ? '<i class="fa-solid fa-video text-blue-500 mr-1"></i>Video' : '<i class="fa-solid fa-image text-emerald-500 mr-1"></i>Foto') + ' • ' + size + '</p>'
      + '</div>'
      + '<button type="button" onclick="removeMediaKendala(' + i + ')" class="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"><i class="fa-solid fa-xmark text-xs"></i></button>'
    + '</div>';
  }).join('');
}

function removeMediaKendala(index) {
  _mediaKendalaFiles.splice(index, 1);
  renderMediaKendalaList();
}

function clearMediaKendala() {
  _mediaKendalaFiles = [];
  renderMediaKendalaList();
}

async function uploadMediaKendalaToStorage(woId) {
  if(!_mediaKendalaFiles.length) return [];
  var uploaded = [];
  for(var i = 0; i < _mediaKendalaFiles.length; i++) {
    var file = _mediaKendalaFiles[i];
    var isVideo = file.type.startsWith('video/');
    var ext = file.name.split('.').pop() || (isVideo ? 'mp4' : 'jpg');
    var path = 'kendala/' + woId + '/' + Date.now() + '_' + i + '.' + ext;
    try {
      var res = await supa.storage.from('wo-media').upload(path, file, {
        cacheControl: '3600', upsert: false
      });
      if(res.error) throw res.error;
      var urlRes = supa.storage.from('wo-media').getPublicUrl(path);
      uploaded.push({ path, url: urlRes.data.publicUrl, type: isVideo ? 'video' : 'image', name: file.name });
    } catch(e) {
      console.warn('[Media] Gagal upload ' + file.name + ':', e.message);
    }
  }
  return uploaded;
}

// ── IMPORT PERANGKAT DARI EXCEL ──────────────────────────────────────
async function importPerangkatExcel(event) {
  var file = event && event.target ? event.target.files[0] : null;
  if(!file) {
    // fallback ke element
    var fileInput = document.getElementById('excel-perangkat');
    file = fileInput ? fileInput.files[0] : null;
  }
  if(!file) { showAlert('Pilih file Excel (.xlsx) terlebih dahulu.', 'Import'); return; }

  showLoading('Membaca file Excel...');
  try {
    var data = await file.arrayBuffer();
    var wb = XLSX.read(data, { type: 'array' });
    var ws = wb.Sheets[wb.SheetNames[0]];
    var rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    // Skip header row jika ada
    var dataRows = rows.filter(function(r) {
      var sn = String(r[0]||'').trim();
      return sn && sn.toLowerCase() !== 'sn' && sn.toLowerCase() !== 'serial number' && sn.toLowerCase() !== 'serial_number';
    });

    if(!dataRows.length) {
      hideLoading();
      showAlert('File kosong atau format tidak sesuai.\nPastikan format: SN | Jenis | Kondisi | Merk', 'Import Gagal');
      return;
    }

    showLoading('Mengimport ' + dataRows.length + ' data ke Supabase...');

    var berhasil = 0, gagal = 0, duplikat = 0;
    var errors = [];

    for(var i = 0; i < dataRows.length; i++) {
      var row = dataRows[i];
      var sn      = String(row[0]||'').trim().toUpperCase();
      var jenis   = String(row[1]||'').trim() || 'Modem/ONT';
      var kondisi = String(row[2]||'').trim() || 'Baru';
      var merk    = String(row[3]||'').trim() || '';

      if(!sn) continue;

      // Validasi kondisi
      var validKondisi = ['Baru', 'Dismantle', 'Rusak', 'Bekas Pakai'];
      if(!validKondisi.includes(kondisi)) kondisi = 'Baru';

      // Cek apakah SN sudah ada
      try {
        var check = await supa.from('perangkat').select('sn').eq('sn', sn).maybeSingle();
        if(check.data) { duplikat++; continue; }

        var insertRow = { sn, jenis, kondisi, merk, status: 'Gudang', lokasi: 'Gudang Utama' };

        // Kalau kabel, cek kolom panjang (kolom ke-5, index 4)
        var isKabel = jenis.toLowerCase().includes('kabel');
        if(isKabel) {
          var panjang = parseFloat(row[4]||0) || null;
          if(panjang && panjang > 0) {
            insertRow.panjang_awal = panjang;
            insertRow.panjang_sisa = panjang;
          }
        }

        var res = await supa.from('perangkat').insert(insertRow);
        if(res.error) { gagal++; errors.push('Row '+(i+2)+' ('+sn+'): '+res.error.message); }
        else berhasil++;

      } catch(e) {
        gagal++;
        errors.push('Row '+(i+2)+' ('+sn+'): '+e.message);
      }
    }

    hideLoading();
    if(typeof loadAndRenderListPerangkat==='function') loadAndRenderListPerangkat();
    if(fileInput) fileInput.value = '';

    var msg = '✅ Berhasil: '+berhasil+' perangkat\n';
    if(duplikat) msg += '⚠️ Duplikat (dilewati): '+duplikat+'\n';
    if(gagal)    msg += '❌ Gagal: '+gagal+'\n';
    if(errors.length) msg += '\nDetail error:\n' + errors.slice(0,3).join('\n');
    showAlert(msg, 'Hasil Import');

  } catch(e) {
    hideLoading();
    showAlert('Gagal membaca file: ' + e.message + '\nPastikan format file .xlsx', 'Error Import');
  }
}

// Download template Excel untuk import perangkat
function downloadTemplatePerangkat() {
  var templateData = [
    ['SN', 'Jenis', 'Kondisi', 'Merk/Model', 'Panjang (meter, khusus kabel)'],
    ['ONT-001', 'Modem/ONT', 'Baru', 'ZTE F609', ''],
    ['ONT-002', 'Modem/ONT', 'Baru', 'Huawei EG8145', ''],
    ['KBL-001', 'Kabel Dropcore', 'Baru', 'YOFC', '500'],
    ['KBL-002', 'Kabel RJ45', 'Baru', 'AMP', '200'],
  ];
  var ws = XLSX.utils.aoa_to_sheet(templateData);
  // Warna header
  ws['!cols'] = [{wch:18},{wch:18},{wch:15},{wch:20},{wch:28}];
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template Perangkat');
  XLSX.writeFile(wb, 'Template_Import_Perangkat.xlsx');
}
