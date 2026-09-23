// ===================== DASHBOARD =====================
let dashboardAttendanceMine={tepat:0,terlambat:0,sakit:0,cuti:0,alpa:0,loaded:false,error:false};
let dashboardAttendanceRequest=0;

async function loadAbsensiRawData(){
  if(typeof supa==='undefined')return;
  try{
    const month=Number((document.getElementById('recapMonthSelect')||{value:new Date().getMonth()}).value);
    const year=Number((document.getElementById('recapYearSelect')||{value:new Date().getFullYear()}).value);
    const pad=n=>String(n).padStart(2,'0');
    const daysInMonth=new Date(year,month+1,0).getDate();
    const start=`${year}-${pad(month+1)}-01`;
    const end=`${year}-${pad(month+1)}-${pad(daysInMonth)}`;
    const {data,error}=await supa.from('absensi').select('nama,tanggal,status_kehadiran').gte('tanggal',start).lte('tanggal',end);
    if(error)throw error;
    absensiRawData=data||[];
  }catch(err){
    console.warn('[Dashboard] Gagal load raw data absensi:',err.message);
    absensiRawData=[];
  }
}

function setDefaultFilterPeriod(){
  const now=new Date(),ms=document.getElementById('recapMonthSelect'),ys=document.getElementById('recapYearSelect');
  if(ms)ms.value=now.getMonth().toString();
  if(ys){const yr=now.getFullYear().toString();let f=false;for(let i=0;i<ys.options.length;i++)if(ys.options[i].value===yr){f=true;break;}if(!f){const o=document.createElement('option');o.value=yr;o.innerText=yr;ys.appendChild(o);}ys.value=yr;}
}

async function loadDashboardAttendanceMine(){
  const request=++dashboardAttendanceRequest;
  const userName=(currentUser&&currentUser.displayName||'').trim();
  const month=Number((document.getElementById('recapMonthSelect')||{value:new Date().getMonth()}).value);
  const year=Number((document.getElementById('recapYearSelect')||{value:new Date().getFullYear()}).value);
  if(!userName||typeof supa==='undefined'){
    if(request===dashboardAttendanceRequest){dashboardAttendanceMine={tepat:0,terlambat:0,sakit:0,cuti:0,alpa:0,loaded:true,error:false};renderDonutChart();}
    return;
  }

  const pad=n=>String(n).padStart(2,'0');
  const start=`${year}-${pad(month+1)}-01`;
  const endDate=new Date(year,month+1,0);
  const end=`${year}-${pad(month+1)}-${pad(endDate.getDate())}`;
  const next={tepat:0,terlambat:0,sakit:0,cuti:0,alpa:0};
  try{
    const {data,error}=await supa.from('absensi').select('status_kehadiran,tanggal').eq('nama',userName).gte('tanggal',start).lte('tanggal',end);
    if(error)throw error;
    (data||[]).forEach(row=>{
      const status=String(row.status_kehadiran||'').toUpperCase();
      if(status==='TEPAT WAKTU')next.tepat++;
      else if(status==='TERLAMBAT')next.terlambat++;
      else if(status==='IZIN SAKIT')next.sakit++;
      else if(status==='IZIN CUTI')next.cuti++;
      else if(status==='ALPA')next.alpa++;
    });
    if(request!==dashboardAttendanceRequest)return;
    dashboardAttendanceMine={...next,loaded:true,error:false};
  }catch(error){
    if(request!==dashboardAttendanceRequest)return;
    console.warn('[Dashboard] Gagal memuat komposisi kehadiran akun:',error.message);
    dashboardAttendanceMine={...dashboardAttendanceMine,loaded:true,error:true};
  }
  if(request===dashboardAttendanceRequest)renderDonutChart();
}

async function fetchDashboardData(){
  await loadAbsensiRawData(); // Load raw data untuk chart
  populateEmployeeDropdowns();updateDashboardStats();renderPodium();renderKPIKlasemen();updateRecapTable();renderMainChart();renderDonutChart();
  loadDashboardAttendanceMine();
}
function onFilterPeriodChange(){fetchDashboardData();}

