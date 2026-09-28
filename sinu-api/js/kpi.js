// ===================== KPI ENGINE =====================
function hitungPointAdmin(mnt){if(mnt<5)return 10;return Math.max(1,10-Math.floor((mnt-5)/2)*2);}
const KPI_TEKNISI_RULES={
  INSTALASI:90,
  INSTALASI_RESELLER:90,
  PERLUASAN_RESELLER:90,
  MAINTENANCE:60
};
function hitungPointTeknisi(mnt,tipe,jumlahTeknisi=2){
  if(jumlahTeknisi===1 && (tipe==='INSTALASI'||tipe==='INSTALASI_RESELLER')) return 13;
  const batas=KPI_TEKNISI_RULES[tipe]||90;
  if(mnt<=batas)return 10;
  return Math.max(1,10-Math.ceil((mnt-batas)/5)*2);
}
function timeToMinutes(t){if(!t)return null;const[h,m]=t.split(':').map(Number);return h*60+m;}
function selisihMenit(t1,t2){const m1=timeToMinutes(t1),m2=timeToMinutes(t2);if(m1===null||m2===null)return null;return Math.max(0,m2-m1);}

// Durasi resmi teknisi: waktu rilis sampai waktu selesai.
// Data baru memakai timestamp penuh; data lama memakai fallback tanggal WO + jam T2/T4.
function dateAtTime(base,time){
  if(!base||!time)return null;
  const parts=String(time).split(':').map(Number);
  if(parts.length<2||parts.some(Number.isNaN))return null;
  const date=base instanceof Date?new Date(base.getTime()):new Date(base);
  if(Number.isNaN(date.getTime()))return null;
  date.setHours(parts[0],parts[1],0,0);
  return date;
}
function durasiRilisSelesai(d){
  if(!d)return null;
  let mulai=d.released_at?new Date(d.released_at):dateAtTime(d.created_at||d.tanggal,d.t2);
  if(!mulai||Number.isNaN(mulai.getTime()))return null;
  let selesai=d.completed_at?new Date(d.completed_at):dateAtTime(mulai,d.t4);
  if(!selesai||Number.isNaN(selesai.getTime()))return null;
  // Fallback data lama: T4 lebih kecil dari T2 berarti selesai setelah tengah malam.
  if(!d.completed_at&&selesai<mulai)selesai.setDate(selesai.getDate()+1);
  if(selesai<mulai)return null;
  return Math.floor((selesai-mulai)/60000);
}
function formatDurasi(menit){
  if(menit===null||menit===undefined||Number.isNaN(Number(menit)))return '--';
  menit=Math.max(0,Math.round(Number(menit)));
  const hari=Math.floor(menit/1440),jam=Math.floor((menit%1440)/60),mnt=menit%60;
  const parts=[];
  if(hari)parts.push(hari+' hari');
  if(jam)parts.push(jam+' jam');
  if(mnt||!parts.length)parts.push(mnt+' menit');
  return parts.join(' ');
}
function formatWaktuKPI(timestamp,fallback){
  if(timestamp){
    const date=new Date(timestamp);
    if(!Number.isNaN(date.getTime()))return date.toLocaleString('id-ID',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
  }
  return fallback||'--';
}
function toggleKPIDetail(detailId,button){
  const detail=document.getElementById(detailId);if(!detail)return;
  const isHidden=detail.classList.toggle('hidden');
  if(button){
    button.setAttribute('aria-expanded',String(!isHidden));
    const icon=button.querySelector('i');
    if(icon)icon.className=isHidden?'fa-solid fa-eye text-slate-400':'fa-solid fa-eye-slash text-blue-500';
  }
}
function pointBadge(p){if(p>=8)return`<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">${p}</span>`;if(p>=4)return`<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">${p}</span>`;return`<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">${p}</span>`;}

function initKPIFilter(){const now=new Date(),ms=document.getElementById('kpi-month-select'),ys=document.getElementById('kpi-year-select');if(ms)ms.value=now.getMonth().toString();if(ys)ys.value=now.getFullYear().toString();}

function switchSubKPI(sub){
  const section=document.getElementById('section-kpi');if(!section)return;
  section.querySelectorAll('.sub-kpi-content').forEach(el=>el.classList.add('hidden'));
  section.querySelectorAll('.sub-kpi-pill').forEach(btn=>btn.classList.remove('active'));
  const content=document.getElementById('sub-kpi-content-'+sub);
  const button=document.getElementById('sub-kpi-'+sub);
  if(content)content.classList.remove('hidden');
  if(button)button.classList.add('active');
  sessionStorage.setItem('sinu_last_sub_kpi',sub);
}

let kpiPeriodRequest=0;
async function changeKPIPeriod(){
  const ms=document.getElementById('kpi-month-select'),ys=document.getElementById('kpi-year-select');
  if(!ms||!ys)return;
  const bulan=Number(ms.value),tahun=Number(ys.value),request=++kpiPeriodRequest;
  absensiPoints={};
  renderKPI();
  if(typeof loadAllAbsensiPoints==='function')await loadAllAbsensiPoints(bulan,tahun,request);
  if(request===kpiPeriodRequest)renderKPI();
}

function getKPIWOTeknisi(d){
  const legacy=Array.isArray(d.teknisi) ? d.teknisi : [];
  return [...new Set([d.teknisi_1,d.teknisi_2,...legacy].filter(name=>typeof name==='string'&&name.trim()))];
}

function renderKPI(){
  const bulan=parseInt(document.getElementById('kpi-month-select').value),tahun=parseInt(document.getElementById('kpi-year-select').value);
  const filtered=kpiWOData.filter(d=>Number(d.bulan)===bulan&&Number(d.tahun)===tahun),selesai=filtered.filter(d=>d.completed_at||d.t4);
  // Admin KPI
  let tPA=0,tDA=0,hijauA=0,kuningA=0,merahA=0;
  const adminData=filtered.map(d=>{const dur=selisihMenit(d.t1,d.t2);const p=dur!==null?hitungPointAdmin(dur):null;if(p!==null){tPA+=p;tDA+=dur;if(p>=8)hijauA++;else if(p>=4)kuningA++;else merahA++;}return{...d,durAdmin:dur,poinAdmin:p};});
  const jA=adminData.filter(d=>d.poinAdmin!==null).length,avgPA=jA?(tPA/jA).toFixed(1):'--',avgDA=jA?(tDA/jA).toFixed(1):'--';
  // Teknisi KPI per individu
  const teknisiPoints={};let totalDurasiTek=0,jumlahDurasiTek=0;
  selesai.forEach(d=>{const dur=durasiRilisSelesai(d),teknisi=getKPIWOTeknisi(d);if(dur!==null){totalDurasiTek+=dur;jumlahDurasiTek++;}const p=dur!==null?hitungPointTeknisi(dur,d.tipe,teknisi.length):null;if(p!==null){teknisi.forEach(t=>{if(!teknisiPoints[t])teknisiPoints[t]={total:0,count:0,hijau:0,kuning:0,merah:0};teknisiPoints[t].total+=p;teknisiPoints[t].count++;if(p>=8)teknisiPoints[t].hijau++;else if(p>=4)teknisiPoints[t].kuning++;else teknisiPoints[t].merah++;});}});
  let allPT=0,allCT=0,hijauT=0,kuningT=0,merahT=0;
  Object.values(teknisiPoints).forEach(tp=>{allPT+=tp.total;allCT+=tp.count;hijauT+=tp.hijau;kuningT+=tp.kuning;merahT+=tp.merah;});
  const avgPT=allCT?(allPT/allCT).toFixed(1):'--';
  const avgDurT=jumlahDurasiTek?formatDurasi(totalDurasiTek/jumlahDurasiTek):'--';
  // Update UI Admin
  const E=id=>document.getElementById(id);
  if(E('kpi-admin-badge'))E('kpi-admin-badge').textContent=jA+' Tiket';
  if(E('kpi-admin-avg-point'))E('kpi-admin-avg-point').textContent=avgPA;
  if(E('kpi-admin-avg-dur'))E('kpi-admin-avg-dur').textContent=avgDA+' mnt';
  const barA=parseFloat(avgPA)>=8?'bg-emerald-500':parseFloat(avgPA)>=4?'bg-amber-500':'bg-rose-500';
  if(E('kpi-admin-bar')){E('kpi-admin-bar').style.width=(jA?parseFloat(avgPA)/10*100:0)+'%';E('kpi-admin-bar').className='h-2.5 rounded-full '+barA+' transition-all duration-700';}
  if(E('kpi-admin-green'))E('kpi-admin-green').textContent=hijauA;if(E('kpi-admin-yellow'))E('kpi-admin-yellow').textContent=kuningA;if(E('kpi-admin-red'))E('kpi-admin-red').textContent=merahA;
  // Update UI Teknisi
  if(E('kpi-teknisi-badge'))E('kpi-teknisi-badge').textContent=allCT+' Assignment';
  if(E('kpi-teknisi-avg-point'))E('kpi-teknisi-avg-point').textContent=avgPT;
  if(E('kpi-teknisi-avg-dur'))E('kpi-teknisi-avg-dur').textContent=avgDurT;
  const barT=parseFloat(avgPT)>=8?'bg-emerald-500':parseFloat(avgPT)>=4?'bg-amber-500':'bg-rose-500';
  if(E('kpi-teknisi-bar')){E('kpi-teknisi-bar').style.width=(allCT?parseFloat(avgPT)/10*100:0)+'%';E('kpi-teknisi-bar').className='h-2.5 rounded-full '+barT+' transition-all duration-700';}
  if(E('kpi-teknisi-green'))E('kpi-teknisi-green').textContent=hijauT;if(E('kpi-teknisi-yellow'))E('kpi-teknisi-yellow').textContent=kuningT;if(E('kpi-teknisi-red'))E('kpi-teknisi-red').textContent=merahT;
  // Total Point Cards
  const csTotal=jA?tPA:0,tekTotal=allCT?allPT:0;
  if(E('kpi-cs-total-point'))E('kpi-cs-total-point').textContent=jA?csTotal:'--';
  if(E('kpi-cs-total-tiket'))E('kpi-cs-total-tiket').textContent=jA+' tiket';
  if(E('kpi-cs-avg-per-tiket'))E('kpi-cs-avg-per-tiket').textContent=avgPA+' poin';
  if(E('kpi-tek-total-point'))E('kpi-tek-total-point').textContent=allCT?tekTotal:'--';
  if(E('kpi-tek-total-tiket'))E('kpi-tek-total-tiket').textContent=allCT+' assignment';
  if(E('kpi-tek-avg-per-tiket'))E('kpi-tek-avg-per-tiket').textContent=avgPT+' poin';
  // Tabel Individu Kehadiran + Kinerja
  renderKPIIndividuTable(teknisiPoints,adminData,filtered,bulan,tahun);
  // Tabel detail tiket
  const tbody=E('kpi-table-body');
  if(tbody){
    if(!filtered.length){
      tbody.innerHTML='<tr><td colspan="7" class="text-center py-8 text-slate-400 text-xs">Belum ada data.</td></tr>';
    } else {
      tbody.innerHTML=adminData.map((d,i)=>{
        const durRilis=durasiRilisSelesai(d);
        const technicians=getKPIWOTeknisi(d);
        const pT=durRilis!==null?hitungPointTeknisi(durRilis,d.tipe,technicians.length):null;
        const detailId='kpi-time-detail-'+i;
        const durAdmin=d.durAdmin!==null?d.durAdmin+' menit':'--';
        const durTek=durRilis!==null?formatDurasi(durRilis):'--';
        return `<tr class="hover:bg-slate-50/80 dark:hover:bg-slate-700/50 transition-all"><td class="py-3 px-3 font-bold text-blue-600 font-mono text-[11px]">${d.id}</td><td class="py-3 px-3 text-xs">${d.pelanggan}</td><td class="py-3 px-3 text-center font-bold text-indigo-600 text-[11px]">${d.cs}</td><td class="py-3 px-3 text-center text-[11px] align-top"><div class="flex items-center justify-center gap-1.5"><span>${durTek}</span><button type="button" onclick="toggleKPIDetail('${detailId}',this)" aria-label="Lihat detail waktu" aria-expanded="false" title="Lihat detail waktu" class="px-1.5 py-0.5 inline-flex items-center justify-center gap-1 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors"><i class="fa-solid fa-eye"></i></button></div><div id="${detailId}" class="hidden mt-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 text-left text-[10px] space-y-1.5"><div class="font-extrabold text-slate-500 dark:text-slate-300 uppercase tracking-wide">Timeline & KPI</div><div class="flex justify-between gap-3"><span class="text-slate-500">WA masuk</span><span class="font-bold text-slate-700 dark:text-slate-200">${formatWaktuKPI(null,d.t1)}</span></div><div class="flex justify-between gap-3"><span class="text-slate-500">Rilis</span><span class="font-bold text-blue-600 dark:text-blue-300 text-right">${formatWaktuKPI(d.released_at,d.t2)}</span></div><div class="flex justify-between gap-3"><span class="text-slate-500">Pickup</span><span class="font-bold text-indigo-600 dark:text-indigo-300 text-right">${formatWaktuKPI(d.picked_up_at,null)}</span></div><div class="flex justify-between gap-3"><span class="text-slate-500">Selesai</span><span class="font-bold text-emerald-600 dark:text-emerald-300 text-right">${formatWaktuKPI(d.completed_at,d.t4)}</span></div><div class="border-t border-slate-200 dark:border-slate-600 pt-1.5 flex justify-between gap-3"><span class="text-slate-500">KPI Admin/CS (WA → Rilis)</span><span class="font-bold text-amber-600 dark:text-amber-300 text-right">${durAdmin}</span></div><div class="flex justify-between gap-3"><span class="text-slate-500">KPI Teknisi (Rilis → Selesai)</span><span class="font-bold text-emerald-600 dark:text-emerald-300 text-right">${durTek}</span></div></div></td><td class="py-3 px-3 text-center">${d.poinAdmin!==null?pointBadge(d.poinAdmin):'--'}</td><td class="py-3 px-3 text-center text-[11px]">${Array.isArray(d.teknisi)?d.teknisi.join(', '):(d.teknisi||'--')}</td><td class="py-3 px-3 text-center">${pT!==null?pointBadge(pT):'--'}</td></tr>`;
      }).join('');
    }
  }
}

function renderKPIIndividuTable(teknisiPoints,adminData,filtered,bulan,tahun){
  const tbody=document.getElementById('kpi-individu-table');if(!tbody)return;
  const maxAttendance=typeof hitungHariKerja==='function'?hitungHariKerja(tahun,bulan)*10:200;
  const people=new Map();
  const addPerson=(name,divisi)=>{
    const clean=String(name||'').trim();if(!clean)return;
    const key=clean.toLowerCase(),existing=people.get(key);
    if(!existing||existing.divisi==='Teknisi'&&divisi==='CS/Admin')people.set(key,{nama:clean,divisi});
  };
  (employeeMaster||[]).forEach(e=>{
    const role=String(e.role||'').trim().toLowerCase();
    const division=String(e.division||'').trim().toLowerCase();
    if(role==='teknisi'||division.includes('teknisi'))addPerson(e.name,'Teknisi');
    else if(['cs','admin'].includes(role)||division.includes('customer service')||division==='cs'||division.includes('admin'))addPerson(e.name,'CS/Admin');
  });
  (filtered||[]).forEach(d=>{
    getKPIWOTeknisi(d).forEach(name=>addPerson(name,'Teknisi'));
    addPerson(d.cs,'CS/Admin');
  });

  const techMap={},csMap={};
  Object.entries(teknisiPoints||{}).forEach(([nama,tp])=>{
    const key=String(nama||'').trim().toLowerCase();if(!key)return;
    if(!techMap[key])techMap[key]={total:0,count:0};
    techMap[key].total+=Number(tp.total)||0;techMap[key].count+=Number(tp.count)||0;
  });
  (adminData||[]).forEach(d=>{
    if(d.poinAdmin===null||d.poinAdmin===undefined||!d.cs)return;
    const key=String(d.cs).trim().toLowerCase();if(!key)return;
    if(!csMap[key])csMap[key]={total:0,count:0};
    csMap[key].total+=Number(d.poinAdmin)||0;csMap[key].count++;
  });
  const attendanceMap={};
  Object.entries(absensiPoints||{}).forEach(([nama,ap])=>{attendanceMap[String(nama).trim().toLowerCase()]=ap;});
  const rows=[];
  people.forEach((person,key)=>{
    const ap=attendanceMap[key]||{total:0,max:maxAttendance};
    const attendanceTotal=Number(ap.total)||0,attendanceMax=Number(ap.max)||maxAttendance;
    const pctH=Math.round((attendanceTotal/attendanceMax)*100);
    const gradeH=pctH>=90?'A':pctH>=75?'B':pctH>=60?'C':'D';
    const performance=person.divisi==='Teknisi'?(techMap[key]||{total:0,count:0}):(csMap[key]||{total:0,count:0});
    const ptKinerja=performance.count?Number((performance.total/performance.count).toFixed(1)):0;
    rows.push({nama:person.nama,divisi:person.divisi,ptHadir:attendanceTotal,gradeH,ptKinerja,total:attendanceTotal+performance.total,tiket:performance.count});
  });
  rows.sort((a,b)=>b.total-a.total||a.nama.localeCompare(b.nama));
  const gradeBg=g=>g==='A'?'pt-badge-a':g==='B'?'pt-badge-b':g==='C'?'pt-badge-c':'pt-badge-d';
  if(!rows.length){tbody.innerHTML='<tr><td colspan="7" class="text-center py-8 text-slate-400 text-xs">Belum ada data teknisi atau CS.</td></tr>';return;}
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
  const hasLegacySubViews = !!(secLog && secLog.querySelector('.sub-logtugas-content'));

  // Versi live tidak lagi memiliki sub-tab Log Tugas. Abaikan state lama
  // (misalnya "rekap-export") agar tabel dan filter selalu dimuat.
  if(!hasLegacySubViews){
    sessionStorage.setItem('sinu_last_sub_logtugas', 'log-wo');
    loadLogTugas();
    return;
  }

  secLog.querySelectorAll('.sub-logtugas-content').forEach(el=>el.classList.add('hidden'));
  document.querySelectorAll('#section-logtugas .snpill').forEach(b=>b.classList.remove('active'));
  const target = sub === 'log-wo' || sub === 'rekap-export' ? sub : 'log-wo';
  const el=document.getElementById('sub-logtugas-'+target);if(el)el.classList.remove('hidden');
  const btn=document.getElementById('sub-log-'+target);if(btn)btn.classList.add('active');
  sessionStorage.setItem('sinu_last_sub_logtugas', target);
  if(target==='log-wo')loadLogTugas();
  if(target==='rekap-export')renderRekapWO();
}

function logTugasText(value,fallback='--'){
  const text=value==null||value===''?fallback:String(value);
  return text.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}
function formatLogTugasTimestamp(value){
  if(value==null||value==='')return '--';
  const raw=String(value);
  if(/^\d{1,2}:\d{2}$/.test(raw))return logTugasText(raw);
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return logTugasText(raw);
  return logTugasText(date.toLocaleString('id-ID',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}));
}
function logTugasTechnicians(d){
  if(Array.isArray(d.teknisi)&&d.teknisi.length)return d.teknisi.join(', ');
  return [d.teknisi_1,d.teknisi_2].filter(Boolean).join(', ')||d.teknisi||'--';
}
function logTugasFieldList(fields){
  const rows=fields.filter(([,value])=>value!==undefined&&value!==null&&value!=='');
  if(!rows.length)return '';
  return rows.map(([label,value])=>`<div class="text-[10px] text-slate-500 dark:text-slate-400 font-normal mt-0.5"><span class="font-semibold">${label}:</span> ${logTugasText(value)}</div>`).join('');
}
// Bungkus konten menjadi panel toggle Lihat/Sembunyikan per baris.
function logTugasCollapsible(content, count){
  if(!content)return '<span class="text-slate-300 text-[11px]">--</span>';
  const id='ltc-'+Math.random().toString(36).slice(2,10);
  return `<div>
    <button type="button" onclick="toggleLogTugasPanel('${id}',this)" class="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-lg text-[10px] font-bold transition-all">
      <i class="fa-solid fa-chevron-down transition-transform"></i>Lihat${count?` (${count})`:''}
    </button>
    <div id="${id}" class="hidden mt-1.5">${content}</div>
  </div>`;
}
function toggleLogTugasPanel(id,btn){
  const el=document.getElementById(id);if(!el)return;
  const hidden=el.classList.toggle('hidden');
  const icon=btn.querySelector('i');
  if(icon)icon.style.transform=hidden?'':'rotate(180deg)';
  const label=btn.childNodes[btn.childNodes.length-1];
  if(label&&label.nodeType===3){
    const base=hidden?'Lihat':'Sembunyikan';
    const m=label.textContent.match(/\((\d+)\)/);
    label.textContent=base+(m?` (${m[1]})`:'');
  }
}
// Detail pendaftaran pelanggan (tanpa perangkat terpasang).
function logTugasDetails(d){
  const fields=[
    ['Alamat',d.alamat],['No. HP',d.no_hp||d.nohp],['Keterangan Kerusakan',d.kendala],
    ['Diagnosa NOC',d.diagnosa],['Penanganan NOC',d.penanganan],['Keterangan Teknisi',d.catatan],
    ['Paket',d.nama_paket||d.paket],['Status koneksi',d.status_koneksi],['Marketing',d.marketing],
    ['Reseller',d.nama_reseller],['Jumlah titik',d.jumlah_titik],['Koordinat',d.koordinat],
    ['ODP',d.odp_id],['Username PPPoE',d.username_pppoe],['Password PPPoE',d.password_pppoe]
  ].filter(([,value])=>value!==undefined&&value!==null&&value!=='');
  return logTugasCollapsible(logTugasFieldList(fields), fields.length);
}
// Perangkat yang terpasang saat pekerjaan selesai.
function logTugasDevices(d){
  const fields=[
    ['SN ONT / Access Point',d.sn_ont||d.sn_ap],['SN Kabel',d.sn_kabel],['Jenis kabel',d.jenis_kabel],
    ['Meter kabel',d.meter_kabel!=null&&d.meter_kabel!==''?d.meter_kabel+' m':''],
    ['Panjang kabel',d.panjang_kabel!=null&&d.panjang_kabel!==''?d.panjang_kabel+' m':'']
  ].filter(([,value])=>value!==undefined&&value!==null&&value!=='');
  return logTugasCollapsible(logTugasFieldList(fields), fields.length);
}

