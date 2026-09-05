// ===================== KPI ENGINE =====================
function hitungPointAdmin(mnt){if(mnt<5)return 10;return Math.max(1,10-Math.floor((mnt-5)/2)*2);}
function hitungPointTeknisi(mnt){if(mnt<15)return 10;return Math.max(1,10-Math.floor((mnt-15)/5)*2);}
function timeToMinutes(t){if(!t)return null;const[h,m]=t.split(':').map(Number);return h*60+m;}
function selisihMenit(t1,t2){const m1=timeToMinutes(t1),m2=timeToMinutes(t2);if(m1===null||m2===null)return null;return Math.max(0,m2-m1);}
function pointBadge(p){if(p>=8)return`<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">${p}</span>`;if(p>=4)return`<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">${p}</span>`;return`<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">${p}</span>`;}

function initKPIFilter(){const now=new Date(),ms=document.getElementById('kpi-month-select'),ys=document.getElementById('kpi-year-select');if(ms)ms.value=now.getMonth().toString();if(ys)ys.value=now.getFullYear().toString();}

function renderKPI(){
  const bulan=parseInt(document.getElementById('kpi-month-select').value),tahun=parseInt(document.getElementById('kpi-year-select').value);
  const filtered=kpiWOData.filter(d=>d.bulan===bulan&&d.tahun===tahun),selesai=filtered.filter(d=>d.t4!==null);
  // Admin KPI
  let tPA=0,tDA=0,hijauA=0,kuningA=0,merahA=0;
  const adminData=filtered.map(d=>{const dur=selisihMenit(d.t1,d.t2);const p=dur!==null?hitungPointAdmin(dur):null;if(p!==null){tPA+=p;tDA+=dur;if(p>=8)hijauA++;else if(p>=4)kuningA++;else merahA++;}return{...d,durAdmin:dur,poinAdmin:p};});
  const jA=adminData.filter(d=>d.poinAdmin!==null).length,avgPA=jA?(tPA/jA).toFixed(1):'--',avgDA=jA?(tDA/jA).toFixed(1):'--';
  // Teknisi KPI per individu
  const teknisiPoints={};
  selesai.forEach(d=>{const dur=selisihMenit(d.t2,d.t4);const p=dur!==null?hitungPointTeknisi(dur):null;if(p!==null&&d.teknisi){d.teknisi.forEach(t=>{if(!teknisiPoints[t])teknisiPoints[t]={total:0,count:0,hijau:0,kuning:0,merah:0};teknisiPoints[t].total+=p;teknisiPoints[t].count++;if(p>=8)teknisiPoints[t].hijau++;else if(p>=4)teknisiPoints[t].kuning++;else teknisiPoints[t].merah++;});}});
  let allPT=0,allCT=0,hijauT=0,kuningT=0,merahT=0;
  Object.values(teknisiPoints).forEach(tp=>{allPT+=tp.total;allCT+=tp.count;hijauT+=tp.hijau;kuningT+=tp.kuning;merahT+=tp.merah;});
  const avgPT=allCT?(allPT/allCT).toFixed(1):'--';
  // Update UI Admin
  const E=id=>document.getElementById(id);
  if(E('kpi-admin-badge'))E('kpi-admin-badge').textContent=jA+' Tiket';
  if(E('kpi-admin-avg-point'))E('kpi-admin-avg-point').textContent=avgPA;
  if(E('kpi-admin-avg-dur'))E('kpi-admin-avg-dur').textContent=avgDA+' mnt';
  const barA=parseFloat(avgPA)>=8?'bg-emerald-500':parseFloat(avgPA)>=4?'bg-amber-500':'bg-rose-500';
  if(E('kpi-admin-bar')){E('kpi-admin-bar').style.width=(jA?parseFloat(avgPA)/10*100:0)+'%';E('kpi-admin-bar').className='h-2.5 rounded-full '+barA+' transition-all duration-700';}
  if(E('kpi-admin-green'))E('kpi-admin-green').textContent=hijauA;if(E('kpi-admin-yellow'))E('kpi-admin-yellow').textContent=kuningA;if(E('kpi-admin-red'))E('kpi-admin-red').textContent=merahA;
  // Update UI Teknisi
  if(E('kpi-teknisi-badge'))E('kpi-teknisi-badge').textContent=selesai.length+' Tiket';
  if(E('kpi-teknisi-avg-point'))E('kpi-teknisi-avg-point').textContent=avgPT;
  const barT=parseFloat(avgPT)>=8?'bg-emerald-500':parseFloat(avgPT)>=4?'bg-amber-500':'bg-rose-500';
  if(E('kpi-teknisi-bar')){E('kpi-teknisi-bar').style.width=(allCT?parseFloat(avgPT)/10*100:0)+'%';E('kpi-teknisi-bar').className='h-2.5 rounded-full '+barT+' transition-all duration-700';}
  if(E('kpi-teknisi-green'))E('kpi-teknisi-green').textContent=hijauT;if(E('kpi-teknisi-yellow'))E('kpi-teknisi-yellow').textContent=kuningT;if(E('kpi-teknisi-red'))E('kpi-teknisi-red').textContent=merahT;
  // Total Point Cards
  const csTotal=jA?tPA:0,tekTotal=allCT?allPT:0;
  if(E('kpi-cs-total-point'))E('kpi-cs-total-point').textContent=jA?csTotal:'--';
  if(E('kpi-cs-total-tiket'))E('kpi-cs-total-tiket').textContent=jA+' tiket';
  if(E('kpi-cs-avg-per-tiket'))E('kpi-cs-avg-per-tiket').textContent=avgPA+' poin';
  if(E('kpi-tek-total-point'))E('kpi-tek-total-point').textContent=allCT?tekTotal:'--';
  if(E('kpi-tek-total-tiket'))E('kpi-tek-total-tiket').textContent=selesai.length+' tiket selesai';
  if(E('kpi-tek-avg-per-tiket'))E('kpi-tek-avg-per-tiket').textContent=avgPT+' poin';
  // Tabel Individu Kehadiran + Kinerja
  renderKPIIndividuTable(teknisiPoints,adminData);
  // Tabel detail tiket
  const tbody=E('kpi-table-body');
  if(tbody){if(!filtered.length){tbody.innerHTML='<tr><td colspan="11" class="text-center py-8 text-slate-400 text-xs">Belum ada data.</td></tr>';}
  else{tbody.innerHTML=adminData.map(d=>{const dur=selisihMenit(d.t2,d.t4);const pT=dur!==null?hitungPointTeknisi(dur):null;return`<tr class="hover:bg-slate-50/80 dark:hover:bg-slate-700/50 transition-all"><td class="py-3 px-3 font-bold text-blue-600 font-mono text-[11px]">${d.id}</td><td class="py-3 px-3 text-xs">${d.pelanggan}</td><td class="py-3 px-3 text-center font-bold text-indigo-600 text-[11px]">${d.cs}</td><td class="py-3 px-3 text-center font-mono text-[11px]">${d.t1||'--'}</td><td class="py-3 px-3 text-center font-mono text-[11px]">${d.t2||'--'}</td><td class="py-3 px-3 text-center text-[11px]">${d.durAdmin!==null?d.durAdmin+' mnt':'--'}</td><td class="py-3 px-3 text-center">${d.poinAdmin!==null?pointBadge(d.poinAdmin):'--'}</td><td class="py-3 px-3 text-center text-[11px]">${d.teknisi?d.teknisi.join(', '):'--'}</td><td class="py-3 px-3 text-center font-mono text-[11px]">${d.t4||'--'}</td><td class="py-3 px-3 text-center text-[11px]">${dur!==null?dur+' mnt':'--'}</td><td class="py-3 px-3 text-center">${pT!==null?pointBadge(pT):'--'}</td></tr>`;}).join('');}}
  renderKPIHistoryList();
}

