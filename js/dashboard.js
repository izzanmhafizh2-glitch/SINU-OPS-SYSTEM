// ===================== DASHBOARD =====================
function setDefaultFilterPeriod(){
  const now=new Date(),ms=document.getElementById('recapMonthSelect'),ys=document.getElementById('recapYearSelect');
  if(ms)ms.value=now.getMonth().toString();
  if(ys){const yr=now.getFullYear().toString();let f=false;for(let i=0;i<ys.options.length;i++)if(ys.options[i].value===yr){f=true;break;}if(!f){const o=document.createElement('option');o.value=yr;o.innerText=yr;ys.appendChild(o);}ys.value=yr;}
}

function fetchDashboardData(){
  populateEmployeeDropdowns();updateDashboardStats();renderPodium();renderKPIKlasemen();updateRecapTable();renderMainChart();renderDonutChart();
}
function onFilterPeriodChange(){fetchDashboardData();}

function populateEmployeeDropdowns(){
  const html='<option value="" disabled selected>-- Pilih Nama Anda --</option>'+employeeMaster.map(e=>`<option value="${e.name}">${e.name}</option>`).join('');
  ['#employeeName','.employee-select-sakit','.employee-select-cuti'].forEach(sel=>document.querySelectorAll(sel).forEach(el=>{if(el)el.innerHTML=html;}));
}

function setRoleFilter(role){
  currentRoleFilter=role;
  document.querySelectorAll('.filter-role-btn').forEach(b=>b.classList.remove('active'));
  const btn=document.getElementById('filter-role-'+role);if(btn)btn.classList.add('active');
  updateDashboardStats();renderPodium();renderKPIKlasemen();updateRecapTable();renderMainChart();renderDonutChart();
}
function setChartPeriod(period){
  currentChartPeriod=period;
  document.querySelectorAll('.period-btn').forEach(b=>b.classList.remove('active'));
  const btn=document.getElementById('period-'+period);if(btn)btn.classList.add('active');
  updateDashboardStats();renderMainChart();
}

function getFiltered(){
  let f=employeeMaster;
  if(currentRoleFilter==='CS')f=f.filter(e=>e.role==='CS'||e.role==='Admin'||e.role==='Finance');
  else if(currentRoleFilter==='NOC')f=f.filter(e=>e.role==='NOC');
  else if(currentRoleFilter==='Teknisi')f=f.filter(e=>e.role==='Teknisi');
  return f;
}

function updateDashboardStats(){
  const f=getFiltered();let tT=0,tL=0,tS=0,tC=0,tH=0;
  f.forEach(e=>{const s=e[currentChartPeriod]||{};const h=s.hadir||0,l=s.terlambat||0,tw=(s.tepatWaktu!=null)?s.tepatWaktu:Math.max(0,h-l);tH+=h;tT+=tw;tL+=l;tS+=(s.izinSakit||0);tC+=(s.izinCuti||0);});
  const tot=tH+tS+tC||1;
  const el=id=>document.getElementById(id);
  if(el('stat-present'))el('stat-present').innerText=Math.round((tT/tot)*100)+'%';
  if(el('stat-late'))el('stat-late').innerText=Math.round((tL/tot)*100)+'%';
  if(el('stat-sick'))el('stat-sick').innerText=Math.round((tS/tot)*100)+'%';
  if(el('stat-leave'))el('stat-leave').innerText=Math.round((tC/tot)*100)+'%';
}

function renderDonutChart(){
  const ctx=document.getElementById('attendanceDonut');if(!ctx)return;
  const f=getFiltered();let tT=0,tL=0,tS=0,tC=0,tA=0,tH=0;
  f.forEach(e=>{const s=e.monthly||{};const h=s.hadir||0,l=s.terlambat||0,tw=(s.tepatWaktu!=null)?s.tepatWaktu:Math.max(0,h-l);tH+=h;tT+=tw;tL+=l;tS+=(s.izinSakit||0);tC+=(s.izinCuti||0);tA+=(s.alpa||0);});
  const tot=tT+tL+tS+tC+tA||1;
  const pT=Math.round((tT/tot)*100),pL=Math.round((tL/tot)*100),pS=Math.round((tS/tot)*100),pC=Math.round((tC/tot)*100),pA=100-pT-pL-pS-pC;
  const el=id=>document.getElementById(id);
  if(el('donut-tepat'))el('donut-tepat').innerText=pT+'%';
  if(el('donut-terlambat'))el('donut-terlambat').innerText=pL+'%';
  if(el('donut-sakit'))el('donut-sakit').innerText=pS+'%';
  if(el('donut-cuti'))el('donut-cuti').innerText=pC+'%';
  if(el('donut-alpa'))el('donut-alpa').innerText=Math.max(0,pA)+'%';
  if(el('donut-center-val'))el('donut-center-val').innerText=(pT+pL)+'%';
  if(donutChartInstance)donutChartInstance.destroy();
  donutChartInstance=new Chart(ctx,{type:'doughnut',data:{datasets:[{data:[pT,pL,pS,pC,Math.max(0,pA)],backgroundColor:['#22c55e','#f59e0b','#ef4444','#6366f1','#94a3b8'],borderWidth:0,hoverOffset:4}]},options:{responsive:true,cutout:'75%',plugins:{legend:{display:false}}}});
}