// Load Log Tugas dari Supabase — seluruh tiket Admin dari pendaftaran sampai selesai.
async function loadLogTugas(){
  const tbody=document.getElementById('logtugas-table-body');
  if(!tbody)return;
  tbody.innerHTML='<tr><td colspan="7" class="text-center py-8"><i class="fa-solid fa-spinner animate-spin text-blue-500 mr-2"></i>Memuat dari Supabase...</td></tr>';

  const statusColor={SELESAI:'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',PROSES:'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',RELEASE:'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',PICKUP:'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',RETURN:'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'};
  const tipeColor={INSTALASI:'bg-blue-100 text-blue-700',INSTALASI_RESELLER:'bg-indigo-100 text-indigo-700',PERLUASAN_RESELLER:'bg-violet-100 text-violet-700',MAINTENANCE:'bg-amber-100 text-amber-700',GANGGUAN:'bg-rose-100 text-rose-700'};

  function renderRows(all){
    const E=id=>document.getElementById(id);
    if(E('lt-total'))E('lt-total').textContent=all.length;
    if(E('lt-release'))E('lt-release').textContent=all.filter(d=>d.status==='RELEASE').length;
    if(E('lt-proses'))E('lt-proses').textContent=all.filter(d=>d.status==='PROSES'||d.status==='PICKUP').length;
    if(E('lt-selesai'))E('lt-selesai').textContent=all.filter(d=>d.status==='SELESAI').length;
    if(E('lt-return'))E('lt-return').textContent=all.filter(d=>d.status==='RETURN').length;
    if(!all.length){tbody.innerHTML='<tr><td colspan="7" class="text-center py-8 text-slate-400 text-xs">Belum ada data WO.</td></tr>';filterLogTugasDom();return;}

    tbody.innerHTML=all.map(d=>{
      const woId=d.wo_id||d.id||'--';
      const tipe=d.tipe||'--';
      const status=d.status||'--';
      const tanggal=d.tanggal||((d.created_at&&typeof logTugasLocalDateKey==='function')?logTugasLocalDateKey(d.created_at):'');
      const sCls=statusColor[status]||'bg-slate-100 text-slate-600';
      const tCls=tipeColor[tipe]||'bg-slate-100 text-slate-600';
      const detail=logTugasDetails(d);
      const devices=logTugasDevices(d);
      return `<tr class="hover:bg-slate-50/80 dark:hover:bg-slate-700/50 transition-all align-top" data-wo-id="${logTugasText(woId)}" data-tipe="${logTugasText(tipe)}" data-tanggal="${logTugasText(tanggal)}">
        <td class="py-3 px-3 font-bold text-blue-600 dark:text-blue-400 font-mono text-[11px]">${logTugasText(woId)}</td>
        <td class="py-3 px-3 text-xs font-mono">${logTugasText(d.no_layanan)}</td>
        <td class="py-3 px-3 text-xs font-bold">${logTugasText(d.pelanggan)}</td>
        <td class="py-3 px-3 text-center"><span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold ${tCls}">${logTugasText(tipe)}</span></td>
        <td class="py-3 px-3 text-xs">${detail}</td>
        <td class="py-3 px-3 text-xs">${devices}</td>
        <td class="py-3 px-3 text-center"><span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold ${sCls}">${logTugasText(status)}</span></td>
      </tr>`;
    }).join('');
    // loadLogTugas mengganti seluruh tbody. Terapkan ulang semua filter,
    // termasuk range tanggal yang sudah dipilih sebelumnya.
    filterLogTugasDom();
  }

  try{
    const {data,error}=await supa.from('work_orders').select('*').order('created_at',{ascending:false});
    if(error)throw error;
    const all=data&&data.length?data:kpiWOData.map(d=>({...d,wo_id:d.id,pelanggan:d.pelanggan,tipe:d.tipe,cs_name:d.cs,teknisi:d.teknisi,teknisi_1:d.teknisi_1,teknisi_2:d.teknisi_2,t1:d.t1,t2:d.t2,t4:d.t4,created_at:d.created_at,tanggal:d.tanggal,released_at:d.released_at,picked_up_at:d.picked_up_at,completed_at:d.completed_at,status:d.status,alamat:d.alamat}));
    renderRows(all);
  }catch(e){
    console.warn('[Log Tugas] Gagal memuat Supabase:',e.message);
    renderRows(Array.isArray(kpiWOData)?kpiWOData:[]);
  }
}