function renderKPIIndividuTable(teknisiPoints,adminData){
  const tbody=document.getElementById('kpi-individu-table');if(!tbody)return;
  const rows=[];
  // Tambah data teknisi
  Object.entries(teknisiPoints).forEach(([nama,tp])=>{
    const avgK=(tp.total/tp.count).toFixed(1);
    const ap=absensiPoints[nama]||{total:0,max:200};
    const pctH=Math.round((ap.total/ap.max)*100);
    const gradeH=pctH>=90?'A':pctH>=75?'B':pctH>=60?'C':'D';
    const total=ap.total+tp.total;
    rows.push({nama,divisi:'Teknisi',ptHadir:ap.total,gradeH,ptKinerja:parseFloat(avgK),total,tiket:tp.count});
  });
  // Tambah data CS/Admin
  const csMap={};
  adminData.forEach(d=>{if(!d.poinAdmin)return;if(!csMap[d.cs])csMap[d.cs]={total:0,count:0};csMap[d.cs].total+=d.poinAdmin;csMap[d.cs].count++;});
  Object.entries(csMap).forEach(([nama,cp])=>{
    const avgK=(cp.total/cp.count).toFixed(1);
    const ap=absensiPoints[nama]||{total:0,max:200};
    const pctH=Math.round((ap.total/ap.max)*100);
    const gradeH=pctH>=90?'A':pctH>=75?'B':pctH>=60?'C':'D';
    const total=ap.total+cp.total;
    rows.push({nama,divisi:'CS/Admin',ptHadir:ap.total,gradeH,ptKinerja:parseFloat(avgK),total,tiket:cp.count});
  });
  rows.sort((a,b)=>b.total-a.total);
  const gradeBg=g=>g==='A'?'pt-badge-a':g==='B'?'pt-badge-b':g==='C'?'pt-badge-c':'pt-badge-d';
  if(!rows.length){tbody.innerHTML='<tr><td colspan="7" class="text-center py-8 text-slate-400 text-xs">Belum ada data tiket selesai bulan ini.</td></tr>';return;}
  tbody.innerHTML=rows.map((r,i)=>`<tr class="hover:bg-slate-50/80 dark:hover:bg-slate-700/50 transition-all">
    <td class="py-3 px-4"><div class="flex items-center gap-2"><span class="w-6 h-6 rounded-lg ${i<3?'bg-amber-500 text-white':'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300'} flex items-center justify-center text-[10px] font-black shrink-0">${i+1}</span><span class="text-xs font-extrabold text-slate-800 dark:text-slate-100">${r.nama}</span></div></td>
    <td class="py-3 px-3 text-center text-xs font-bold text-slate-500">${r.divisi}</td>
    <td class="py-3 px-3 text-center font-black text-amber-600 dark:text-amber-400">${r.ptHadir}</td>
    <td class="py-3 px-3 text-center"><span class="text-[11px] font-extrabold px-2 py-0.5 rounded-lg ${gradeBg(r.gradeH)}">${r.gradeH}</span></td>
    <td class="py-3 px-3 text-center font-black text-blue-600 dark:text-blue-400">${r.ptKinerja} <span class="text-slate-400 text-[10px] font-normal">(${r.tiket} tiket)</span></td>
    <td class="py-3 px-3 text-center font-black text-slate-900 dark:text-white text-sm">${r.total}</td>
    <td class="py-3 px-3 text-center"><span class="w-5 h-5 rounded-full ${i<3?'bg-amber-500 text-white':'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300'} inline-flex items-center justify-center text-[10px] font-black">${i+1}</span></td>
  </tr>`).join('');
}

