// =====================================================
//  ABSENSINU v2 - Main App Controller with Role-Based Menu
// =====================================================

let currentUser = null;
let employeeMaster = [];
let kpiWOData = [];
let absensiPoints = {};

// ── ROLE DEFINITIONS ──────────────────────────────────
function getRoleFlags(role) {
  const r = String(role || '').toLowerCase();
  return {
    isOwner: r === 'owner',
    isAdmin: r === 'admin' || r === 'owner',
    isSupervisor: r === 'supervisor' || r === 'spv' || r === 'owner',
    isSupervisorOnly: r === 'supervisor' || r === 'spv',
    isTek: r === 'teknisi' || r === 'owner',
    isNOC: r === 'noc' || r === 'owner',
    isCS: r === 'cs',
    isFinance: r === 'finance',
    isManager: r === 'manager',
    isAssetOnly: r === 'noc' || r === 'supervisor' || r === 'spv',
    
    // Mitra roles
    isKoordinator: r === 'koordinator',
    isTekMitra: r === 'teknisi_mitra',
    isNOCMitra: r === 'noc_mitra',
    isCSMitra: r === 'cs_mitra',
    isMitraAny: ['koordinator','teknisi_mitra','noc_mitra','cs_mitra'].includes(r)
  };
}

// ── MENU STRUCTURE ────────────────────────────────────
function getMenuStructure(roleFlags) {
  const {isOwner, isAdmin, isSupervisor, isSupervisorOnly, isTek, isNOC, isCS, 
         isFinance, isManager, isAssetOnly, isKoordinator, isTekMitra, 
         isNOCMitra, isCSMitra, isMitraAny} = roleFlags;
  
  return [
    {
      section: 'UTAMA',
      items: [
        {id: 'dashboard', icon: 'house', label: 'Dashboard', 
         show: (!isFinance && !isMitraAny && !isManager) || isOwner}
      ]
    },
    {
      section: 'OPERASIONAL',
      items: [
        {id: 'absensi', icon: 'calendar-check', label: 'Absensi', 
         show: !isMitraAny && !isManager},
        {id: 'cs', icon: 'headset', label: 'CS Portal', 
         show: isCS || isCSMitra,
         submenu: [
           {id: 'buat-wo', label: 'Buat WO', icon: 'plus'},
           {id: 'list-tiket', label: 'List Tiket', icon: 'list'}
         ]},
        {id: 'tugas', icon: 'list-check', label: 'Tugas', 
         show: isTek || isTekMitra,
         badge: 3},
        {id: 'material', icon: 'boxes-packing', label: 'Material', 
         show: isTek || isTekMitra},
        {id: 'noc', icon: 'tower-cell', label: 'NOC', 
         show: isNOC || isNOCMitra},
        {id: 'kpi', icon: 'ranking-star', label: 'KPI', 
         show: isOwner}
      ]
    },
    {
      section: 'ADMIN',
      items: [
        {id: 'admin', icon: isAssetOnly ? 'boxes-packing' : 'user-gear', 
         label: isAssetOnly ? 'Asset' : 'Admin', 
         show: isAdmin || isAssetOnly,
         submenu: !isAssetOnly ? [
           {id: 'list-tiket', label: 'List Tiket', icon: 'list'},
           {id: 'tambah-perangkat', label: 'Tambah Perangkat', icon: 'plus'},
           {id: 'list-perangkat', label: 'List Perangkat', icon: 'boxes-packing'},
           {id: 'odp', label: 'ODP', icon: 'tower-broadcast'},
           {id: 'jadwal-shift', label: 'Jadwal Shift', icon: 'calendar-days'},
           {id: 'konfirmasi-bayar', label: 'Konfirmasi Bayar', icon: 'check-circle'},
           {id: 'area-mitra', label: 'Area Mitra', icon: 'map-location-dot'}
         ] : [
           {id: 'list-perangkat', label: 'List Perangkat', icon: 'boxes-packing'},
           {id: 'list-rusak', label: 'Rusak', icon: 'wrench'}
         ]},
        {id: 'spv', icon: 'user-tie', label: 'Supervisor', 
         show: isSupervisorOnly},
        {id: 'manager', icon: 'file-invoice', label: 'Manager', 
         show: isManager},
        {id: 'kelolaakun', icon: 'users-gear', label: 'Kelola Akun', 
         show: isSupervisor}
      ]
    },
    {
      section: 'MITRA',
      items: [
        {id: 'invoice-mitra', icon: 'file-invoice', label: 'Invoice/BAPS', 
         show: isKoordinator},
        {id: 'perangkat-mitra', icon: 'laptop', label: 'Perangkat', 
         show: isKoordinator},
        {id: 'approval-perangkat-mitra', icon: 'clipboard-check', label: 'Approval Pickup', 
         show: isKoordinator}
      ]
    }
  ];
}

