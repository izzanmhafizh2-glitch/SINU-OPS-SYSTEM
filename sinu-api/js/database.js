// ===================== API CONFIG =====================
const API_BASE = '';

// ===================== AUTH FUNCTIONS =====================
async function handleLogin(event) {
  event.preventDefault();
  
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value.trim();
  const errorDiv = document.getElementById('login-error');
  const btnLogin = document.getElementById('btn-login');
  
  if(!username || !password) {
    if(errorDiv) {
      errorDiv.querySelector('#login-error-msg').textContent = 'Username dan password wajib diisi!';
      errorDiv.classList.remove('hidden');
    }
    return;
  }
  
  // Disable button while loading
  if(btnLogin) {
    btnLogin.disabled = true;
    btnLogin.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Memproses...';
  }
  
  try {
    const res = await fetch(`${API_BASE}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const data = await res.json();
    
    if(data.success && data.user) {
      currentUser = data.user;
      sinuSavePersistentSession(currentUser);
      loadMainApp();
      if(errorDiv) errorDiv.classList.add('hidden');
    } else {
      throw new Error(data.message || 'Login gagal');
    }
  } catch(err) {
    console.error('[Login Error]', err);
    if(errorDiv) {
      errorDiv.querySelector('#login-error-msg').textContent = err.message || 'Username atau password salah.';
      errorDiv.classList.remove('hidden');
    }
  } finally {
    if(btnLogin) {
      btnLogin.disabled = false;
      btnLogin.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i><span>Masuk ke Sistem</span>';
    }
  }
}

// ===================== DATABASE FUNCTIONS =====================
// Helper functions for common API calls

async function fetchWorkOrders(status = null, type = null, month = null, year = null) {
  let url = `${API_BASE}/api/work-orders`;
  const params = new URLSearchParams();
  if(status) params.append('status', status);
  if(type) params.append('tipe', type);
  if(month) params.append('bulan', month);
  if(year) params.append('tahun', year);
  if(params.toString()) url += '?' + params.toString();
  
  try {
    const res = await fetch(url);
    return await res.json();
  } catch(e) {
    console.error('[fetchWorkOrders]', e);
    return [];
  }
}

async function fetchODP() {
  try {
    const res = await fetch(`${API_BASE}/api/odp`);
    return await res.json();
  } catch(e) {
    console.error('[fetchODP]', e);
    return [];
  }
}

async function fetchAttendance(date) {
  try {
    const res = await fetch(`${API_BASE}/api/attendance/${date}`);
    return await res.json();
  } catch(e) {
    console.error('[fetchAttendance]', e);
    return null;
  }
}

async function fetchEmployees() {
  try {
    const res = await fetch(`${API_BASE}/api/employees`);
    return await res.json();
  } catch(e) {
    console.error('[fetchEmployees]', e);
    return [];
  }
}

async function fetchMaterials() {
  try {
    const res = await fetch(`${API_BASE}/api/materials`);
    return await res.json();
  } catch(e) {
    console.error('[fetchMaterials]', e);
    return [];
  }
}

// Export for use in other modules
window.sinuAPI = {
  handleLogin,
  fetchWorkOrders,
  fetchODP,
  fetchAttendance,
  fetchEmployees,
  fetchMaterials
};
