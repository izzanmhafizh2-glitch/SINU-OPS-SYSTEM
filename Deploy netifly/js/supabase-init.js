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
      sinuSavePersistentSession(acc);
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
    if (error) throw error;
    kpiWOData = Array.isArray(data) ? data.map(d => {
      const legacy = Array.isArray(d.teknisi) ? d.teknisi : [];
      const anggota = [d.teknisi_1, d.teknisi_2].filter(Boolean);
      return { ...d, id: d.wo_id, pelanggan: d.pelanggan, tipe: d.tipe, cs: d.cs_name || d.cs || '',
        teknisi_1: d.teknisi_1 || legacy[0] || null,
        teknisi_2: d.teknisi_2 || legacy[1] || null,
        teknisi: anggota.length ? anggota : legacy,
        t1: d.t1, t2: d.t2, t4: d.t4,
        created_at: d.created_at || null, tanggal: d.tanggal || null,
        released_at: d.released_at || null, picked_up_at: d.picked_up_at || null, completed_at: d.completed_at || null,
        status: d.status, bulan: Number(d.bulan), tahun: Number(d.tahun) };
    }) : [];
  } catch(e) {
    kpiWOData = [];
    console.warn('WO load failed:', e);
  }
}

// ── SIMPAN ke Supabase ────────────────────────────────────────
async function simpanAbsensiKeSupabase(payload) {
  const now = new Date();
  const tanggal = now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');
  const { error } = await supa.from('absensi').insert({
    nama: payload.nama,
    role: payload.role,
    shift: payload.shift,
    status_kehadiran: payload.statusKehadiran,
    mnt_terlambat: payload.mntTerlambat || 0,
    point: payload.point || 0,
    lat: payload.lat || null,
    lng: payload.lng || null,
    tanggal
  });
  if(error) throw error;
}