function populateEmployeeDropdowns(){
  // employeeName sudah diganti jadi input readonly — tidak perlu populate dropdown
  // Hanya isi kalau masih ada element select legacy
  const html='<option value="" disabled selected>-- Pilih Nama --</option>'+employeeMaster.map(e=>`<option value="${e.name}">${e.name}</option>`).join('');
  document.querySelectorAll('select.employee-legacy').forEach(el=>{ if(el) el.innerHTML=html; });
  // Auto-fill nama dari currentUser ke semua form absensi
  if(typeof autoFillNamaAbsensi==='function') autoFillNamaAbsensi();
}

function setRoleFilter(role){
  currentRoleFilter=role;
  document.querySelectorAll('.filter-role-btn').forEach(b=>b.classList.remove('active'));
  const btn=document.getElementById('filter-role-'+role);if(btn)btn.classList.add('active');
  updateDashboardStats();renderPodium();renderKPIKlasemen();updateRecapTable();renderMainChart();renderDonutChart();
}

function getFiltered(){
  let f=employeeMaster;
  if(currentRoleFilter==='CS')f=f.filter(e=>window.sinuResolveOperationalDivision(e.name,e.role)==='CS');
  else if(currentRoleFilter==='Admin')f=f.filter(e=>window.sinuResolveOperationalDivision(e.name,e.role)==='Admin');
  else if(currentRoleFilter==='NOC')f=f.filter(e=>e.role==='NOC');
  else if(currentRoleFilter==='Teknisi')f=f.filter(e=>e.role==='Teknisi');
  return f;
}

function updateDashboardStats(){
  const f=getFiltered();let tT=0,tL=0,tS=0,tC=0,tH=0;
  // Gunakan data monthly
  f.forEach(e=>{const s=e.monthly||{};const h=s.hadir||0,l=s.terlambat||0,tw=(s.tepatWaktu!=null)?s.tepatWaktu:Math.max(0,h-l);tH+=h;tT+=tw;tL+=l;tS+=(s.izinSakit||0);tC+=(s.izinCuti||0);});
  const tot=tH+tS+tC||1;
  const el=id=>document.getElementById(id);
  if(el('stat-present'))el('stat-present').innerText=Math.round((tT/tot)*100)+'%';
  if(el('stat-late'))el('stat-late').innerText=Math.round((tL/tot)*100)+'%';
  if(el('stat-sick'))el('stat-sick').innerText=Math.round((tS/tot)*100)+'%';
  if(el('stat-leave'))el('stat-leave').innerText=Math.round((tC/tot)*100)+'%';
}

function renderDonutChart(){
  const ctx=document.getElementById('attendanceDonut');if(!ctx)return;
  const mine=dashboardAttendanceMine||{};
  const tT=Number(mine.tepat)||0,tL=Number(mine.terlambat)||0,tS=Number(mine.sakit)||0,tC=Number(mine.cuti)||0,tA=Number(mine.alpa)||0;
  const total=tT+tL+tS+tC+tA;
  const pT=total?Math.round((tT/total)*100):0;
  const pL=total?Math.round((tL/total)*100):0;
  const pS=total?Math.round((tS/total)*100):0;
  const pC=total?Math.round((tC/total)*100):0;
  const pA=total?Math.max(0,100-pT-pL-pS-pC):0;
  const el=id=>document.getElementById(id);
  if(el('donut-tepat'))el('donut-tepat').innerText=pT+'%';
  if(el('donut-terlambat'))el('donut-terlambat').innerText=pL+'%';
  if(el('donut-sakit'))el('donut-sakit').innerText=pS+'%';
  if(el('donut-cuti'))el('donut-cuti').innerText=pC+'%';
  if(el('donut-alpa'))el('donut-alpa').innerText=pA+'%';
  if(el('donut-center-val'))el('donut-center-val').innerText=(pT+pL)+'%';
  // Isi stat card angka hari
  if(el('donut-count-tepat'))el('donut-count-tepat').innerText=tT;
  if(el('donut-count-terlambat'))el('donut-count-terlambat').innerText=tL;
  if(el('donut-count-izin'))el('donut-count-izin').innerText=tS+tC+tA;
  if(donutChartInstance)donutChartInstance.destroy();
  donutChartInstance=new Chart(ctx,{type:'doughnut',data:{datasets:[{data:total?[pT,pL,pS,pC,pA]:[1],backgroundColor:total?['#22c55e','#f59e0b','#ef4444','#6366f1','#94a3b8']:['#cbd5e1'],borderWidth:0,hoverOffset:4}]},options:{responsive:true,cutout:'75%',plugins:{legend:{display:false}}}});
}