function renderKPIHistoryList(){
  const el=document.getElementById('kpi-history-list');if(!el)return;
  if(!kpiHistory.length){el.innerHTML='<p class="text-xs text-slate-400 text-center py-4">Belum ada histori.</p>';return;}
  el.innerHTML=kpiHistory.map(h=>{const cA=parseFloat(h.avgAdmin)>=8?'text-emerald-600':parseFloat(h.avgAdmin)>=4?'text-amber-600':'text-rose-600';const cT=parseFloat(h.avgTeknisi)>=8?'text-emerald-600':parseFloat(h.avgTeknisi)>=4?'text-amber-600':'text-rose-600';return`<div class="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/40 rounded-2xl border border-slate-200 dark:border-slate-600"><div class="flex items-center gap-3"><div class="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-slate-500 dark:text-slate-300 text-xs font-black"><i class="fa-solid fa-calendar-days"></i></div><div><p class="text-xs font-extrabold text-slate-800 dark:text-slate-100">${h.label}</p><p class="text-[10px] text-slate-400">${h.tiket} tiket</p></div></div><div class="flex items-center gap-4 text-center"><div><p class="text-[9px] text-slate-400">Admin</p><p class="text-sm font-black ${cA}">${h.avgAdmin}</p></div><div><p class="text-[9px] text-slate-400">Teknisi</p><p class="text-sm font-black ${cT}">${h.avgTeknisi}</p></div></div></div>`;}).join('');
}
function exportKPIData(){showAlert('Fitur export tersedia setelah koneksi database aktif.','Export KPI');}

