// ===================== INVOICE MITRA (BAPS) =====================
// Dipakai oleh: Koordinator Mitra

var _invoiceWOData    = [];
var _invoiceSelected  = new Set();
var _bapsConfigCache  = null;

// ── Helpers ──────────────────────────────────────────────────
function invText(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}
function invFmt(v) {
  return Number(v||0).toLocaleString('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0});
}
function invFmtDate(s) {
  if(!s) return '-';
  const d = new Date(String(s)+'T00:00:00');
  return d.toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'});
}
function invFmtDateShort(s) {
  if(!s) return '-';
  const d = new Date(String(s)+'T00:00:00');
  return d.toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'});
}

// ── LOAD BAPS CONFIG ─────────────────────────────────────────
async function getBapsConfig() {
  if(_bapsConfigCache) return _bapsConfigCache;
  try {
    const { data, error } = await supa.from('baps_config').select('*').limit(1).single();
    if(error) throw error;
    _bapsConfigCache = data;
    return data;
  } catch(err) {
    console.warn('[BAPS] Gagal load config:', err.message);
    return { perusahaan:'PT. Sinergi Internet Nusantara', alamat:'', pic_nama:'', pic_jabatan:'Direktur', nomor_surat_prefix:'BAPS/SINU', nomor_surat_counter:1 };
  }
}

// ── LOAD DAFTAR WO MITRA ─────────────────────────────────────
async function loadInvoiceMitraList() {
  const el = document.getElementById('invoice-wo-list');
  const summary = document.getElementById('invoice-summary');
  if(!el || !currentUser || !currentUser.mitraId) return;

  const dateFrom = (document.getElementById('invoice-date-from')||{value:''}).value;
  const dateTo   = (document.getElementById('invoice-date-to')||{value:''}).value;

  el.innerHTML = '<p class="text-xs text-slate-400 text-center py-6"><i class="fa-solid fa-spinner animate-spin mr-1"></i>Memuat WO...</p>';
  _invoiceSelected.clear();
  updateInvoiceActionBar();

  try {
    let query = supa.from('work_orders')
      .select('wo_id, pelanggan, tipe, alamat, teknisi_1, teknisi_2, t1, t4, tanggal, status, total, registrasi, paket, invoiced')
      .eq('mitra_id', currentUser.mitraId)
      .eq('invoiced', false)
      .in('tipe', ['INSTALASI','INSTALASI_RESELLER','PERLUASAN_RESELLER'])
      .eq('status','SELESAI')
      .order('tanggal', {ascending: false});

    if(dateFrom) query = query.gte('tanggal', dateFrom);
    if(dateTo)   query = query.lte('tanggal', dateTo);

    const { data, error } = await query.limit(500);
    if(error) throw error;
    _invoiceWOData = data || [];

    if(!_invoiceWOData.length) {
      el.innerHTML = '<p class="text-xs text-slate-400 text-center py-8"><i class="fa-solid fa-inbox text-2xl block mb-2"></i>Tidak ada WO yang belum tertagih pada periode ini.</p>';
      if(summary) summary.classList.add('hidden');
      return;
    }

    if(summary) summary.classList.remove('hidden');
    renderInvoiceTable();
  } catch(err) {
    el.innerHTML = `<p class="text-xs text-rose-500 text-center py-4">Gagal memuat WO: ${invText(err.message)}</p>`;
  }
}

function renderInvoiceTable() {
  const el = document.getElementById('invoice-wo-list');
  if(!el) return;
  const TIPE_LABEL = { INSTALASI:'Instalasi Baru', INSTALASI_RESELLER:'Instalasi Reseller', PERLUASAN_RESELLER:'Perluasan Reseller' };
  el.innerHTML = `
    <div class="overflow-x-auto">
      <table class="w-full text-xs min-w-[640px]">
        <thead class="bg-slate-50 dark:bg-slate-700/50">
          <tr>
            <th class="py-2.5 px-3 text-left"><input type="checkbox" id="invoice-check-all" onchange="toggleAllInvoice(this.checked)" class="rounded"></th>
            <th class="py-2.5 px-3 text-left font-extrabold text-slate-500 uppercase">WO ID</th>
            <th class="py-2.5 px-3 text-left font-extrabold text-slate-500 uppercase">Tanggal</th>
            <th class="py-2.5 px-3 text-left font-extrabold text-slate-500 uppercase">Pelanggan</th>
            <th class="py-2.5 px-3 text-left font-extrabold text-slate-500 uppercase">Tipe</th>
            <th class="py-2.5 px-3 text-left font-extrabold text-slate-500 uppercase">Teknisi</th>
            <th class="py-2.5 px-3 text-right font-extrabold text-slate-500 uppercase">Nilai</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-700">
          ${_invoiceWOData.map(wo => {
            const teknisi = [wo.teknisi_1, wo.teknisi_2].filter(Boolean).join(', ') || '-';
            const nilai = (wo.total || wo.registrasi || 0);
            return `<tr class="hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition-all">
              <td class="py-2.5 px-3"><input type="checkbox" class="invoice-wo-check rounded" value="${invText(wo.wo_id)}" onchange="onInvoiceCheck(this)"></td>
              <td class="py-2.5 px-3 font-bold font-mono text-slate-800 dark:text-slate-100">${invText(wo.wo_id)}</td>
              <td class="py-2.5 px-3 text-slate-600 dark:text-slate-300">${invFmtDateShort(wo.tanggal)}</td>
              <td class="py-2.5 px-3 text-slate-700 dark:text-slate-200 max-w-[140px] truncate">${invText(wo.pelanggan||'-')}</td>
              <td class="py-2.5 px-3"><span class="px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-100 text-blue-700">${TIPE_LABEL[wo.tipe]||wo.tipe}</span></td>
              <td class="py-2.5 px-3 text-slate-500">${invText(teknisi)}</td>
              <td class="py-2.5 px-3 text-right font-bold text-slate-800 dark:text-slate-100">${nilai ? invFmt(nilai) : '-'}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
  updateInvoiceSummary();
}

function onInvoiceCheck(checkbox) {
  if(checkbox.checked) _invoiceSelected.add(checkbox.value);
  else _invoiceSelected.delete(checkbox.value);
  updateInvoiceActionBar();
  updateInvoiceSummary();
}

function toggleAllInvoice(checked) {
  _invoiceSelected.clear();
  document.querySelectorAll('.invoice-wo-check').forEach(cb => {
    cb.checked = checked;
    if(checked) _invoiceSelected.add(cb.value);
  });
  updateInvoiceActionBar();
  updateInvoiceSummary();
}

function updateInvoiceActionBar() {
  const bar = document.getElementById('invoice-action-bar');
  const countEl = document.getElementById('invoice-selected-count');
  if(!bar) return;
  const count = _invoiceSelected.size;
  bar.classList.toggle('hidden', count === 0);
  if(countEl) countEl.textContent = count + ' WO dipilih';
}

function updateInvoiceSummary() {
  const el = document.getElementById('invoice-summary-text');
  if(!el) return;
  const selected = _invoiceWOData.filter(wo => _invoiceSelected.has(wo.wo_id));
  const total = selected.reduce((s, wo) => s + Number(wo.total || wo.registrasi || 0), 0);
  el.textContent = `${_invoiceWOData.length} WO tersedia • ${_invoiceSelected.size} dipilih • Total: ${invFmt(total)}`;
}

// ── GENERATE BAPS PDF ────────────────────────────────────────
async function generateBAPS() {
  if(_invoiceSelected.size === 0) {
    showAlert('Pilih minimal 1 WO sebelum generate BAPS.','Belum Ada Pilihan');
    return;
  }
  const btn = document.getElementById('btn-generate-baps');
  const orig = btn ? btn.innerHTML : '';
  if(btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner animate-spin"></i> Membuat BAPS...'; }

  try {
    const config = await getBapsConfig();
    const mitraId = currentUser.mitraId;

    // Ambil data mitra
    const { data: mitraData, error: mitraErr } = await supa.from('mitra').select('*').eq('id', mitraId).single();
    if(mitraErr) throw mitraErr;

    const selectedWOs = _invoiceWOData.filter(wo => _invoiceSelected.has(wo.wo_id));
    const tanggalList = selectedWOs.map(wo => wo.tanggal).filter(Boolean).sort();
    const tanggalMulai = tanggalList[0] || mitraToday();
    const tanggalSelesai = tanggalList[tanggalList.length-1] || mitraToday();
    const totalNilai = selectedWOs.reduce((s, wo) => s + Number(wo.total || wo.registrasi || 0), 0);

    // Generate nomor surat dengan pengecekan duplicate
    const now = new Date();
    let nomorSurat, attempts = 0;
    let currentCounter = config.nomor_surat_counter || 0;
    
    // Loop sampai dapat nomor unik (max 10 attempts)
    while (attempts < 10) {
      nomorSurat = `${config.nomor_surat_prefix}/${String(currentCounter).padStart(3,'0')}/${now.toLocaleString('id-ID',{month:'long'}).toUpperCase()}/${now.getFullYear()}`;
      
      // Cek apakah nomor sudah ada
      const { data: existing } = await supa.from('mitra_invoices').select('id').eq('nomor_surat', nomorSurat).maybeSingle();
      
      if (!existing) {
        // Nomor unik, keluar dari loop
        break;
      }
      
      // Nomor duplicate, increment dan coba lagi
      currentCounter++;
      attempts++;
    }
    
    if (attempts >= 10) {
      throw new Error('Gagal generate nomor surat unik setelah 10 percobaan');
    }

    // Simpan ke database
    const snapshot = {
      config: { perusahaan: config.perusahaan, alamat: config.alamat, pic_nama: config.pic_nama, pic_jabatan: config.pic_jabatan },
      mitra: { id: mitraId, nama: mitraData.nama, alamat: mitraData.alamat, pic_nama: mitraData.pic_nama, pic_jabatan: mitraData.pic_jabatan },
      wo_list: selectedWOs
    };
    const { data: savedInvoice, error: saveErr } = await supa.from('mitra_invoices').insert({
      nomor_surat: nomorSurat,
      mitra_id: mitraId,
      mitra_nama: mitraData.nama,
      tanggal_generate: mitraToday(),
      tanggal_mulai: tanggalMulai,
      tanggal_selesai: tanggalSelesai,
      generated_by: currentUser.username,
      total_wo: selectedWOs.length,
      total_nilai: totalNilai,
      wo_ids: selectedWOs.map(w => w.wo_id),
      baps_snapshot: snapshot,
      status: 'GENERATED'
    }).select().single();
    if(saveErr) throw saveErr;

    // Tandai WO sebagai invoiced
    const { error: updateErr } = await supa.from('work_orders')
      .update({ invoiced: true, invoice_id: savedInvoice.id })
      .in('wo_id', selectedWOs.map(w => w.wo_id));
    if(updateErr) throw updateErr;

    // Increment counter nomor surat (gunakan currentCounter yang sudah di-check)
    await supa.from('baps_config').update({ nomor_surat_counter: currentCounter + 1 }).eq('id', config.id);
    _bapsConfigCache = null; // reset cache

    // Render dan print PDF
    renderBapsPDF(nomorSurat, now, config, mitraData, selectedWOs, totalNilai);
    showAlert(`BAPS ${nomorSurat} berhasil digenerate untuk ${selectedWOs.length} WO.`, 'BAPS Dibuat ✅');
    await loadInvoiceMitraList();
    
    // Switch ke tab List BAPS dan load list
    if (typeof switchInvoiceMitraTab === 'function') {
      switchInvoiceMitraTab('list');
    }
  } catch(err) {
    showAlert('Gagal generate BAPS: '+(err.message||''),'Error');
  }
  if(btn) { btn.disabled = false; btn.innerHTML = orig; }
}

function renderBapsPDF(nomorSurat, tanggalGenerate, config, mitra, woList, totalNilai) {
  const tanggalStr = tanggalGenerate.toLocaleDateString('id-ID',{weekday:'long', day:'numeric', month:'long', year:'numeric'}).replace(/^./, s => s.toUpperCase());
  const terbilang = totalNilai > 0 ? `Terbilang: ${numberToTerbilang(totalNilai)} Rupiah` : '';

  const printWindow = window.open('','_blank','width=900,height=700');
  printWindow.document.write(`<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>BAPS ${invText(nomorSurat)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Times New Roman', serif; font-size: 12pt; color: #000; padding: 40px 50px; line-height: 1.5; }
  h1 { font-size: 14pt; text-align: center; font-weight: bold; text-transform: uppercase; margin-bottom: 4px; }
  .subtitle { text-align: center; font-size: 11pt; margin-bottom: 16px; }
  .divider { border-top: 3px double #000; margin: 8px 0; }
  .info-table { width: 100%; margin-bottom: 16px; }
  .info-table td { padding: 2px 0; vertical-align: top; }
  .info-table td:first-child { width: 180px; font-weight: bold; }
  .body-text { text-align: justify; margin-bottom: 12px; }
  .wo-table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 11pt; }
  .wo-table th, .wo-table td { border: 1px solid #000; padding: 5px 8px; }
  .wo-table th { background: #f0f0f0; font-weight: bold; text-align: center; }
  .wo-table td.center { text-align: center; }
  .wo-table td.right { text-align: right; }
  .total-row td { font-weight: bold; background: #f5f5f5; }
  .sign-section { margin-top: 32px; display: flex; justify-content: space-between; }
  .sign-box { text-align: center; width: 220px; }
  .sign-box .name { font-weight: bold; margin-top: 64px; border-top: 1px solid #000; padding-top: 4px; }
  .sign-box .role { font-size: 10pt; }
  @media print { body { padding: 20px 30px; } .no-print { display: none; } }
</style>
</head>
<body>
<h1>Berita Acara Pekerjaan Selesai</h1>
<p class="subtitle">(BAPS)</p>
<div class="divider"></div>
<br>
<table class="info-table">
  <tr><td>Nomor Surat</td><td>: ${invText(nomorSurat)}</td></tr>
  <tr><td>Tanggal</td><td>: ${tanggalStr}</td></tr>
</table>
<p class="body-text">
  Yang bertanda tangan di bawah ini, kami masing-masing mewakili pihak-pihak sebagai berikut:
</p>
<p style="margin-bottom:8px"><strong>Pihak Pertama (Pemberi Kerja):</strong><br>
  Perusahaan &nbsp;: ${invText(config.perusahaan)}<br>
  Alamat &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: ${invText(config.alamat||'-')}<br>
  Nama &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: ${invText(config.pic_nama||'-')}<br>
  Jabatan &nbsp;&nbsp;&nbsp;: ${invText(config.pic_jabatan||'-')}
</p>
<p style="margin-bottom:16px"><strong>Pihak Kedua (Pelaksana):</strong><br>
  Perusahaan/Mitra : ${invText(mitra.nama)}<br>
  Alamat &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: ${invText(mitra.alamat||'-')}<br>
  Nama &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: ${invText(mitra.pic_nama||'-')}<br>
  Jabatan &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: ${invText(mitra.pic_jabatan||'-')}
</p>
<p class="body-text">
  Dengan ini menyatakan bahwa pekerjaan instalasi/perluasan jaringan telah selesai dilaksanakan oleh Pihak Kedua
  sesuai dengan Work Order yang tercantum di bawah ini, dengan rincian sebagai berikut:
</p>
<table class="wo-table">
  <thead>
    <tr>
      <th style="width:40px">No</th>
      <th>WO ID</th>
      <th>Tanggal</th>
      <th>Pelanggan</th>
      <th>Tipe</th>
      <th>Teknisi</th>
      <th>Nilai (Rp)</th>
    </tr>
  </thead>
  <tbody>
    ${woList.map((wo,i) => {
      const tek = [wo.teknisi_1, wo.teknisi_2].filter(Boolean).join(', ') || '-';
      const nilai = wo.total || wo.registrasi || 0;
      const tipeMap = {INSTALASI:'Instalasi Baru', INSTALASI_RESELLER:'Instalasi Reseller', PERLUASAN_RESELLER:'Perluasan Reseller'};
      return `<tr>
        <td class="center">${i+1}</td>
        <td class="center">${invText(wo.wo_id)}</td>
        <td class="center">${invFmtDateShort(wo.tanggal)}</td>
        <td>${invText(wo.pelanggan||'-')}</td>
        <td class="center">${tipeMap[wo.tipe]||wo.tipe}</td>
        <td>${invText(tek)}</td>
        <td class="right">${nilai ? Number(nilai).toLocaleString('id-ID') : '-'}</td>
      </tr>`;
    }).join('')}
    <tr class="total-row">
      <td colspan="6" class="right">Total</td>
      <td class="right">${totalNilai ? Number(totalNilai).toLocaleString('id-ID') : '-'}</td>
    </tr>
  </tbody>
</table>
${terbilang ? `<p style="margin-bottom:12px;font-style:italic">${invText(terbilang)}</p>` : ''}
<p class="body-text">
  Demikian Berita Acara Pekerjaan Selesai ini dibuat dengan sebenarnya, untuk dipergunakan sebagaimana mestinya.
</p>
<div class="sign-section">
  <div class="sign-box">
    <p>Pihak Kedua (Pelaksana)</p>
    <p>${invText(mitra.nama)}</p>
    <p class="name">${invText(mitra.pic_nama||'...........................')}</p>
    <p class="role">${invText(mitra.pic_jabatan||'-')}</p>
  </div>
  <div class="sign-box">
    <p>Pihak Pertama (Pemberi Kerja)</p>
    <p>${invText(config.perusahaan)}</p>
    <p class="name">${invText(config.pic_nama||'...........................')}</p>
    <p class="role">${invText(config.pic_jabatan||'-')}</p>
  </div>
</div>
<div class="no-print" style="margin-top:24px;text-align:center">
  <button onclick="window.print()" style="padding:10px 28px;background:#4f46e5;color:#fff;border:none;border-radius:8px;font-size:13px;cursor:pointer;font-weight:bold">
    🖨️ Cetak / Simpan PDF
  </button>
  <button onclick="window.close()" style="margin-left:12px;padding:10px 24px;background:#e2e8f0;color:#334155;border:none;border-radius:8px;font-size:13px;cursor:pointer">
    Tutup
  </button>
</div>
</body>
</html>`);
  printWindow.document.close();
}

// ── TERBILANG ────────────────────────────────────────────────
function numberToTerbilang(n) {
  const satuan = ['','satu','dua','tiga','empat','lima','enam','tujuh','delapan','sembilan','sepuluh','sebelas'];
  function spell(n) {
    if(n < 12) return satuan[n];
    if(n < 20) return satuan[n-10]+' belas';
    if(n < 100) return satuan[Math.floor(n/10)]+' puluh'+(n%10?' '+satuan[n%10]:'');
    if(n < 200) return 'seratus'+(n%100?' '+spell(n%100):'');
    if(n < 1000) return satuan[Math.floor(n/100)]+' ratus'+(n%100?' '+spell(n%100):'');
    if(n < 2000) return 'seribu'+(n%1000?' '+spell(n%1000):'');
    if(n < 1000000) return spell(Math.floor(n/1000))+' ribu'+(n%1000?' '+spell(n%1000):'');
    if(n < 1000000000) return spell(Math.floor(n/1000000))+' juta'+(n%1000000?' '+spell(n%1000000):'');
    return spell(Math.floor(n/1000000000))+' miliar'+(n%1000000000?' '+spell(n%1000000000):'');
  }
  if(!n||n===0) return 'nol';
  return spell(Math.round(n)).trim();
}

function mitraToday() {
  const d = new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}


// ===============================================
// SWITCH TAB INVOICE MITRA
// ===============================================
function switchInvoiceMitraTab(tab) {
  // Hide all tabs
  document.querySelectorAll('.invoice-tab-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('[id^="invoice-tab-"]').forEach(btn => btn.classList.remove('active'));
  
  // Show selected tab
  document.getElementById(`invoice-tab-${tab}-content`)?.classList.remove('hidden');
  document.getElementById(`invoice-tab-${tab}`)?.classList.add('active');
  
  // Load data
  if (tab === 'generate') {
    // Generate tab sudah auto load saat switchMainTab
  } else if (tab === 'list') {
    loadMitraBapsList();
  }
}

// ===============================================
// LOAD LIST BAPS MITRA
// ===============================================
async function loadMitraBapsList() {
  const container = document.getElementById('mitra-baps-list');
  if (!container || !currentUser || !currentUser.mitraId) return;

  const statusFilter = document.getElementById('mitra-baps-filter-status')?.value || '';
  const dateFrom = document.getElementById('mitra-baps-filter-from')?.value || '';
  const dateTo = document.getElementById('mitra-baps-filter-to')?.value || '';

  container.innerHTML = '<p class="text-xs text-slate-400 text-center py-6"><i class="fa-solid fa-spinner animate-spin mr-1"></i>Memuat...</p>';

  try {
    let query = supa.from('mitra_baps')
      .select('*')
      .eq('mitra_id', currentUser.mitraId)
      .order('created_at', { ascending: false });

    if (statusFilter) query = query.eq('status', statusFilter);
    if (dateFrom) query = query.gte('created_at', dateFrom);
    if (dateTo) query = query.lte('created_at', dateTo + 'T23:59:59');

    const { data, error } = await query;

    if (error) throw error;

    if (!data || data.length === 0) {
      container.innerHTML = '<div class="text-center py-8"><i class="fa-solid fa-inbox text-4xl text-slate-300 dark:text-slate-600 mb-2"></i><p class="text-sm text-slate-400">Belum ada BAPS yang digenerate</p></div>';
      return;
    }

    const html = data.map(baps => {
      const statusBadge = baps.status === 'PAID' 
        ? '<span class="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-black rounded-lg">LUNAS</span>'
        : baps.status === 'CANCELLED'
        ? '<span class="px-2 py-1 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 text-[10px] font-black rounded-lg">BATAL</span>'
        : '<span class="px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-black rounded-lg">BELUM LUNAS</span>';

      const createdDate = new Date(baps.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
      const periode = `${new Date(baps.periode_dari).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${new Date(baps.periode_sampai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`;

      return `
        <div class="bg-slate-50 dark:bg-slate-700/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-600 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all">
          <div class="flex items-start justify-between gap-3 mb-3">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1">
                <h3 class="text-sm font-extrabold text-slate-900 dark:text-white">${baps.nomor_surat || '-'}</h3>
                ${statusBadge}
              </div>
              <p class="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Dibuat: ${createdDate}</p>
            </div>
            <button onclick="bukaBapsDetail('${baps.nomor_surat}')" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all">
              <i class="fa-solid fa-eye"></i>Detail
            </button>
          </div>
          <div class="grid grid-cols-2 gap-2 text-[10px]">
            <div class="bg-white dark:bg-slate-800 rounded-lg p-2">
              <p class="text-slate-500 dark:text-slate-400 mb-0.5">Periode</p>
              <p class="font-bold text-slate-900 dark:text-white">${periode}</p>
            </div>
            <div class="bg-white dark:bg-slate-800 rounded-lg p-2">
              <p class="text-slate-500 dark:text-slate-400 mb-0.5">Total WO</p>
              <p class="font-bold text-slate-900 dark:text-white">${baps.jumlah_wo || 0} WO</p>
            </div>
            <div class="bg-white dark:bg-slate-800 rounded-lg p-2 col-span-2">
              <p class="text-slate-500 dark:text-slate-400 mb-0.5">Total Nilai</p>
              <p class="font-black text-indigo-600 dark:text-indigo-400 text-sm">${invFmt(baps.total_nilai || 0)}</p>
            </div>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = html;

  } catch (err) {
    console.error('Error loading mitra BAPS list:', err);
    container.innerHTML = '<p class="text-xs text-rose-500 text-center py-6"><i class="fa-solid fa-triangle-exclamation mr-1"></i>Gagal memuat data</p>';
  }
}
