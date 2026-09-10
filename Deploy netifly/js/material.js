// ===================== MATERIAL =====================
const REGISTERED_SN=['SN-ONT-99201','SN-ONT-99202','KBL-150M-01'];
let snStream=null;
let _pickupDrafts=[];
let _pickupScanData=null;
let _materialPolls=new Map();

function _makeMaterialBatchId(prefix){
  const random = (window.crypto && typeof window.crypto.randomUUID === 'function')
    ? window.crypto.randomUUID() : Date.now()+'-'+Math.random().toString(36).slice(2);
  return prefix+'-'+random;
}

function _selectedValues(id){
  const el=document.getElementById(id);
  return el ? Array.from(el.selectedOptions || []).map(o=>o.value).filter(Boolean) : [];
}

async function _insertMaterialBatch(table, rows){
  let result=await supa.from(table).insert(rows).select('id, sn, status');
  // batch_id adalah kolom tambahan yang dapat dipasang lewat SQL migration. Fallback
  // menjaga fitur tetap kompatibel sebelum migration dijalankan.
  if(result.error && /batch_id|column .* does not exist/i.test(result.error.message||'')){
    result=await supa.from(table).insert(rows.map(row=>{
      const copy={...row}; delete copy.batch_id; return copy;
    })).select('id, sn, status');
  }
  if(result.error) throw result.error;
  return result.data || [];
}

function renderPickupDrafts(){
  const panel=document.getElementById('pickup-draft-panel');
  const list=document.getElementById('pickup-draft-list');
  const count=document.getElementById('pickup-draft-count');
  if(!panel || !list) return;
  panel.classList.toggle('hidden', !_pickupDrafts.length);
  if(count) count.textContent=_pickupDrafts.length+' perangkat';
  list.innerHTML=_pickupDrafts.map((item,index)=>{
    const meter=item.meterDari!=null && item.meterSampai!=null
      ? `<span class="text-amber-600 dark:text-amber-300"> • ${item.meterDari}m → ${item.meterSampai}m (${item.meterSampai-item.meterDari}m)</span>` : '';
    return `<div class="flex items-center justify-between gap-2 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600">
      <div class="min-w-0"><p class="text-xs font-black text-slate-800 dark:text-slate-100 truncate">${item.sn}</p><p class="text-[10px] text-slate-500">${item.jenis||'-'}${meter}</p></div>
      <button type="button" onclick="removePickupDraft(${index})" class="shrink-0 p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg" title="Hapus dari daftar"><i class="fa-solid fa-trash-can text-xs"></i></button>
    </div>`;
  }).join('');
}

function removePickupDraft(index){
  _pickupDrafts.splice(index,1);
  renderPickupDrafts();
}

