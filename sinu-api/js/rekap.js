// ===================== REKAP WO =====================
function renderRekapWO(){
  const filterTipe=(document.getElementById('rekap-filter-tipe')||{value:'ALL'}).value;
  const filterStatus=(document.getElementById('rekap-filter-status')||{value:'ALL'}).value;
  const filterBulan=(document.getElementById('rekap-filter-bulan')||{value:'ALL'}).value;

  let data=[...kpiWOData];
  if(filterTipe!=='ALL') data=data.filter(d=>d.tipe===filterTipe);
  if(filterStatus!=='ALL') data=data.filter(d=>d.status===filterStatus);
  if(filterBulan!=='ALL') data=data.filter(d=>d.bulan===parseInt(filterBulan));

  // Update summary cards
  const el=id=>document.getElementById(id);
  if(el('rekap-total'))el('rekap-total').textContent=data.length;
  if(el('rekap-instalasi'))el('rekap-instalasi').textContent=data.filter(d=>d.tipe==='INSTALASI').length;
  if(el('rekap-maintenance'))el('rekap-maintenance').textContent=data.filter(d=>d.tipe==='MAINTENANCE').length;
  if(el('rekap-selesai'))el('rekap-selesai').textContent=data.filter(d=>d.status==='SELESAI').length;

  const tbody=el('rekap-wo-tbody');
  if(!tbody)return;

  if(!data.length){
    tbody.innerHTML='<tr><td colspan="10" class="text-center py-8 text-slate-400 text-xs">Tidak ada data untuk filter yang dipilih.</td></tr>';
    return;
  }

  const bulanNames=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  const statusColor={
    SELESAI:'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    PROSES:'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    RELEASE:'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    RETURN:'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
  };
  const tipeColor={
    INSTALASI:'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    MAINTENANCE:'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    GANGGUAN:'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
  };

  tbody.innerHTML=data.map(d=>{
    const durAdmin=selisihMenit(d.t1,d.t2);
    const durTeknisi=selisihMenit(d.t2,d.t4);
    const durTotal=d.t4&&d.t1?selisihMenit(d.t1,d.t4):null;
    const bln=bulanNames[d.bulan]||'--';
    return `<tr class="hover:bg-slate-50/80 dark:hover:bg-slate-700/50 transition-all">
      <td class="py-3 px-3 font-bold text-blue-600 dark:text-blue-400 font-mono text-[11px]">${d.id}</td>
      <td class="py-3 px-3">
        <p class="text-xs font-semibold text-slate-800 dark:text-slate-100">${d.pelanggan}</p>
        <p class="text-[10px] text-slate-400">${bln} ${d.tahun}</p>
      </td>
      <td class="py-3 px-3 text-center"><span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold ${tipeColor[d.tipe]||tipeColor.INSTALASI}">${d.tipe}</span></td>
      <td class="py-3 px-3 text-center font-bold text-indigo-600 dark:text-indigo-400 text-[11px]">${d.cs||'--'}</td>
      <td class="py-3 px-3 text-center font-mono font-bold text-[11px]">${d.t1||'--'}</td>
      <td class="py-3 px-3 text-center font-mono font-bold text-[11px]">${d.t2||'--'}</td>
      <td class="py-3 px-3 text-center text-[11px] font-bold">${d.teknisi&&d.teknisi.length?d.teknisi.join(', '):'--'}</td>
      <td class="py-3 px-3 text-center font-mono font-bold text-[11px]">${d.t4||'--'}</td>
      <td class="py-3 px-3 text-center text-[11px]">
        ${durTotal!==null?`<span class="font-black ${durTotal<=15?'text-emerald-600 dark:text-emerald-400':durTotal<=30?'text-amber-600 dark:text-amber-400':'text-rose-600 dark:text-rose-400'}">${durTotal} mnt</span>`:'<span class="text-slate-400">--</span>'}
      </td>
      <td class="py-3 px-3 text-center"><span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold ${statusColor[d.status]||'bg-slate-100 text-slate-600'}">${d.status}</span></td>
    </tr>`;
  }).join('');
}

function exportRekapWO(){
  const filterTipe=(document.getElementById('rekap-filter-tipe')||{value:'ALL'}).value;
  const filterStatus=(document.getElementById('rekap-filter-status')||{value:'ALL'}).value;
  const filterBulan=(document.getElementById('rekap-filter-bulan')||{value:'ALL'}).value;

  let data=[...kpiWOData];
  if(filterTipe!=='ALL') data=data.filter(d=>d.tipe===filterTipe);
  if(filterStatus!=='ALL') data=data.filter(d=>d.status===filterStatus);
  if(filterBulan!=='ALL') data=data.filter(d=>d.bulan===parseInt(filterBulan));

  if(!data.length){showAlert('Tidak ada data untuk diexport.','Export');return;}

  const bulanNames=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

  // Buat data untuk Excel
  const headers=['No. Tiket','Pelanggan','Tipe','Input CS','WA Masuk','Tiket Dibuat','Teknisi','Selesai','Durasi (mnt)','Status','Bulan','Tahun'];
  const rows=data.map(d=>{
    const dur=d.t4&&d.t1?selisihMenit(d.t1,d.t4):null;
    return[
      d.id,d.pelanggan,d.tipe,d.cs||'',d.t1||'',d.t2||'',
      d.teknisi?d.teknisi.join(', '):'',d.t4||'',
      dur!==null?dur:'',d.status,
      bulanNames[d.bulan]||'',d.tahun
    ];
  });

  if(typeof XLSX!=='undefined'){
    const wb=XLSX.utils.book_new();
    const wsData=[headers,...rows];
    const ws=XLSX.utils.aoa_to_sheet(wsData);
    // Set column widths
    ws['!cols']=[{wch:18},{wch:25},{wch:14},{wch:16},{wch:14},{wch:16},{wch:20},{wch:14},{wch:12},{wch:10},{wch:12},{wch:8}];
    XLSX.utils.book_append_sheet(wb,ws,'Rekap WO');
    const fname='Rekap_WO_SINu_'+new Date().toISOString().substring(0,10)+'.xlsx';
    XLSX.writeFile(wb,fname);
    showAlert('File '+fname+' berhasil didownload.','Export Berhasil');
  } else {
    // Fallback: CSV
    const csv=[headers,...rows].map(r=>r.map(c=>'"'+(c||'').toString().replace(/"/g,'""')+'"').join(',')).join('\n');
    const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download='Rekap_WO_SINu_'+new Date().toISOString().substring(0,10)+'.csv';a.click();URL.revokeObjectURL(url);
    showAlert('File CSV berhasil didownload.','Export Berhasil');
  }
}