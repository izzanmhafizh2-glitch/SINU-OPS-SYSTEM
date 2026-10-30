// =====================================================
//  ABSENSINU v2 - Tugas Section Helpers
// =====================================================

function initTugasSection() {
  loadPickupTugas();
  loadTugasSaya();
}

function showPickupTugas() {
  document.getElementById('pickup-tugas-container').style.display = 'block';
  document.getElementById('tugas-saya-container').style.display = 'none';
  loadPickupTugas();
}

function showTugasSaya() {
  document.getElementById('pickup-tugas-container').style.display = 'none';
  document.getElementById('tugas-saya-container').style.display = 'block';
  loadTugasSaya();
}

function showRiwayatTugas() {
  showAlert('Riwayat tugas akan ditampilkan', 'Info');
}

async function loadPickupTugas() {
  if(typeof supa === 'undefined') return;
  
  try {
    const { data, error } = await supa.from('work_orders')
      .select('*')
      .eq('status', 'release')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if(error) throw error;
    
    const container = document.getElementById('pickup-tugas-list');
    if(!container) return;
    
    if(!data || data.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding:40px 20px; color:#94a3b8;">
          <i class="fa-solid fa-inbox" style="font-size:48px; margin-bottom:12px;"></i>
          <p>Tidak ada tiket release tersedia</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = data.map(wo => `
      <div class="card" style="border:1px solid #e2e8f0;">
        <div class="card-body">
          <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:8px;">
            <div>
              <div style="font-weight:700; font-size:14px; color:#0f172a;">#${wo.wo_id || wo.id}</div>
              <div style="font-size:12px; color:#64748b; margin-top:2px;">${wo.pelanggan_nama || '-'}</div>
            </div>
            <span class="badge badge-amber">${wo.tipe || 'UNKNOWN'}</span>
          </div>
          <div style="font-size:12.5px; color:#475569; margin-bottom:12px;">${wo.alamat || '-'}</div>
          <button class="btn btn-primary btn-sm" onclick="pickupWO('${wo.id}')">
            <i class="fa-solid fa-hand-pointer"></i> Pickup
          </button>
        </div>
      </div>
    `).join('');
    
  } catch(err) {
    console.error('Error loading pickup tugas:', err);
  }
}

async function loadTugasSaya() {
  if(typeof supa === 'undefined' || !currentUser) return;
  
  try {
    const { data, error } = await supa.from('work_orders')
      .select('*')
      .or(`teknisi_1.ilike.%${currentUser.name || currentUser.username}%,teknisi_2.ilike.%${currentUser.name || currentUser.username}%`)
      .in('status', ['on_progress', 'assigned'])
      .order('created_at', { ascending: false });
    
    if(error) throw error;
    
    const container = document.getElementById('tugas-saya-list');
    if(!container) return;
    
    if(!data || data.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding:40px 20px; color:#94a3b8;">
          <p>Anda belum memiliki tugas aktif</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = data.map(wo => `
      <div class="card" style="border:1px solid #e2e8f0;">
        <div class="card-body">
          <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:8px;">
            <div>
              <div style="font-weight:700; font-size:14px; color:#0f172a;">#${wo.wo_id || wo.id}</div>
              <div style="font-size:12px; color:#64748b; margin-top:2px;">${wo.pelanggan_nama || '-'}</div>
            </div>
            <span class="badge badge-blue">${wo.status}</span>
          </div>
          <div style="font-size:12.5px; color:#475569; margin-bottom:12px;">${wo.alamat || '-'}</div>
          <div style="display:flex; gap:8px;">
            <button class="btn btn-primary btn-sm" onclick="openWODetail('${wo.id}')">
              <i class="fa-solid fa-eye"></i> Detail
            </button>
            <button class="btn btn-amber btn-sm" onclick="completeWO('${wo.id}')">
              <i class="fa-solid fa-check"></i> Selesaikan
            </button>
          </div>
        </div>
      </div>
    `).join('');
    
  } catch(err) {
    console.error('Error loading tugas saya:', err);
  }
}

async function pickupWO(woId) {
  if(!confirm('Pickup WO ini?')) return;
  
  if(typeof supa === 'undefined') return;
  
  try {
    const { error } = await supa.from('work_orders')
      .update({
        teknisi_1: currentUser.name || currentUser.username,
        status: 'assigned',
        t2: new Date().toISOString()
      })
      .eq('id', woId);
    
    if(error) throw error;
    
    showAlert('WO berhasil di-pickup!', 'Sukses');
    loadPickupTugas();
    
  } catch(err) {
    showAlert('Error: ' + err.message, 'Error');
  }
}

function openWODetail(woId) {
  showAlert('Detail WO ' + woId + ' akan ditampilkan', 'Info');
}

function completeWO(woId) {
  showAlert('Form penyelesaian WO akan dibuka', 'Info');
}
