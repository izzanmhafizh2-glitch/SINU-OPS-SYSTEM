// ===================== MATERIAL =====================
const REGISTERED_SN=['SN-ONT-99201','SN-ONT-99202','KBL-150M-01'];
let snStream=null;
function toggleSNCamera(){
  const wrap=document.getElementById('sn-camera-wrap'),video=document.getElementById('sn-video'),btn=document.getElementById('btn-sn-cam');
  if(!wrap)return;
  if(wrap.classList.contains('hidden')){wrap.classList.remove('hidden');btn.innerHTML='<i class="fa-solid fa-stop"></i>Stop';navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}}).then(s=>{snStream=s;video.srcObject=s;}).catch(()=>{showAlert('Tidak bisa akses kamera.');wrap.classList.add('hidden');});}
  else{wrap.classList.add('hidden');btn.innerHTML='<i class="fa-solid fa-camera"></i>Kamera';if(snStream){snStream.getTracks().forEach(t=>t.stop());snStream=null;}}
}
async function checkAndScanSN(){
  const sn=document.getElementById('scan-sn-input').value.trim().toUpperCase();
  const card=document.getElementById('scan-result-card'),stat=document.getElementById('scan-result-status'),det=document.getElementById('scan-result-details'),btn=document.getElementById('btn-submit-pickup-mat');
  if(!sn){showAlert('Masukkan atau scan SN perangkat!');return;}
  card.classList.remove('hidden');
  stat.className='text-xs font-bold text-slate-500';stat.innerText='Mengecek SN...';det.innerText='';btn.classList.add('hidden');

  const myName = currentUser ? currentUser.displayName : '';

  try {
    const {data,error}=await supa.from('perangkat').select('sn,jenis,merk,kondisi,status,lokasi').eq('sn',sn).maybeSingle();
    if(!error&&data){
      // Cek apakah SN sedang dipegang teknisi lain (bukan Gudang)
      const isGudang = data.status==='Gudang' || data.lokasi==='Gudang Utama' || data.lokasi==='Gudang';
      if(!isGudang) {
        const pemilik = data.lokasi || data.status;
        const isPelanggan = pemilik && pemilik.startsWith('Pelanggan:');
        const namaPlg = isPelanggan ? pemilik.replace('Pelanggan:','').trim() : pemilik;

        if(isPelanggan) {
          // SN sudah terpasang di pelanggan
          card.className='p-4 rounded-2xl border border-rose-200 bg-rose-50 dark:bg-rose-950/40';
          stat.className='text-xs font-bold text-rose-700 dark:text-rose-400';
          stat.innerText='Sudah terpasang di pelanggan: '+namaPlg;
          det.innerText=`SN: ${data.sn} | Jenis: ${data.jenis||'-'} | Status: Terpasang di ${namaPlg}`;
          btn.classList.add('hidden');
        } else if(pemilik && pemilik.toLowerCase() !== myName.toLowerCase()) {
          // SN di teknisi lain
          card.className='p-4 rounded-2xl border border-rose-200 bg-rose-50 dark:bg-rose-950/40';
          stat.className='text-xs font-bold text-rose-700 dark:text-rose-400';
          stat.innerText='SN sudah di-pickup oleh '+pemilik;
          det.innerText=`SN: ${data.sn} | Jenis: ${data.jenis||'-'} | Sedang dipegang: ${pemilik}`;
          btn.classList.add('hidden');
        } else if(pemilik && pemilik.toLowerCase() === myName.toLowerCase()) {
          // SN sudah milik saya sendiri
          card.className='p-4 rounded-2xl border border-blue-200 bg-blue-50 dark:bg-blue-950/40';
          stat.className='text-xs font-bold text-blue-700 dark:text-blue-400';
          stat.innerText='ℹ SN sudah ada di perangkat Anda';
          det.innerText=`SN: ${data.sn} | Jenis: ${data.jenis||'-'} | Sudah di-pickup sebelumnya`;
          btn.classList.add('hidden');
        } else {
          card.className='p-4 rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-950/40';
          stat.className='text-xs font-bold text-amber-700 dark:text-amber-400';
          stat.innerText='⚠ SN Terdaftar Tapi Tidak Di Gudang';
          det.innerText=`SN: ${data.sn} | Status: ${data.status} | Lokasi: ${data.lokasi||'-'}`;
          btn.classList.add('hidden');
        }
      } else {
        // SN tersedia di gudang — cek juga apakah ada request WAITING dari orang lain
        const {data: req} = await supa.from('pickup_requests')
          .select('teknisi_name, status')
          .eq('sn', sn).eq('status','WAITING').maybeSingle();

        if(req && req.teknisi_name && req.teknisi_name.toLowerCase() !== myName.toLowerCase()) {
          card.className='p-4 rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-950/40';
          stat.className='text-xs font-bold text-amber-700 dark:text-amber-400';
          stat.innerText='⚠ SN sedang dalam antrian approval '+req.teknisi_name;
          det.innerText=`SN: ${data.sn} | Sudah di-request oleh: ${req.teknisi_name} (menunggu approval)`;
          btn.classList.add('hidden');
        } else {
          card.className='p-4 rounded-2xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40';
          stat.className='text-xs font-bold text-emerald-700 dark:text-emerald-400';
          stat.innerText='✓ SN Terdaftar & Tersedia Di Gudang';
          det.innerText=`SN: ${data.sn} | Jenis: ${data.jenis||'-'} | Merk: ${data.merk||'-'} | Kondisi: ${data.kondisi||'-'}`;
          btn.classList.remove('hidden');
        }
      }
    } else {
      card.className='p-4 rounded-2xl border border-rose-200 bg-rose-50 dark:bg-rose-950/40';
      stat.className='text-xs font-bold text-rose-700 dark:text-rose-400';
      stat.innerText='✕ SN Belum Terdaftar!';
      det.innerText='SN '+sn+' tidak ada di database gudang.';
      btn.classList.add('hidden');
    }
  } catch(e){
    card.className='p-4 rounded-2xl border border-rose-200 bg-rose-50 dark:bg-rose-950/40';
    stat.className='text-xs font-bold text-rose-700 dark:text-rose-400';
    stat.innerText='✕ Gagal mengecek SN';
    det.innerText='Cek koneksi internet.';
    btn.classList.add('hidden');
  }
}
// checkAndScanSN versi async Supabase ada di atas