// ===================== ODP =====================
function getODPColor(pct){if(pct===0)return'#3b82f6';if(pct<=20)return'#22c55e';if(pct<50)return'#86efac';if(pct<80)return'#eab308';if(pct<100)return'#ef4444';return'#1e293b';}
function getODPStatusLabel(pct){
  if(pct===0)return{label:'Kosong',color:'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'};
  if(pct<=20)return{label:'Hampir Kosong',color:'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'};
  if(pct<50)return{label:'Sebagian',color:'bg-emerald-100 text-emerald-700'};
  if(pct<80)return{label:'Setengah',color:'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300'};
  if(pct<100)return{label:'Hampir Penuh',color:'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'};
  return{label:'PENUH',color:'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900'};
}
function renderODPGrid(){
  const tbody=document.getElementById('odp-grid');if(!tbody)return;
  if(!odpMaster.length){tbody.innerHTML='<tr><td colspan="8" class="text-center py-8 text-slate-400 text-xs">Belum ada data ODP.</td></tr>';return;}
  tbody.innerHTML=odpMaster.map(o=>{const pct=Math.round((o.terisi/o.kapasitas)*100),sisa=o.kapasitas-o.terisi,color=getODPColor(pct),status=getODPStatusLabel(pct);return`<tr class="hover:bg-slate-50/80 dark:hover:bg-slate-700/50 transition-all"><td class="py-3 px-4"><div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full shrink-0" style="background-color:${color}"></span><span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold ${status.color}">${status.label}</span></div></td><td class="py-3 px-3 font-extrabold text-slate-900 dark:text-white font-mono text-xs">${o.id}</td><td class="py-3 px-3 text-slate-600 dark:text-slate-300 text-xs">${o.lokasi}</td><td class="py-3 px-3 text-center font-bold text-xs">${o.kapasitas}</td><td class="py-3 px-3 text-center font-black text-xs" style="color:${color}">${o.terisi}</td><td class="py-3 px-3 text-center font-black text-emerald-600 dark:text-emerald-400 text-xs">${sisa}</td><td class="py-3 px-3 text-center font-black text-xs" style="color:${color}">${pct}%</td><td class="py-3 px-3 w-28"><div class="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden"><div class="h-2 rounded-full" style="width:${pct}%;background-color:${color}"></div></div></td></tr>`;}).join('');
}
function openAddODPModal(){document.getElementById('add-odp-modal').classList.remove('hidden');}
function addODP(e){
  e.preventDefault();const id=document.getElementById('odp-id-input').value.trim().toUpperCase(),lokasi=document.getElementById('odp-lokasi-input').value.trim(),kapasitas=parseInt(document.getElementById('odp-kapasitas-input').value)||8,terisi=parseInt(document.getElementById('odp-terisi-input').value)||0,lat=parseFloat(document.getElementById('odp-lat-input').value)||0,lng=parseFloat(document.getElementById('odp-lng-input').value)||0;
  if(odpMaster.find(o=>o.id===id)){showAlert('ODP dengan ID ini sudah ada!');return;}
  odpMaster.push({id,lokasi,kapasitas,terisi,lat,lng});renderODPGrid();document.getElementById('add-odp-modal').classList.add('hidden');e.target.reset();showAlert('ODP '+id+' berhasil ditambahkan.','ODP Tersimpan');
}
function importODPExcel(event){const f=event.target.files[0];if(!f){return;}showAlert('Import ODP dari Excel berhasil terdeteksi. (Koneksi database diperlukan untuk simpan)','Import ODP');}

// LOG — Sub-tab Log Tugas
function switchSubLogTugas(sub){
  const secLog = document.getElementById('section-logtugas');
  if(secLog) secLog.querySelectorAll('.sub-logtugas-content').forEach(el=>el.classList.add('hidden'));
  document.querySelectorAll('#section-logtugas .snpill').forEach(b=>b.classList.remove('active'));
  const el=document.getElementById('sub-logtugas-'+sub);if(el)el.classList.remove('hidden');
  const btn=document.getElementById('sub-log-'+sub);if(btn)btn.classList.add('active');
  sessionStorage.setItem('sinu_last_sub_logtugas', sub);
  if(sub==='log-wo')loadLogTugas();
  if(sub==='rekap-export')renderRekapWO();
}

