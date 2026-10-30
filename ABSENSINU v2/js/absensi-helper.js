// =====================================================
//  ABSENSINU v2 - Absensi Section Helpers
// =====================================================

function initAbsensiSection() {
  // Auto-fill nama
  const namaEl = document.getElementById('absen-nama');
  if(namaEl && currentUser) {
    namaEl.value = currentUser.name || currentUser.displayName || currentUser.username;
  }
  
  // Set tanggal dan jam sekarang
  const now = new Date();
  const tanggalEl = document.getElementById('absen-tanggal');
  const jamEl = document.getElementById('absen-jam');
  if(tanggalEl) tanggalEl.value = now.toISOString().slice(0,10);
  if(jamEl) jamEl.value = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
  
  // Load riwayat
  loadRiwayatAbsensi();
}

function showAbsenForm() {
  document.getElementById('absensi-form-container').style.display = 'block';
}

function showIzinForm() {
  showAlert('Form izin sakit akan ditambahkan', 'Info');
}

function showCutiForm() {
  showAlert('Form cuti akan ditambahkan', 'Info');
}

function showJadwalAbsensi() {
  showAlert('Jadwal absensi akan ditampilkan', 'Info');
}

async function submitAbsensi(e) {
  e.preventDefault();
  
  if(typeof supa === 'undefined') {
    showAlert('Supabase belum ter-inisialisasi', 'Error');
    return;
  }
  
  const nama = document.getElementById('absen-nama').value;
  const tanggal = document.getElementById('absen-tanggal').value;
  const jam = document.getElementById('absen-jam').value;
  const lokasi = document.getElementById('absen-lokasi').value || 'Kantor';
  
  // Cek jadwal untuk hitung poin
  const jamMasuk = '08:00'; // Default, akan diambil dari jadwal nanti
  const jamParts = jam.split(':').map(Number);
  const jadwalParts = jamMasuk.split(':').map(Number);
  const selisih = (jamParts[0] * 60 + jamParts[1]) - (jadwalParts[0] * 60 + jadwalParts[1]);
  
  let status, poin;
  if(selisih <= 0) {
    status = 'TEPAT WAKTU';
    poin = 100;
  } else if(selisih <= 15) {
    status = 'TOLERANSI';
    poin = 90;
  } else if(selisih <= 30) {
    status = 'TERLAMBAT';
    poin = 70;
  } else {
    status = 'SANGAT TERLAMBAT';
    poin = 50;
  }
  
  try {
    const { data, error } = await supa.from('absensi').insert([{
      nama,
      tanggal,
      jam_masuk: jam,
      lokasi,
      status_kehadiran: status,
      point: poin,
      created_at: new Date().toISOString()
    }]);
    
    if(error) throw error;
    
    showAlert('Absensi berhasil dicatat!', 'Sukses');
    document.getElementById('form-absensi').reset();
    loadRiwayatAbsensi();
    
  } catch(err) {
    showAlert('Error: ' + err.message, 'Error');
  }
}

async function loadRiwayatAbsensi() {
  if(typeof supa === 'undefined' || !currentUser) return;
  
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0,10);
  
  try {
    const { data, error } = await supa.from('absensi')
      .select('*')
      .ilike('nama', currentUser.name || currentUser.displayName || currentUser.username)
      .gte('tanggal', startOfMonth)
      .lte('tanggal', endOfMonth)
      .order('tanggal', { ascending: false });
    
    if(error) throw error;
    
    const tbody = document.getElementById('riwayat-absensi-table');
    if(!tbody) return;
    
    if(!data || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#94a3b8; padding:20px;">Belum ada data absensi</td></tr>';
      return;
    }
    
    tbody.innerHTML = data.map(row => {
      const statusColor = row.status_kehadiran === 'TEPAT WAKTU' ? '#10b981' : row.status_kehadiran === 'TOLERANSI' ? '#3b82f6' : '#f59e0b';
      return `
        <tr>
          <td>${new Date(row.tanggal).toLocaleDateString('id-ID')}</td>
          <td>${row.jam_masuk || '-'}</td>
          <td>${row.jam_keluar || '-'}</td>
          <td><span class="badge" style="background-color:${statusColor}15; color:${statusColor};">${row.status_kehadiran}</span></td>
          <td style="font-weight:700;">${row.point || 0}</td>
        </tr>
      `;
    }).join('');
    
  } catch(err) {
    console.error('Error loading riwayat:', err);
  }
}