async function submitPickupMaterial(){
  const sn = document.getElementById('scan-sn-input').value.trim().toUpperCase();
  const teknisiName = currentUser ? currentUser.displayName : '';
  const det = document.getElementById('scan-result-details');
  const jenis = det ? (det.innerText.match(/Jenis:\s*([^|]+)/)?.[1]||'').trim() : '';

  if(!sn) { showAlert('SN tidak boleh kosong.'); return; }

  const btn = document.getElementById('btn-submit-pickup-mat');
  const origHtml = btn ? btn.innerHTML : '';
  if(btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner animate-spin"></i> Mengirim...'; }

  try {
    // Cek apakah sudah ada request pending untuk SN ini dari teknisi ini
    const { data: existing } = await supa
      .from('pickup_requests')
      .select('id, status')
      .eq('sn', sn)
      .eq('teknisi_name', teknisiName)
      .eq('status', 'WAITING')
      .maybeSingle();

    if(existing) {
      showAlert(`SN "${sn}" sudah ada dalam antrian approval.\nTunggu konfirmasi dari Admin.`, 'Sudah Ada ⏳');
      if(btn) { btn.disabled = false; btn.innerHTML = origHtml; }
      return;
    }

    // Insert request pickup ke DB
    const { data: inserted, error } = await supa.from('pickup_requests').insert({
      sn,
      jenis: jenis || '-',
      teknisi_name: teknisiName,
      status: 'WAITING'
    }).select('id').single();
    if(error) throw error;

    // Update status UI di teknisi
    const statusEl2 = document.getElementById('scan-result-card');
    if(statusEl2) statusEl2.className = 'p-4 rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-950/40';
    const statusText = document.getElementById('scan-result-status');
    if(statusText) {
      statusText.className = 'text-xs font-bold text-amber-700 dark:text-amber-400';
      statusText.innerText = '⏳ Menunggu Approval Admin...';
    }
    if(btn) btn.style.display = 'none';
    document.getElementById('scan-sn-input').value = '';
    showAlert(`Request pickup SN "${sn}" terkirim ke Admin.\nStatus: Menunggu Approval`, 'Waiting Approval ⏳');

    // Refresh waiting list
    if(typeof loadWaitingApproval === 'function') loadWaitingApproval();

    // Polling cek status setiap 5 detik
    if(inserted?.id) {
      let _pickupPoll = setInterval(async () => {
        try {
          const { data } = await supa.from('pickup_requests')
            .select('status').eq('id', inserted.id).maybeSingle();
          if(!data) return;
          if(data.status === 'APPROVED') {
            clearInterval(_pickupPoll);
            // Toast notif
            showToast('Pickup Disetujui ✅', 'SN '+sn+' sudah masuk ke Perangkat Saya.', 'success');
            // Reset form agar bisa pickup lagi
            const card = document.getElementById('scan-result-card');
            const stat = document.getElementById('scan-result-status');
            const det  = document.getElementById('scan-result-details');
            const btn2 = document.getElementById('btn-submit-pickup-mat');
            if(card) card.classList.add('hidden');
            if(btn2) { btn2.style.display=''; btn2.disabled=false; }
            document.getElementById('scan-sn-input').value = '';
            if(typeof loadListPerangkatSaya === 'function') loadListPerangkatSaya();
            if(typeof loadWaitingApproval   === 'function') loadWaitingApproval();
          } else if(data.status === 'REJECTED') {
            clearInterval(_pickupPoll);
            showToast('Pickup Ditolak ❌', 'Request SN '+sn+' ditolak Admin.', 'error');
            // Reset form
            const card = document.getElementById('scan-result-card');
            if(card) card.classList.add('hidden');
            const btn2 = document.getElementById('btn-submit-pickup-mat');
            if(btn2) { btn2.style.display=''; btn2.disabled=false; }
            document.getElementById('scan-sn-input').value = '';
          }
        } catch(e) { /* silent */ }
      }, 5000);
    }

  } catch(err) {
    showAlert('Gagal kirim request: ' + (err.message || ''), 'Error');
  }

  if(btn) { btn.disabled = false; btn.innerHTML = origHtml; }
}

async function executeSendMaterial(){
  const sn = document.getElementById('send-sn-select')?.value;
  const target = document.getElementById('send-target-teknisi')?.value;
  const statusEl = document.getElementById('send-status');
  const btn = document.getElementById('btn-send-material');

  if(!sn) { showAlert('Pilih perangkat yang akan dikirim.'); return; }
  if(!target) { showAlert('Pilih teknisi tujuan.'); return; }

  const dari = currentUser ? currentUser.displayName : '';
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner animate-spin"></i> Mengirim...';

  try {
    const { data: inserted, error } = await supa.from('material_requests').insert({
      type: 'SEND', sn, dari_teknisi: dari, ke_teknisi: target, status: 'WAITING'
    }).select('id').single();
    if(error) throw error;

    if(statusEl) {
      statusEl.className = 'flex items-center gap-3 p-3 rounded-xl border bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800';
      statusEl.classList.remove('hidden');
      statusEl.innerHTML = '<i class="fa-solid fa-spinner animate-spin text-amber-500"></i><div><p class="text-xs font-extrabold text-amber-700 dark:text-amber-300">Menunggu Approval Admin</p><p class="text-[11px] text-slate-500">SN '+sn+' → '+target+'</p></div>';
    }
    btn.style.display = 'none';
    showAlert('Request send SN "'+sn+'" ke '+target+' terkirim.\nMenunggu approval admin.', 'Waiting Approval ⏳');

    // Polling cek status setiap 5 detik
    if(inserted?.id) _pollMaterialRequest(inserted.id, statusEl);

  } catch(err) {
    showAlert('Gagal: ' + (err.message || ''), 'Error');
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i>Kirim (Butuh Approval Admin)';
  }
}

async function executeReturnMaterial(){
  const sn = document.getElementById('return-sn-select')?.value;
  const alasan = document.getElementById('return-alasan')?.value.trim();
  const statusEl = document.getElementById('return-status');
  const btn = document.getElementById('btn-return-material');

  if(!sn) { showAlert('Pilih perangkat yang akan di-return.'); return; }
  if(!alasan) { showAlert('Isi alasan return terlebih dahulu.'); return; }

  const dari = currentUser ? currentUser.displayName : '';
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner animate-spin"></i> Mengirim...';

  try {
    const { data: inserted, error } = await supa.from('material_requests').insert({
      type: 'RETURN', sn, dari_teknisi: dari, alasan, status: 'WAITING'
    }).select('id').single();
    if(error) throw error;

    if(statusEl) {
      statusEl.className = 'flex items-center gap-3 p-3 rounded-xl border bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800';
      statusEl.classList.remove('hidden');
      statusEl.innerHTML = '<i class="fa-solid fa-spinner animate-spin text-amber-500"></i><div><p class="text-xs font-extrabold text-amber-700 dark:text-amber-300">Menunggu Approval Admin</p><p class="text-[11px] text-slate-500">Return SN '+sn+' ke Gudang</p></div>';
    }
    btn.style.display = 'none';
    showAlert('Request return SN "'+sn+'" terkirim.\nMenunggu approval admin.', 'Waiting Approval ⏳');

    // Polling cek status setiap 5 detik
    if(inserted?.id) _pollMaterialRequest(inserted.id, statusEl);

  } catch(err) {
    showAlert('Gagal: ' + (err.message || ''), 'Error');
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-rotate-left"></i>Return Ke Gudang (Butuh Approval Admin)';
  }
}

// Polling status material request setiap 5 detik
let _matPollInterval = null;
function _pollMaterialRequest(id, statusEl) {
  if(_matPollInterval) clearInterval(_matPollInterval);
  _matPollInterval = setInterval(async () => {
    try {
      const { data } = await supa.from('material_requests')
        .select('status, type, sn').eq('id', id).maybeSingle();
      if(!data) return;
      if(data.status === 'APPROVED') {
        clearInterval(_matPollInterval); _matPollInterval = null;
        // Toast notif
        const msg = data.type === 'RETURN'
          ? 'SN '+data.sn+' berhasil dikembalikan ke Gudang.'
          : 'SN '+data.sn+' berhasil dikirim ke teknisi tujuan.';
        showToast(data.type === 'RETURN' ? 'Return Disetujui ✅' : 'Send Disetujui ✅', msg, 'success');
        // Sembunyikan status card
        if(statusEl) statusEl.classList.add('hidden');
        // Reset form agar bisa kirim lagi
        const btnSend   = document.getElementById('btn-send-material');
        const btnReturn = document.getElementById('btn-return-material');
        const sendSel   = document.getElementById('send-sn-select');
        const retSel    = document.getElementById('return-sn-select');
        const retAls    = document.getElementById('return-alasan');
        if(btnSend)   { btnSend.style.display=''; btnSend.disabled=false; btnSend.innerHTML='<i class="fa-solid fa-paper-plane"></i>Kirim (Butuh Approval Admin)'; }
        if(btnReturn) { btnReturn.style.display=''; btnReturn.disabled=false; btnReturn.innerHTML='<i class="fa-solid fa-rotate-left"></i>Return Ke Gudang (Butuh Approval Admin)'; }
        if(sendSel)   sendSel.value = '';
        if(retSel)    retSel.value = '';
        if(retAls)    retAls.value = '';
        // Refresh data
        if(typeof loadListPerangkatSaya    === 'function') loadListPerangkatSaya();
        if(typeof loadSendReturnDropdowns  === 'function') loadSendReturnDropdowns();
      } else if(data.status === 'REJECTED') {
        clearInterval(_matPollInterval); _matPollInterval = null;
        showToast(data.type === 'RETURN' ? 'Return Ditolak ❌' : 'Send Ditolak ❌',
          'Request SN '+data.sn+' ditolak Admin.', 'error');
        if(statusEl) statusEl.classList.add('hidden');
        // Reset tombol
        const btnSend   = document.getElementById('btn-send-material');
        const btnReturn = document.getElementById('btn-return-material');
        if(btnSend)   { btnSend.style.display=''; btnSend.disabled=false; btnSend.innerHTML='<i class="fa-solid fa-paper-plane"></i>Kirim (Butuh Approval Admin)'; }
        if(btnReturn) { btnReturn.style.display=''; btnReturn.disabled=false; btnReturn.innerHTML='<i class="fa-solid fa-rotate-left"></i>Return Ke Gudang (Butuh Approval Admin)'; }
      }
    } catch(e) { /* silent */ }
  }, 5000);
}

// Load dropdown SN milik teknisi untuk Send & Return
async function loadSendReturnDropdowns() {
  const selSend   = document.getElementById('send-sn-select');
  const selReturn = document.getElementById('return-sn-select');
  const selTarget = document.getElementById('send-target-teknisi');
  const nama = currentUser ? currentUser.displayName : '';

  try {
    // Load perangkat milik teknisi ini — pakai kolom yang ada di perangkat_teknisi
    const { data: milik } = await supa.from('perangkat_teknisi')
      .select('sn, jenis, kondisi, panjang_sisa').eq('teknisi_name', nama).eq('status', 'READY');
    const opts = (milik||[]).map(p => {
      const isKabel = p.jenis && p.jenis.toLowerCase().includes('kabel');
      const sisa = isKabel && p.panjang_sisa != null ? ` — ${p.panjang_sisa}m` : '';
      return `<option value="${p.sn}">${p.sn}${p.jenis?' ('+p.jenis+')':''}${sisa}</option>`;
    }).join('');
    const emptyOpt = '<option value="" disabled selected>-- Pilih SN --</option>';

    if(selSend)   selSend.innerHTML   = emptyOpt + (opts || '<option disabled>Belum ada perangkat</option>');
    if(selReturn) selReturn.innerHTML = emptyOpt + (opts || '<option disabled>Belum ada perangkat</option>');

    // Load daftar teknisi lain untuk target send
    if(selTarget) {
      const { data: akuns } = await supa.from('akun')
        .select('display_name').eq('role','teknisi').neq('display_name', nama);
      const targetOpts = (akuns||[]).map(a =>
        `<option value="${a.display_name}">${a.display_name}</option>`
      ).join('');
      selTarget.innerHTML = '<option value="" disabled selected>-- Pilih Teknisi --</option>' +
        (targetOpts || '<option disabled>Tidak ada teknisi lain</option>');
    }
  } catch(e) { console.warn('[loadSendReturnDropdowns]', e.message); }
}