// Load Log Tugas dari Supabase
async function loadLogTugas(){
  const tbody=document.getElementById('logtugas-table-body');
  if(!tbody)return;
  tbody.innerHTML='<tr><td colspan="9" class="text-center py-8"><i class="fa-solid fa-spinner animate-spin text-blue-500 mr-2"></i>Memuat dari Supabase...</td></tr>';

  const statusColor={SELESAI:'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',PROSES:'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',RELEASE:'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',PICKUP:'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',RETURN:'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'};
  const tipeColor={INSTALASI:'bg-blue-100 text-blue-700',MAINTENANCE:'bg-amber-100 text-amber-700',GANGGUAN:'bg-rose-100 text-rose-700'};

  try {
    const {data,error}=await supa.from('work_orders').select('*').order('created_at',{ascending:false});
    if(error)throw error;

    const all=data&&data.length?data:kpiWOData.map(d=>({wo_id:d.id,pelanggan:d.pelanggan,tipe:d.tipe,cs_name:d.cs,teknisi:d.teknisi,t1:d.t1,t2:d.t2,t4:d.t4,status:d.status}));

    // Update summary counts
    const E=id=>document.getElementById(id);
    if(E('lt-total'))E('lt-total').textContent=all.length;
    if(E('lt-release'))E('lt-release').textContent=all.filter(d=>d.status==='RELEASE').length;
    if(E('lt-proses'))E('lt-proses').textContent=all.filter(d=>d.status==='PROSES'||d.status==='PICKUP').length;
    if(E('lt-selesai'))E('lt-selesai').textContent=all.filter(d=>d.status==='SELESAI').length;
    if(E('lt-return'))E('lt-return').textContent=all.filter(d=>d.status==='RETURN').length;

    if(!all.length){tbody.innerHTML='<tr><td colspan="9" class="text-center py-8 text-slate-400 text-xs">Belum ada data WO.</td></tr>';return;}

    tbody.innerHTML=all.map(d=>{
      const tek=Array.isArray(d.teknisi)?d.teknisi.join(', '):(d.teknisi||'--');
      const sCls=statusColor[d.status]||'bg-slate-100 text-slate-600';
      const tCls=tipeColor[d.tipe]||'bg-slate-100 text-slate-600';
      const tanggal = d.tanggal || (d.created_at ? d.created_at.substring(0,10) : '');
      return `<tr class="hover:bg-slate-50/80 dark:hover:bg-slate-700/50 transition-all" data-wo-id="${d.wo_id}" data-tipe="${d.tipe||''}" data-tanggal="${tanggal}">
        <td class="py-3 px-3 font-bold text-blue-600 dark:text-blue-400 font-mono text-[11px]">${d.wo_id}</td>
        <td class="py-3 px-3 text-xs font-semibold">${d.pelanggan||'--'}</td>
        <td class="py-3 px-3 text-center"><span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold ${tCls}">${d.tipe||'--'}</span></td>
        <td class="py-3 px-3 text-center font-bold text-indigo-600 dark:text-indigo-400 text-[11px]">${d.cs_name||'--'}</td>
        <td class="py-3 px-3 text-center font-mono text-[11px]">${d.t1||'--'}</td>
        <td class="py-3 px-3 text-center font-mono text-[11px]">${d.t2||'--'}</td>
        <td class="py-3 px-3 text-center text-[11px] font-bold">${tek}</td>
        <td class="py-3 px-3 text-center font-mono text-[11px]">${d.t4||'--'}</td>
        <td class="py-3 px-3 text-center"><span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold ${sCls}">${d.status}</span></td>
      </tr>`;
    }).join('');
  } catch(e){
    // Fallback ke data lokal
    const all=kpiWOData;
    if(!all.length){tbody.innerHTML='<tr><td colspan="9" class="text-center py-8 text-slate-400 text-xs">Belum ada data.</td></tr>';return;}
    tbody.innerHTML=all.map(d=>`<tr class="hover:bg-slate-50/80 dark:hover:bg-slate-700/50"><td class="py-3 px-3 font-bold text-blue-600 font-mono text-[11px]">${d.id}</td><td class="py-3 px-3 text-xs">${d.pelanggan}</td><td class="py-3 px-3 text-center text-[10px]">${d.tipe}</td><td class="py-3 px-3 text-center text-[11px]">${d.cs}</td><td class="py-3 px-3 text-center font-mono text-[11px]">${d.t1||'--'}</td><td class="py-3 px-3 text-center font-mono text-[11px]">${d.t2||'--'}</td><td class="py-3 px-3 text-center text-[11px]">${d.teknisi?d.teknisi.join(','):'--'}</td><td class="py-3 px-3 text-center font-mono text-[11px]">${d.t4||'--'}</td><td class="py-3 px-3 text-center text-[10px]">${d.status}</td></tr>`).join('');
  }
}