function renderMainChart(){
  const ctx=document.getElementById('mainAttendanceChart');if(!ctx)return;
  const isDark=document.documentElement.classList.contains('dark');
  const grid=isDark?'rgba(51,65,85,0.5)':'rgba(226,232,240,0.6)',text=isDark?'#94a3b8':'#64748b';
  
  // Ambil bulan dan tahun dari filter
  const month=Number((document.getElementById('recapMonthSelect')||{value:new Date().getMonth()}).value);
  const year=Number((document.getElementById('recapYearSelect')||{value:new Date().getFullYear()}).value);
  const daysInMonth=new Date(year,month+1,0).getDate();
  
  // Buat label per tanggal (1-31)
  const labels=[];
  for(let d=1;d<=daysInMonth;d++)labels.push(d.toString());
  
  // Hitung attendance rate per hari untuk role yang dipilih
  const data=Array(daysInMonth).fill(0);
  const f=getFiltered();
  
  // Load data dari absensi untuk bulan/tahun terpilih
  if(typeof supa!=='undefined'&&absensiRawData.length>0){
    const pad=n=>String(n).padStart(2,'0');
    const start=`${year}-${pad(month+1)}-01`;
    const end=`${year}-${pad(month+1)}-${pad(daysInMonth)}`;
    
    // Filter absensi sesuai periode dan karyawan yang sedang difilter
    const employeeNames=f.map(e=>e.name);
    const filteredAbs=absensiRawData.filter(row=>{
      const tgl=row.tanggal||'';
      return tgl>=start && tgl<=end && employeeNames.includes(row.nama);
    });
    
    // Hitung persentase kehadiran per tanggal
    for(let d=1;d<=daysInMonth;d++){
      const dateStr=`${year}-${pad(month+1)}-${pad(d)}`;
      const dayData=filteredAbs.filter(r=>r.tanggal===dateStr);
      if(dayData.length>0){
        const hadir=dayData.filter(r=>['TEPAT WAKTU','TERLAMBAT'].includes(String(r.status_kehadiran||'').toUpperCase())).length;
        data[d-1]=Math.round((hadir/employeeNames.length)*100);
      }
    }
  }
  
  if(mainChartInstance)mainChartInstance.destroy();
  mainChartInstance=new Chart(ctx,{type:'line',data:{labels,datasets:[{label:'Kehadiran (%)',data,borderColor:'#06b6d4',backgroundColor:'rgba(6,182,212,0.08)',borderWidth:2.5,fill:true,tension:0.4,pointRadius:3,pointBackgroundColor:'#06b6d4',pointBorderColor:'#fff',pointBorderWidth:2}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{color:grid},ticks:{color:text,font:{size:10}}},y:{min:0,max:100,grid:{color:grid},ticks:{color:text,font:{size:10},callback:v=>v+'%'}}}}});
}

