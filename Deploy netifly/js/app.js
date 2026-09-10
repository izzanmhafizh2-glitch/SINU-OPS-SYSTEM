// ===================== AUTH =====================
// handleLogin versi Supabase ada di supabase-init.js
// Fungsi ini sengaja dihapus agar tidak menimpa versi async Supabase

function togglePwd(){
  const i=document.getElementById('login-password'),ic=document.getElementById('pwd-eye-icon');
  if(i.type==='password'){i.type='text';ic.className='fa-solid fa-eye-slash text-sm';}
  else{i.type='password';ic.className='fa-solid fa-eye text-sm';}
}

const SINU_AUTH_STORAGE_KEY = 'sinu_user';
let sinuMidnightLogoutTimer = null;

function sinuTodayKey(date = new Date()) {
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}

function sinuSavePersistentSession(user) {
  if(!user) return;
  try {
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 0, 0);
    localStorage.setItem(SINU_AUTH_STORAGE_KEY, JSON.stringify({
      user,
      loginDay: sinuTodayKey(now),
      expiresAt: nextMidnight.getTime()
    }));
  } catch(e) { console.warn('[Auth] Gagal menyimpan sesi persistent:', e.message); }
}

function sinuClearPersistentSession() {
  try { localStorage.removeItem(SINU_AUTH_STORAGE_KEY); } catch(e) { /* abaikan */ }
  try { sessionStorage.removeItem(SINU_AUTH_STORAGE_KEY); } catch(e) { /* abaikan */ }
}

function sinuReadPersistentSession() {
  try {
    let raw = localStorage.getItem(SINU_AUTH_STORAGE_KEY);
    let parsed = raw ? JSON.parse(raw) : null;

    // Migrasi sesi lama dari sessionStorage agar pengguna tidak langsung logout setelah update.
    if(!parsed) {
      const legacy = sessionStorage.getItem(SINU_AUTH_STORAGE_KEY);
      if(legacy) {
        const legacyUser = JSON.parse(legacy);
        sinuSavePersistentSession(legacyUser);
        sessionStorage.removeItem(SINU_AUTH_STORAGE_KEY);
        return legacyUser;
      }
      return null;
    }

    const user = parsed.user || parsed;
    const expired = (parsed.loginDay && parsed.loginDay !== sinuTodayKey())
      || (parsed.expiresAt && Date.now() >= Number(parsed.expiresAt));
    if(expired || !user || !user.username) {
      sinuClearPersistentSession();
      return null;
    }
    return user;
  } catch(e) {
    sinuClearPersistentSession();
    return null;
  }
}

function sinuScheduleMidnightLogout() {
  if(sinuMidnightLogoutTimer) clearTimeout(sinuMidnightLogoutTimer);
  const now = new Date();
  const nextMidnight = new Date(now);
  nextMidnight.setHours(24, 0, 0, 0);
  sinuMidnightLogoutTimer = setTimeout(function() {
    sinuPerformLogout();
  }, Math.max(1000, nextMidnight.getTime() - now.getTime() + 500));
}

function sinuPerformLogout() {
  if(sinuMidnightLogoutTimer) { clearTimeout(sinuMidnightLogoutTimer); sinuMidnightLogoutTimer = null; }
  currentUser = null;
  sinuClearPersistentSession();
  if(typeof destroySinuNotificationRealtime === 'function') destroySinuNotificationRealtime();
  document.getElementById('main-app').classList.add('hidden');
  document.getElementById('login-page').classList.remove('hidden');
  if(mainChartInstance){mainChartInstance.destroy();mainChartInstance=null;}
  if(donutChartInstance){donutChartInstance.destroy();donutChartInstance=null;}
}

function loadMainApp(){
  document.getElementById('login-page').classList.add('hidden');
  document.getElementById('main-app').classList.remove('hidden');
  document.getElementById('user-avatar').textContent=currentUser.avatar;
  document.getElementById('user-display-name').textContent=currentUser.displayName;
  const rLabel={owner:'Owner (Super Admin)',admin:'Admin/CS',cs:'Admin/CS',teknisi:'Teknisi Field',supervisor:'Supervisor',noc:'NOC Engineer',finance:'Finance'};
  document.getElementById('user-role-badge').textContent=rLabel[currentUser.role]||currentUser.role;
  buildNavigation();initApp();
  // Load foto profil kalau ada
  loadProfilePhoto();
  sinuScheduleMidnightLogout();
}