// ── DATE RANGE PICKER LOG TUGAS ───────────────────────────────
let _logTugasDatePickerState = (() => {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth(), from: '', to: '', bound: false };
})();

function logTugasDateKey(year, month, day) {
  return String(year).padStart(4,'0') + '-' + String(month + 1).padStart(2,'0') + '-' + String(day).padStart(2,'0');
}

function logTugasLocalDateKey(value) {
  const raw = String(value || '');
  if(/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const date = new Date(value);
  if(Number.isNaN(date.getTime())) return raw.substring(0,10);
  return logTugasDateKey(date.getFullYear(), date.getMonth(), date.getDate());
}

function logTugasDateParts(key) {
  const parts = String(key || '').split('-').map(Number);
  return parts.length === 3 && parts.every(Number.isFinite) ? parts : null;
}

function formatLogTugasDateRangeLabel(key) {
  const parts = logTugasDateParts(key);
  if(!parts) return '';
  return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'});
}

function updateLogTugasDateRangeLabel() {
  const label = document.getElementById('logtugas-date-range-label');
  const hint = document.getElementById('logtugas-calendar-hint');
  if(!label) return;
  const state = _logTugasDatePickerState;
  if(state.from && state.to) {
    label.textContent = formatLogTugasDateRangeLabel(state.from) + ' – ' + formatLogTugasDateRangeLabel(state.to);
    if(hint) hint.textContent = 'Rentang tanggal sudah dipilih';
  } else if(state.from) {
    label.textContent = 'Mulai: ' + formatLogTugasDateRangeLabel(state.from);
    if(hint) hint.textContent = 'Pilih tanggal akhir';
  } else {
    label.textContent = 'Pilih rentang tanggal';
    if(hint) hint.textContent = 'Pilih tanggal mulai';
  }
}

function renderLogTugasDatePicker() {
  const title = document.getElementById('logtugas-calendar-title');
  const grid = document.getElementById('logtugas-calendar-grid');
  if(!title || !grid) return;
  const state = _logTugasDatePickerState;
  const monthDate = new Date(state.year, state.month, 1);
  title.textContent = monthDate.toLocaleDateString('id-ID', {month:'long', year:'numeric'});
  const firstDay = monthDate.getDay();
  const daysInMonth = new Date(state.year, state.month + 1, 0).getDate();
  const previousDays = new Date(state.year, state.month, 0).getDate();
  const today = new Date();
  const todayKey = logTugasDateKey(today.getFullYear(), today.getMonth(), today.getDate());
  const cells = [];

  for(let index = 0; index < 42; index++) {
    const dayOffset = index - firstDay + 1;
    let cellYear = state.year;
    let cellMonth = state.month;
    let day = dayOffset;
    let currentMonth = true;
    if(dayOffset < 1) {
      day = previousDays + dayOffset;
      cellMonth--;
      currentMonth = false;
    } else if(dayOffset > daysInMonth) {
      day = dayOffset - daysInMonth;
      cellMonth++;
      currentMonth = false;
    }
    if(cellMonth < 0) { cellMonth = 11; cellYear--; }
    if(cellMonth > 11) { cellMonth = 0; cellYear++; }
    const key = logTugasDateKey(cellYear, cellMonth, day);
    const selectedStart = key === state.from;
    const selectedEnd = key === state.to;
    const inRange = state.from && state.to && key > state.from && key < state.to;
    const selected = selectedStart || selectedEnd;
    const todayClass = key === todayKey ? ' ring-1 ring-blue-400' : '';
    const rangeClass = selected ? ' bg-blue-600 text-white font-extrabold' : (inRange ? ' bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-200' : ' hover:bg-slate-100 dark:hover:bg-slate-700');
    const mutedClass = currentMonth ? ' text-slate-700 dark:text-slate-200' : ' text-slate-300 dark:text-slate-600';
    cells.push('<button type="button" onclick="selectLogTugasDate(\'' + key + '\')" class="h-8 rounded-lg text-[11px] transition-colors' + mutedClass + rangeClass + todayClass + '">' + day + '</button>');
  }
  grid.innerHTML = cells.join('');
  updateLogTugasDateRangeLabel();
}

function syncLogTugasDatePickerState() {
  const from = document.getElementById('logtugas-date-from');
  const to = document.getElementById('logtugas-date-to');
  if(from && from.value) _logTugasDatePickerState.from = from.value;
  if(to && to.value) _logTugasDatePickerState.to = to.value;
  const selected = _logTugasDatePickerState.from || _logTugasDatePickerState.to;
  const parts = logTugasDateParts(selected);
  if(parts) { _logTugasDatePickerState.year = parts[0]; _logTugasDatePickerState.month = parts[1] - 1; }
}

function bindLogTugasDatePickerEvents() {
  if(_logTugasDatePickerState.bound) return;
  _logTugasDatePickerState.bound = true;
  document.addEventListener('click', function(event) {
    if(!event.target.closest('#logtugas-date-range')) closeLogTugasDatePicker();
  });
  document.addEventListener('keydown', function(event) {
    if(event.key === 'Escape') closeLogTugasDatePicker();
  });
}

function toggleLogTugasDatePicker() {
  const panel = document.getElementById('logtugas-date-range-panel');
  const trigger = document.getElementById('logtugas-date-range-trigger');
  if(!panel) return;
  bindLogTugasDatePickerEvents();
  const opening = panel.classList.contains('hidden');
  if(opening) {
    syncLogTugasDatePickerState();
    panel.classList.remove('hidden');
    if(trigger) trigger.setAttribute('aria-expanded','true');
    renderLogTugasDatePicker();
  } else {
    closeLogTugasDatePicker();
  }
}

function closeLogTugasDatePicker() {
  const panel = document.getElementById('logtugas-date-range-panel');
  const trigger = document.getElementById('logtugas-date-range-trigger');
  if(panel) panel.classList.add('hidden');
  if(trigger) trigger.setAttribute('aria-expanded','false');
}

function changeLogTugasCalendar(offset) {
  const state = _logTugasDatePickerState;
  const next = new Date(state.year, state.month + offset, 1);
  state.year = next.getFullYear();
  state.month = next.getMonth();
  renderLogTugasDatePicker();
}

function applyLogTugasDateRange() {
  const from = document.getElementById('logtugas-date-from');
  const to = document.getElementById('logtugas-date-to');
  if(from) from.value = _logTugasDatePickerState.from || '';
  if(to) to.value = _logTugasDatePickerState.to || '';
  updateLogTugasDateRangeLabel();
  filterLogTugasDom();
  closeLogTugasDatePicker();
}

function selectLogTugasDate(key) {
  const state = _logTugasDatePickerState;
  if(!state.from || state.to) {
    state.from = key;
    state.to = '';
    renderLogTugasDatePicker();
    return;
  }
  if(key < state.from) {
    state.to = state.from;
    state.from = key;
  } else {
    state.to = key;
  }
  applyLogTugasDateRange();
}

function clearLogTugasDateRange() {
  _logTugasDatePickerState.from = '';
  _logTugasDatePickerState.to = '';
  const from = document.getElementById('logtugas-date-from');
  const to = document.getElementById('logtugas-date-to');
  if(from) from.value = '';
  if(to) to.value = '';
  renderLogTugasDatePicker();
  filterLogTugasDom();
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
async function exportLogWO(){
  const rows = Array.from(document.querySelectorAll('#logtugas-table-body tr'))
    .filter(r => r.style.display !== 'none' && !r.querySelector('td[colspan]'));
  const visibleWoIds = new Set(rows.map(r => String(r.dataset.woId || r.cells[0]?.textContent || '').trim()).filter(Boolean));
  const statusFilter = (document.getElementById('logtugas-filter-status') || {value:'ALL'}).value;
  const tipeFilter = (document.getElementById('logtugas-filter-tipe') || {value:'ALL'}).value;
  const dateFrom = (document.getElementById('logtugas-date-from') || {value:''}).value;
  const dateTo = (document.getElementById('logtugas-date-to') || {value:''}).value;
  const searchQuery = ((document.getElementById('logtugas-search') || {value:''}).value || '').trim().toLowerCase();

  const asValue = value => {
    if(value === undefined || value === null) return '';
    if(Array.isArray(value)) return value.filter(Boolean).join(', ');
    return value;
  };
  const asDateTime = value => {
    if(!value) return '';
    const raw = String(value);
    if(/^\d{4}-\d{2}-\d{2}$/.test(raw) || /^\d{1,2}:\d{2}$/.test(raw)) return raw;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? raw : date.toLocaleString('id-ID', {
      day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'
    });
  };
  const dateKey = value => String(value || '').substring(0,10);
  const technicians = d => {
    const legacy = Array.isArray(d.teknisi) ? d.teknisi.filter(Boolean) : (d.teknisi ? [d.teknisi] : []);
    return {
      one: d.teknisi_1 || legacy[0] || '',
      two: d.teknisi_2 || legacy[1] || '',
      all: legacy.join(', ')
    };
  };
  const matchesDate = value => {
    const key = dateKey(value);
    if(dateFrom && (!key || key < dateFrom)) return false;
    if(dateTo && (!key || key > dateTo)) return false;
    return true;
  };

  let workOrders = [];
  try {
    if(typeof supa !== 'undefined') {
      const result = await supa.from('work_orders').select('*').order('created_at', {ascending:false});
      if(result.error) throw result.error;
      workOrders = (result.data || []).filter(d => {
        const id = String(d.wo_id || d.id || '').trim();
        return visibleWoIds.has(id) && (tipeFilter === 'ALL' || d.tipe === tipeFilter);
      });
    }
  } catch(e) {
    console.warn('[Export Log WO] Gagal mengambil detail lengkap:', e.message);
  }

  // Fallback hanya jika query detail gagal, tanpa mengubah data atau tampilan Log Tugas.
  if(!workOrders.length && rows.length) {
    const localData = Array.isArray(kpiWOData) ? kpiWOData : [];
    workOrders = localData.filter(d => visibleWoIds.has(String(d.wo_id || d.id || '').trim()));
  }
  if(!workOrders.length && rows.length) {
    workOrders = rows.map(r => {
      const cells = r.querySelectorAll('td');
      return {
        wo_id: cells[0]?.textContent.trim() || '',
        no_layanan: cells[1]?.textContent.trim() || '',
        pelanggan: cells[2]?.textContent.trim() || '',
        tipe: cells[3]?.textContent.trim() || '',
        status: cells[6]?.textContent.trim() || ''
      };
    });
  }

  let dismantleTickets = [];
  let dismantleItems = [];
  if(typeof supa !== 'undefined') {
    try {
      const ticketResult = await supa.from('tiket_dismantle').select('*').order('created_at', {ascending:false});
      if(ticketResult.error) throw ticketResult.error;
      dismantleTickets = ticketResult.data || [];
      const ticketIds = dismantleTickets.map(t => t.id).filter(Boolean);
      if(ticketIds.length) {
        const itemResult = await supa.from('dismantle_items').select('*').in('tiket_id', ticketIds);
        if(itemResult.error) throw itemResult.error;
        dismantleItems = itemResult.data || [];
      }
    } catch(e) {
      // Tabel Dismantle mungkin belum dibuat; sheet tetap dibuat dengan header kosong.
      console.warn('[Export Log WO] Data Dismantle tidak tersedia:', e.message);
      dismantleTickets = [];
      dismantleItems = [];
    }
  }

  const itemsByTicket = {};
  dismantleItems.forEach(item => {
    const key = String(item.tiket_id || '');
    if(!itemsByTicket[key]) itemsByTicket[key] = [];
    itemsByTicket[key].push(item);
  });

  const baseFields = (d, customerLabel, phoneLabel) => {
    const tech = technicians(d);
    return {
      'No. Tiket': asValue(d.wo_id || d.id),
      'No. Layanan': asValue(d.no_layanan || d.id_pelanggan),
      [customerLabel]: asValue(d.pelanggan),
      [phoneLabel]: asValue(d.no_hp || d.nohp),
      'Alamat': asValue(d.alamat),
      'Koordinat': asValue(d.koordinat),
      'CS/Admin': asValue(d.cs_name || d.cs),
      'WA Masuk': asValue(d.t1),
      'Tiket Dibuat': asValue(d.t2),
      'Release': asDateTime(d.released_at),
      'Pickup': asDateTime(d.picked_up_at),
      'Teknisi 1': asValue(tech.one),
      'Teknisi 2': asValue(tech.two),
      'Selesai': asDateTime(d.completed_at || d.t4),
      'Status': asValue(d.status)
    };
  };

  const instalasiRows = workOrders.filter(d => d.tipe === 'INSTALASI').map(d => ({
    ...baseFields(d, 'Pelanggan', 'No. HP'),
    'Registrasi (Rp)': asValue(d.registrasi),
    'Paket (Rp)': asValue(d.paket),
    'Nama Paket': asValue(d.nama_paket),
    'Total (Rp)': asValue(d.total),
    'Marketing': asValue(d.marketing),
    'Username PPPoE': asValue(d.username_pppoe),
    'Password PPPoE': asValue(d.password_pppoe),
    'Status Koneksi': asValue(d.status_koneksi),
    'ODP': asValue(d.odp_id),
    'SN ONT': asValue(d.sn_ont),
    'SN Kabel': asValue(d.sn_kabel),
    'Jenis Kabel': asValue(d.jenis_kabel),
    'Panjang Kabel (m)': asValue(d.panjang_kabel),
    'Catatan': asValue(d.catatan)
  }));

  const instalasiResellerRows = workOrders.filter(d => d.tipe === 'INSTALASI_RESELLER').map(d => ({
    ...baseFields({...d, pelanggan: d.nama_reseller || d.pelanggan}, 'Nama Reseller', 'No. HP'),
    'Registrasi (Rp)': asValue(d.registrasi),
    'Paket Voucher (Rp)': asValue(d.paket),
    'Total (Rp)': asValue(d.total),
    'Marketing': asValue(d.marketing),
    'Status Koneksi': asValue(d.status_koneksi),
    'ODP': asValue(d.odp_id),
    'SN ONT': asValue(d.sn_ont),
    'SN Kabel': asValue(d.sn_kabel),
    'Jenis Kabel': asValue(d.jenis_kabel),
    'Panjang Kabel (m)': asValue(d.panjang_kabel),
    'Catatan': asValue(d.catatan)
  }));

  const perluasanRows = workOrders.filter(d => d.tipe === 'PERLUASAN_RESELLER').map(d => ({
    ...baseFields(d, 'Nama Pelanggan', 'No. HP Reseller'),
    'Nama Reseller': asValue(d.nama_reseller),
    'Jumlah Titik': asValue(d.jumlah_titik),
    'SN ONT / AP': asValue(d.sn_ont || d.sn_ap),
    'SN Kabel': asValue(d.sn_kabel),
    'Jenis Kabel': asValue(d.jenis_kabel),
    'Meter Kabel': asValue(d.meter_kabel),
    'Panjang Kabel (m)': asValue(d.panjang_kabel),
    'Catatan': asValue(d.catatan)
  }));

  const maintenanceRows = workOrders.filter(d => d.tipe === 'MAINTENANCE').map(d => ({
    ...baseFields(d, 'Pelanggan', 'No. HP'),
    'Kendala': asValue(d.kendala),
    'NOC': asValue(d.noc_name),
    'Diagnosa': asValue(d.diagnosa),
    'Penanganan': asValue(d.penanganan),
    'SN ONT': asValue(d.sn_ont),
    'SN Kabel': asValue(d.sn_kabel),
    'Panjang Kabel (m)': asValue(d.panjang_kabel),
    'Catatan': asValue(d.catatan)
  }));

  const dismantleRows = dismantleTickets.filter(t => {
    const ticketDate = t.tanggal || t.created_at;
    if(tipeFilter !== 'ALL') return false;
    if(statusFilter !== 'ALL' && t.status !== statusFilter) return false;
    if(!matchesDate(ticketDate)) return false;
    if(searchQuery && !JSON.stringify(t).toLowerCase().includes(searchQuery)) return false;
    return true;
  }).flatMap(t => {
    const items = itemsByTicket[String(t.id || '')] || [];
    const sourceItems = items.length ? items : [{}];
    return sourceItems.map(item => ({
      'No. Tiket': asValue(t.wo_id),
      'No. Layanan': asValue(t.no_layanan || t.id_pelanggan),
      'Pelanggan': asValue(t.nama_pelanggan),
      'No. HP': asValue(t.no_telp),
      'Alamat': asValue(t.alamat),
      'Koordinat': asValue(t.koordinat),
      'CS/Admin': asValue(t.cs_name),
      'Tanggal': asDateTime(t.tanggal || t.created_at),
      'Teknisi': asValue(t.teknisi),
      'Status Tiket': asValue(t.status),
      'SN': asValue(item.sn),
      'Jenis Perangkat': asValue(item.jenis),
      'Merk': asValue(item.merk),
      'Kondisi Awal': asValue(item.kondisi_awal),
      'Hasil NOC': asValue(item.hasil_noc),
      'NOC': asValue(item.noc_name),
      'Diperiksa': asDateTime(item.checked_at)
    }));
  });

  const sheetDefinitions = [
    {
      name: 'Instalasi Baru', rows: instalasiRows,
      headers: ['No. Tiket','No. Layanan','Pelanggan','No. HP','Alamat','Koordinat','CS/Admin','WA Masuk','Tiket Dibuat','Release','Pickup','Teknisi 1','Teknisi 2','Selesai','Status','Registrasi (Rp)','Paket (Rp)','Nama Paket','Total (Rp)','Marketing','Username PPPoE','Password PPPoE','Status Koneksi','ODP','SN ONT','SN Kabel','Jenis Kabel','Panjang Kabel (m)','Catatan']
    },
    {
      name: 'Instalasi Reseller', rows: instalasiResellerRows,
      headers: ['No. Tiket','No. Layanan','Nama Reseller','No. HP','Alamat','Koordinat','CS/Admin','WA Masuk','Tiket Dibuat','Release','Pickup','Teknisi 1','Teknisi 2','Selesai','Status','Registrasi (Rp)','Paket Voucher (Rp)','Total (Rp)','Marketing','Status Koneksi','ODP','SN ONT','SN Kabel','Jenis Kabel','Panjang Kabel (m)','Catatan']
    },
    {
      name: 'Perluasan Reseller', rows: perluasanRows,
      headers: ['No. Tiket','No. Layanan','Nama Pelanggan','No. HP Reseller','Nama Reseller','Alamat','Koordinat','Jumlah Titik','CS/Admin','WA Masuk','Tiket Dibuat','Release','Pickup','Teknisi 1','Teknisi 2','Selesai','Status','SN ONT / AP','SN Kabel','Jenis Kabel','Meter Kabel','Panjang Kabel (m)','Catatan']
    },
    {
      name: 'Maintenance', rows: maintenanceRows,
      headers: ['No. Tiket','No. Layanan','Pelanggan','No. HP','Alamat','Koordinat','CS/Admin','WA Masuk','Tiket Dibuat','Release','Pickup','Teknisi 1','Teknisi 2','Selesai','Status','Kendala','NOC','Diagnosa','Penanganan','SN ONT','SN Kabel','Panjang Kabel (m)','Catatan']
    },
    {
      name: 'Dismantle', rows: dismantleRows,
      headers: ['No. Tiket','No. Layanan','Pelanggan','No. HP','Alamat','Koordinat','CS/Admin','Tanggal','Teknisi','Status Tiket','SN','Jenis Perangkat','Merk','Kondisi Awal','Hasil NOC','NOC','Diperiksa']
    }
  ];

  const totalRows = sheetDefinitions.reduce((sum, sheet) => sum + sheet.rows.length, 0);
  if(!totalRows) {
    showAlert('Tidak ada data untuk di-export.', 'Export');
    return;
  }

  const wb = XLSX.utils.book_new();
  sheetDefinitions.forEach(sheet => {
    const aoa = [sheet.headers].concat(sheet.rows.map(row => sheet.headers.map(header => row[header] ?? '')));
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = sheet.headers.map(header => {
      if(/Alamat|Koordinat|Kendala|Diagnosa|Penanganan|Catatan/.test(header)) return {wch: 32};
      if(/Password|Username|Nama Pelanggan|Nama Reseller|No\. Layanan/.test(header)) return {wch: 22};
      return {wch: Math.max(14, Math.min(22, header.length + 3))};
    });
    if(ws['!ref']) ws['!autofilter'] = {ref: ws['!ref']};
    const range = XLSX.utils.decode_range(ws['!ref']);
    for(let row = range.s.r; row <= range.e.r; row++) {
      for(let col = range.s.c; col <= range.e.c; col++) {
        const addr = XLSX.utils.encode_cell({r:row,c:col});
        if(ws[addr] && typeof ws[addr].v === 'string' && ws[addr].v.includes('\n')) {
          ws[addr].s = ws[addr].s || {};
          ws[addr].s.alignment = {wrapText:true, vertical:'top'};
        }
      }
    }
    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  });

  const today = new Date().toISOString().substring(0,10);
  XLSX.writeFile(wb, `Log-WO-${today}.xlsx`, {cellStyles:true});
  showAlert(`Export berhasil!\n${totalRows} baris di-export ke ${sheetDefinitions.length} sheet.`, 'Export Excel');
}