// PODIUM TOP 3
function calcTotalPoint(emp){
  const ap=absensiPoints[emp.name];const hadir=ap?ap.total:0;
  // KPI kinerja: rata-rata dari tiket yang dikerjakan
  const tikets=kpiWOData.filter(d=>d.teknisi&&d.teknisi.includes(emp.name)&&d.t4);
  let kinerja=0;
  if(tikets.length){tikets.forEach(t=>{const dur=selisihMenit(t.t2,t.t4);const teknisiCount=Array.isArray(t.teknisi)?t.teknisi.filter(Boolean).length:([t.teknisi_1,t.teknisi_2].filter(Boolean).length||1);kinerja+=hitungPointTeknisi(dur||0,t.tipe,teknisiCount);});kinerja=Math.round(kinerja/tikets.length*10);}
  return hadir+kinerja;
}

function renderPodium(){
  const el=document.getElementById('podium-container');if(!el||!employeeMaster.length){if(el)el.innerHTML='<p class="text-xs text-slate-400 py-4 w-full text-center">Belum ada data karyawan.</p>';return;}
  // Hitung total poin (kehadiran + kinerja) untuk setiap karyawan
  const withPoints=[...employeeMaster].map(e=>{
    const totalPt=calcTotalPoint(e);
    return{...e,_totalPt:totalPt};
  });
  const sorted=withPoints.sort((a,b)=>b._totalPt-a._totalPt);
  const top=sorted.slice(0,3);
  const medals=['🥇','🥈','🥉'];
  const heights=['h-28','h-20','h-16'];
  const colors=['from-amber-400 to-yellow-500','from-slate-400 to-slate-500','from-orange-700 to-orange-800'];
  const order=[1,0,2]; // tampilkan: #2, #1, #3
  const html=order.map(i=>{
    if(!top[i])return'';
    const e=top[i];
    const ap=absensiPoints[e.name];
    const ptHadir=ap?ap.total:0;
    const ptTotal=e._totalPt;
    const ptKinerja=Math.round((ptTotal-ptHadir)*10)/10;
    const isFirst=i===0;
    return `<div class="podium-card flex flex-col items-center gap-2 ${isFirst?'scale-105':''}">
      <div class="text-2xl">${medals[i]}</div>
      <div class="w-12 h-12 rounded-2xl bg-gradient-to-br ${colors[i]} text-white font-black text-sm flex items-center justify-center shadow-lg">${e.id||e.name.substring(0,2).toUpperCase()}</div>
      <div class="text-center"><p class="text-[11px] font-extrabold text-slate-800 dark:text-slate-100 leading-tight max-w-[80px] truncate">${e.name}</p><p class="text-[9px] text-slate-500">${e.role||''}</p></div>
      <div class="bg-slate-100 dark:bg-slate-700 rounded-xl px-3 py-1 text-center">
        <p class="text-lg font-black text-slate-900 dark:text-white leading-none">${ptTotal}</p>
        <p class="text-[9px] text-slate-400 font-semibold">poin</p>
        <p class="text-[8px] text-slate-400 mt-0.5">${ptHadir} hadir + ${ptKinerja} kinerja</p>
      </div>
      <div class="w-12 ${heights[i]} bg-gradient-to-t ${colors[i]} rounded-t-xl opacity-80"></div>
    </div>`;
  }).join('');
  el.innerHTML=html||'<p class="text-xs text-slate-400 py-4 w-full text-center">Belum ada data.</p>';
}