function buildNavigation(){
  const nav=document.getElementById('main-nav');
  const r=(currentUser.role||'').toLowerCase();
  // Owner = super admin. Melihat & mengakses SEMUA menu.
  const isOwner=r==='owner';
  const isAdmin=r==='admin'||isOwner,isSupervisor=r==='supervisor'||isOwner,isTek=r==='teknisi'||isOwner,isNOC=r==='noc'||isOwner,isFinance=r==='finance';
  const menus=[
    {id:'dashboard',icon:'fa-chart-pie',label:'Dashboard',show:!isFinance||isOwner},
    {id:'tugas',icon:'fa-list-check',label:'Tugas',show:isTek},
    {id:'material',icon:'fa-boxes-packing',label:'Material',show:isTek},
    {id:'noc',icon:'fa-headset',label:'NOC',show:isNOC},
    {id:'absensi',icon:'fa-user-check',label:'Absensi',show:true},
    {id:'admin',icon:'fa-user-gear',label:'Admin',show:isAdmin},
    {id:'odp',icon:'fa-tower-broadcast',label:'Asset ODP',show:isAdmin||isSupervisor},
    {id:'kpi',icon:'fa-ranking-star',label:'KPI',show:isSupervisor},
    {id:'logtugas',icon:'fa-clock-rotate-left',label:'Log Tugas',show:isSupervisor},
    {id:'logperangkat',icon:'fa-route',label:'Log Aset',show:isSupervisor},
    {id:'kelolaakun',icon:'fa-users-gear',label:'Kelola Akun',show:isSupervisor}
  ];
  const visible=menus.filter(m=>m.show);
  // Responsive nav: selalu pakai inline style untuk grid columns
  nav.className='bg-white dark:bg-slate-800 rounded-2xl p-2 shadow-sm border border-slate-100 dark:border-slate-700 grid gap-1';
  nav.style.cssText='grid-template-columns:repeat('+Math.min(visible.length,5)+',1fr);';
  nav.innerHTML=visible.map((m,i)=>`<button type="button" onclick="switchMainTab('${m.id}')" id="main-tab-${m.id}" class="tab-btn ${i===0?'active':''} py-2 px-1 rounded-xl text-[9px] sm:text-[10px] lg:text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-all flex flex-col items-center gap-1 min-w-0"><i class="fa-solid ${m.icon} text-sm lg:text-base"></i><span class="truncate w-full text-center">${m.label}</span></button>`).join('');
  // Rekapitulasi karyawan hanya untuk Supervisor dan Owner.
  // Admin, NOC, dan Teknisi tetap memakai Dashboard tanpa melihat rekap ini.
  const canViewEmployeeRecap=isSupervisor;
  const recapHeader=document.getElementById('employee-recap-header');
  const recapTable=document.getElementById('employee-recap-table');
  if(recapHeader)recapHeader.classList.toggle('hidden',!canViewEmployeeRecap);
  if(recapTable)recapTable.classList.toggle('hidden',!canViewEmployeeRecap);

  // Tombol tambah dan aksi hapus hanya untuk Supervisor/Owner.
  const btnTambah=document.getElementById('btn-tambah-karyawan');
  const colAksi=document.getElementById('col-aksi-karyawan');
  if(btnTambah)btnTambah.classList.toggle('hidden',!isSupervisor);
  if(colAksi)colAksi.classList.toggle('hidden',!isSupervisor);
}

function handleLogout(){document.getElementById('logout-modal').classList.remove('hidden');}
function confirmLogout(){
  document.getElementById('logout-modal').classList.add('hidden');
  sinuPerformLogout();
}

window.addEventListener('load',function(){
  initTheme();
  const saved=sinuReadPersistentSession();
  if(saved){
    currentUser=saved;
    loadMainApp();
  }
});