// Filter DOM untuk log tugas (setelah data di-load)
function filterLogTugasDom(){
  const q=(document.getElementById('logtugas-search')||{value:''}).value.toLowerCase();
  const s=(document.getElementById('logtugas-filter-status')||{value:'ALL'}).value;
  const t=(document.getElementById('logtugas-filter-tipe')||{value:'ALL'}).value;
  const dateFrom=(document.getElementById('logtugas-date-from')||{value:''}).value;
  const dateTo=(document.getElementById('logtugas-date-to')||{value:''}).value;
  
  document.querySelectorAll('#logtugas-table-body tr').forEach(r=>{
    const txt=r.textContent.toLowerCase();
    const woId = r.dataset.woId || '';
    const tipe = r.dataset.tipe || '';
    const tanggal = r.dataset.tanggal || '';
    
    // Filter text search
    const matchQ = !q || txt.includes(q);
    // Filter status
    const matchS = s==='ALL' || txt.toUpperCase().includes(s);
    // Filter tipe
    const matchT = t==='ALL' || tipe===t;
    // Filter tanggal range
    let matchDate = true;
    if(dateFrom && tanggal < dateFrom) matchDate = false;
    if(dateTo && tanggal > dateTo) matchDate = false;
    
    r.style.display = (matchQ && matchS && matchT && matchDate) ? '' : 'none';
  });
}

