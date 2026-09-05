// ===================== ABSENSI =====================
const TARGET_LAT=-6.234139,TARGET_LNG=107.360805,MAX_RADIUS=30;
const NON_SHIFT_ROLES=['NOC','Admin','Finance','SPV','CS'];

function selectRole(roleName,element){
  document.getElementById('selectedRole').value=roleName;
  document.querySelectorAll('.role-btn').forEach(b=>{b.className='role-btn py-2.5 px-2 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 transition-all flex flex-col items-center gap-1 hover:border-slate-300';});
  element.className='role-btn active py-2.5 px-2 rounded-xl border-2 border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-300 transition-all flex flex-col items-center gap-1';
  // Update label jam di tombol shift sesuai role
  const s1=document.getElementById('shift1-jam-label'),s2=document.getElementById('shift2-jam-label'),ns=document.getElementById('nonshift-jam-label');
  if(roleName==='CS'){if(s1)s1.textContent='07:00 WIB';if(s2)s2.textContent='13:00 WIB';if(ns)ns.textContent='09:00 WIB';}
  else if(roleName==='NOC'){if(s1)s1.textContent='08:00 WIB';if(s2)s2.textContent='14:00 WIB';if(ns)ns.textContent='10:00 WIB';}
  else{if(s1)s1.textContent='08:00 WIB';if(s2)s2.textContent='14:00 WIB';if(ns)ns.textContent='09:00 WIB';}
  updateShiftVisibility(roleName);updateGPSLabel(roleName);
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
    if(infoTxt)infoTxt.textContent='NOC: Non Shift — masuk 10:00 WIB, batas 10:15 (setiap hari kecuali Minggu).';
    // Otomatis pilih Non Shift
    document.querySelectorAll('.shift-btn').forEach((b,i)=>{if(i===2){b.classList.add('border-blue-600','bg-blue-50','dark:bg-blue-950/40','text-blue-900','dark:text-blue-300');b.classList.remove('border-slate-100','dark:border-slate-700','bg-slate-50','dark:bg-slate-700/50','text-slate-700','dark:text-slate-300');}else{b.classList.remove('border-blue-600','bg-blue-50','dark:bg-blue-950/40','text-blue-900','dark:text-blue-300');b.classList.add('border-slate-100','dark:border-slate-700','bg-slate-50','dark:bg-slate-700/50','text-slate-700','dark:text-slate-300');}});
    document.getElementById('selectedShift').value='NonShift';
  } else if(['Admin','Finance','SPV'].includes(role)){
    if(infoTxt){
      if(dow===0)infoTxt.textContent='Minggu — hari libur.';
      else if(dow===6)infoTxt.textContent='Sabtu: Non Shift — masuk 10:00 (batas 10:15).';
      else infoTxt.textContent='Non Shift: masuk 09:00 WIB, batas 09:15 (Senin-Jumat).';
    }
    document.querySelectorAll('.shift-btn').forEach((b,i)=>{if(i===2){b.classList.add('border-blue-600','bg-blue-50','dark:bg-blue-950/40','text-blue-900','dark:text-blue-300');b.classList.remove('border-slate-100','dark:border-slate-700','bg-slate-50','dark:bg-slate-700/50','text-slate-700','dark:text-slate-300');}else{b.classList.remove('border-blue-600','bg-blue-50','dark:bg-blue-950/40','text-blue-900','dark:text-blue-300');b.classList.add('border-slate-100','dark:border-slate-700','bg-slate-50','dark:bg-slate-700/50','text-slate-700','dark:text-slate-300');}});
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
  document.getElementById('selectedShift').value=shiftName;
  document.querySelectorAll('.shift-btn').forEach(b=>{b.className='shift-btn py-2.5 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 transition-all flex items-center justify-center gap-2 hover:border-slate-300';});
  element.className='shift-btn active py-2.5 rounded-xl border-2 border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-300 transition-all flex items-center justify-center gap-2';
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
      locationData={lat,lng,distance:0,wfh:true};
      status.innerHTML="<span class='font-bold text-emerald-600 dark:text-emerald-400'>✓ Lokasi Terdeteksi (WFH/Kantor)</span><br>Lat: "+lat.toFixed(6)+", Lng: "+lng.toFixed(6);
    } else {
      const dist=Math.round(calculateDistance(lat,lng,TARGET_LAT,TARGET_LNG));
      if(dist<=MAX_RADIUS){locationData={lat,lng,distance:dist};status.innerHTML="<span class='font-bold text-emerald-600 dark:text-emerald-400'>✓ Lokasi Valid (Dalam Radius)</span><br>Lat: "+lat.toFixed(6)+", Lng: "+lng.toFixed(6)+"<br><span class='text-slate-400'>Jarak: "+dist+"m</span>";}
      else{locationData=null;status.innerHTML="<span class='font-bold text-rose-600 dark:text-rose-400'>✕ Di Luar Jangkauan!</span><br><span class='text-rose-500'>Jarak: "+dist+"m (Maks. 30m)</span>";showAlert('Anda berada '+dist+'m dari kantor.','Di Luar Radius');}
    }
  },()=>{locationData=null;status.innerHTML="<span class='text-rose-500 font-semibold'>Gagal ambil GPS.</span>";},{enableHighAccuracy:true,timeout:10000,maximumAge:0});
}

// Hitung point kehadiran per hari
function hitungPointKehadiran(statusKehadiran,mntTerlambat,jenisCuti,adaSurat){
  if(statusKehadiran==='TEPAT WAKTU')return 10;
  if(statusKehadiran==='TERLAMBAT'){if(mntTerlambat<30)return 7;if(mntTerlambat<60)return 5;return 3;}
  if(statusKehadiran==='IZIN SAKIT')return adaSurat?6:4;
  if(statusKehadiran==='IZIN CUTI')return 5;
  return 0; // ALPA
}