function renderMainChart(){
  const ctx=document.getElementById('mainAttendanceChart');if(!ctx)return;
  const isDark=document.documentElement.classList.contains('dark');
  const grid=isDark?'rgba(51,65,85,0.5)':'rgba(226,232,240,0.6)',text=isDark?'#94a3b8':'#64748b';
  const f=getFiltered();let labels=[],data=[];
  if(currentChartPeriod==='daily'){labels=['08:00','10:00','12:00','14:00','16:00'];let t=0;f.forEach(e=>{t+=(e.daily?e.daily.hadir:0);});data=[Math.max(10,t*20),Math.max(30,t*30),Math.max(50,t*40),Math.max(70,t*50),100];}
  else if(currentChartPeriod==='weekly'){labels=['Sen','Sel','Rab','Kam','Jum','Sab','Min'];let t=0;f.forEach(e=>{t+=(e.weekly?e.weekly.hadir:0);});const b=t>0?80:0;data=[b,b+3,b+2,b+5,b+4,Math.min(100,b+8),Math.min(100,b+10)];}
  else{labels=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];data=labels.map(()=>0);const sel=parseInt((document.getElementById('recapMonthSelect')||{value:7}).value,10);let rate=0;f.forEach(e=>{const h=e.monthly?e.monthly.hadir:0,hk=e.monthly?e.monthly.hariKerja:30;rate+=Math.round((h/hk)*100);});data[sel]=f.length?Math.round(rate/f.length):0;}
  if(mainChartInstance)mainChartInstance.destroy();
  mainChartInstance=new Chart(ctx,{type:'line',data:{labels,datasets:[{label:'Kehadiran (%)',data,borderColor:'#06b6d4',backgroundColor:'rgba(6,182,212,0.08)',borderWidth:2.5,fill:true,tension:0.4,pointRadius:5,pointBackgroundColor:'#06b6d4',pointBorderColor:'#fff',pointBorderWidth:2}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{color:grid},ticks:{color:text,font:{size:10}}},y:{min:0,max:100,grid:{color:grid},ticks:{color:text,font:{size:10},callback:v=>v+'%'}}}}});
}

// PODIUM TOP 3
function calcTotalPoint(emp){
  const ap=absensiPoints[emp.name];const hadir=ap?ap.total:0;const bonus=ap&&ap.perfect?10:0;
  // KPI kinerja: rata-rata dari tiket yang dikerjakan
  const tikets=kpiWOData.filter(d=>d.teknisi&&d.teknisi.includes(emp.name)&&d.t4);
  let kinerja=0;
  if(tikets.length){tikets.forEach(t=>{const dur=selisihMenit(t.t2,t.t4);kinerja+=hitungPointTeknisi(dur||0);});kinerja=Math.round(kinerja/tikets.length*10);}
  return hadir+bonus+kinerja;
}