function addPickupDraft(){
  const sn=document.getElementById('scan-sn-input')?.value.trim().toUpperCase();
  const det=document.getElementById('scan-result-details');
  const jenis=_pickupScanData?.jenis || (det?.innerText.match(/Jenis:\s*([^|]+)/)?.[1]||'').trim();
  if(!sn || !_pickupScanData || _pickupScanData.sn!==sn){ showAlert('Scan dan cek SN yang valid terlebih dahulu.'); return; }
  if(_pickupDrafts.some(item=>item.sn===sn)){ showAlert('SN tersebut sudah ada di daftar pickup.'); return; }

  const meterWrap=document.getElementById('meter-kabel-wrap');
  const isKabel=!!(meterWrap && !meterWrap.classList.contains('hidden'));
  let meterDari=null, meterSampai=null;
  if(isKabel){
    meterDari=parseFloat(document.getElementById('input-meter-dari')?.value)||0;
    meterSampai=parseFloat(document.getElementById('input-meter-sampai')?.value)||0;
    const panjangSisa=parseFloat(meterWrap.dataset.panjangSisa)||0;
    if(!meterSampai || meterSampai<=meterDari){ showAlert('Isi "Sampai Meter" dengan nilai lebih besar dari meter awal ('+meterDari+'m).','Input Meter Kabel'); return; }
    if(meterSampai-meterDari>panjangSisa){ showAlert('Pengambilan melebihi sisa kabel di gudang.','Melebihi Sisa'); return; }
  }
  _pickupDrafts.push({sn, jenis:jenis||'-', meterDari, meterSampai});
  renderPickupDrafts();
  const card=document.getElementById('scan-result-card');
  const btn=document.getElementById('btn-submit-pickup-mat');
  if(card) card.classList.add('hidden');
  if(btn){ btn.classList.add('hidden'); btn.style.display=''; btn.disabled=false; }
  if(meterWrap) meterWrap.classList.add('hidden');
  const input=document.getElementById('scan-sn-input'); if(input) input.value='';
  _pickupScanData=null;
  showToast('Perangkat ditambahkan','SN '+sn+' masuk ke daftar pickup.','success');
}

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
  // Reset meter wrap
  const _mw = document.getElementById('meter-kabel-wrap');
  if(_mw) _mw.classList.add('hidden');
  const _mp = document.getElementById('meter-preview');
  if(_mp) _mp.classList.add('hidden');

  const myName = currentUser ? currentUser.displayName : '';

  try {
    const {data,error}=await supa.from('perangkat').select('sn,jenis,merk,kondisi,status,lokasi,panjang_awal,panjang_sisa').eq('sn',sn).maybeSingle();
    if(!error&&data){
      const isKabel = data.jenis && data.jenis.toLowerCase().includes('kabel');
      // Cek apakah SN sedang dipegang teknisi lain (bukan Gudang)
      const isGudang = data.status==='Gudang' || data.lokasi==='Gudang Utama' || data.lokasi==='Gudang';
      const stokKabelGudang = isKabel ? Number(data.panjang_sisa != null ? data.panjang_sisa : data.panjang_awal || 0) : null;
      if(isKabel && isGudang && stokKabelGudang <= 0) {
        card.className='p-4 rounded-2xl border border-rose-200 bg-rose-50 dark:bg-rose-950/40';
        stat.className='text-xs font-bold text-rose-700 dark:text-rose-400';
        stat.innerText='Stok kabel di gudang sudah habis';
        det.innerText=`SN: ${data.sn} | Sisa gudang: ${stokKabelGudang}m`;
        btn.classList.add('hidden');
      } else if(!isGudang) {
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
          _pickupScanData={sn:data.sn, jenis:data.jenis||'-', merk:data.merk||'', kondisi:data.kondisi||''};

          // Kalau kabel — tampilkan input meteran
          const meterWrap = document.getElementById('meter-kabel-wrap');
          const inputDari = document.getElementById('input-meter-dari');
          const inputSampai = document.getElementById('input-meter-sampai');
          const meterPreview = document.getElementById('meter-preview');
          if(isKabel && meterWrap) {
            const panjangAwal = data.panjang_awal || 0;
            const panjangSisa = data.panjang_sisa != null ? data.panjang_sisa : panjangAwal;
            // Meter Dari = posisi gulungan sekarang (meter yang sudah dipakai)
            const meterDari = panjangAwal - panjangSisa;
            if(inputDari) inputDari.value = meterDari;
            if(inputSampai) { inputSampai.value = ''; inputSampai.max = panjangAwal; inputSampai.min = meterDari + 1; }
            if(meterPreview) meterPreview.classList.add('hidden');
            // Simpan data kabel untuk hitungMeterKabel()
            meterWrap.dataset.panjangAwal = panjangAwal;
            meterWrap.dataset.panjangSisa = panjangSisa;
            meterWrap.dataset.meterDari = meterDari;
            meterWrap.classList.remove('hidden');
            // Info ekstra di det
            det.innerText += ` | Sisa Gulungan: ${panjangSisa}m / ${panjangAwal}m | Posisi sekarang: meter ${meterDari}`;
          } else {
            if(meterWrap) meterWrap.classList.add('hidden');
          }
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
  if(!_pickupDrafts.length){ showAlert('Tambahkan minimal satu perangkat ke daftar pickup.'); return; }
  const teknisiName=currentUser ? currentUser.displayName : '';
  const btn=document.getElementById('btn-submit-pickup-batch');
  const origHtml=btn ? btn.innerHTML : '';
  if(btn){ btn.disabled=true; btn.innerHTML='<i class="fa-solid fa-spinner animate-spin"></i> Mengirim semua...'; }

  try{
    const sns=_pickupDrafts.map(item=>item.sn);
    const {data:existing,error:existingError}=await supa.from('pickup_requests')
      .select('sn, status').in('sn',sns).eq('teknisi_name',teknisiName).eq('status','WAITING');
    if(existingError) throw existingError;
    if(existing?.length){
      const duplicate=existing.map(item=>item.sn).join(', ');
      showAlert('SN berikut sudah ada dalam antrian approval: '+duplicate,'Sudah Ada ⏳');
      return;
    }

    const batchId=_makeMaterialBatchId('PICKUP');
    const rows=_pickupDrafts.map(item=>{
      const row={sn:item.sn, jenis:item.jenis||'-', teknisi_name:teknisiName, status:'WAITING', batch_id:batchId};
      if(item.meterDari!=null && item.meterSampai!=null){
        row.meter_dari=item.meterDari; row.meter_sampai=item.meterSampai;
      }
      return row;
    });
    const inserted=await _insertMaterialBatch('pickup_requests',rows);
    if(!inserted.length) throw new Error('Tidak ada request pickup yang tersimpan.');

    const submitted=_pickupDrafts.slice();
    _pickupDrafts=[]; renderPickupDrafts();
    const card=document.getElementById('scan-result-card');
    const scanInput=document.getElementById('scan-sn-input');
    if(card) card.classList.add('hidden');
    if(scanInput) scanInput.value='';
    showAlert(submitted.length+' perangkat berhasil diajukan ke Admin dalam satu proses.','Waiting Approval ⏳');
    if(typeof loadWaitingApproval==='function') loadWaitingApproval();
    _pollPickupBatch(inserted.map(row=>row.id),submitted.map(row=>row.sn));
  }catch(err){
    showAlert('Gagal kirim request pickup: '+(err.message||''),'Error');
  }finally{
    if(btn){ btn.disabled=false; btn.innerHTML=origHtml; }
  }
}

function _pollPickupBatch(ids,sns){
  const idList=(ids||[]).filter(Boolean);
  if(!idList.length) return;
  const poll=setInterval(async()=>{
    try{
      const {data,error}=await supa.from('pickup_requests').select('id,sn,status').in('id',idList);
      if(error || !data?.length) return;
      const terminal=data.filter(row=>row.status==='APPROVED' || row.status==='REJECTED');
      if(terminal.length<idList.length) return;
      clearInterval(poll);
      const approved=terminal.filter(row=>row.status==='APPROVED').map(row=>row.sn);
      const rejected=terminal.filter(row=>row.status==='REJECTED').map(row=>row.sn);
      if(approved.length) showToast('Pickup Disetujui ✅',approved.length+' perangkat masuk ke Perangkat Saya.','success');
      if(rejected.length) showToast('Pickup Ditolak ❌',rejected.join(', ')+' ditolak Admin.','error');
      if(typeof loadListPerangkatSaya==='function') loadListPerangkatSaya();
      if(typeof loadWaitingApproval==='function') loadWaitingApproval();
    }catch(e){ /* polling tetap berjalan */ }
  },5000);
}
async function executeSendMaterial(){
  const sns=_selectedValues('send-sn-select');
  const target=document.getElementById('send-target-teknisi')?.value;
  const statusEl=document.getElementById('send-status');
  const btn=document.getElementById('btn-send-material');
  if(!sns.length){ showAlert('Pilih minimal satu perangkat yang akan dikirim.'); return; }
  if(!target){ showAlert('Pilih teknisi tujuan.'); return; }

  const dari=currentUser ? currentUser.displayName : '';
  if(btn){ btn.disabled=true; btn.innerHTML='<i class="fa-solid fa-spinner animate-spin"></i> Mengirim semua...'; }
  try{
    const {data:milik,error:milikError}=await supa.from('perangkat_teknisi')
      .select('sn').in('sn',sns).eq('teknisi_name',dari).eq('status','READY');
    if(milikError) throw milikError;
    const ready=new Set((milik||[]).map(row=>row.sn));
    const unavailable=sns.filter(sn=>!ready.has(sn));
    if(unavailable.length) throw new Error('Perangkat tidak lagi tersedia: '+unavailable.join(', '));

    const {data:pending,error:pendingError}=await supa.from('material_requests')
      .select('sn').in('sn',sns).eq('dari_teknisi',dari).eq('type','SEND').eq('status','WAITING');
    if(pendingError) throw pendingError;
    if(pending?.length) throw new Error('Request send sudah menunggu approval untuk: '+pending.map(row=>row.sn).join(', '));

    const batchId=_makeMaterialBatchId('SEND');
    const rows=sns.map(sn=>({type:'SEND',sn,dari_teknisi:dari,ke_teknisi:target,status:'WAITING',batch_id:batchId}));
    const inserted=await _insertMaterialBatch('material_requests',rows);
    if(!inserted.length) throw new Error('Tidak ada request send yang tersimpan.');
    if(statusEl){
      statusEl.className='flex items-center gap-3 p-3 rounded-xl border bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800';
      statusEl.classList.remove('hidden');
      statusEl.innerHTML='<i class="fa-solid fa-spinner animate-spin text-amber-500"></i><div><p class="text-xs font-extrabold text-amber-700 dark:text-amber-300">'+inserted.length+' request menunggu approval admin</p><p class="text-[11px] text-slate-500">'+sns.join(', ')+' → '+target+'</p></div>';
    }
    if(btn) btn.style.display='none';
    showAlert(inserted.length+' perangkat berhasil diajukan untuk dikirim ke '+target+'.','Waiting Approval ⏳');
    _pollMaterialRequests(inserted.map(row=>row.id),statusEl,'SEND');
  }catch(err){
    showAlert('Gagal: '+(err.message||''),'Error');
  }finally{
    if(btn && btn.style.display!=='none'){ btn.disabled=false; btn.innerHTML='<i class="fa-solid fa-paper-plane"></i>Kirim (Butuh Approval Admin)'; }
  }
}

async function executeReturnMaterial(){
  const sns=_selectedValues('return-sn-select');
  const alasan=document.getElementById('return-alasan')?.value.trim();
  const statusEl=document.getElementById('return-status');
  const btn=document.getElementById('btn-return-material');
  if(!sns.length){ showAlert('Pilih minimal satu perangkat yang akan di-return.'); return; }
  if(!alasan){ showAlert('Isi alasan return terlebih dahulu.'); return; }

  const dari=currentUser ? currentUser.displayName : '';
  if(btn){ btn.disabled=true; btn.innerHTML='<i class="fa-solid fa-spinner animate-spin"></i> Mengirim semua...'; }
  try{
    const {data:milik,error:milikError}=await supa.from('perangkat_teknisi')
      .select('sn').in('sn',sns).eq('teknisi_name',dari).eq('status','READY');
    if(milikError) throw milikError;
    const ready=new Set((milik||[]).map(row=>row.sn));
    const unavailable=sns.filter(sn=>!ready.has(sn));
    if(unavailable.length) throw new Error('Perangkat tidak lagi tersedia: '+unavailable.join(', '));

    const {data:pending,error:pendingError}=await supa.from('material_requests')
      .select('sn').in('sn',sns).eq('dari_teknisi',dari).eq('type','RETURN').eq('status','WAITING');
    if(pendingError) throw pendingError;
    if(pending?.length) throw new Error('Request return sudah menunggu approval untuk: '+pending.map(row=>row.sn).join(', '));

    const batchId=_makeMaterialBatchId('RETURN');
    const rows=sns.map(sn=>({type:'RETURN',sn,dari_teknisi:dari,alasan,status:'WAITING',batch_id:batchId}));
    const inserted=await _insertMaterialBatch('material_requests',rows);
    if(!inserted.length) throw new Error('Tidak ada request return yang tersimpan.');
    if(statusEl){
      statusEl.className='flex items-center gap-3 p-3 rounded-xl border bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800';
      statusEl.classList.remove('hidden');
      statusEl.innerHTML='<i class="fa-solid fa-spinner animate-spin text-amber-500"></i><div><p class="text-xs font-extrabold text-amber-700 dark:text-amber-300">'+inserted.length+' request menunggu approval admin</p><p class="text-[11px] text-slate-500">'+sns.join(', ')+' → Gudang</p></div>';
    }
    if(btn) btn.style.display='none';
    showAlert(inserted.length+' perangkat berhasil diajukan untuk return ke Gudang.','Waiting Approval ⏳');
    _pollMaterialRequests(inserted.map(row=>row.id),statusEl,'RETURN');
  }catch(err){
    showAlert('Gagal: '+(err.message||''),'Error');
  }finally{
    if(btn && btn.style.display!=='none'){ btn.disabled=false; btn.innerHTML='<i class="fa-solid fa-rotate-left"></i>Return Ke Gudang (Butuh Approval Admin)'; }
  }
}

// Polling status material request setiap 5 detik — mendukung beberapa request sekaligus
function _resetMaterialForm(type){
  const isSend=type==='SEND';
  const btn=document.getElementById(isSend?'btn-send-material':'btn-return-material');
  const statusEl=document.getElementById(isSend?'send-status':'return-status');
  const select=document.getElementById(isSend?'send-sn-select':'return-sn-select');
  if(statusEl) statusEl.classList.add('hidden');
  if(btn){
    btn.style.display=''; btn.disabled=false;
    btn.innerHTML=isSend ? '<i class="fa-solid fa-paper-plane"></i>Kirim (Butuh Approval Admin)' : '<i class="fa-solid fa-rotate-left"></i>Return Ke Gudang (Butuh Approval Admin)';
  }
  if(select) Array.from(select.options).forEach(option=>option.selected=false);
  if(!isSend){ const alasan=document.getElementById('return-alasan'); if(alasan) alasan.value=''; }
}

function _pollMaterialRequests(ids,statusEl,type){
  const idList=(ids||[]).filter(Boolean);
  if(!idList.length) return;
  const poll=setInterval(async()=>{
    try{
      const {data,error}=await supa.from('material_requests').select('id,status,type,sn').in('id',idList);
      if(error || !data?.length) return;
      const terminal=data.filter(row=>row.status==='APPROVED' || row.status==='REJECTED');
      if(terminal.length<idList.length) return;
      clearInterval(poll);
      const approved=terminal.filter(row=>row.status==='APPROVED').map(row=>row.sn);
      const rejected=terminal.filter(row=>row.status==='REJECTED').map(row=>row.sn);
      if(approved.length) showToast(type==='RETURN'?'Return Disetujui ✅':'Send Disetujui ✅',approved.length+' perangkat berhasil diproses.','success');
      if(rejected.length) showToast(type==='RETURN'?'Return Ditolak ❌':'Send Ditolak ❌',rejected.join(', ')+' ditolak Admin.','error');
      _resetMaterialForm(type);
      if(typeof loadListPerangkatSaya==='function') loadListPerangkatSaya();
      if(typeof loadSendReturnDropdowns==='function') loadSendReturnDropdowns();
    }catch(e){ /* polling tetap berjalan */ }
  },5000);
}

// Kompatibilitas untuk pemanggilan lama satu request.
function _pollMaterialRequest(id,statusEl){ _pollMaterialRequests([id],statusEl,'SEND'); }

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
    const opts = (milik||[]).filter(p => {
      const isKabel = p.jenis && p.jenis.toLowerCase().includes('kabel');
      return !isKabel || Number(p.panjang_sisa || 0) > 0;
    }).map(p => {
      const isKabel = p.jenis && p.jenis.toLowerCase().includes('kabel');
      const sisa = isKabel ? ` — ${p.panjang_sisa}m sisa` : '';
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

// ── HITUNG METER KABEL SAAT INPUT SAMPAI DIISI ───────────────────────
function hitungMeterKabel() {
  const meterWrap = document.getElementById('meter-kabel-wrap');
  const inputDari  = document.getElementById('input-meter-dari');
  const inputSampai = document.getElementById('input-meter-sampai');
  const previewEl  = document.getElementById('meter-preview');
  const totalText  = document.getElementById('meter-total-text');
  const sisaText   = document.getElementById('meter-sisa-text');

  if(!meterWrap || !inputDari || !inputSampai) return;

  const meterDari   = parseFloat(inputDari.value) || 0;
  const meterSampai = parseFloat(inputSampai.value) || 0;
  const panjangAwal = parseFloat(meterWrap.dataset.panjangAwal) || 0;
  const panjangSisa = parseFloat(meterWrap.dataset.panjangSisa) || 0;

  if(meterSampai <= meterDari) {
    if(previewEl) previewEl.classList.add('hidden');
    return;
  }

  const totalDiambil = meterSampai - meterDari;
  const sisaSetelah  = panjangSisa - totalDiambil;

  if(previewEl) previewEl.classList.remove('hidden');
  if(totalText) {
    totalText.textContent = totalDiambil + 'm';
    totalText.className = totalDiambil > panjangSisa ? 'text-rose-600 text-sm font-extrabold' : 'text-emerald-600 text-sm font-extrabold';
  }
  if(sisaText) {
    if(sisaSetelah < 0) {
      sisaText.textContent = '⚠ Melebihi sisa! (' + panjangSisa + 'm tersedia)';
      sisaText.className = 'text-rose-600 font-extrabold';
    } else {
      sisaText.textContent = sisaSetelah + 'm';
      sisaText.className = sisaSetelah <= 50 ? 'text-amber-600 font-extrabold' : 'text-slate-600 dark:text-slate-300 font-extrabold';
    }
  }
}