function cekKeterlambatan(){
  const role=document.getElementById('selectedRole').value;
  const shift=document.getElementById('selectedShift').value;
  const now=new Date();const dow=now.getDay();const tot=now.getHours()*60+now.getMinutes();
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

function handleFormSubmit(event){
  event.preventDefault();const btn=document.getElementById('btn-submit');
  const empName=document.getElementById('employeeName').value;const role=document.getElementById('selectedRole').value;const shift=document.getElementById('selectedShift').value;const lateReason=document.getElementById('lateReason').value;
  if(!empName){showAlert('Silakan pilih Nama Karyawan.');return;}
  if(!locationData){showAlert('Silakan dapatkan lokasi GPS terlebih dahulu.');return;}
  if(!capturedImageData){showAlert('Silakan ambil foto selfie presensi.');return;}
  const{isLate,mntLate,statusKehadiran}=cekKeterlambatan();
  if(isLate&&!lateReason.trim()){showAlert('Anda terlambat! Isi alasan keterlambatan.');return;}
  const point=hitungPointKehadiran(statusKehadiran,mntLate,'',false);
  const orig=btn.innerHTML;btn.disabled=true;btn.innerHTML='<i class="fa-solid fa-spinner animate-spin"></i><span>Mengirim...</span>';
  setTimeout(()=>{
    btn.disabled=false;btn.innerHTML=orig;
    document.getElementById('attendance-form').classList.add('hidden');document.getElementById('success-screen').classList.remove('hidden');
    const badge=document.getElementById('screen-status-badge'),ptVal=document.getElementById('screen-point-val');
    if(isLate){badge.innerText='HADIR (TERLAMBAT)';badge.className='inline-block px-4 py-2 rounded-2xl border text-sm font-extrabold bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800';}
    else{badge.innerText='HADIR (TEPAT WAKTU)';badge.className='inline-block px-4 py-2 rounded-2xl border text-sm font-extrabold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';}
    if(ptVal)ptVal.textContent='+'+point;
  },1000);
}

function setSickDocStatus(ada,el){
  sickHasDoc=ada;
  document.querySelectorAll('.sick-doc-btn').forEach(b=>{b.className='sick-doc-btn py-2.5 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-2 transition-all hover:border-slate-300';});
  el.className='sick-doc-btn py-2.5 rounded-xl border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 transition-all';
  const pt=ada?6:4;const prev=document.getElementById('sick-point-preview');if(prev)prev.textContent=pt+' poin '+(ada?'(dengan surat)':'(tanpa surat)');
  const upld=document.getElementById('sick-doc-upload');if(upld){if(ada)upld.classList.remove('hidden');else upld.classList.add('hidden');}
}

function handleLeaveSubmit(event,jenisForm){
  event.preventDefault();const form=event.target;const btn=form.querySelector('button[type="submit"]');
  const name=form.querySelector('select[name="nama"]').value;const ket=form.querySelector('textarea[name="keterangan"]').value;
  if(!name||!ket){showAlert('Harap pilih nama dan isi keterangan.');return;}
  const orig=btn.innerHTML;btn.disabled=true;btn.innerHTML='<i class="fa-solid fa-spinner animate-spin"></i>Mengirim...';
  setTimeout(()=>{btn.disabled=false;btn.innerHTML=orig;if(jenisForm==='Izin Sakit'){document.getElementById('form-sakit').classList.add('hidden');document.getElementById('success-screen-sakit').classList.remove('hidden');}else{document.getElementById('form-cuti').classList.add('hidden');document.getElementById('success-screen-cuti').classList.remove('hidden');}},1000);
}

function renderMyPointSection(){
  const el=document.getElementById('my-attendance-point'),elMax=document.getElementById('my-max-point'),elGrade=document.getElementById('my-grade-badge');
  if(!el)return;
  const name=currentUser?currentUser.displayName:'';
  const ap=absensiPoints[name]||{total:0,max:200,perfect:false};
  const pct=Math.round((ap.total/ap.max)*100);
  const grade=pct>=90?'A':pct>=75?'B':pct>=60?'C':'D';
  const gColor=pct>=90?'text-emerald-300':pct>=75?'text-blue-300':pct>=60?'text-amber-300':'text-rose-300';
  if(el)el.textContent=ap.total+(ap.perfect?' ⭐':'');
  if(elMax)elMax.textContent=ap.max+' poin';
  if(elGrade)elGrade.innerHTML=`<span class="${gColor} font-black">Grade ${grade}</span>`;
}

function resetForm(){document.getElementById('attendance-form').reset();document.getElementById('photo-preview').classList.add('hidden');document.getElementById('camera-placeholder').classList.remove('hidden');document.getElementById('success-screen').classList.add('hidden');document.getElementById('attendance-form').classList.remove('hidden');capturedImageData=null;locationData=null;document.getElementById('location-status').innerText='Klik tombol untuk mendeteksi GPS.';}
function resetFormSakit(){document.getElementById('form-sakit').reset();document.getElementById('label-file-sakit').innerText='Upload Surat Dokter';document.getElementById('success-screen-sakit').classList.add('hidden');document.getElementById('form-sakit').classList.remove('hidden');}
function resetFormCuti(){document.getElementById('form-cuti').reset();document.getElementById('label-file-cuti').innerText='Upload Surat Cuti';document.getElementById('success-screen-cuti').classList.add('hidden');document.getElementById('form-cuti').classList.remove('hidden');}
function updateFileName(input,labelId){if(input.files&&input.files[0])document.getElementById(labelId).innerText='File: '+input.files[0].name;}