// ===================== ABSENSI =====================
const TARGET_LAT=-6.234139,TARGET_LNG=107.360805,MAX_RADIUS=30;
const NON_SHIFT_ROLES=['NOC','Admin','Finance','SPV','CS'];

function selectRole(roleName,element){
  document.getElementById('selectedRole').value=roleName;
  const roleText=document.getElementById('account-role-text');
  if(roleText)roleText.textContent=roleName;
  document.querySelectorAll('.role-btn').forEach(b=>{b.className='role-btn py-2.5 px-2 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 transition-all flex flex-col items-center gap-1 hover:border-slate-300';});
  if(element)element.className='role-btn active py-2.5 px-2 rounded-xl border-2 border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-300 transition-all flex flex-col items-center gap-1';
  // Update label jam di tombol shift sesuai role
  const s1=document.getElementById('shift1-jam-label'),s2=document.getElementById('shift2-jam-label'),ns=document.getElementById('nonshift-jam-label');
  if(roleName==='CS'){if(s1)s1.textContent='07:00 WIB';if(s2)s2.textContent='13:00 WIB';if(ns)ns.textContent='09:00 WIB';}
  else if(roleName==='NOC'){if(s1)s1.textContent='08:00 WIB';if(s2)s2.textContent='14:00 WIB';if(ns)ns.textContent='10:00 WIB';}
  else{if(s1)s1.textContent='08:00 WIB';if(s2)s2.textContent='14:00 WIB';if(ns)ns.textContent='09:00 WIB';}
  updateShiftVisibility(roleName);updateGPSLabel(roleName);
  if(typeof applyJadwalHariIni==='function') applyJadwalHariIni();
}

function updateShiftVisibility(role){
  const shiftSec=document.getElementById('shift-section');
  const infoTxt=document.getElementById('shift-info-text');
  if(shiftSec)shiftSec.classList.remove('hidden');
  const dow=new Date().getDay();
  if(role==='CS'){
    if(infoTxt){
      if(dow===0)infoTxt.textContent='Minggu — hari libur.';
      else if(dow===6)infoTxt.textContent='Sabtu: Non Shift 09:15. Shift 1/2 tidak berlaku.';
      else infoTxt.textContent='Shift 1: masuk 07:00 (batas 07:15) | Shift 2: masuk 13:00 (batas 13:15) | Non Shift: 09:15';
    }
  } else if(role==='NOC'){
    if(infoTxt)infoTxt.textContent='NOC: pilih Shift 1 atau Shift 2 sesuai jadwal yang diberikan Admin. Toleransi keterlambatan 15 menit.';
    // NOC tidak lagi dipaksa Non Shift; applyJadwalHariIni akan memilih shift dari jadwal terpublikasi.
    const selected=document.getElementById('selectedShift');
    if(selected && !['Shift1','Shift2','NonShift'].includes(selected.value))selected.value='';
  } else if(['Admin','Finance','SPV'].includes(role)){
    if(infoTxt){
      if(dow===0)infoTxt.textContent='Minggu — hari libur.';
      else if(dow===6)infoTxt.textContent='Sabtu: Non Shift — masuk 10:00 (batas 10:15).';
      else infoTxt.textContent='Non Shift: masuk 09:00 WIB, batas 09:15 (Senin-Jumat).';
    }
    document.querySelectorAll('.shift-btn').forEach((b,i)=>{if(i===2){b.classList.add('border-emerald-500','bg-emerald-50','dark:bg-emerald-950/40','text-emerald-900','dark:text-emerald-300');b.classList.remove('border-slate-100','dark:border-slate-700','bg-slate-50','dark:bg-slate-700/50','text-slate-700','dark:text-slate-300');}else{b.classList.remove('border-emerald-500','bg-emerald-50','dark:bg-emerald-950/40','text-emerald-900','dark:text-emerald-300');b.classList.add('border-slate-100','dark:border-slate-700','bg-slate-50','dark:bg-slate-700/50','text-slate-700','dark:text-slate-300');}});
    document.getElementById('selectedShift').value='NonShift';
  } else {
    // Teknisi
    if(infoTxt){
      if(dow===0||dow===6)infoTxt.textContent='Akhir pekan: pilih Non Shift — masuk 09:00 (batas 09:15).';
      else infoTxt.textContent='Shift 1: 08:00 (batas 08:15) | Shift 2: 14:00 (batas 14:15) | Non Shift: 09:00 (batas 09:15)';
    }
  }
}

function updateGPSLabel(role){
  const lbl=document.getElementById('gps-radius-label');
  if(lbl){if(NON_SHIFT_ROLES.includes(role)){lbl.textContent='(tanpa batasan radius — WFH diizinkan)';}else{lbl.textContent='(Radius 30m dari kantor)';}}
}

function autoSelectRoleByName(name){
  const e=employeeMaster.find(x=>x.name===name);
  if(e&&e.role){const roleMap={'CS':'CS','NOC':'NOC','Admin':'Admin','Finance':'Finance','SPV':'SPV','Teknisi':'Teknisi'};const r=roleMap[e.role]||'Teknisi';const btn=document.getElementById('role-btn-'+r);if(btn)selectRole(r,btn);}
}

function selectShift(shiftName,element){
  if(typeof _sinuAttendanceScheduleLoading !== 'undefined' && _sinuAttendanceScheduleLoading){showAlert('Sedang membaca jadwal Anda.','Jadwal Absensi');return;}
  const schedule=typeof getJadwalAbsensiHariIni==='function' ? getJadwalAbsensiHariIni() : null;
  const role=document.getElementById('selectedRole') ? document.getElementById('selectedRole').value : '';
  const scheduledRoles=['Teknisi','CS','Admin','Finance','SPV','NOC'];
  if(!schedule&&scheduledRoles.includes(role)){showAlert('Shift belum dapat dipilih karena jadwal hari ini belum tersedia. Hubungi Admin.','Jadwal Absensi');return;}
  if(schedule && schedule.shift_code!==shiftName){showAlert('Shift mengikuti jadwal yang dipublish Admin: '+(schedule.shift_code==='NonShift'?'Non Shift':schedule.shift_code.replace('Shift','Shift '))+'.','Shift Terkunci');return;}
  document.getElementById('selectedShift').value=shiftName;
  document.querySelectorAll('.shift-btn').forEach(b=>{b.className='shift-btn py-2.5 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 transition-all flex items-center justify-center gap-2 hover:border-slate-300';});
  const activeClasses=shiftName==='NonShift' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300' : shiftName==='Shift1' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/40 text-yellow-900 dark:text-yellow-300' : 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-300';
  element.className='shift-btn active py-2.5 rounded-xl border-2 '+activeClasses+' transition-all flex items-center justify-center gap-2';
}