// KPI KLASEMEN SINGKAT
function renderKPIKlasemen(){
  const el=document.getElementById('kpi-klasemen-list');if(!el)return;
  if(!employeeMaster.length){el.innerHTML='<p class="text-xs text-slate-400 text-center py-4">Belum ada data.</p>';return;}
  const sorted=[...employeeMaster].map(e=>{
    const ap=absensiPoints[e.name]||{total:0,max:100,perfect:false};
    const pctH=Math.round((ap.total/ap.max)*100);
    const gradeH=pctH>=90?'A':pctH>=75?'B':pctH>=60?'C':'D';
    const tikets=kpiWOData.filter(d=>d.teknisi&&d.teknisi.includes(e.name)&&d.t4);
    let avgKinerja=0;if(tikets.length){tikets.forEach(t=>{const dur=selisihMenit(t.t2,t.t4);const teknisiCount=Array.isArray(t.teknisi)?t.teknisi.filter(Boolean).length:([t.teknisi_1,t.teknisi_2].filter(Boolean).length||1);avgKinerja+=hitungPointTeknisi(dur||0,t.tipe,teknisiCount);});avgKinerja=Math.round(avgKinerja/tikets.length*10)/10;}
    // untuk CS
    const csTickets=kpiWOData.filter(d=>d.cs===e.name&&d.t1&&d.t2);
    let avgKsCS=0;if(csTickets.length){csTickets.forEach(t=>{const dur=selisihMenit(t.t1,t.t2);avgKsCS+=hitungPointAdmin(dur||0);});avgKsCS=Math.round(avgKsCS/csTickets.length*10)/10;}
    const kinerjaFinal=['CS','Admin'].includes(window.sinuResolveOperationalDivision(e.name,e.role||e.division))?avgKsCS:avgKinerja;
    return{...e,ptHadir:ap.total,pctH,gradeH,ptKinerja:kinerjaFinal,total:ap.total+kinerjaFinal};
  }).sort((a,b)=>b.total-a.total);

  const colorBadge=g=>g==='A'?'pt-badge-a':g==='B'?'pt-badge-b':g==='C'?'pt-badge-c':'pt-badge-d';
  el.innerHTML=sorted.map((e,i)=>`
    <div class="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/40 rounded-2xl border border-slate-200 dark:border-slate-600">
      <span class="w-6 h-6 rounded-lg ${i<3?'bg-amber-500 text-white':'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300'} flex items-center justify-center text-[11px] font-black shrink-0">${i+1}</span>
      <div class="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-black text-xs flex items-center justify-center shrink-0">${e.id||e.name.substring(0,2).toUpperCase()}</div>
      <div class="flex-1 min-w-0"><p class="text-xs font-extrabold text-slate-800 dark:text-slate-100 truncate">${e.name}</p><p class="text-[10px] text-slate-400">${e.role||e.division||''}</p></div>
      <div class="flex items-center gap-2 shrink-0">
        <div class="text-center"><p class="text-[9px] text-slate-400">Hadir</p><p class="text-xs font-black text-emerald-600 dark:text-emerald-400">${e.ptHadir}</p></div>
        <div class="text-center"><p class="text-[9px] text-slate-400">Kinerja</p><p class="text-xs font-black text-blue-600 dark:text-blue-400">${e.ptKinerja}</p></div>
        <span class="text-[10px] font-extrabold px-2 py-0.5 rounded-lg ${colorBadge(e.gradeH)}">${e.gradeH}</span>
      </div>
    </div>`).join('');
}