// ===================== CORE =====================
// ── GPS KOORDINAT HELPER ─────────────────────────────
function pasteGPSKoordinat(inputId) {
  const el = document.getElementById(inputId);
  if(!el) return;
  if(!navigator.geolocation) {
    showAlert('Browser tidak mendukung Geolocation.', 'GPS');
    return;
  }
  const origPlaceholder = el.placeholder;
  el.placeholder = 'Mendeteksi GPS...';
  el.disabled = true;
  navigator.geolocation.getCurrentPosition(
    function(pos) {
      const lat = pos.coords.latitude.toFixed(6);
      const lng = pos.coords.longitude.toFixed(6);
      el.value = lat + ', ' + lng;
      el.disabled = false;
      el.placeholder = origPlaceholder;
      el.style.borderColor = '#10b981';
      setTimeout(function(){ el.style.borderColor = ''; }, 2000);
    },
    function(err) {
      el.disabled = false;
      el.placeholder = origPlaceholder;
      showAlert('Gagal deteksi GPS: ' + err.message + '\nSilakan input manual.', 'GPS Error');
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

function showLoading(text) {
  const overlay = document.getElementById('loading-overlay');
  const txt = document.getElementById('loading-text');
  if(txt) txt.textContent = text || 'Menyimpan data...';
  if(overlay) overlay.classList.remove('hidden');
}
function hideLoading() {
  const overlay = document.getElementById('loading-overlay');
  if(overlay) overlay.classList.add('hidden');
}

function showAlert(msg, title='Informasi'){
  const t = (title||'').toLowerCase();
  const m = (msg||'').toLowerCase();

  // Tentukan tipe berdasarkan judul/pesan
  let type = 'info';
  if(t.includes('berhasil') || t.includes('sukses') || t.includes('✅') || t.includes('selesai') || t.includes('tersimpan') || t.includes('dibuat') || t.includes('approved') || t.includes('disetujui') || m.includes('berhasil'))
    type = 'success';
  else if(t.includes('gagal') || t.includes('error') || t.includes('❌') || t.includes('ditolak') || t.includes('rejected') || t.includes('tidak bisa') || t.includes('tidak boleh'))
    type = 'error';
  else if(t.includes('peringatan') || t.includes('⚠') || t.includes('warning') || t.includes('wajib') || t.includes('harap') || t.includes('sudah ada') || t.includes('duplikat'))
    type = 'warning';
  else if(t.includes('hapus') || t.includes('dihapus') || t.includes('dibatalkan') || t.includes('return') || t.includes('logout'))
    type = 'danger';
  else if(t.includes('waiting') || t.includes('menunggu') || t.includes('⏳') || t.includes('on going'))
    type = 'waiting';

  const configs = {
    success: { bg:'bg-emerald-100 dark:bg-emerald-950/60', text:'text-emerald-600 dark:text-emerald-400', icon:'fa-circle-check' },
    error:   { bg:'bg-rose-100 dark:bg-rose-950/60',    text:'text-rose-600 dark:text-rose-400',    icon:'fa-circle-xmark' },
    warning: { bg:'bg-amber-100 dark:bg-amber-950/60',  text:'text-amber-600 dark:text-amber-400',  icon:'fa-triangle-exclamation' },
    danger:  { bg:'bg-rose-100 dark:bg-rose-950/60',    text:'text-rose-600 dark:text-rose-400',    icon:'fa-trash-can' },
    waiting: { bg:'bg-amber-100 dark:bg-amber-950/60',  text:'text-amber-600 dark:text-amber-400',  icon:'fa-hourglass-half' },
    info:    { bg:'bg-blue-100 dark:bg-blue-950/60',    text:'text-blue-600 dark:text-blue-400',    icon:'fa-circle-info' }
  };
  const c = configs[type] || configs.info;

  const wrap = document.getElementById('alert-icon-wrap');
  const icon = document.getElementById('alert-icon');
  if(wrap) wrap.className = `w-16 h-16 ${c.bg} rounded-full flex items-center justify-center mx-auto ${c.text}`;
  if(icon) icon.className = `fa-solid ${c.icon} text-3xl`;

  // Strip semua emoji dari judul
  const stripEmoji = s => s.replace(/[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{27BF}]|[\u{FE00}-\u{FEFF}]|✅|❌|⚠️|⏳|📦|🔄|↩️|🗑️|⭐|🎉|💡|🔔|📋|🏆/gu, '').trim();
  document.getElementById('alert-title').innerText   = stripEmoji(title);
  document.getElementById('alert-message').innerText = msg;
  document.getElementById('alert-modal').classList.remove('hidden');
}

function toggleTheme(){
  const html=document.documentElement,icon=document.getElementById('theme-icon');
  if(html.classList.contains('dark')){html.classList.remove('dark');localStorage.setItem('theme','light');if(icon)icon.className='fa-solid fa-moon text-sm';}
  else{html.classList.add('dark');localStorage.setItem('theme','dark');if(icon)icon.className='fa-solid fa-sun text-sm';}
  if(mainChartInstance)renderMainChart();if(donutChartInstance)renderDonutChart();
}

function initTheme(){
  const saved=localStorage.getItem('theme'),icon=document.getElementById('theme-icon');
  if(saved==='dark'||(!saved&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark');if(icon)icon.className='fa-solid fa-sun text-sm';}
  else{document.documentElement.classList.remove('dark');if(icon)icon.className='fa-solid fa-moon text-sm';}
}

function updateClock(){
  const now=new Date(),t=document.getElementById('current-time'),d=document.getElementById('current-date');
  if(t)t.innerText=now.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit',second:'2-digit'}).replace(/\./g,':');
  if(d)d.innerText=now.toLocaleDateString('id-ID',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
}

function initApp(){
  setInterval(updateClock,1000);updateClock();
  setDefaultFilterPeriod();fetchDashboardData();
  // Pulihkan tab terakhir — Finance default ke absensi
  const r=(currentUser.role||'').toLowerCase();
  const defaultTab = r==='finance' ? 'absensi' : 'dashboard';
  const lastTab = sessionStorage.getItem('sinu_last_tab') || defaultTab;
  switchMainTab(lastTab);
  renderODPGrid();renderPickupList();
  const _isOwner = currentUser && currentUser.role==='owner';
  if(currentUser&&(currentUser.role==='admin'||_isOwner)&&typeof initBuatWOForm==='function')initBuatWOForm();
  if(currentUser&&(currentUser.role==='supervisor'||_isOwner)){if(typeof initKPIFilter==='function')initKPIFilter();if(typeof changeKPIPeriod==='function')changeKPIPeriod();}
  async function tryLoad(){try{if(typeof blazeface!=='undefined')faceModel=await blazeface.load();}catch(e){}}
  tryLoad();
  renderMyPointSection();
}

// ===================== NAVIGATION =====================
function switchMainTab(tabName){
  // Sebelum pindah — reset semua sub-content dari SEMUA section
  // supaya tidak ada yang bocor ke section lain
  var allSubIds = [
    // Tugas
    'sub-content-pickup-tugas','sub-content-tugas-saya','sub-content-return-tugas',
    'sub-content-riwayat-tugas','sub-content-pickup-dismantle','sub-content-tugas-dismantle',
    'form-work-instalasi','form-work-maintenance','form-work-perluasan',
    // NOC
    'sub-content-pickup-noc','sub-content-tugas-noc','sub-content-registrasi-noc',
    'sub-content-checking-dismantle','sub-content-riwayat-noc',
    'view-noc-form',
    // Material
    'sub-mat-content-pickup-perangkat','sub-mat-content-waiting-approval',
    'sub-mat-content-list-perangkat-saya','sub-mat-content-send-perangkat',
    'sub-mat-content-return-perangkat',
    // Absensi
    'sub-abs-content-absen-form','sub-abs-content-izin-sakit',
    'sub-abs-content-izin-cuti','sub-abs-content-point-absensi',
    // Admin
    'sub-adm-content-buat-tugas','sub-adm-content-registrasi',
    'sub-adm-content-buat-dismantle','sub-adm-content-list-tiket',
    'sub-adm-content-list-tiket-dismantle','sub-adm-content-rl-radius',
    'sub-adm-content-tambah-perangkat','sub-adm-content-list-perangkat',
    'sub-adm-content-list-rusak','sub-adm-content-dismantle-items',
    'sub-adm-content-approval-pickup'
  ];
  allSubIds.forEach(function(id){
    var el = document.getElementById(id);
    if(el) el.classList.add('hidden');
  });

  document.querySelectorAll('.main-section').forEach(el=>el.classList.add('hidden'));
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  const s=document.getElementById('section-'+tabName);if(s)s.classList.remove('hidden');
  const b=document.getElementById('main-tab-'+tabName);if(b)b.classList.add('active');
  sessionStorage.setItem('sinu_last_tab', tabName);
  if(tabName==='kpi'){initKPIFilter();switchSubKPI(sessionStorage.getItem('sinu_last_sub_kpi')||'performance');changeKPIPeriod();}
  if(tabName==='noc'){
    switchSubNOC('pickup-noc');
  }
  if(tabName==='admin'){
    const lastMenu = sessionStorage.getItem('sinu_last_admin_menu') || 'tugas';
    switchAdminMenu(lastMenu);
    const lastSub = sessionStorage.getItem('sinu_last_sub_admin') || (lastMenu==='tugas' ? 'buat-tugas' : 'tambah-perangkat');
    switchSubAdmin(lastSub);
  }
  if(tabName==='tugas'){
    const lastSub=sessionStorage.getItem('sinu_last_sub_tugas')||'pickup-tugas';
    switchSubTugas(lastSub);
  }
  if(tabName==='material'){
    const lastSub=sessionStorage.getItem('sinu_last_sub_material')||'pickup-perangkat';
    switchSubMaterial(lastSub);
  }
  if(tabName==='absensi'){
    if(typeof autoFillNamaAbsensi==='function') autoFillNamaAbsensi();
    const lastSub=sessionStorage.getItem('sinu_last_sub_absensi')||'form-absensi';
    switchSubAbsensi(lastSub);
  }
  if(tabName==='odp')renderODPGrid();
  if(tabName==='rekap-wo')renderRekapWO();
  if(tabName==='logtugas'){
    const lastSub=sessionStorage.getItem('sinu_last_sub_logtugas')||'log-wo';
    switchSubLogTugas(lastSub);
  }
  if(tabName==='logperangkat'){
    loadLogPerangkat();
    if(typeof loadRekapKabel==='function') loadRekapKabel();
  }
  if(tabName==='kelolaakun'){loadDaftarAkun();if(typeof renderOwnerControlVisibility==='function')renderOwnerControlVisibility();}
}
function switchSubTugas(sub){
  const secTugas = document.getElementById('section-tugas');
  // Pastikan hanya satu sub-view Tugas yang terlihat dalam satu waktu.
  document.querySelectorAll('#section-tugas .sub-tugas-content').forEach(function(el){
    el.classList.add('hidden');
  });
  // Sembunyikan semua form kerja aktif saat pindah tab
  ['form-work-instalasi','form-work-maintenance','form-work-perluasan'].forEach(function(id){
    var f=document.getElementById(id); if(f) f.classList.add('hidden');
  });
  // view-tugas-saya-list hanya visible saat di tab tugas-saya
  var listEl=document.getElementById('view-tugas-saya-list');
  if(listEl) listEl.classList.toggle('hidden', sub !== 'tugas-saya');
  // view-dismantle-list hanya visible saat di tab tugas-dismantle
  var disListEl=document.getElementById('view-dismantle-list');
  var disFormEl=document.getElementById('view-dismantle-form');
  if(disListEl) disListEl.classList.toggle('hidden', sub !== 'tugas-dismantle');
  if(disFormEl) disFormEl.classList.add('hidden');
  // Aktifkan pill yang dipilih
  document.querySelectorAll('#section-tugas .snpill').forEach(b=>b.classList.remove('active'));
  const el=document.getElementById('sub-content-'+sub); if(el) el.classList.remove('hidden');
  const btn=document.getElementById('sub-tugas-'+sub); if(btn) btn.classList.add('active');
  sessionStorage.setItem('sinu_last_sub_tugas', sub);
  if(sub==='pickup-tugas') renderPickupList();
  if(sub==='pickup-dismantle' && typeof loadPickupDismantle==='function') loadPickupDismantle();
  if(sub==='tugas-dismantle' && typeof loadTugasDismantle==='function') loadTugasDismantle();
  if(sub==='tugas-saya'){
    if(typeof restoreMyPickedTasks==='function') restoreMyPickedTasks().then(function(){renderMyTaskList();renderReturnSelect();});
    else { renderMyTaskList(); renderReturnSelect(); }
  }
  if(sub==='riwayat-tugas') renderRiwayatTugas();
  if(sub==='return-tugas') renderReturnSelect();
}
function switchSubMaterial(sub){
  const secMat = document.getElementById('section-material');
  if(secMat) secMat.querySelectorAll('.sub-mat-content').forEach(el=>el.classList.add('hidden'));
  document.querySelectorAll('#section-material .snpill').forEach(b=>b.classList.remove('active'));
  const el=document.getElementById('sub-mat-content-'+sub);if(el)el.classList.remove('hidden');
  const btn=document.getElementById('sub-mat-'+sub);if(btn)btn.classList.add('active');
  sessionStorage.setItem('sinu_last_sub_material', sub);
}
function switchSubNOC(sub){
  const secNOC = document.getElementById('section-noc');
  if(secNOC) {
    secNOC.classList.remove('hidden');
    secNOC.querySelectorAll('.sub-noc-content').forEach(el=>el.classList.add('hidden'));
  }
  document.querySelectorAll('#section-noc .snpill').forEach(b=>b.classList.remove('active'));
  const el=document.getElementById('sub-content-'+sub);if(el)el.classList.remove('hidden');
  const btn=document.getElementById('sub-noc-'+sub);if(btn)btn.classList.add('active');
  sessionStorage.setItem('sinu_last_sub_noc', sub);
  if(sub==='pickup-noc' && typeof loadNOCPickup==='function') loadNOCPickup();
  if(sub==='tugas-noc' && typeof loadNOCTasks==='function') loadNOCTasks();
  if(sub==='registrasi-noc' && typeof loadProvisioningQueueNOC==='function') loadProvisioningQueueNOC();
  if(sub==='checking-dismantle' && typeof loadCheckingDismantle==='function') loadCheckingDismantle();
  if(sub==='riwayat-noc' && typeof loadRiwayatNOC==='function') loadRiwayatNOC();
}
function switchSubAbsensi(sub){
  const secAbs = document.getElementById('section-absensi');
  if(secAbs) secAbs.querySelectorAll('.sub-abs-content').forEach(el=>el.classList.add('hidden'));
  document.querySelectorAll('#section-absensi .snpill').forEach(b=>b.classList.remove('active'));
  const el=document.getElementById('sub-abs-content-'+sub);if(el)el.classList.remove('hidden');
  const btn=document.getElementById('sub-abs-'+sub);if(btn)btn.classList.add('active');
  sessionStorage.setItem('sinu_last_sub_absensi', sub);
  if(sub==='point-absensi')renderMyPointSection();
}
// Mapping sub ke menu utama
const _admMenuMap = {
  'buat-tugas':'tugas', 'buat-dismantle':'tugas', 'list-tiket':'tugas',
  'list-tiket-dismantle':'tugas', 'rl-radius':'tugas', 'registrasi':'tugas',
  'tambah-perangkat':'asset', 'list-perangkat':'asset', 'list-rusak':'asset',
  'dismantle-items':'asset', 'approval-pickup':'asset'
};

function switchAdminMenu(menu) {
  // Toggle kedua sub-nav
  const tugasNav  = document.getElementById('admin-sub-tugas');
  const assetNav  = document.getElementById('admin-sub-asset');
  if(tugasNav)  tugasNav.classList.toggle('hidden',  menu !== 'tugas');
  if(assetNav)  assetNav.classList.toggle('hidden',  menu !== 'asset');
  // Highlight menu utama
  document.querySelectorAll('#subnav-admin-main .snpill').forEach(b=>b.classList.remove('active'));
  const menuBtn = document.getElementById('admin-menu-'+menu);
  if(menuBtn) menuBtn.classList.add('active');
  sessionStorage.setItem('sinu_last_admin_menu', menu);
  // Auto-pilih default sub
  if(menu==='tugas')  switchSubAdmin('buat-tugas');
  if(menu==='asset')  switchSubAdmin('tambah-perangkat');
}

function switchSubAdmin(sub){
  const secAdm = document.getElementById('section-admin');
  if(secAdm) secAdm.querySelectorAll('.sub-adm-content').forEach(el=>el.classList.add('hidden'));
  // Jangan remove active dari SEMUA snpill — hanya dari sub-nav yang aktif
  const activeMenu = _admMenuMap[sub] || 'tugas';
  const activeSubNav = document.getElementById('admin-sub-'+activeMenu);
  if(activeSubNav) activeSubNav.querySelectorAll('.snpill').forEach(b=>b.classList.remove('active'));
  const el=document.getElementById('sub-adm-content-'+sub);if(el)el.classList.remove('hidden');
  const btn=document.getElementById('sub-adm-'+sub);if(btn)btn.classList.add('active');
  sessionStorage.setItem('sinu_last_sub_admin', sub);
  if(sub==='buat-tugas'){
    initBuatWOForm();
    var fw = document.getElementById('sub-bt-content-form-wo');
    if(fw) fw.classList.remove('hidden');
  }
  if(sub==='list-perangkat'){
    loadAndRenderListPerangkat();
    if(typeof loadLogPerangkat==='function') loadLogPerangkat();
    if(typeof loadRekapKabel==='function') loadRekapKabel();
  }
  if(sub==='list-rusak' && typeof loadListPerangkatRusak==='function') loadListPerangkatRusak();
  if(sub==='dismantle-items' && typeof loadDismantleItems==='function') loadDismantleItems();
  if(sub==='buat-dismantle' && typeof initBuatDismantle==='function') initBuatDismantle();
  if(sub==='list-tiket' && typeof refreshAdminTicketList==='function') refreshAdminTicketList();
  if(sub==='list-tiket-dismantle' && typeof loadListTiketDismantle==='function') loadListTiketDismantle();
  if(sub==='rl-radius' && typeof loadRLRadiusList==='function') loadRLRadiusList();
}

function switchSubBuatTugas(sub) {
  const container = document.getElementById('sub-adm-content-buat-tugas');
  if(container) container.querySelectorAll('.sub-bt-content').forEach(el=>el.classList.add('hidden'));
  document.querySelectorAll('#subnav-buat-tugas .snpill').forEach(b=>b.classList.remove('active'));
  const el = document.getElementById('sub-bt-content-'+sub); if(el) el.classList.remove('hidden');
  const btn = document.getElementById('sub-bt-'+sub); if(btn) btn.classList.add('active');
  if(sub==='form-wo') initBuatWOForm();
  if(sub==='list-tiket') refreshAdminTicketList();
}

// ── AUTO SET data-count untuk grid sub-nav simetris ──────────────────
function initSubnavGrid() {
  document.querySelectorAll('.subnav-wrap').forEach(nav => {
    const count = nav.querySelectorAll('.snpill').length;
    nav.setAttribute('data-count', count);
  });
}
// Panggil setelah DOM siap dan setelah buildNavigation
window.addEventListener('load', function() {
  setTimeout(initSubnavGrid, 200);
});

// ── TOAST NOTIFICATION (seperti notif WA) ───────────────────────────
// type: 'success' | 'info' | 'warning' | 'error'
// duration: ms (default 4000)
function showToast(title, msg, type, duration) {
  type     = type     || 'info';
  duration = duration || 4000;

  // Strip emoji dari judul toast
  const stripEmoji = s => (s||'').replace(/[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{27BF}]|[\u{FE00}-\u{FEFF}]|✅|❌|⚠️|⏳|📦|🔄|↩️|🗑️|⭐|🎉|💡|🔔|📋|🏆/gu, '').trim();
  title = stripEmoji(title);

  const icons = {
    success: '<i class="fa-solid fa-circle-check text-emerald-500"></i>',
    info:    '<i class="fa-solid fa-bell text-blue-500"></i>',
    warning: '<i class="fa-solid fa-triangle-exclamation text-amber-500"></i>',
    error:   '<i class="fa-solid fa-circle-xmark text-rose-500"></i>'
  };

  const container = document.getElementById('toast-container');
  if(!container) return;

  const el = document.createElement('div');
  el.className = 'toast toast-' + type;
  el.innerHTML = `
    <div class="toast-icon">${icons[type]||icons.info}</div>
    <div class="toast-body">
      <div class="toast-title">${title}</div>
      ${msg ? '<div class="toast-msg">'+msg+'</div>' : ''}
      <div class="toast-progress" style="animation-duration:${duration}ms"></div>
    </div>
    <button onclick="this.parentElement.remove()" style="background:none;border:none;cursor:pointer;opacity:.5;font-size:14px;padding:0;line-height:1;">✕</button>
  `;

  // Klik untuk dismiss
  el.addEventListener('click', () => _dismissToast(el));
  container.appendChild(el);

  // Auto dismiss
  setTimeout(() => _dismissToast(el), duration);
}

function _dismissToast(el) {
  if(!el || !el.parentElement) return;
  el.classList.add('hide');
  setTimeout(() => el.remove(), 350);
}

// ── PENGATURAN PROFIL ─────────────────────────────────────────────────
function openProfileSettings() {
  const modal = document.getElementById('profile-settings-modal');
  if(!modal) return;

  // Isi info profil
  const name = currentUser ? currentUser.displayName : '--';
  const role = currentUser ? currentUser.role : '--';
  const initials = currentUser ? currentUser.avatar || name.substring(0,2).toUpperCase() : '--';
  const rLabel = {admin:'Admin/CS', cs:'Admin/CS', teknisi:'Teknisi Field', supervisor:'Supervisor', noc:'NOC Engineer', finance:'Finance'};

  const nameEl = document.getElementById('profile-name-display');
  const roleEl = document.getElementById('profile-role-display');
  const initialsEl = document.getElementById('profile-avatar-initials');
  const photoEl = document.getElementById('profile-avatar-photo');

  if(nameEl) nameEl.textContent = name;
  if(roleEl) roleEl.textContent = rLabel[role] || role;
  if(initialsEl) initialsEl.textContent = initials;

  // Load foto profil kalau ada
  const savedPhoto = currentUser ? currentUser.photoUrl : null;
  if(savedPhoto && photoEl) {
    photoEl.src = savedPhoto;
    photoEl.classList.remove('hidden');
    if(initialsEl) initialsEl.classList.add('hidden');
  } else if(photoEl) {
    photoEl.classList.add('hidden');
    if(initialsEl) initialsEl.classList.remove('hidden');
  }

  modal.classList.remove('hidden');
}

function closeProfileSettings() {
  const modal = document.getElementById('profile-settings-modal');
  if(modal) modal.classList.add('hidden');
}

function onProfilePhotoChange(event) {
  const file = event.target.files[0];
  if(!file) return;

  // Validasi ukuran maks 2MB
  if(file.size > 2 * 1024 * 1024) {
    showAlert('Foto terlalu besar. Maksimal 2MB.', 'Foto Profil');
    event.target.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = async function(e) {
    const base64 = e.target.result;

    // Tampilkan preview langsung
    const photoEl = document.getElementById('profile-avatar-photo');
    const initialsEl = document.getElementById('profile-avatar-initials');
    if(photoEl) { photoEl.src = base64; photoEl.classList.remove('hidden'); }
    if(initialsEl) initialsEl.classList.add('hidden');

    // Update avatar di user bar juga
    applyProfilePhoto(base64);

    // Simpan ke Supabase
    await saveProfilePhoto(base64);
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}

function applyProfilePhoto(base64) {
  // Avatar di sidebar
  const avatarEl = document.getElementById('user-avatar');
  const avatarImg = document.getElementById('user-avatar-img');
  if(avatarImg && base64) {
    avatarImg.src = base64;
    avatarImg.classList.remove('hidden');
    if(avatarEl) avatarEl.classList.add('hidden');
  } else if(avatarImg) {
    avatarImg.classList.add('hidden');
    if(avatarEl) avatarEl.classList.remove('hidden');
  }
}

async function saveProfilePhoto(base64) {
  const statusEl = document.getElementById('profile-upload-status');
  if(statusEl) statusEl.classList.remove('hidden');

  try {
    if(typeof supa === 'undefined' || !currentUser) throw new Error('Tidak ada koneksi');

    const { error } = await supa.from('akun')
      .update({ avatar_url: base64 })
      .eq('username', currentUser.username);

    if(error) throw error;

    // Simpan ke session dan localStorage
    currentUser.photoUrl = base64;
    sinuSavePersistentSession(currentUser);
    localStorage.setItem('sinu_photo_' + currentUser.username, base64);

    showAlert('Foto profil berhasil disimpan!', 'Foto Profil');
  } catch(e) {
    // Fallback: simpan lokal saja
    if(currentUser) {
      currentUser.photoUrl = base64;
      sinuSavePersistentSession(currentUser);
      localStorage.setItem('sinu_photo_' + currentUser.username, base64);
    }
    console.warn('[Profile] Simpan ke DB gagal, tersimpan lokal:', e.message);
    showAlert('Foto disimpan di perangkat ini.', 'Foto Profil');
  } finally {
    if(statusEl) statusEl.classList.add('hidden');
  }
}

function loadProfilePhoto() {
  if(!currentUser) return;
  // Prioritas: dari session → localStorage → DB (sudah dihandle saat login)
  let photoUrl = currentUser.photoUrl || null;
  if(!photoUrl && currentUser.username) {
    photoUrl = localStorage.getItem('sinu_photo_' + currentUser.username) || null;
    if(photoUrl) currentUser.photoUrl = photoUrl;
  }
  if(photoUrl) {
    applyProfilePhoto(photoUrl);
  }
}