// ── BUILD SIDEBAR ─────────────────────────────────────
function buildSidebar() {
  if(!currentUser) return;
  
  const roleFlags = getRoleFlags(currentUser.role);
  const menuStructure = getMenuStructure(roleFlags);
  const sidebarNav = document.querySelector('.sidebar-nav');
  
  if(!sidebarNav) return;
  
  let html = '';
  menuStructure.forEach(section => {
    const visibleItems = section.items.filter(item => item.show);
    if(visibleItems.length === 0) return;
    
    html += `<div class="nav-section-label">${section.section}</div>`;
    
    visibleItems.forEach(item => {
      if(item.submenu) {
        html += `
          <a href="#" class="nav-item" onclick="toggleSubMenu(this); return false;">
            <span class="nav-icon"><i class="fa-solid fa-${item.icon}"></i></span>
            <span class="nav-label">${item.label}</span>
            ${item.badge ? `<span class="nav-badge">${item.badge}</span>` : ''}
            <span class="nav-arrow"><i class="fa-solid fa-chevron-right"></i></span>
          </a>
          <div class="nav-submenu">
            ${item.submenu.map(sub => `
              <a href="#" class="nav-item" onclick="switchSection('${sub.id}'); return false;">
                <span class="nav-icon"><i class="fa-solid fa-${sub.icon}"></i></span>
                <span class="nav-label">${sub.label}</span>
              </a>
            `).join('')}
          </div>
        `;
      } else {
        html += `
          <a href="#" class="nav-item ${item.id === 'dashboard' ? 'active' : ''}" 
             onclick="switchSection('${item.id}'); return false;">
            <span class="nav-icon"><i class="fa-solid fa-${item.icon}"></i></span>
            <span class="nav-label">${item.label}</span>
            ${item.badge ? `<span class="nav-badge">${item.badge}</span>` : ''}
          </a>
        `;
      }
    });
  });
  
  // Tambah menu sistem
  html += `
    <div class="nav-section-label">SISTEM</div>
    <a href="#" class="nav-item" onclick="switchSection('notifikasi'); return false;">
      <span class="nav-icon"><i class="fa-solid fa-bell"></i></span>
      <span class="nav-label">Notifikasi</span>
    </a>
    <a href="#" class="nav-item" onclick="logout(); return false;">
      <span class="nav-icon"><i class="fa-solid fa-right-from-bracket"></i></span>
      <span class="nav-label">Keluar</span>
    </a>
  `;
  
  sidebarNav.innerHTML = html;
}

// ── INIT APP ──────────────────────────────────────────
function initApp() {
  const userData = localStorage.getItem('sinu_v2_user');
  if(!userData) {
    window.location.href = 'login.html';
    return;
  }
  
  currentUser = JSON.parse(userData);
  document.getElementById('topbar-username').textContent = currentUser.name || currentUser.username;
  
  // Build role-based sidebar
  buildSidebar();
  
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
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
  
  const targetSection = document.getElementById('section-' + sectionName);
  if(targetSection) {
    targetSection.classList.add('active');
    
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
    const { data: karyawan, error: errKaryawan } = await supa.from('karyawan').select('*');
    if(!errKaryawan && karyawan) {
      employeeMaster = karyawan;
      console.log('Employee master loaded:', employeeMaster.length);
    }
    
    const { data: wo, error: errWO } = await supa.from('work_orders').select('*');
    if(!errWO && wo) {
      kpiWOData = wo;
      console.log('WO data loaded:', kpiWOData.length);
    }
    
    if(typeof loadAllAbsensiPoints === 'function') {
      const now = new Date();
      await loadAllAbsensiPoints(now.getMonth(), now.getFullYear());
      console.log('Absensi points loaded');
    }
    
    if(typeof renderDashboard === 'function') {
      renderDashboard();
    }
    
  } catch(e) {
    console.error('Error loading initial data:', e);
  }
}

// ── RENDER DASHBOARD ──────────────────────────────────
function renderDashboard() {
  updateStatCards();
  if(typeof updateRecapTable === 'function') {
    updateRecapTable();
  }
}

// ── UPDATE STAT CARDS ─────────────────────────────────
function updateStatCards() {
  const today = new Date().toISOString().slice(0,10);
  if(typeof supa !== 'undefined') {
    supa.from('absensi').select('*').eq('tanggal', today).then(({data}) => {
      const hadirEl = document.querySelector('.stat-card:nth-child(1) .stat-card-value');
      if(hadirEl && data) hadirEl.textContent = data.length;
    });
  }
  
  if(kpiWOData.length) {
    const tugasAktif = kpiWOData.filter(wo => wo.status !== 'done' && wo.status !== 'closed').length;
    const tugasEl = document.querySelector('.stat-card:nth-child(2) .stat-card-value');
    if(tugasEl) tugasEl.textContent = tugasAktif;
  }
  
  const thisMonth = new Date().getMonth();
  const thisYear = new Date().getFullYear();
  const woSelesai = kpiWOData.filter(wo => {
    if(!wo.t4) return false;
    const t4Date = new Date(wo.t4);
    return t4Date.getMonth() === thisMonth && t4Date.getFullYear() === thisYear;
  }).length;
  const woEl = document.querySelector('.stat-card:nth-child(3) .stat-card-value');
  if(woEl) woEl.textContent = woSelesai;
}

// ── SHOW ALERT ────────────────────────────────────────
function showAlert(message, title = 'Notifikasi') {
  alert(title + '\n\n' + message);
}

// ── INIT ON DOM READY ─────────────────────────────────
window.addEventListener('DOMContentLoaded', initApp);