// Load Log Perangkat dari Supabase
async function loadLogPerangkat(){
  const tbody=document.getElementById('logperangkat-table-body');
  if(!tbody)return;
  tbody.innerHTML='<tr><td colspan="6" class="text-center py-8"><i class="fa-solid fa-spinner animate-spin text-emerald-500 mr-2"></i>Memuat dari Supabase...</td></tr>';

  const kondisiCls={'Baru':'bg-emerald-100 text-emerald-700','Dismantle':'bg-amber-100 text-amber-700','Rusak':'bg-rose-100 text-rose-700'};
  const statusCls={'Gudang':'bg-blue-100 text-blue-700','Terpasang':'bg-emerald-100 text-emerald-700'};

  try {
    const {data,error}=await supa.from('perangkat').select('*').order('created_at',{ascending:false});
    if(error)throw error;

    const all=data&&data.length?data:[];
    // Update summary
    const E=id=>document.getElementById(id);
    if(E('lp-total'))E('lp-total').textContent=all.length;
    if(E('lp-gudang'))E('lp-gudang').textContent=all.filter(d=>d.status==='Gudang'||d.lokasi==='Gudang Utama').length;
    if(E('lp-teknisi'))E('lp-teknisi').textContent=all.filter(d=>d.status==='Teknisi'||(d.lokasi&&d.lokasi!=='Gudang Utama'&&d.status!=='Terpasang')).length;
    if(E('lp-terpasang'))E('lp-terpasang').textContent=all.filter(d=>d.status==='Terpasang').length;

    if(!all.length){tbody.innerHTML='<tr><td colspan="6" class="text-center py-8 text-slate-400 text-xs">Belum ada data perangkat.</td></tr>';return;}

    tbody.innerHTML=all.map(p=>{
      const kCls=kondisiCls[p.kondisi]||'bg-slate-100 text-slate-600';
      const lCls=statusCls[p.status]||'bg-amber-100 text-amber-700';
      const updated=p.updated_at?new Date(p.updated_at).toLocaleString('id-ID',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'--';
      return `<tr class="hover:bg-slate-50/80 dark:hover:bg-slate-700/50 transition-all">
        <td class="py-3 px-3 font-extrabold font-mono text-slate-900 dark:text-white text-xs">${p.sn}</td>
        <td class="py-3 px-3 text-xs">${p.jenis||'--'}</td>
        <td class="py-3 px-3 text-center"><span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold ${kCls}">${p.kondisi||'--'}</span></td>
        <td class="py-3 px-3 text-center"><span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold ${lCls}">${p.lokasi||p.status||'Gudang'}</span></td>
        <td class="py-3 px-3 text-center font-mono text-[11px] text-slate-500">${updated}</td>
        <td class="py-3 px-3 text-center"><button onclick="showDeviceHistory('${p.sn}')" class="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-lg text-[10px] font-bold"><i class="fa-solid fa-timeline mr-1"></i>Lihat</button></td>
      </tr>`;
    }).join('');
  } catch(e){
    // Fallback ke hardcoded jika Supabase error
    tbody.innerHTML='<tr><td colspan="6" class="text-center py-4 text-rose-500 text-xs">Gagal load data. Cek koneksi Supabase.</td></tr>';
  }
}

// Override filterLogPerangkat agar filter DOM setelah load
function filterLogPerangkat(){
  const q=(document.getElementById('logperangkat-search').value||'').toLowerCase();
  const f=(document.getElementById('logperangkat-filter').value||'ALL');
  document.querySelectorAll('#logperangkat-table-body tr').forEach(r=>{
    const t=r.textContent.toLowerCase();
    r.style.display=(!q||t.includes(q))&&(f==='ALL'||t.toUpperCase().includes(f))?'':'none';
  });
}
function filterLogTugas(){filterLogTugasDom();}
// ── TIMELINE PERANGKAT dari Supabase ──────────────────────────
async function showDeviceHistory(sn){
  document.getElementById('device-history-sn').textContent=sn;
  const el=document.getElementById('device-history-timeline');
  el.innerHTML='<div class="flex items-center gap-2 py-4 text-slate-400 text-xs"><i class="fa-solid fa-spinner animate-spin"></i>Memuat riwayat...</div>';
  document.getElementById('device-history-modal').classList.remove('hidden');
  try {
    const {data,error}=await supa.from('device_history').select('*').eq('sn',sn).order('created_at',{ascending:true});
    const history = (!error&&data&&data.length) ? data : (deviceHistories[sn]||[]);
    if(!history.length){el.innerHTML='<p class="text-xs text-slate-400 text-center py-4">Belum ada riwayat untuk perangkat ini.</p>';return;}
    const iconMap={'Diterima':'fa-warehouse','Pickup':'fa-hand-holding-hand','Terpasang':'fa-plug','Return':'fa-rotate-left','Approved':'fa-circle-check','Rejected':'fa-circle-xmark'};
    const colorMap={'Diterima':'bg-blue-100 text-blue-600','Pickup':'bg-amber-100 text-amber-600','Terpasang':'bg-emerald-100 text-emerald-600','Return':'bg-rose-100 text-rose-500','Approved':'bg-emerald-100 text-emerald-700','Rejected':'bg-rose-100 text-rose-700'};
    el.innerHTML=history.map((h,i)=>{
      const evtKey=Object.keys(iconMap).find(k=>(h.event||h.ikon||'').includes(k))||'Diterima';
      const ikon=h.ikon||`fa-${iconMap[evtKey]||'circle'}`;
      const warna=h.warna||colorMap[evtKey]||'bg-slate-100 text-slate-600';
      const waktu=h.waktu||(h.created_at?new Date(h.created_at).toLocaleString('id-ID',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'--');
      const actor=h.actor?` — ${h.actor}`:'';
      return `<div class="flex gap-3"><div class="flex flex-col items-center"><div class="w-8 h-8 rounded-full ${warna} flex items-center justify-center shrink-0"><i class="fa-solid ${ikon} text-xs"></i></div>${i<history.length-1?'<div class="w-0.5 flex-1 bg-slate-200 dark:bg-slate-600 mt-1"></div>':''}</div><div class="pb-4"><p class="text-xs font-extrabold text-slate-800 dark:text-slate-100">${h.event||'Event'}${actor}</p><p class="text-[10px] text-slate-400 mt-0.5 font-mono">${waktu}</p></div></div>`;
    }).join('');
  } catch(e){
    const history=deviceHistories[sn]||[];
    if(!history.length){el.innerHTML='<p class="text-xs text-slate-400 text-center py-4">Belum ada riwayat.</p>';return;}
    el.innerHTML=history.map((h,i)=>`<div class="flex gap-3"><div class="flex flex-col items-center"><div class="w-8 h-8 rounded-full ${h.warna} flex items-center justify-center shrink-0"><i class="fa-solid ${h.ikon} text-xs"></i></div>${i<history.length-1?'<div class="w-0.5 flex-1 bg-slate-200 dark:bg-slate-600 mt-1"></div>':''}</div><div class="pb-4"><p class="text-xs font-extrabold text-slate-800 dark:text-slate-100">${h.event}</p><p class="text-[10px] text-slate-400 mt-0.5 font-mono">${h.waktu}</p></div></div>`).join('');
  }
}

// EMPLOYEE MANAGEMENT
function generateInitials(name){const p=name.trim().split(' ');return p.length>=2?(p[0][0]+p[1][0]).toUpperCase():name.substring(0,2).toUpperCase();}
function openAddEmployeeModal(){document.getElementById('add-employee-modal').classList.remove('hidden');}
function closeAddEmployeeModal(){document.getElementById('form-add-employee').reset();document.getElementById('add-employee-modal').classList.add('hidden');}
function addNewEmployee(e){
  e.preventDefault();const name=document.getElementById('newEmpName').value.trim(),role=document.getElementById('newEmpRole').value,btn=document.getElementById('btn-save-emp');
  if(!name){showAlert('Nama tidak boleh kosong.');return;}if(employeeMaster.some(x=>x.name.toLowerCase()===name.toLowerCase())){showAlert('Karyawan sudah ada!');return;}
  btn.disabled=true;btn.innerText='Saving...';
  employeeMaster.push({id:generateInitials(name),name,role,daily:{hariKerja:1,hadir:0,tepatWaktu:0,terlambat:0,izinSakit:0,izinCuti:0},weekly:{hariKerja:7,hadir:0,tepatWaktu:0,terlambat:0,izinSakit:0,izinCuti:0},monthly:{hariKerja:30,hadir:0,tepatWaktu:0,terlambat:0,izinSakit:0,izinCuti:0}});
  populateEmployeeDropdowns();updateRecapTable();updateDashboardStats();
  btn.disabled=false;btn.innerText='Simpan';closeAddEmployeeModal();showAlert('Berhasil menambahkan: '+name);
}
function confirmDeleteEmployee(name){
  if(!confirm('Hapus "'+name+'"?'))return;
  employeeMaster=employeeMaster.filter(e=>e.name!==name);
  populateEmployeeDropdowns();updateDashboardStats();updateRecapTable();renderMainChart();renderDonutChart();renderPodium();renderKPIKlasemen();
  showAlert(name+' berhasil dihapus.');
}


// Export Log WO ke Excel
function exportLogWO(){
  const rows = Array.from(document.querySelectorAll('#logtugas-table-body tr'))
    .filter(r => r.style.display !== 'none' && !r.querySelector('td[colspan]'));
  
  if(!rows.length) {
    showAlert('Tidak ada data untuk di-export.', 'Export');
    return;
  }

  const data = rows.map(r => {
    const cells = r.querySelectorAll('td');
    return {
      'No. Tiket': cells[0]?.textContent.trim() || '',
      'Pelanggan': cells[1]?.textContent.trim() || '',
      'Tipe': cells[2]?.textContent.trim() || '',
      'CS': cells[3]?.textContent.trim() || '',
      'WA Masuk': cells[4]?.textContent.trim() || '',
      'Tiket Dibuat': cells[5]?.textContent.trim() || '',
      'Teknisi': cells[6]?.textContent.trim() || '',
      'Selesai': cells[7]?.textContent.trim() || '',
      'Status': cells[8]?.textContent.trim() || ''
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Log WO');
  
  const today = new Date().toISOString().substring(0,10);
  XLSX.writeFile(wb, `Log-WO-${today}.xlsx`);
  showAlert(`Export berhasil!\n${data.length} tiket di-export.`, 'Export Excel');
}