function calculateDistance(lat1,lon1,lat2,lon2){
  const R=6371000,dLat=(lat2-lat1)*Math.PI/180,dLon=(lon2-lon1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

function getLocation(){
  const status=document.getElementById('location-status');
  const role=document.getElementById('selectedRole').value;
  const isWFH=NON_SHIFT_ROLES.includes(role);
  if(!navigator.geolocation){status.innerHTML="<span class='text-rose-500 font-semibold'>Geolocation tidak didukung.</span>";return;}
  status.innerText='Mendeteksi lokasi GPS...';
  navigator.geolocation.getCurrentPosition(pos=>{
    const lat=pos.coords.latitude,lng=pos.coords.longitude;
    if(isWFH){
      locationData={lat,lng,distance:0,wfh:true,lapangan:false};
      status.innerHTML="<span class='font-bold text-emerald-600 dark:text-emerald-400'>✓ Lokasi Terdeteksi (WFH/Kantor)</span><br>Lat: "+lat.toFixed(6)+", Lng: "+lng.toFixed(6);
      toggleLapanganSection(false);
    } else {
      const dist=Math.round(calculateDistance(lat,lng,TARGET_LAT,TARGET_LNG));
      if(dist<=MAX_RADIUS){
        locationData={lat,lng,distance:dist,lapangan:false};
        status.innerHTML="<span class='font-bold text-emerald-600 dark:text-emerald-400'>✓ Lokasi Valid (Dalam Radius)</span><br>Lat: "+lat.toFixed(6)+", Lng: "+lng.toFixed(6)+"<br><span class='text-slate-400'>Jarak: "+dist+"m</span>";
        toggleLapanganSection(false);
      } else {
        locationData={lat,lng,distance:dist,lapangan:true};
        status.innerHTML="<span class='font-bold text-amber-600 dark:text-amber-400'>⚡ Di Luar Radius — Mode Lapangan</span><br>"
          +"<span class='text-[11px] text-amber-600/80 dark:text-amber-400/80'>Jarak: "+dist+"m dari kantor. Isi form lapangan di bawah.</span>";
        toggleLapanganSection(true);
      }
    }
  },()=>{locationData=null;status.innerHTML="<span class='text-rose-500 font-semibold'>Gagal ambil GPS.</span>";},{enableHighAccuracy:true,timeout:10000,maximumAge:0});
}

function toggleLapanganSection(show){
  const sec=document.getElementById('lapangan-section');
  if(sec) sec.classList.toggle('hidden',!show);
  if(!show){
    // Reset form lapangan saat disembunyikan
    const woId=document.getElementById('lapangan-wo-id');
    const ket=document.getElementById('lapangan-keterangan');
    if(woId) woId.value='';
    if(ket) ket.value='';
    lapanganFotoData=null;
    const prev=document.getElementById('lapangan-foto-preview');
    const ph=document.getElementById('lapangan-foto-placeholder');
    const btnTxt=document.getElementById('lapangan-foto-btn-text');
    if(prev){prev.src='';prev.classList.add('hidden');}
    if(ph) ph.classList.remove('hidden');
    if(btnTxt) btnTxt.textContent='Ambil Foto Lokasi';
  }
}

// Data foto lokasi lapangan
let lapanganFotoData = null;

async function handleLapanganFotoSelect(event){
  const file=event.target.files[0];if(!file)return;
  const preview=document.getElementById('lapangan-foto-preview');
  const placeholder=document.getElementById('lapangan-foto-placeholder');
  const btnTxt=document.getElementById('lapangan-foto-btn-text');
  const reader=new FileReader();
  reader.onload=async function(e){
    // Kompresi foto lapangan
    if(typeof kompressFotoAbsensi==='function'){
      lapanganFotoData=await kompressFotoAbsensi(e.target.result,1200,1200,0.7);
    } else {
      lapanganFotoData=e.target.result;
    }
    if(preview){preview.src=lapanganFotoData;preview.classList.remove('hidden');}
    if(placeholder) placeholder.classList.add('hidden');
    if(btnTxt) btnTxt.textContent='Ganti Foto Lokasi';
  };
  reader.readAsDataURL(file);
}

// Hitung point kehadiran per hari (skala 100)
function hitungPointKehadiran(statusKehadiran,mntTerlambat,jenisCuti,adaSurat){
  if(statusKehadiran==='TEPAT WAKTU')return 100;
  if(statusKehadiran==='TERLAMBAT'){if(mntTerlambat<30)return 70;if(mntTerlambat<60)return 50;return 30;}
  if(statusKehadiran==='IZIN SAKIT')return adaSurat?60:40;
  if(statusKehadiran==='IZIN CUTI')return 50;
  return 0; // ALPA
}

function cekKeterlambatan(){
  const role=document.getElementById('selectedRole').value;
  const shift=document.getElementById('selectedShift').value;
  const scheduled=typeof getJadwalAbsensiHariIni==='function' ? getJadwalAbsensiHariIni() : null;
  const now=new Date();const dow=now.getDay();const tot=now.getHours()*60+now.getMinutes();
  if(scheduled){
    const parts=String(scheduled.jam_masuk).slice(0,5).split(':').map(Number);
    const batas=(parts[0]*60+parts[1])+15;
    const isLate=tot>batas;
    return{isLate,mntLate:isLate?tot-(parts[0]*60+parts[1]):0,statusKehadiran:isLate?'TERLAMBAT':'TEPAT WAKTU'};
  }
  let batas=555,isLate=false,mntLate=0;

  if(role==='CS'){
    // CS Shift1: 07:00 masuk, batas 07:15 (435)
    // CS Shift2: 13:00 masuk, batas 13:15 (795)
    // CS NonShift / weekend: 09:15 (555)
    if(dow===0)return{isLate:false,mntLate:0,statusKehadiran:'TEPAT WAKTU',pesan:'Minggu — hari libur'};
    if(shift==='Shift1')batas=dow===6?555:435;
    else if(shift==='Shift2')batas=dow===6?555:795;
    else batas=dow===6?615:555;
  } else if(role==='NOC'){
    // NOC: Non Shift 10:00, batas 10:15 (615) — setiap hari kecuali Minggu
    if(dow===0)return{isLate:false,mntLate:0,statusKehadiran:'TEPAT WAKTU',pesan:'Minggu — hari libur'};
    batas=615;
  } else if(shift==='NonShift'||['Admin','Finance','SPV'].includes(role)){
    // Non Shift lainnya: Senin-Jumat 09:15 (555), Sabtu 10:15 (615), Minggu libur
    if(dow===0)return{isLate:false,mntLate:0,statusKehadiran:'TEPAT WAKTU',pesan:'Minggu — hari libur'};
    batas=dow===6?615:555;
  } else if(shift==='Shift1'){
    // Teknisi Shift 1 weekday: 08:15 (495), weekend: 09:15 (555)
    batas=(dow===0||dow===6)?555:495;
  } else if(shift==='Shift2'){
    // Teknisi Shift 2 weekday: 14:15 (855), weekend: 09:15 (555)
    batas=(dow===0||dow===6)?555:855;
  }

  isLate=tot>batas;mntLate=isLate?tot-batas:0;
  const status=isLate?'TERLAMBAT':'TEPAT WAKTU';
  return{isLate,mntLate,statusKehadiran:status};
}

async function handleNativeFileSelect(event){
  const file=event.target.files[0];if(!file)return;
  const preview=document.getElementById('photo-preview'),placeholder=document.getElementById('camera-placeholder'),overlay=document.getElementById('face-loading-overlay'),btnTxt=document.getElementById('btn-camera-text');
  overlay.classList.remove('hidden');overlay.style.display='flex';
  const reader=new FileReader();
  reader.onload=async function(e){
    const img=new Image();
    img.onload=async function(){
      let hasFace=true;
      if(faceModel){try{const p=await faceModel.estimateFaces(img,false);hasFace=p.length>0;}catch(err){}}
      overlay.classList.add('hidden');overlay.style.display='none';
      if(!hasFace){showAlert('Wajah tidak terdeteksi! Ambil ulang foto selfie.','Deteksi Gagal');capturedImageData=null;preview.classList.add('hidden');placeholder.classList.remove('hidden');btnTxt.innerText='Ambil Ulang Foto';return;}
      capturedImageData=e.target.result;preview.src=capturedImageData;preview.classList.remove('hidden');placeholder.classList.add('hidden');btnTxt.innerText='Ganti Foto';
    };img.src=e.target.result;
  };reader.readAsDataURL(file);
}

async function handleFormSubmit(event){
  event.preventDefault();const btn=document.getElementById('btn-submit');
  const empName=document.getElementById('employeeName').value;const role=document.getElementById('selectedRole').value;const selectedShift=document.getElementById('selectedShift').value;const lateReason=document.getElementById('lateReason').value;
  const schedule=typeof getJadwalAbsensiHariIni==='function' ? getJadwalAbsensiHariIni() : null;
  const shift=schedule ? schedule.shift_code : selectedShift;
  const scheduledRoles=['Teknisi','CS','Admin','NOC','Finance','SPV'];
  if(scheduledRoles.includes(role) && typeof getJadwalAbsensiHariIni==='function' && !schedule){showAlert('Anda belum memiliki jadwal yang dipublish untuk hari ini. Hubungi Admin.','Jadwal Absensi');return;}
  if(!empName){showAlert('Silakan pilih Nama Karyawan.');return;}
  if(!locationData){showAlert('Silakan dapatkan lokasi GPS terlebih dahulu.');return;}
  if(!capturedImageData){showAlert('Silakan ambil foto selfie presensi.');return;}

  // Validasi form lapangan jika di luar radius
  if(locationData.lapangan){
    const woIdVal=(document.getElementById('lapangan-wo-id')||{value:''}).value.trim();
    const ketVal=(document.getElementById('lapangan-keterangan')||{value:''}).value.trim();
    if(!woIdVal){showAlert('Isi ID Tiket WO untuk absensi lapangan.','Form Lapangan Wajib');return;}
    if(!ketVal){showAlert('Isi keterangan lokasi untuk absensi lapangan.','Form Lapangan Wajib');return;}
    if(!lapanganFotoData){showAlert('Ambil foto lokasi/rumah pelanggan untuk absensi lapangan.','Form Lapangan Wajib');return;}
  }

  const{isLate,mntLate,statusKehadiran}=cekKeterlambatan();
  if(isLate&&!lateReason.trim()){showAlert('Anda terlambat! Isi alasan keterlambatan.');return;}
  const point=hitungPointKehadiran(statusKehadiran,mntLate,'',false);
  const orig=btn.innerHTML;btn.disabled=true;btn.innerHTML='<i class="fa-solid fa-spinner animate-spin"></i><span>Mengirim...</span>';
  try {
    // Upload foto selfie ke Supabase Storage
    let fotoUrl = null;
    if(capturedImageData) {
      btn.innerHTML='<i class="fa-solid fa-spinner animate-spin"></i><span>Mengupload foto...</span>';
      fotoUrl = await uploadFotoAbsensiKeStorage(capturedImageData, empName, 'selfie');
    }

    // Upload foto lapangan jika ada
    let fotoLapanganUrl = null;
    if(locationData.lapangan && lapanganFotoData) {
      btn.innerHTML='<i class="fa-solid fa-spinner animate-spin"></i><span>Mengupload foto lapangan...</span>';
      fotoLapanganUrl = await uploadFotoAbsensiKeStorage(lapanganFotoData, empName, 'lapangan');
    }

    btn.innerHTML='<i class="fa-solid fa-spinner animate-spin"></i><span>Menyimpan...</span>';
    const woIdVal=(document.getElementById('lapangan-wo-id')||{value:''}).value.trim();
    const ketVal=(document.getElementById('lapangan-keterangan')||{value:''}).value.trim();
    if(typeof simpanAbsensiKeSupabase==='function') await simpanAbsensiKeSupabase({
      nama:empName,
      username:currentUser ? currentUser.username : '',
      role,
      shift,
      scheduleId:schedule ? schedule.id : null,
      jamMasukAktual:new Date().toISOString(),
      alasanKeterlambatan:lateReason.trim(),
      statusKehadiran,
      mntTerlambat:mntLate,
      point,
      lat:locationData.lat,
      lng:locationData.lng,
      fotoUrl,
      lapangan: locationData.lapangan || false,
      lapanganWoId: woIdVal || null,
      lapanganKeterangan: ketVal || null,
      fotoLapanganUrl: fotoLapanganUrl || null
    });
  } catch(error) {
    btn.disabled=false;btn.innerHTML=orig;
    showAlert('Absensi gagal disimpan: '+(error.message||'Periksa koneksi Supabase.'),'Gagal Menyimpan');
    return;
  }
  setTimeout(()=>{
    btn.disabled=false;btn.innerHTML=orig;
    document.getElementById('attendance-form').classList.add('hidden');document.getElementById('success-screen').classList.remove('hidden');
    const badge=document.getElementById('screen-status-badge'),ptVal=document.getElementById('screen-point-val');
    if(isLate){badge.innerText='HADIR (TERLAMBAT)';badge.className='inline-block px-4 py-2 rounded-2xl border text-sm font-extrabold bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800';}
    else{badge.innerText='HADIR (TEPAT WAKTU)';badge.className='inline-block px-4 py-2 rounded-2xl border text-sm font-extrabold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';}
    if(ptVal)ptVal.textContent='+'+(Number(point)||0);
  },1000);
}

function setSickDocStatus(ada,el){
  sickHasDoc=ada;
  document.querySelectorAll('.sick-doc-btn').forEach(b=>{b.className='sick-doc-btn py-2.5 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-2 transition-all hover:border-slate-300';});
  el.className='sick-doc-btn py-2.5 rounded-xl border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 transition-all';
  const pt=ada?60:40;const prev=document.getElementById('sick-point-preview');if(prev)prev.textContent=pt+' poin '+(ada?'(dengan surat)':'(tanpa surat)');
  const upld=document.getElementById('sick-doc-upload');if(upld){if(ada)upld.classList.remove('hidden');else upld.classList.add('hidden');}
}

function handleLeaveSubmit(event,jenisForm){
  event.preventDefault();const form=event.target;const btn=form.querySelector('button[type="submit"]');
  // Ambil nama dari input readonly (bukan select lagi)
  const nameInput = form.querySelector('input[name="nama"]') || form.querySelector('select[name="nama"]');
  const name = nameInput ? nameInput.value : (currentUser ? currentUser.displayName : '');
  const ket=form.querySelector('textarea[name="keterangan"]').value;
  if(!name||!ket){showAlert('Nama dan keterangan wajib diisi.');return;}
  const orig=btn.innerHTML;btn.disabled=true;btn.innerHTML='<i class="fa-solid fa-spinner animate-spin"></i>Mengirim...';
  setTimeout(()=>{btn.disabled=false;btn.innerHTML=orig;if(jenisForm==='Izin Sakit'){document.getElementById('form-sakit').classList.add('hidden');document.getElementById('success-screen-sakit').classList.remove('hidden');}else{document.getElementById('form-cuti').classList.add('hidden');document.getElementById('success-screen-cuti').classList.remove('hidden');}},1000);
}

// Auto-fill nama dari currentUser di semua form absensi
function autoFillNamaAbsensi(){
  const nama = currentUser ? currentUser.displayName : '';
  const role = currentUser ? (currentUser.role||'') : '';

  // Form Absensi
  const empEl = document.getElementById('employeeName');
  if(empEl) { empEl.value = nama; }

  // Form Izin Sakit
  const sakitEl = document.getElementById('izin-sakit-nama');
  if(sakitEl) sakitEl.value = nama;

  // Form Izin Cuti
  const cutiEl = document.getElementById('izin-cuti-nama');
  if(cutiEl) cutiEl.value = nama;
  // Auto-fill form cuti baru
  if(typeof autoFillCutiForm === 'function') autoFillCutiForm();

  // Auto-set role di form absensi berdasarkan role akun
  const roleMap = {
    'admin':'Admin','cs':'CS','noc':'NOC','teknisi':'Teknisi',
    'finance':'Finance','supervisor':'SPV','spv':'SPV'
  };
  const mappedRole = roleMap[role.toLowerCase()] || 'Teknisi';
  const roleBtn = document.getElementById('role-btn-'+mappedRole);
  selectRole(mappedRole, roleBtn);
}

function renderMyPointSection(){
  const el=document.getElementById('my-attendance-point'),elMax=document.getElementById('my-max-point'),elGrade=document.getElementById('my-grade-badge');
  if(!el)return;
  const name=currentUser?currentUser.displayName:'';
  
  // Load point dari database untuk user ini (async)
  loadMyPointFromDB(name);
}

// Load point individual user dari database
async function loadMyPointFromDB(userName) {
  if(!userName || typeof supa === 'undefined') return;
  
  const now = new Date();
  const bulan = now.getMonth() + 1;
  const tahun = now.getFullYear();
  
  try {
    const { data, error } = await supa.from('absensi')
      .select('point, status_kehadiran, tanggal')
      .eq('nama', userName);
    
    if(error || !data) return;
    
    // Filter hanya bulan ini
    const bulanIni = data.filter(d => {
      if(!d.tanggal) return false;
      const t = new Date(d.tanggal);
      return t.getMonth() + 1 === bulan && t.getFullYear() === tahun;
    });
    
    // TOTAL MENTAH dari semua point bulan ini (kumulatif)
    const total = bulanIni.reduce((sum, d) => sum + (Number(d.point) || 0), 0);
    const perfect = bulanIni.length >= 30 && bulanIni.every(d => d.status_kehadiran === 'TEPAT WAKTU');
    
    absensiPoints[userName] = {total, perfect};
    
    // Update UI - hanya tampilkan total kumulatif
    const el=document.getElementById('my-attendance-point');
    if(el)el.textContent=total+(perfect?' ⭐':'');
  } catch(e) {
    console.error('Error loading my point:', e);
  }
}

function resetForm(){document.getElementById('attendance-form').reset();document.getElementById('photo-preview').classList.add('hidden');document.getElementById('camera-placeholder').classList.remove('hidden');document.getElementById('success-screen').classList.add('hidden');document.getElementById('attendance-form').classList.remove('hidden');capturedImageData=null;locationData=null;document.getElementById('location-status').innerText='Klik tombol untuk mendeteksi GPS.';}
function resetFormSakit(){
  document.getElementById('form-sakit').reset();
  document.getElementById('label-file-sakit').innerText='Upload Surat Dokter';
  document.getElementById('success-screen-sakit').classList.add('hidden');
  document.getElementById('form-sakit').classList.remove('hidden');
  // Restore nama setelah reset
  if(typeof autoFillNamaAbsensi==='function') autoFillNamaAbsensi();
}
function resetFormCuti(){
  document.getElementById('form-cuti').reset();
  document.getElementById('success-screen-cuti').classList.add('hidden');
  document.getElementById('form-cuti').classList.remove('hidden');
  _cutiData = {};
  // Restore nama setelah reset
  if(typeof autoFillNamaAbsensi==='function') autoFillNamaAbsensi();
}
function updateFileName(input,labelId){if(input.files&&input.files[0])document.getElementById(labelId).innerText='File: '+input.files[0].name;}

// ── KOMPRESI FOTO ABSENSI ─────────────────────────────────────
// Mengecilkan foto selfie ke max 800x800px dan kualitas JPEG ~80KB
async function kompressFotoAbsensi(base64DataUrl, maxWidth=800, maxHeight=800, quality=0.65) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = function() {
      let w = img.width, h = img.height;
      // Scale down proporsional
      if(w > maxWidth || h > maxHeight) {
        const ratio = Math.min(maxWidth / w, maxHeight / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(base64DataUrl); // fallback pakai original
    img.src = base64DataUrl;
  });
}

// Konversi base64 DataURL ke Blob untuk upload
function base64ToBlob(base64DataUrl) {
  const [header, data] = base64DataUrl.split(',');
  const mime = header.match(/:(.*?);/)[1];
  const binary = atob(data);
  const arr = new Uint8Array(binary.length);
  for(let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

// ── UPLOAD FOTO KE SUPABASE STORAGE ──────────────────────────
// Struktur: foto-absensi/2026/09 - September/28-Sep-2026/selfie/nama_28092026_0800.jpg
//           foto-absensi/2026/09 - September/28-Sep-2026/lapangan/nama_28092026_0800.jpg
async function uploadFotoAbsensiKeStorage(base64DataUrl, nama, subfolder='selfie') {
  try {
    // Kompresi dulu
    const compressed = await kompressFotoAbsensi(base64DataUrl);
    const blob = base64ToBlob(compressed);

    // Buat path folder dan nama file
    const now = new Date();
    const tahun = now.getFullYear();
    const bulanIdx = now.getMonth();
    const namaBulan = ['Januari','Februari','Maret','April','Mei','Juni',
                       'Juli','Agustus','September','Oktober','November','Desember'][bulanIdx];
    const bulanNum = String(bulanIdx + 1).padStart(2, '0');
    const tgl = String(now.getDate()).padStart(2, '0');
    const bln = String(bulanIdx + 1).padStart(2, '0');
    const thn = String(tahun);
    const jam = String(now.getHours()).padStart(2, '0');
    const mnt = String(now.getMinutes()).padStart(2, '0');

    const namaBulanPendek = ['Jan','Feb','Mar','Apr','Mei','Jun',
                              'Jul','Agu','Sep','Okt','Nov','Des'][bulanIdx];
    const folderTanggal = `${tgl}-${namaBulanPendek}-${tahun}`;

    // Format nama file: nama_ddmmyyyy_hhmm.jpg
    const namaFile = `${nama.toLowerCase().replace(/\s+/g,'_')}_${tgl}${bln}${thn}_${jam}${mnt}.jpg`;

    // Path lengkap dengan subfolder selfie/lapangan
    const filePath = `${tahun}/${bulanNum} - ${namaBulan}/${folderTanggal}/${subfolder}/${namaFile}`;

    const { data, error } = await supa.storage
      .from('foto-absensi')
      .upload(filePath, blob, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if(error) {
      console.warn('[Foto Absensi] Upload gagal:', error.message);
      return null;
    }

    const { data: urlData } = supa.storage
      .from('foto-absensi')
      .getPublicUrl(filePath);

    return urlData ? urlData.publicUrl : null;
  } catch(e) {
    console.warn('[Foto Absensi] Error:', e.message);
    return null;
  }
}

// ── FORM PERMOHONAN CUTI ─────────────────────────────────────────────

// Data cuti untuk generate PDF
let _cutiData = {};

function autoFillCutiForm() {
  const nama  = currentUser ? currentUser.displayName : '';
  const role  = currentUser ? (currentUser.role || '') : '';
  const roleLabel = { admin:'Admin', cs:'CS', noc:'NOC Engineer', teknisi:'Teknisi Field', supervisor:'Supervisor', spv:'Supervisor', finance:'Finance' };

  const el = id => document.getElementById(id);
  if(el('cuti-nama'))    el('cuti-nama').value    = nama;
  if(el('cuti-jabatan')) el('cuti-jabatan').value  = roleLabel[role.toLowerCase()] || role;
  if(el('cuti-divisi'))  el('cuti-divisi').value   = roleLabel[role.toLowerCase()] || role;

  // Tampilkan/sembunyikan field "Lainnya" saat radio berubah
  document.querySelectorAll('input[name="jenis-cuti"]').forEach(function(r) {
    r.addEventListener('change', function() {
      const el = document.getElementById('cuti-jenis-lainnya');
      if(el) el.classList.toggle('hidden', r.value !== 'Lainnya');
    });
  });
}

function hitungJumlahHariCuti() {
  const mulai   = document.getElementById('cuti-tgl-mulai')?.value;
  const selesai = document.getElementById('cuti-tgl-selesai')?.value;
  if(!mulai || !selesai) return;

  const d1 = new Date(mulai), d2 = new Date(selesai);
  if(d2 < d1) { showAlert('Tanggal selesai tidak boleh sebelum tanggal mulai.', 'Cek Tanggal'); return; }

  // Hitung hari kerja (Senin–Sabtu, skip Minggu)
  let hariKerja = 0, cur = new Date(d1);
  while(cur <= d2) {
    if(cur.getDay() !== 0) hariKerja++;
    cur.setDate(cur.getDate() + 1);
  }

  // Masuk kembali = hari kerja pertama setelah selesai
  const kembali = new Date(d2);
  kembali.setDate(kembali.getDate() + 1);
  while(kembali.getDay() === 0) kembali.setDate(kembali.getDate() + 1);

  const fmtDate = d => d.toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'});

  const elHari   = document.getElementById('cuti-jumlah-hari');
  const elKembali = document.getElementById('cuti-masuk-kembali');
  if(elHari)    elHari.value    = hariKerja + ' hari kerja';
  if(elKembali) elKembali.value = fmtDate(kembali);
}

async function handleCutiSubmit(event) {
  event.preventDefault();
  const nama       = document.getElementById('cuti-nama')?.value || '';
  const tglMulai   = document.getElementById('cuti-tgl-mulai')?.value;
  const tglSelesai = document.getElementById('cuti-tgl-selesai')?.value;
  const alasan     = document.getElementById('cuti-alasan')?.value?.trim();
  const jenisCutiEl = document.querySelector('input[name="jenis-cuti"]:checked');

  if(!jenisCutiEl) { showAlert('Pilih jenis cuti terlebih dahulu.', 'Jenis Cuti Wajib'); return; }
  if(!tglMulai || !tglSelesai) { showAlert('Isi tanggal mulai dan selesai cuti.', 'Tanggal Wajib'); return; }
  if(!alasan) { showAlert('Isi alasan / keperluan cuti.', 'Alasan Wajib'); return; }

  const jenisCuti = jenisCutiEl.value === 'Lainnya'
    ? (document.getElementById('cuti-jenis-lainnya')?.value || 'Lainnya')
    : jenisCutiEl.value;

  // Simpan data untuk generate PDF
  _cutiData = {
    nama,
    nik:           document.getElementById('cuti-nik')?.value || '',
    jabatan:       document.getElementById('cuti-jabatan')?.value || '',
    divisi:        document.getElementById('cuti-divisi')?.value || '',
    kontak:        document.getElementById('cuti-kontak')?.value || '',
    jenisCuti,
    tglMulai,
    tglSelesai,
    jumlahHari:    document.getElementById('cuti-jumlah-hari')?.value || '',
    masukKembali:  document.getElementById('cuti-masuk-kembali')?.value || '',
    alasan,
    delegasiNama:  document.getElementById('cuti-delegasi-nama')?.value || '',
    kontakCuti:    document.getElementById('cuti-kontak-cuti')?.value || '',
    tanggalPengajuan: new Date().toLocaleDateString('id-ID', {day:'numeric',month:'long',year:'numeric'}),
    nomorFormulir: 'HRD-SIN/' + new Date().getFullYear() + '/' + String(Math.floor(Math.random()*9000)+1000),
  };

  // Simpan ke Supabase
  try {
    if(typeof supa !== 'undefined') {
      await supa.from('izin_cuti').insert({
        nama:             _cutiData.nama,
        username:         currentUser?.username || null,
        jenis_cuti:       _cutiData.jenisCuti,
        tanggal_mulai:    _cutiData.tglMulai,
        tanggal_selesai:  _cutiData.tglSelesai,
        jumlah_hari:      _cutiData.jumlahHari,
        masuk_kembali:    _cutiData.masukKembali,
        alasan:           _cutiData.alasan,
        delegasi_nama:    _cutiData.delegasiNama || null,
        kontak_cuti:      _cutiData.kontakCuti || null,
        nomor_formulir:   _cutiData.nomorFormulir,
        status:           'MENUNGGU',
        created_at:       new Date().toISOString()
      });
    }
  } catch(e) { console.warn('[Cuti] Gagal simpan:', e.message); }

  document.getElementById('form-cuti').classList.add('hidden');
  document.getElementById('success-screen-cuti').classList.remove('hidden');
}


function generateFormulirCutiPDF() {
  if(!_cutiData || !_cutiData.nama) {
    showAlert('Isi form cuti terlebih dahulu sebelum generate PDF.', 'Form Belum Diisi');
    return;
  }
  const logoUrl = 'assets/logo-s.png?' + Date.now();
  fetch(logoUrl)
    .then(r => r.blob())
    .then(blob => new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    }))
    .then(logoBase64 => _doGenerateCutiPDF(logoBase64))
    .catch(() => _doGenerateCutiPDF(null));
}

function _doGenerateCutiPDF(logoBase64) {
  const d = _cutiData;
  const fmtTgl = s => s ? new Date(s).toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'}) : '';
  const isLainnya = !['Cuti Tahunan','Cuti Sakit','Cuti Melahirkan','Cuti Penting','Cuti di Luar Tanggungan'].includes(d.jenisCuti);
  const cb = v => d.jenisCuti === v ? '&#9745;' : '&#9744;';

  const NAVY = '#2d5a8e';
  const BORDER = '#aabbcc';

  // Sel tabel: label kiri (bold), nilai kanan
  const tdBase = 'padding:4px 8px;border:0.5px solid '+BORDER+';font-size:10pt;line-height:1.5;vertical-align:middle;';
  const tdLbl = tdBase+'font-weight:normal;'; // label tidak bold sesuai template
  const tdVal = tdBase;
  const tdTall = tdBase+'vertical-align:top;padding-top:5px;min-height:40px;';
  const secH = 'background-color:'+NAVY+';color:#fff;padding:4px 8px;font-weight:bold;font-size:10pt;-webkit-print-color-adjust:exact;print-color-adjust:exact;';

  const logoHtml = logoBase64
    ? '<img src="'+logoBase64+'" style="width:55px;height:55px;object-fit:contain;" alt="Logo">'
    : '<div style="width:55px;height:55px;border-radius:50%;background:'+NAVY+';display:flex;align-items:center;justify-content:center;color:#fff;font-size:24px;font-weight:bold;">S</div>';

  var html = '<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8">'
  + '<title>Formulir Permohonan Cuti - '+d.nama+'</title>'
  + '<style>'
  + '@page{size:A4;margin:15mm}'
  + '*{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}'
  + 'body{font-family:Arial,sans-serif;font-size:10pt;color:#000;background:#fff}'
  + 'table{width:100%;border-collapse:collapse}'
  + '</style>'
  + '</head><body>'

  // HEADER — logo kiri, nama perusahaan, banner hitam diagonal kanan
  + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0;">'
  +   '<div style="display:flex;align-items:center;gap:12px;padding:6px 0;">'
  +     logoHtml
  +     '<div style="font-size:14pt;font-weight:bold;color:#000;">PT. &nbsp;Sinergi Internet Nusantara</div>'
  +   '</div>'
  +   '<div style="width:160px;height:70px;overflow:hidden;position:relative;">'
  +     '<div style="position:absolute;right:0;top:0;width:160px;height:70px;background:linear-gradient(135deg,transparent 30%,#2d5a8e 30%,#1a3a5c 60%,#0d1a2e 100%);-webkit-print-color-adjust:exact;print-color-adjust:exact;"></div>'
  +     '<div style="position:absolute;right:0;top:0;width:130px;height:70px;background:linear-gradient(135deg,transparent 40%,#4a7faa 40%,#2d5a8e 70%,#1a3a5c 100%);opacity:0.6;-webkit-print-color-adjust:exact;print-color-adjust:exact;"></div>'
  +   '</div>'
  + '</div>'
  + '<hr style="border:none;border-top:2.5px solid #000;margin-bottom:10px;">'

  // JUDUL
  + '<div style="text-align:center;margin:6px 0 2px;">'
  + '<b style="font-size:13pt;text-transform:uppercase;letter-spacing:1px;">FORMULIR PERMOHONAN CUTI</b>'
  + '</div>'
  + '<div style="font-size:9pt;margin-bottom:8px;text-align:center;">'
  + 'No. Formulir: &nbsp;<b>'+d.nomorFormulir+'</b> &nbsp;&nbsp;&nbsp;&nbsp; Tanggal Pengajuan: &nbsp;<b>'+d.tanggalPengajuan+'</b>'
  + '</div>'

  // A. DATA KARYAWAN
  + '<div style="margin-bottom:6px;border:1px solid '+BORDER+';">'
  + '<div style="'+secH+'">A. &nbsp;DATA KARYAWAN</div>'
  + '<table>'
  + '<tr>'
  +   '<td style="'+tdLbl+'width:18%">Nama</td>'
  +   '<td style="'+tdVal+'width:32%">'+d.nama+'</td>'
  +   '<td style="'+tdLbl+'width:18%">NIK / ID Karyawan</td>'
  +   '<td style="'+tdVal+'width:32%">'+(d.nik||'')+'</td>'
  + '</tr>'
  + '<tr>'
  +   '<td style="'+tdLbl+'">Jabatan</td>'
  +   '<td style="'+tdVal+'">'+(d.jabatan||'')+'</td>'
  +   '<td style="'+tdLbl+'">Divisi / Bagian</td>'
  +   '<td style="'+tdVal+'">'+(d.divisi||'')+'</td>'
  + '</tr>'
  + '<tr>'
  +   '<td style="'+tdLbl+'">Tgl. Mulai Kerja</td>'
  +   '<td style="'+tdVal+'">&nbsp;</td>'
  +   '<td style="'+tdLbl+'">No. HP / Email</td>'
  +   '<td style="'+tdVal+'">'+(d.kontak||'')+'</td>'
  + '</tr>'
  + '</table></div>'

  // B. JENIS CUTI
  + '<div style="margin-bottom:6px;border:1px solid '+BORDER+';">'
  + '<div style="'+secH+'">B. &nbsp;JENIS CUTI &nbsp;<span style="font-weight:normal;font-size:8.5pt">(beri tanda ✓ pada kotak yang sesuai)</span></div>'
  + '<div style="padding:5px 8px;">'
  +   '<div style="display:flex;gap:20px;margin-bottom:3px;">'
  +     '<span style="display:flex;align-items:center;gap:4px;">'+cb('Cuti Tahunan')+' Cuti Tahunan</span>'
  +     '<span style="display:flex;align-items:center;gap:4px;">'+cb('Cuti Sakit')+' Cuti Sakit</span>'
  +     '<span style="display:flex;align-items:center;gap:4px;">'+cb('Cuti Melahirkan')+' Cuti Melahirkan</span>'
  +     '<span style="display:flex;align-items:center;gap:4px;">'+cb('Cuti Penting')+' Cuti Penting</span>'
  +   '</div>'
  +   '<div style="display:flex;gap:20px;">'
  +     '<span style="display:flex;align-items:center;gap:4px;">'+cb('Cuti di Luar Tanggungan')+' Cuti di Luar Tanggungan</span>'
  +     '<span style="display:flex;align-items:center;gap:4px;">'+(isLainnya?'&#9745;':'&#9744;')+' Lainnya: '+(isLainnya?'<u>'+d.jenisCuti+'</u>':'________________________________________________')+'</span>'
  +   '</div>'
  + '</div></div>'

  // C. RINCIAN CUTI
  + '<div style="margin-bottom:6px;border:1px solid '+BORDER+';">'
  + '<div style="'+secH+'">C. &nbsp;RINCIAN CUTI</div>'
  + '<table>'
  + '<tr>'
  +   '<td style="'+tdLbl+'width:18%">Tanggal Mulai</td>'
  +   '<td style="'+tdVal+'width:32%">'+fmtTgl(d.tglMulai)+'</td>'
  +   '<td style="'+tdLbl+'width:18%">Tanggal Selesai</td>'
  +   '<td style="'+tdVal+'width:32%">'+fmtTgl(d.tglSelesai)+'</td>'
  + '</tr>'
  + '<tr>'
  +   '<td style="'+tdLbl+'">Jumlah Hari Kerja</td>'
  +   '<td style="'+tdVal+'">'+(d.jumlahHari||'')+'</td>'
  +   '<td style="'+tdLbl+'">Masuk Kembali</td>'
  +   '<td style="'+tdVal+'">'+(d.masukKembali||'')+'</td>'
  + '</tr>'
  + '<tr>'
  +   '<td style="'+tdLbl+'vertical-align:top;padding-top:4px;">Alasan /<br>Keperluan</td>'
  +   '<td colspan="3" style="'+tdTall+'">'+(d.alasan||'')+'</td>'
  + '</tr>'
  + '</table></div>'

  // D. SALDO HAK CUTI
  + '<div style="margin-bottom:6px;border:1px solid '+BORDER+';">'
  + '<div style="'+secH+'">D. &nbsp;SALDO HAK CUTI TAHUNAN &nbsp;<span style="font-weight:normal;font-size:8.5pt">(diisi oleh HRD)</span></div>'
  + '<table>'
  + '<tr>'
  +   '<td style="'+tdLbl+'width:25%">Hak Cuti Tahun Berjalan</td>'
  +   '<td style="'+tdVal+'width:25%">&nbsp;</td>'
  +   '<td style="'+tdLbl+'width:25%">Sudah Diambil</td>'
  +   '<td style="'+tdVal+'width:25%">&nbsp;</td>'
  + '</tr>'
  + '<tr>'
  +   '<td style="'+tdLbl+'">Sisa Hak Cuti</td>'
  +   '<td style="'+tdVal+'">&nbsp;</td>'
  +   '<td style="'+tdLbl+'">Sisa Setelah Cuti Ini</td>'
  +   '<td style="'+tdVal+'">&nbsp;</td>'
  + '</tr>'
  + '</table></div>'

  // E. DELEGASI TUGAS
  + '<div style="margin-bottom:6px;border:1px solid '+BORDER+';">'
  + '<div style="'+secH+'">E. &nbsp;DELEGASI TUGAS SELAMA CUTI</div>'
  + '<table><tr>'
  +   '<td style="'+tdLbl+'width:30%">Pekerjaan<br>didelegasikan kepada</td>'
  +   '<td style="'+tdVal+'width:20%">'+(d.delegasiNama||'')+'</td>'
  +   '<td style="'+tdLbl+'width:25%">Kontak saat<br>cuti</td>'
  +   '<td style="'+tdVal+'width:25%">'+(d.kontakCuti||'')+'</td>'
  + '</tr></table></div>'

  // F. PERSETUJUAN
  + '<div style="margin-bottom:8px;border:1px solid '+BORDER+';">'
  + '<div style="'+secH+'">F. &nbsp;PERSETUJUAN</div>'
  + '<table><tr>'
  +   '<td style="'+tdBase+'text-align:center;width:33%;padding:8px 6px;">'
  +     '<div>Pemohon,</div>'
  +     '<div style="height:60px;"></div>'
  +     '<div style="margin-bottom:20px;"></div>'
  +     '<div>(________________________)</div>'
  +   '</td>'
  +   '<td style="'+tdBase+'text-align:center;width:33%;padding:8px 6px;">'
  +     '<div>Atasan Langsung,</div>'
  +     '<div style="height:60px;"></div>'
  +     '<div style="margin-bottom:20px;"></div>'
  +     '<div>(________________________)</div>'
  +   '</td>'
  +   '<td style="'+tdBase+'text-align:center;width:33%;padding:8px 6px;">'
  +     '<div>Menyetujui, HRD/Manajer,</div>'
  +     '<div style="height:60px;"></div>'
  +     '<div style="margin-bottom:20px;"></div>'
  +     '<div>(________________________)</div>'
  +   '</td>'
  + '</tr></table></div>'

  // CATATAN
  + '<div style="font-size:8.5pt;font-style:italic;color:#333;line-height:1.55;">'
  + '<i>Catatan: Cuti sakit wajib melampirkan surat keterangan dokter. Cuti melahirkan melampirkan surat keterangan dokter/bidan. Formulir diajukan minimal [3] hari kerja sebelum tanggal cuti (kecuali kondisi mendesak).</i>'
  + '</div>'
  + '</body></html>';

  var win = window.open('', '_blank');
  if(!win) { showAlert('Pop-up diblokir browser. Izinkan pop-up untuk halaman ini.', 'Pop-up Diblokir'); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(function(){ win.print(); }, 600);
}