function updateRecapTable(){
  const tbody=document.getElementById('individual-recap-table-body');if(!tbody)return;
  const period='monthly'; // Selalu gunakan monthly
  const q=((document.getElementById('searchIndividual')||{value:''}).value||'').toLowerCase();
  let f=getFiltered().filter(e=>e.name.toLowerCase().includes(q));
  const hkMap={daily:1,weekly:7,monthly:30};
  tbody.innerHTML=f.map(e=>{
    const s=e[period]||{};const hk=s.hariKerja||hkMap[period]||30;const h=s.hadir||0,l=s.terlambat||0,tw=(s.tepatWaktu!=null)?s.tepatWaktu:Math.max(0,h-l);const pct=Math.round((h/hk)*100);
    const ap=absensiPoints[e.name]||{total:0,max:100};const ptHadir=ap.total;const pctPt=ap.max?Math.round((ap.total/ap.max)*100):0;
    const grade=pctPt>=90?'A':pctPt>=75?'B':pctPt>=60?'C':'D';
    const gradeBg=pctPt>=90?'pt-badge-a':pctPt>=75?'pt-badge-b':pctPt>=60?'pt-badge-c':'pt-badge-d';
    return`<tr class="hover:bg-slate-50/80 dark:hover:bg-slate-700/50 transition-all border-b border-slate-100 dark:border-slate-700"><td class="py-3 px-4 font-bold text-slate-900 dark:text-white"><div class="flex items-center gap-2"><div class="w-7 h-7 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-extrabold text-[10px] flex items-center justify-center shrink-0">${e.id||'--'}</div><span class="text-xs font-extrabold">${e.name}</span></div></td><td class="py-3 px-3 text-center font-bold text-slate-600 dark:text-slate-300 text-xs">${e.role||''}</td><td class="py-3 px-3 text-center font-black text-emerald-600 dark:text-emerald-400">${h}</td><td class="py-3 px-3 text-center font-black text-blue-600 dark:text-blue-400">${tw}</td><td class="py-3 px-3 text-center font-black text-amber-600 dark:text-amber-400">${l}</td><td class="py-3 px-3 text-center font-black text-rose-600 dark:text-rose-400">${s.izinSakit||0}</td><td class="py-3 px-3 text-center font-black text-indigo-600 dark:text-indigo-400">${s.izinCuti||0}</td><td class="py-3 px-3 text-center font-black text-cyan-600 dark:text-cyan-400 text-sm">${pct}%</td><td class="py-3 px-3 text-center font-black text-amber-600">${ptHadir}</td><td class="py-3 px-3 text-center"><span class="text-[11px] font-extrabold px-2 py-0.5 rounded-lg ${gradeBg}">${grade}</span></td></tr>`;
  }).join('');
  if(!f.length)tbody.innerHTML=`<tr><td colspan="10" class="text-center text-xs text-slate-400 py-6">Tidak ada data.</td></tr>`;
}
function filterIndividualList(){updateRecapTable();}

// ── LOAD KARYAWAN DARI TABEL AKUN ────────────────────────────────────
// Pastikan semua akun terdaftar masuk ke employeeMaster untuk rekapitulasi
async function loadEmployeesFromAkun() {
  try {
    var res = await supa.from('akun').select('username, display_name, role, division');
    if(res.error || !res.data) return;
    var roleMap = {
      'admin':'Admin','teknisi':'Teknisi','noc':'NOC',
      'supervisor':'SPV','finance':'Finance','cs':'CS'
    };
    res.data.forEach(function(akun) {
      // Ingat nama akun Owner agar histori WO tidak memasukkannya kembali ke roster KPI.
      if(window.sinuRememberHiddenAccount(akun)) return;
      var namaAkun = akun.display_name || akun.username;
      var roleAkun = roleMap[(akun.role||'').toLowerCase()] || 'Teknisi';
      // Cek apakah sudah ada di employeeMaster
      var exists = employeeMaster.find(function(e){ return e.name.toLowerCase() === namaAkun.toLowerCase(); });
      if(!exists) {
        employeeMaster.push({
          id: namaAkun.substring(0,2).toUpperCase(),
          name: namaAkun, role: roleAkun,
          division: akun.division || '',
          daily:   {hariKerja:1, hadir:0, tepatWaktu:0, terlambat:0, izinSakit:0, izinCuti:0},
          weekly:  {hariKerja:7, hadir:0, tepatWaktu:0, terlambat:0, izinSakit:0, izinCuti:0},
          monthly: {hariKerja:30,hadir:0, tepatWaktu:0, terlambat:0, izinSakit:0, izinCuti:0}
        });
      }
    });
    // Hapus Owner dari roster legacy maupun cache sebelum semua renderer dijalankan.
    employeeMaster = employeeMaster.filter(function(e){
      return !window.sinuIsSuperAdminRole(e.role) && !window.sinuIsHiddenOperationalName(e.name);
    });
    populateEmployeeDropdowns();
    // Re-render dashboard dengan data lengkap
    updateDashboardStats();
    renderPodium();
    renderKPIKlasemen();
    updateRecapTable();
  } catch(e) { console.warn('[Dashboard] Gagal load dari akun:', e.message); }
}