function renderPodium(){
  const el=document.getElementById('podium-container');if(!el||!employeeMaster.length){if(el)el.innerHTML='<p class="text-xs text-slate-400 py-4 w-full text-center">Belum ada data karyawan.</p>';return;}
  const sorted=[...employeeMaster].sort((a,b)=>{const pa=absensiPoints[a.name]?absensiPoints[a.name].total:0;const pb=absensiPoints[b.name]?absensiPoints[b.name].total:0;return pb-pa;});
  const top=sorted.slice(0,3);
  const medals=['🥇','🥈','🥉'];
  const heights=['h-28','h-20','h-16'];
  const colors=['from-amber-400 to-yellow-500','from-slate-400 to-slate-500','from-orange-700 to-orange-800'];
  const order=[1,0,2]; // tampilkan: #2, #1, #3
  const html=order.map(i=>{
    if(!top[i])return'';
    const e=top[i];const ap=absensiPoints[e.name];const pt=ap?ap.total:0;
    const pct=ap?Math.round((ap.total/ap.max)*100):0;
    const grade=pct>=90?'A':pct>=75?'B':pct>=60?'C':'D';
    const gradeColor=pct>=90?'text-emerald-600':pct>=75?'text-blue-600':pct>=60?'text-amber-600':'text-rose-600';
    const isFirst=i===0;
    return `<div class="podium-card flex flex-col items-center gap-2 ${isFirst?'scale-105':''}">
      <div class="text-2xl">${medals[i]}</div>
      <div class="w-12 h-12 rounded-2xl bg-gradient-to-br ${colors[i]} text-white font-black text-sm flex items-center justify-center shadow-lg">${e.id||e.name.substring(0,2).toUpperCase()}</div>
      <div class="text-center"><p class="text-[11px] font-extrabold text-slate-800 dark:text-slate-100 leading-tight max-w-[80px] truncate">${e.name}</p><p class="text-[9px] text-slate-500">${e.role||''}</p></div>
      <div class="bg-slate-100 dark:bg-slate-700 rounded-xl px-3 py-1 text-center"><p class="text-lg font-black text-slate-900 dark:text-white leading-none">${pt}</p><p class="text-[9px] text-slate-400 font-semibold">poin</p></div>
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
    const ap=absensiPoints[e.name]||{total:0,max:200,perfect:false};
    const pctH=Math.round((ap.total/ap.max)*100);
    const gradeH=pctH>=90?'A':pctH>=75?'B':pctH>=60?'C':'D';
    const tikets=kpiWOData.filter(d=>d.teknisi&&d.teknisi.includes(e.name)&&d.t4);
    let avgKinerja=0;if(tikets.length){tikets.forEach(t=>{const dur=selisihMenit(t.t2,t.t4);avgKinerja+=hitungPointTeknisi(dur||0);});avgKinerja=Math.round(avgKinerja/tikets.length*10)/10;}
    // untuk CS
    const csTickets=kpiWOData.filter(d=>d.cs===e.name&&d.t1&&d.t2);
    let avgKsCS=0;if(csTickets.length){csTickets.forEach(t=>{const dur=selisihMenit(t.t1,t.t2);avgKsCS+=hitungPointAdmin(dur||0);});avgKsCS=Math.round(avgKsCS/csTickets.length*10)/10;}
    const kinerjaFinal=e.role==='CS'||e.division==='CS'?avgKsCS:avgKinerja;
    return{...e,ptHadir:ap.total,pctH,gradeH,ptKinerja:kinerjaFinal,total:ap.total+(kinerjaFinal*10)};
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
  const period=(document.getElementById('recapPeriodSelect')||{value:'monthly'}).value;
  const q=((document.getElementById('searchIndividual')||{value:''}).value||'').toLowerCase();
  const canEdit=currentUser&&(currentUser.role==='admin'||currentUser.role==='supervisor');
  let f=getFiltered().filter(e=>e.name.toLowerCase().includes(q));
  const hkMap={daily:1,weekly:7,monthly:30};
  tbody.innerHTML=f.map(e=>{
    const s=e[period]||{};const hk=s.hariKerja||hkMap[period]||30;const h=s.hadir||0,l=s.terlambat||0,tw=(s.tepatWaktu!=null)?s.tepatWaktu:Math.max(0,h-l);const pct=Math.round((h/hk)*100);
    const ap=absensiPoints[e.name]||{total:0,max:hk*10};const ptHadir=ap.total;const pctPt=ap.max?Math.round((ap.total/ap.max)*100):0;
    const grade=pctPt>=90?'A':pctPt>=75?'B':pctPt>=60?'C':'D';
    const gradeBg=pctPt>=90?'pt-badge-a':pctPt>=75?'pt-badge-b':pctPt>=60?'pt-badge-c':'pt-badge-d';
    const stBadge=pct>=95?'<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">Sangat Baik</span>':pct>=85?'<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">Baik</span>':'<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300">Cukup</span>';
    return`<tr class="hover:bg-slate-50/80 dark:hover:bg-slate-700/50 transition-all border-b border-slate-100 dark:border-slate-700"><td class="py-3 px-4 font-bold text-slate-900 dark:text-white"><div class="flex items-center gap-2"><div class="w-7 h-7 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-extrabold text-[10px] flex items-center justify-center shrink-0">${e.id||'--'}</div><span class="text-xs font-extrabold">${e.name}</span></div></td><td class="py-3 px-3 text-center font-bold text-slate-600 dark:text-slate-300 text-xs">${e.role||''}</td><td class="py-3 px-3 text-center font-black text-emerald-600 dark:text-emerald-400">${h}</td><td class="py-3 px-3 text-center font-black text-blue-600 dark:text-blue-400">${tw}</td><td class="py-3 px-3 text-center font-black text-amber-600 dark:text-amber-400">${l}</td><td class="py-3 px-3 text-center font-black text-rose-600 dark:text-rose-400">${s.izinSakit||0}</td><td class="py-3 px-3 text-center font-black text-indigo-600 dark:text-indigo-400">${s.izinCuti||0}</td><td class="py-3 px-3 text-center font-black text-cyan-600 dark:text-cyan-400 text-sm">${pct}%</td><td class="py-3 px-3 text-center font-black text-amber-600">${ptHadir}</td><td class="py-3 px-3 text-center"><span class="text-[11px] font-extrabold px-2 py-0.5 rounded-lg ${gradeBg}">${grade}</span></td>${canEdit?`<td class="py-3 px-3 text-center"><button onclick="confirmDeleteEmployee('${e.name}')" class="p-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-lg"><i class="fa-solid fa-trash-can text-xs"></i></button></td>`:''}</tr>`;
  }).join('');
  if(!f.length)tbody.innerHTML=`<tr><td colspan="${canEdit?11:10}" class="text-center text-xs text-slate-400 py-6">Tidak ada data.</td></tr>`;
}
function filterIndividualList(){updateRecapTable();}