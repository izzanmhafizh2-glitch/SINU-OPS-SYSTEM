// =====================================================
//  ABSENSINU v2 - Main App Controller
// =====================================================

let currentUser = null;
let employeeMaster = [];
let kpiWOData = [];
let absensiPoints = {};

// ── INIT APP ──────────────────────────────────────────
function initApp() {
  // Check auth
  const userData = localStorage.getItem('sinu_v2_user');
  if(!userData) {
    window.location.href = 'login.html';
    return;
  }
  
  currentUser = JSON.parse(userData);
  document.getElementById('topbar-username').textContent = currentUser.name || currentUser.username;
  
  // Update clock
  updateClock();
  setInterval(updateClock, 1000);
  
  // Load initial data from Supabase
  if(typeof loadInitialData === 'function') {
    loadInitialData();
  }
  
  // Load dashboard by default
  switchSection('dashboard');
}

// ── UPDATE CLOCK ──────────────────────────────────────
function updateClock() {
  const now = new Date();
  const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const date = now.getDate() + '-' + months[now.getMonth()] + '-' + now.getFullYear();
  const time = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0') + ':' + String(now.getSeconds()).padStart(2,'0');
  const clockEl = document.getElementById('server-time');
  if(clockEl) clockEl.textContent = date + ' ' + time;
}

// ── SIDEBAR TOGGLE ────────────────────────────────────
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  if(sidebar) sidebar.classList.toggle('collapsed');
}

// ── SUB MENU TOGGLE ───────────────────────────────────
function toggleSubMenu(el) {
  el.classList.toggle('open');
  const submenu = el.nextElementSibling;
  if(submenu && submenu.classList.contains('nav-submenu')) {
    submenu.classList.toggle('open');
  }
}

// ── SWITCH SECTION ────────────────────────────────────
function switchSection(sectionName) {
  // Hide all sections
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  
  // Remove active from all nav items
  document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
  
  // Show target section
  const targetSection = document.getElementById('section-' + sectionName);
  if(targetSection) {
    targetSection.classList.add('active');
    
    // Call section-specific init functions
    switch(sectionName) {
      case 'dashboard':
        if(typeof renderDashboard === 'function') renderDashboard();
        break;
      case 'absensi':
        if(typeof initAbsensiSection === 'function') initAbsensiSection();
        break;
      case 'tugas':
        if(typeof initTugasSection === 'function') initTugasSection();
        break;
      case 'kpi':
        if(typeof initKPISection === 'function') initKPISection();
        break;
    }
  }
  
  // Set active nav item
  document.querySelectorAll('.nav-item').forEach(item => {
    const onclick = item.getAttribute('onclick');
    if(onclick && onclick.includes("'" + sectionName + "'")) {
      item.classList.add('active');
    }
  });
}

// ── LOGOUT ────────────────────────────────────────────
function logout() {
  if(confirm('Yakin ingin keluar?')) {
    localStorage.removeItem('sinu_v2_user');
    localStorage.removeItem('sinu_persistent_session');
    window.location.href = 'login.html';
  }
}

// ── LOAD INITIAL DATA FROM SUPABASE ──────────────────
async function loadInitialData() {
  if(typeof supa === 'undefined') {
    console.warn('Supabase not initialized');
    return;
  }
  
  try {
    // Load employee master
    const { data: karyawan, error: errKaryawan } = await supa.from('karyawan').select('*');
    if(!errKaryawan && karyawan) {
      employeeMaster = karyawan;
      console.log('Employee master loaded:', employeeMaster.length);
    }
    
    // Load WO data for KPI
    const { data: wo, error: errWO } = await supa.from('work_orders').select('*');
    if(!errWO && wo) {
      kpiWOData = wo;
      console.log('WO data loaded:', kpiWOData.length);
    }
    
    // Load absensi points
    if(typeof loadAllAbsensiPoints === 'function') {
      const now = new Date();
      await loadAllAbsensiPoints(now.getMonth(), now.getFullYear());
      console.log('Absensi points loaded');
    }
    
    // Refresh dashboard
    if(typeof renderDashboard === 'function') {
      renderDashboard();
    }
    
  } catch(e) {
    console.error('Error loading initial data:', e);
  }
}

// ── RENDER DASHBOARD ──────────────────────────────────
function renderDashboard() {
  // Update stat cards
  updateStatCards();
  
  // Update attendance recap
  if(typeof updateRecapTable === 'function') {
    updateRecapTable();
  }
}

// ── UPDATE STAT CARDS ─────────────────────────────────
function updateStatCards() {
  // Hadir hari ini
  const today = new Date().toISOString().slice(0,10);
  if(typeof supa !== 'undefined') {
    supa.from('absensi').select('*').eq('tanggal', today).then(({data}) => {
      const hadirEl = document.querySelector('.stat-card:nth-child(1) .stat-card-value');
      if(hadirEl && data) hadirEl.textContent = data.length;
    });
  }
  
  // Tugas aktif
  if(kpiWOData.length) {
    const tugasAktif = kpiWOData.filter(wo => wo.status !== 'done' && wo.status !== 'closed').length;
    const tugasEl = document.querySelector('.stat-card:nth-child(2) .stat-card-value');
    if(tugasEl) tugasEl.textContent = tugasAktif;
  }
  
  // WO selesai bulan ini
  const thisMonth = new Date().getMonth();
  const thisYear = new Date().getFullYear();
  const woSelesai = kpiWOData.filter(wo => {
    if(!wo.t4) return false;
    const t4Date = new Date(wo.t4);
    return t4Date.getMonth() === thisMonth && t4Date.getFullYear() === thisYear;
  }).length;
  const woEl = document.querySelector('.stat-card:nth-child(3) .stat-card-value');
  if(woEl) woEl.textContent = woSelesai;
  
  // Total pelanggan (dummy for now)
  // Will be connected to pelanggan table later
}

// ── SHOW ALERT ────────────────────────────────────────
function showAlert(message, title = 'Notifikasi') {
  alert(title + '\n\n' + message);
}

// ── INIT ON DOM READY ─────────────────────────────────
window.addEventListener('DOMContentLoaded', initApp);