async function simpanWOKeSupabase(woData) {
  try {
    const row = { wo_id: woData.id, pelanggan: woData.pelanggan, tipe: woData.tipe, cs_name: woData.cs, teknisi: woData.teknisi || [], teknisi_1: woData.teknisi_1 || null, teknisi_2: woData.teknisi_2 || null, t1: woData.t1, t2: woData.t2, t4: woData.t4 || null, released_at: woData.released_at || new Date().toISOString(), picked_up_at: woData.picked_up_at || null, completed_at: woData.completed_at || null, status: woData.status || 'RELEASE', bulan: woData.bulan, tahun: woData.tahun, alamat: woData.alamat || '' };
    let result = await supa.from('work_orders').insert(row);
    if(result.error && /released_at|completed_at|column/i.test(result.error.message||'')) {
      delete row.released_at;
      delete row.picked_up_at;
      delete row.completed_at;
      result = await supa.from('work_orders').insert(row);
    }
    if(result.error) throw result.error;
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
  // Sync karyawan dari tabel akun agar semua user masuk rekap
  if(typeof loadEmployeesFromAkun === 'function') await loadEmployeesFromAkun();
  updateDashboardStats();
  if(typeof updateTopEmployee==='function') updateTopEmployee();
  updateRecapTable(); renderMainChart(); renderDonutChart(); renderPodium(); renderKPIKlasemen(); renderODPGrid();
  if(typeof renderKPI==='function') renderKPI();
  if(typeof changeKPIPeriod==='function' && currentUser && currentUser.role==='supervisor') await changeKPIPeriod();
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
      registrasi: parseRupiahValue((document.getElementById('wo-registrasi')||{value:''}).value),
      paket:       parseRupiahValue((document.getElementById('wo-paket')||{value:''}).value),
      nama_paket:  (document.getElementById('wo-nama-paket')||{value:''}).value,
      total:       parseRupiahValue((document.getElementById('wo-total')||{value:''}).value),
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
      registrasi:       parseRupiahValue((document.getElementById('wo-registrasi-reseller')||{value:''}).value, 0),
      paket:            parseRupiahValue((document.getElementById('wo-paket-voucher')||{value:''}).value, 0),
      total:            parseRupiahValue((document.getElementById('wo-total-reseller')||{value:''}).value),
      marketing:        (document.getElementById('wo-marketing-reseller')||{value:''}).value,
      koordinat:        (document.getElementById('wo-koordinat-reseller')||{value:''}).value,
      status_koneksi:   (document.getElementById('wo-status-koneksi-reseller')||{value:'Reseller'}).value
    };
  } else if(tipe==='PERLUASAN_RESELLER') {
    pelanggan = (document.getElementById('wo-pelanggan-perluasan')||{value:''}).value;
    alamat    = (document.getElementById('wo-alamat-perluasan')||{value:''}).value;
    nohp      = (document.getElementById('wo-nohp-perluasan')||{value:''}).value;
    extra = {
      nama_reseller:  (document.getElementById('wo-reseller-perluasan')||{value:''}).value,
      jumlah_titik:   parseInt((document.getElementById('wo-titik-perluasan')||{value:0}).value)||0,
      koordinat:      (document.getElementById('wo-koordinat-perluasan')||{value:''}).value
    };
  } else if(tipe==='MAINTENANCE') {
    pelanggan = (document.getElementById('wo-pelanggan-maint')||{value:''}).value;
    alamat    = (document.getElementById('wo-alamat-maint')||{value:''}).value;
    nohp      = (document.getElementById('wo-nohp-maint')||{value:''}).value;
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

// Helper: validasi seluruh field yang diisi Admin berdasarkan tipe WO
function validateWOFields(tipe, fields) {
  const missing = (value, label) => {
    if(value === null || value === undefined || String(value).trim() === '') {
      showAlert(label+' wajib diisi.','Validasi WO');
      return true;
    }
    return false;
  };
  if(missing(fields.pelanggan,'Nama pelanggan/reseller') || missing(fields.nohp,'Nomor HP') || missing(fields.alamat,'Alamat') || missing(fields.extra.koordinat,'Titik koordinat')) return false;

  if(tipe==='INSTALASI') {
    if(!fields.extra.registrasi) { showAlert('Registrasi wajib diisi.','Validasi WO'); return false; }
    if(!fields.extra.paket) { showAlert('Paket Mbps wajib diisi.','Validasi WO'); return false; }
    if(missing(fields.extra.nama_paket,'Nama paket') || missing(fields.extra.marketing,'Marketing') || missing(fields.extra.username_pppoe,'Username PPPOE') || missing(fields.extra.password_pppoe,'Password PPPOE') || missing(fields.extra.status_koneksi,'Status koneksi')) return false;
  }
  if(tipe==='INSTALASI_RESELLER') {
    if(!fields.extra.registrasi) { showAlert('Registrasi reseller wajib diisi.','Validasi WO'); return false; }
    if(!fields.extra.paket) { showAlert('Paket voucher wajib diisi.','Validasi WO'); return false; }
    if(missing(fields.extra.marketing,'Marketing reseller') || missing(fields.extra.status_koneksi,'Status koneksi reseller')) return false;
  }
  if(tipe==='PERLUASAN_RESELLER') {
    if(missing(fields.extra.nama_reseller,'Nama reseller') || !fields.extra.jumlah_titik || missing(fields.nohp,'Nomor HP reseller')) return false;
  }
  if(tipe==='MAINTENANCE' && missing(fields.extra.kendala,'Keterangan kerusakan')) return false;
  return true;
}

async function handleCreateTaskWithDB(e) {
  e.preventDefault();
  var t1   = document.getElementById('wo-t1-time').value;
  var tipe = document.getElementById('wo-tipe').value;
  if(typeof syncWORequiredFields==='function') syncWORequiredFields(tipe);
  console.log('[WO] Tipe yang dipilih:', tipe);
  if(!t1){showAlert('Harap input jam permintaan masuk (T1).','T1 Wajib Diisi');return;}

  var fields = getWOFields(tipe);
  if(!validateWOFields(tipe, fields)) return;

  var now=new Date(), t2=now.toTimeString().substring(0,5), bulan=now.getMonth(), tahun=now.getFullYear();
  var tanggal = now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');
  var woId='WO-'+String(tahun).slice(-2)+String(now.getMonth()+1).padStart(2,'0')+String(now.getDate()).padStart(2,'0')+'-'+String(Math.floor(Math.random()*900)+100);
  var dur=selisihMenit(t1,t2), poin=hitungPointAdmin(Math.max(0,dur||0));

  // Semua WO → status RELEASE. Maintenance difilter di sisi NOC (tipe=MAINTENANCE)
  var statusAwal = 'RELEASE';

  var pelanggan=fields.pelanggan, alamat=fields.alamat;
  var woData={id:woId,pelanggan,tipe,cs:currentUser.displayName,teknisi:[],teknisi_1:null,teknisi_2:null,t1,t2,t4:null,released_at:now.toISOString(),picked_up_at:null,completed_at:null,status:statusAwal,bulan,tahun,alamat,no_hp:fields.nohp||null,...fields.extra};
  kpiWOData.push(woData);

  var insertData = {
    wo_id: woId, pelanggan, tipe,
    cs_name: currentUser.displayName,
    teknisi: [],
    teknisi_1: null,
    teknisi_2: null,
    t1, t2, t4: null,
    released_at: now.toISOString(),
    picked_up_at: null,
    completed_at: null,
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
  // Kompatibilitas sementara bila migration timestamp belum dijalankan.
  if(res.error && /released_at|completed_at|column/i.test(res.error.message||'')) {
    var legacyInsert = Object.assign({}, insertData);
    delete legacyInsert.released_at;
    delete legacyInsert.picked_up_at;
    delete legacyInsert.completed_at;
    res = await supa.from('work_orders').insert(legacyInsert);
  }
  if(res.error) { console.error('[WO] Gagal simpan:', res.error); showAlert('Gagal simpan WO: '+res.error.message,'Error'); return; }
  console.log('[WO] Berhasil simpan dengan status:', statusAwal);

  // Simpan foto/video kendala maintenance ke Supabase Storage
  if(tipe === 'MAINTENANCE') {
    showLoading('Mengupload media kendala...');
    var totalMedia = _mediaKendalaFiles.length;
    var uploadedMedia = await uploadMediaKendalaToStorage(woId);
    var savedMedia = 0;
    if(uploadedMedia.length) {
      // Simpan URL / base64 ke wo_photos
      for(var um of uploadedMedia) {
        try {
          var ins = await supa.from('wo_photos').insert({
            wo_id: woId, step: 'kendala',
            key: um.type === 'video' ? 'video' : 'foto',
            label: um.name,
            photo_base64: um.url  // reuse kolom sebagai URL storage atau base64
          });
          if(ins.error) throw ins.error;
          savedMedia++;
        } catch(e) { console.warn('Gagal simpan record media:', e.message); }
      }
    }
    clearMediaKendala();
    hideLoading();
    if(totalMedia > 0 && savedMedia < totalMedia) {
      showAlert('Sebagian media kendala gagal disimpan ('+savedMedia+'/'+totalMedia+').\nPeriksa koneksi/bucket Supabase "wo-media".','Media Kendala');
    }
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

function adminTicketDateKey(t) {
  if(t && t.created_at) {
    var created = new Date(t.created_at);
    if(!Number.isNaN(created.getTime())) {
      return created.getFullYear()+'-'+String(created.getMonth()+1).padStart(2,'0')+'-'+String(created.getDate()).padStart(2,'0');
    }
  }
  return t && t.tanggal ? String(t.tanggal).substring(0,10) : '';
}

function adminTodayDateKey() {
  var now = new Date();
  return now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');
}

async function refreshAdminTicketList() {
  var el = document.getElementById('admin-ticket-list');
  if (!el) return;
  el.innerHTML = '<p class="text-xs text-slate-400 text-center py-4"><i class="fa-solid fa-spinner animate-spin mr-2"></i>Memuat...</p>';

  try {
    var res = await supa.from('work_orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000);
    if(res.error) throw res.error;
    _adminTicketData = Array.isArray(res.data) ? res.data : [];
    applyAdminTicketFilters();
  } catch(e) {
    _adminTicketData = [];
    console.error('[List Tiket] Gagal memuat:', e);
    el.innerHTML = '<p class="text-xs text-rose-500 text-center py-4"><i class="fa-solid fa-circle-xmark mr-1"></i>Gagal memuat tiket: '+(e.message||'Periksa koneksi Supabase.')+'</p>';
  }
}

function applyAdminTicketFilters() {
  var status = (document.getElementById('ticket-filter-status')||{value:'ALL'}).value;
  var tipe   = (document.getElementById('ticket-filter-tipe')||{value:'ALL'}).value;
  var from   = (document.getElementById('ticket-filter-date-from')||{value:''}).value;
  var to     = (document.getElementById('ticket-filter-date-to')||{value:''}).value;
  if(from && to && from > to) {
    if(typeof showAlert==='function') showAlert('Tanggal mulai tidak boleh lebih besar dari tanggal akhir.','Filter Tanggal');
    return;
  }

  var today = adminTodayDateKey();
  var hasDateRange = Boolean(from || to);
  var filtered = _adminTicketData.filter(function(t) {
    if(status !== 'ALL' && t.status !== status) return false;
    if(tipe !== 'ALL' && t.tipe !== tipe) return false;

    var dateKey = adminTicketDateKey(t);
    // Tanpa rentang tanggal: tiket aktif selalu tampil; tiket selesai hanya yang selesai/tercatat hari ini.
    if(!hasDateRange && t.status === 'SELESAI' && dateKey !== today) return false;
    if(from && (!dateKey || dateKey < from)) return false;
    if(to && (!dateKey || dateKey > to)) return false;
    return true;
  });
  renderTicketList(filtered);
}

function filterTicketList() {
  applyAdminTicketFilters();
}

function resetTicketFilters() {
  var status = document.getElementById('ticket-filter-status');
  var tipe = document.getElementById('ticket-filter-tipe');
  var from = document.getElementById('ticket-filter-date-from');
  var to = document.getElementById('ticket-filter-date-to');
  if(status) status.value='ALL';
  if(tipe) tipe.value='ALL';
  if(from) from.value='';
  if(to) to.value='';
  if(_adminTicketData.length) applyAdminTicketFilters();
  else refreshAdminTicketList();
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
    // Badge RL Radius / No Layanan — hanya untuk tipe instalasi
    var rlBadge = '';
    var isInstalasi = ['INSTALASI','INSTALASI_RESELLER','PERLUASAN_RESELLER'].includes(t.tipe);
    if(isInstalasi) {
      if(t.rl_radius_done && t.no_layanan) {
        rlBadge = '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-100 text-emerald-700"><i class="fa-solid fa-id-card"></i>No. Layanan: '+t.no_layanan+'</span>';
      } else {
        rlBadge = '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-rose-100 text-rose-700"><i class="fa-solid fa-triangle-exclamation"></i>Belum Input RL Radius</span>';
      }
    }
    return '<div class="p-3 rounded-xl border space-y-1.5 '+tc+'">'
      +'<div class="flex items-center justify-between gap-1">'
      +'<span class="text-[10px] font-extrabold text-blue-600 font-mono">'+t.wo_id+'</span>'
      +'<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold '+sc+'">'+t.status+'</span>'
      +'</div>'
      +'<p class="text-xs font-bold text-slate-800">'+t.pelanggan+'</p>'
      +'<p class="text-[10px] text-slate-400">'+t.tipe+(t.alamat?' • '+t.alamat:'')+'</p>'
      +(rlBadge ? '<div>'+rlBadge+'</div>' : '')
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
      +row('WA Masuk', d.t1)
      +row('Tiket Dibuat', d.t2)
      +row('Selesai', d.t4||'-')
      +(dur ? row('Durasi Pengerjaan', dur) : '');
    if(d.tipe === 'INSTALASI' || d.tipe === 'INSTALASI_RESELLER') {
      html += '<p class="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mt-3 mb-1">Detail Instalasi</p>'
        +row('No. Layanan', d.no_layanan) +row('SN ONT', d.sn_ont) +row('SN Kabel', d.sn_kabel) +row('ODP', d.odp_id)
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
    if(res.error) throw res.error;
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

function _fileToDataURL(file) {
  return new Promise(function(resolve, reject) {
    var reader = new FileReader();
    reader.onload = function(e) { resolve(e.target.result); };
    reader.onerror = function() { reject(new Error('Gagal membaca file')); };
    reader.readAsDataURL(file);
  });
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
      console.warn('[Media] Gagal upload ke Storage ' + file.name + ':', e.message);
      // Fallback: simpan foto sebagai base64 agar tetap muncul di NOC.
      // Video tidak di-fallback karena base64 video terlalu besar untuk kolom teks.
      if(!isVideo) {
        try {
          var dataUrl = await _fileToDataURL(file);
          uploaded.push({ path: path, url: dataUrl, type: 'image', name: file.name });
        } catch(fe) {
          console.warn('[Media] Fallback base64 gagal ' + file.name + ':', fe.message);
        }
      }
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

// ── SEARCH & AUTO-FILL PELANGGAN (Maintenance & Dismantle) ────────────
var _searchTimeout = null;

// ── SEARCH RESELLER UNTUK PERLUASAN ───────────────────────────────
let _resellerSearchTimeout = null;

function escapeResellerHtml(value) {
  return String(value || '').replace(/[&<>"']/g, function(char) {
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char];
  });
}

async function searchResellerPerluasan(query) {
  clearTimeout(_resellerSearchTimeout);
  const dropdown = document.getElementById('wo-search-dropdown-reseller-perluasan');
  if(!dropdown) return;

  _resellerSearchTimeout = setTimeout(async function() {
    dropdown.innerHTML = '<p class="text-xs text-slate-400 text-center py-3"><i class="fa-solid fa-spinner animate-spin mr-1"></i>Memuat reseller...</p>';
    dropdown.classList.remove('hidden');
    try {
      const res = await supa.from('work_orders')
        .select('nama_reseller,pelanggan,no_hp,tipe,created_at')
        .in('tipe', ['INSTALASI_RESELLER', 'PERLUASAN_RESELLER'])
        .order('created_at', {ascending: false})
        .limit(500);
      if(res.error) throw res.error;

      const needle = (query || '').trim().toLowerCase();
      const byName = {};
      (res.data || []).forEach(function(row) {
        // Instalasi Reseller lama menyimpan nama reseller di kolom pelanggan.
        const name = (row.nama_reseller || (row.tipe === 'INSTALASI_RESELLER' ? row.pelanggan : '') || '').trim();
        if(!name || (needle && name.toLowerCase().indexOf(needle) === -1)) return;
        const key = name.toLowerCase();
        const current = byName[key];
        // Karena query terbaru lebih dulu, hanya ganti jika record lama belum punya HP.
        if(!current || (!current.no_hp && row.no_hp)) {
          byName[key] = { nama_reseller: name, no_hp: row.no_hp || '' };
        }
      });

      const unique = Object.values(byName).sort(function(a, b) {
        return a.nama_reseller.localeCompare(b.nama_reseller, 'id');
      });
      if(!unique.length) {
        dropdown.innerHTML = '<p class="text-xs text-slate-400 text-center py-3">Reseller terdaftar tidak ditemukan</p>';
        return;
      }

      if(!window._resellerPerluasanCache) window._resellerPerluasanCache = {};
      dropdown.innerHTML = unique.map(function(row, index) {
        const cacheKey = 'reseller_' + index;
        window._resellerPerluasanCache[cacheKey] = row;
        return '<button type="button" onclick="fillResellerPerluasan(\'' + cacheKey + '\')" '
          + 'class="w-full text-left px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all border-b border-slate-100 dark:border-slate-700 last:border-0">'
          + '<div class="flex items-center gap-2">'
          + '<span class="text-xs font-extrabold text-slate-800 dark:text-slate-100 flex-1 truncate">' + escapeResellerHtml(row.nama_reseller) + '</span>'
          + (row.no_hp ? '<span class="text-[10px] text-emerald-600 font-bold shrink-0">' + escapeResellerHtml(row.no_hp) + '</span>' : '<span class="text-[10px] text-slate-400 shrink-0">No. HP belum ada</span>')
          + '</div></button>';
      }).join('');
    } catch(e) {
      dropdown.innerHTML = '<p class="text-xs text-rose-500 text-center py-3">Gagal memuat reseller</p>';
      console.warn('[SearchResellerPerluasan]', e.message);
    }
  }, 250);
}

function fillResellerPerluasan(cacheKey) {
  const data = (window._resellerPerluasanCache || {})[cacheKey];
  if(!data) return;
  const nameEl = document.getElementById('wo-reseller-perluasan');
  const nohpEl = document.getElementById('wo-nohp-perluasan');
  const dropdown = document.getElementById('wo-search-dropdown-reseller-perluasan');
  if(nameEl) nameEl.value = data.nama_reseller || '';
  if(nohpEl && data.no_hp) nohpEl.value = data.no_hp;
  if(dropdown) dropdown.classList.add('hidden');

  [nameEl, nohpEl].forEach(function(el) {
    if(el && el.value) {
      el.classList.add('border-emerald-400');
      el.classList.remove('border-slate-200');
      setTimeout(function() {
        el.classList.remove('border-emerald-400');
        el.classList.add('border-slate-200');
      }, 2000);
    }
  });
}

async function searchPelangganWO(query, formType) {
  clearTimeout(_searchTimeout);
  var dropdownId = 'wo-search-dropdown-' + formType;
  var dropdown = document.getElementById(dropdownId);
  if(!dropdown) return;

  if(!query || query.length < 2) {
    dropdown.classList.add('hidden');
    return;
  }

  _searchTimeout = setTimeout(async function() {
    try {
      // Cari dari work_orders tipe INSTALASI, INSTALASI_RESELLER, PERLUASAN_RESELLER
      // yang sudah SELESAI (pelanggan aktif)
      var res = await supa.from('work_orders')
        .select('*')
        .in('tipe', ['INSTALASI', 'INSTALASI_RESELLER', 'PERLUASAN_RESELLER'])
        .ilike('pelanggan', '%' + query + '%')
        .order('created_at', { ascending: false })
        .limit(8);

      var data = res.data || [];

      if(!data.length) {
        dropdown.innerHTML = '<p class="text-xs text-slate-400 text-center py-3">Pelanggan tidak ditemukan</p>';
        dropdown.classList.remove('hidden');
        return;
      }

      // Hilangkan duplikat berdasarkan nama pelanggan. Jika riwayat terbaru
      // belum memiliki No. Layanan, gunakan riwayat pelanggan berikutnya yang
      // sudah memiliki no_layanan.
      var seen = {};
      var unique = [];
      data.forEach(function(d) {
        var key = (d.pelanggan || '').toLowerCase();
        if(!seen[key]) {
          seen[key] = d;
          unique.push(d);
        } else if(!seen[key].no_layanan && d.no_layanan) {
          var index = unique.indexOf(seen[key]);
          seen[key] = d;
          if(index >= 0) unique[index] = d;
        }
      });

      dropdown.innerHTML = unique.map(function(d, idx) {
        var tipeBadge = {
          INSTALASI: 'bg-blue-100 text-blue-700',
          INSTALASI_RESELLER: 'bg-cyan-100 text-cyan-700',
          PERLUASAN_RESELLER: 'bg-teal-100 text-teal-700'
        }[d.tipe] || 'bg-slate-100 text-slate-600';
        var tipeLabel = {
          INSTALASI: 'Instalasi', INSTALASI_RESELLER: 'Reseller', PERLUASAN_RESELLER: 'Perluasan'
        }[d.tipe] || d.tipe;
        // Simpan data ke cache global lalu panggil dengan index
        if(!window._pelangganSearchCache) window._pelangganSearchCache = {};
        window._pelangganSearchCache[formType + '_' + idx] = d;
        return '<button type="button" onclick="fillPelangganData(\'' + formType + '\',\'' + formType + '_' + idx + '\')" '
          + 'class="w-full text-left px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all border-b border-slate-100 dark:border-slate-700 last:border-0">'
          + '<div class="flex items-center gap-2">'
            + '<span class="text-xs font-extrabold text-slate-800 dark:text-slate-100 flex-1 truncate">' + d.pelanggan + '</span>'
            + '<span class="px-1.5 py-0.5 rounded text-[9px] font-extrabold ' + tipeBadge + ' shrink-0">' + tipeLabel + '</span>'
          + '</div>'
          + '<p class="text-[10px] text-slate-400 mt-0.5 truncate">'
            + (d.alamat ? d.alamat.substring(0,50) : '-')
          + '</p>'
        + '</button>';
      }).join('');
      dropdown.classList.remove('hidden');

    } catch(e) { console.warn('[SearchPelanggan]', e.message); }
  }, 300);
}

function fillPelangganData(formType, cacheKey) {
  // Ambil data dari cache global
  var data = (window._pelangganSearchCache || {})[cacheKey];
  if(!data) return;

  // Tutup dropdown
  var dropdown = document.getElementById('wo-search-dropdown-' + formType);
  if(dropdown) dropdown.classList.add('hidden');

  if(formType === 'maint') {
    // Form Maintenance
    var nameEl   = document.getElementById('wo-pelanggan-maint');
    var alamatEl = document.getElementById('wo-alamat-maint');
    var koordEl  = document.getElementById('wo-koordinat-maint');
    var nohpEl   = document.getElementById('wo-nohp-maint');
    var badge    = document.getElementById('wo-maint-source-badge');

    if(nameEl)   nameEl.value   = data.pelanggan || '';
    if(alamatEl) alamatEl.value = data.alamat    || '';
    if(koordEl && data.koordinat)  koordEl.value = data.koordinat;
    if(nohpEl  && data.no_hp)      nohpEl.value  = data.no_hp;
    if(badge) badge.classList.remove('hidden');

    // Highlight field yang terisi
    [nameEl, alamatEl, koordEl, nohpEl].forEach(function(el) {
      if(el && el.value) {
        el.classList.add('border-emerald-400');
        el.classList.remove('border-slate-200');
        setTimeout(function(){ el.classList.remove('border-emerald-400'); el.classList.add('border-slate-200'); }, 2000);
      }
    });

  } else if(formType === 'dis') {
    // Form Dismantle
    var nameEl   = document.getElementById('dis-nama-pelanggan');
    var noLayananEl = document.getElementById('dis-no-layanan');
    var alamatEl = document.getElementById('dis-alamat');
    var koordEl  = document.getElementById('dis-koordinat');
    var nohpEl   = document.getElementById('dis-no-telp');
    var badge    = document.getElementById('wo-dis-source-badge');

    if(nameEl)      nameEl.value      = data.pelanggan || '';
    if(noLayananEl) noLayananEl.value = data.no_layanan || '';
    if(alamatEl)    alamatEl.value    = data.alamat    || '';
    if(koordEl && data.koordinat) koordEl.value  = data.koordinat;
    if(nohpEl  && data.no_hp)     nohpEl.value   = data.no_hp;
    if(badge) badge.classList.remove('hidden');

    // Highlight field yang terisi
    [nameEl, noLayananEl, alamatEl, koordEl, nohpEl].forEach(function(el) {
      if(el && el.value) {
        el.classList.add('border-emerald-400');
        el.classList.remove('border-slate-200');
        setTimeout(function(){ el.classList.remove('border-emerald-400'); el.classList.add('border-slate-200'); }, 2000);
      }
    });
  }
}

function clearPelangganMaint() {
  ['wo-pelanggan-maint','wo-alamat-maint','wo-koordinat-maint','wo-nohp-maint'].forEach(function(id){
    var el = document.getElementById(id); if(el) el.value = '';
  });
  var badge = document.getElementById('wo-maint-source-badge');
  if(badge) badge.classList.add('hidden');
}

function clearPelangganDis() {
  ['dis-nama-pelanggan','dis-no-layanan','dis-alamat','dis-koordinat','dis-no-telp'].forEach(function(id){
    var el = document.getElementById(id); if(el) el.value = '';
  });
  var badge = document.getElementById('wo-dis-source-badge');
  if(badge) badge.classList.add('hidden');
}

// Tutup dropdown saat klik di luar
 document.addEventListener('click', function(e) {
  if(!e.target.closest('#wo-fields-maintenance') && !e.target.closest('#sub-adm-content-buat-dismantle') && !e.target.closest('#wo-fields-perluasan')) {
    ['wo-search-dropdown-maint','wo-search-dropdown-dis','wo-search-dropdown-reseller-perluasan'].forEach(function(id){
      var el = document.getElementById(id); if(el) el.classList.add('hidden');
    });
  }
});
