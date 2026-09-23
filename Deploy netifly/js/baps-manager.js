// ===================== BAPS MANAGER =====================
// Dipakai oleh: Manager — history BAPS + konfigurasi data PT SINu

var _bapsHistoryData = [];

// ── Helpers ──────────────────────────────────────────────────
function bapsText(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}
function bapsFmt(v) {
  return Number(v||0).toLocaleString('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0});
}
function bapsFmtDate(s) {
  if(!s) return '-';
  const d = new Date(String(s)+'T00:00:00');
  return d.toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'});
}
function bapsFmtDateShort(s) {
  if(!s) return '-';
  const d = new Date(String(s)+'T00:00:00');
  return d.toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'});
}
function bapsStatusBadge(status) {
  const map = {
    GENERATED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    PAID:       'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    CANCELLED:  'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
  };
  const label = {GENERATED:'Generated', PAID:'Lunas', CANCELLED:'Dibatalkan'};
  return `<span class="px-2.5 py-1 rounded-lg text-[10px] font-extrabold ${map[status]||'bg-slate-100 text-slate-600'}">${bapsText(label[status]||status)}</span>`;
}

// ── HISTORY BAPS ─────────────────────────────────────────────
async function loadHistoryBaps() {
  const el = document.getElementById('baps-history-list');
  if(!el) return;
  el.innerHTML = '<div class="text-xs text-slate-400 text-center py-8"><i class="fa-solid fa-spinner animate-spin mr-1"></i>Memuat riwayat BAPS...</div>';

  const filterMitra  = (document.getElementById('baps-filter-mitra')||{value:''}).value;
  const filterStatus = (document.getElementById('baps-filter-status')||{value:''}).value;
  const filterFrom   = (document.getElementById('baps-filter-date-from')||{value:''}).value;
  const filterTo     = (document.getElementById('baps-filter-date-to')||{value:''}).value;

  try {
    let query = supa.from('mitra_invoices')
      .select('*, mitra(nama, pic_nama, pic_jabatan)')
      .order('tanggal_generate', {ascending: false})
      .limit(200);

    if(filterMitra)  query = query.eq('mitra_id', filterMitra);
    if(filterStatus) query = query.eq('status', filterStatus);
    if(filterFrom)   query = query.gte('tanggal_generate', filterFrom);
    if(filterTo)     query = query.lte('tanggal_generate', filterTo);

    const { data, error } = await query;
    if(error) throw error;
    _bapsHistoryData = data || [];

    if(!_bapsHistoryData.length) {
      el.innerHTML = '<div class="text-xs text-slate-400 text-center py-8"><i class="fa-solid fa-inbox text-2xl block mb-2"></i>Belum ada BAPS yang digenerate.</div>';
      return;
    }

    el.innerHTML = _bapsHistoryData.map((inv, idx) => `
      <div class="baps-card border border-slate-200 dark:border-slate-700 rounded-2xl p-4 bg-white dark:bg-slate-800 space-y-3 fade-up" style="animation-delay:${idx*30}ms">
        <div class="flex flex-wrap items-start justify-between gap-2">
          <div class="flex-1 min-w-0">
            <p class="text-[10px] font-bold text-slate-400 uppercase mb-0.5">BAPS</p>
            <p class="text-sm font-extrabold text-slate-900 dark:text-white font-mono">${bapsText(inv.nomor_surat)}</p>
            <p class="text-xs text-slate-500 mt-0.5"><i class="fa-solid fa-handshake mr-1"></i>${bapsText(inv.mitra?.nama||inv.mitra_nama||'—')}</p>
          </div>
          <div class="flex items-center gap-2">
            ${bapsStatusBadge(inv.status)}
          </div>
        </div>
        <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <div><span class="text-slate-400">Tanggal Generate:</span><span class="font-semibold ml-1">${bapsFmtDate(inv.tanggal_generate)}</span></div>
          <div><span class="text-slate-400">Total WO:</span><span class="font-semibold ml-1">${bapsText(inv.total_wo)} WO</span></div>
          <div><span class="text-slate-400">Periode:</span><span class="font-semibold ml-1">${bapsFmtDateShort(inv.tanggal_mulai)} – ${bapsFmtDateShort(inv.tanggal_selesai)}</span></div>
          <div><span class="text-slate-400">Total Nilai:</span><span class="font-semibold ml-1">${bapsFmt(inv.total_nilai)}</span></div>
          <div><span class="text-slate-400">Dibuat oleh:</span><span class="font-semibold ml-1">${bapsText(inv.generated_by)}</span></div>
        </div>
        <div class="flex flex-wrap gap-2 pt-1 border-t border-slate-100 dark:border-slate-700">
          <button onclick="bukaBapsDetail('${bapsText(inv.id)}')" class="px-3 py-1.5 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-xl text-[10px] font-bold flex items-center gap-1">
            <i class="fa-solid fa-eye"></i>Lihat Detail
          </button>
          <button onclick="cetakUlangBaps('${bapsText(inv.id)}')" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-bold flex items-center gap-1">
            <i class="fa-solid fa-print"></i>Cetak Ulang
          </button>
          ${inv.status === 'GENERATED' ? `
          <button onclick="tandaiLunasBaps('${bapsText(inv.id)}')" class="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-xl text-[10px] font-bold flex items-center gap-1">
            <i class="fa-solid fa-check-double"></i>Tandai Lunas
          </button>
          <button onclick="batalkanBaps('${bapsText(inv.id)}')" class="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-600 rounded-xl text-[10px] font-bold flex items-center gap-1">
            <i class="fa-solid fa-ban"></i>Batalkan
          </button>` : ''}
        </div>
      </div>`).join('');

    // Load filter dropdown mitra
    loadBapsMitraFilter();
  } catch(err) {
    el.innerHTML = `<div class="text-xs text-rose-500 text-center py-4">Gagal memuat: ${bapsText(err.message)}</div>`;
  }
}

async function loadBapsMitraFilter() {
  const sel = document.getElementById('baps-filter-mitra');
  if(!sel || sel.options.length > 1) return;
  try {
    const { data } = await supa.from('mitra').select('id, nama').eq('aktif', true).order('nama');
    sel.innerHTML = '<option value="">Semua Mitra</option>' +
      (data||[]).map(m => `<option value="${m.id}">${bapsText(m.nama)}</option>`).join('');
  } catch(e) {}
}

function bukaBapsDetail(id) {
  const inv = _bapsHistoryData.find(x => x.id === id);
  if(!inv) return;
  const snap = inv.baps_snapshot || {};
  const config = snap.config || {};
  const mitra  = snap.mitra  || {};
  const woList = snap.wo_list || [];
  const modal  = document.getElementById('baps-detail-modal');
  const body   = document.getElementById('baps-detail-body');
  if(!modal || !body) return;

  const TIPE_LABEL = {INSTALASI:'Instalasi Baru', INSTALASI_RESELLER:'Instalasi Reseller', PERLUASAN_RESELLER:'Perluasan Reseller'};
  body.innerHTML = `
    <div class="space-y-4 text-xs">
      <div class="grid grid-cols-2 gap-3">
        <div class="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-3">
          <p class="text-[10px] font-bold text-indigo-400 uppercase mb-1">PT SINu</p>
          <p class="font-extrabold text-slate-900 dark:text-white">${bapsText(config.perusahaan||'—')}</p>
          <p class="text-slate-500">${bapsText(config.pic_nama||'—')} • ${bapsText(config.pic_jabatan||'—')}</p>
          <p class="text-slate-400 text-[10px]">${bapsText(config.alamat||'—')}</p>
        </div>
        <div class="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-3">
          <p class="text-[10px] font-bold text-orange-400 uppercase mb-1">Mitra</p>
          <p class="font-extrabold text-slate-900 dark:text-white">${bapsText(mitra.nama||inv.mitra_nama||'—')}</p>
          <p class="text-slate-500">${bapsText(mitra.pic_nama||'—')} • ${bapsText(mitra.pic_jabatan||'—')}</p>
          <p class="text-slate-400 text-[10px]">${bapsText(mitra.alamat||'—')}</p>
        </div>
      </div>
      <div class="bg-slate-50 dark:bg-slate-700/40 rounded-xl p-3">
        <p class="text-[10px] font-bold text-slate-400 uppercase mb-2">Daftar WO (${woList.length} WO)</p>
        <div class="overflow-x-auto">
          <table class="w-full min-w-[480px]">
            <thead><tr class="text-[10px] font-bold text-slate-400 uppercase border-b border-slate-200 dark:border-slate-600">
              <th class="py-1.5 pr-3 text-left">WO ID</th>
              <th class="py-1.5 pr-3 text-left">Tanggal</th>
              <th class="py-1.5 pr-3 text-left">Pelanggan</th>
              <th class="py-1.5 pr-3 text-left">Tipe</th>
              <th class="py-1.5 text-right">Nilai</th>
            </tr></thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-700">
              ${woList.map(wo => `<tr class="text-[11px]">
                <td class="py-1.5 pr-3 font-mono font-bold text-slate-800 dark:text-slate-100">${bapsText(wo.wo_id)}</td>
                <td class="py-1.5 pr-3 text-slate-500">${bapsFmtDateShort(wo.tanggal)}</td>
                <td class="py-1.5 pr-3 text-slate-700 dark:text-slate-200 max-w-[120px] truncate">${bapsText(wo.pelanggan||'—')}</td>
                <td class="py-1.5 pr-3"><span class="px-1.5 py-0.5 rounded text-[9px] bg-blue-100 text-blue-700">${bapsText(TIPE_LABEL[wo.tipe]||wo.tipe)}</span></td>
                <td class="py-1.5 text-right font-semibold">${wo.total||wo.registrasi ? bapsFmt(wo.total||wo.registrasi) : '—'}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
      <div class="flex items-center justify-between border-t border-slate-200 dark:border-slate-700 pt-3">
        <span class="text-[10px] text-slate-400">Total: ${woList.length} WO</span>
        <span class="font-extrabold text-slate-900 dark:text-white">${bapsFmt(inv.total_nilai)}</span>
      </div>
    </div>`;
  modal.classList.remove('hidden');
}

function tutupBapsDetail() {
  const modal = document.getElementById('baps-detail-modal');
  if(modal) modal.classList.add('hidden');
}

async function cetakUlangBaps(id) {
  const inv = _bapsHistoryData.find(x => x.id === id);
  if(!inv || !inv.baps_snapshot) { showAlert('Data snapshot BAPS tidak ditemukan.','Error'); return; }
  const snap = inv.baps_snapshot;
  const now = new Date(inv.tanggal_generate+'T00:00:00');
  // Reuse renderBapsPDF dari invoice-mitra.js
  if(typeof renderBapsPDF === 'function') {
    renderBapsPDF(inv.nomor_surat, now, snap.config||{}, snap.mitra||{}, snap.wo_list||[], inv.total_nilai||0);
  } else {
    showAlert('Modul cetak belum dimuat.','Error');
  }
}

async function tandaiLunasBaps(id) {
  if(!confirm('Tandai BAPS ini sebagai LUNAS?')) return;
  try {
    const { error } = await supa.from('mitra_invoices').update({ status:'PAID' }).eq('id', id);
    if(error) throw error;
    showAlert('BAPS berhasil ditandai sebagai Lunas.','Berhasil ✅');
    await loadHistoryBaps();
  } catch(err) {
    showAlert('Gagal update status: '+(err.message||''),'Error');
  }
}

async function batalkanBaps(id) {
  if(!confirm('Batalkan BAPS ini? WO terkait akan dikembalikan ke status belum tertagih.')) return;
  try {
    const inv = _bapsHistoryData.find(x => x.id === id);
    if(!inv) throw new Error('BAPS tidak ditemukan');
    // Kembalikan WO ke invoiced=false
    if(inv.wo_ids && inv.wo_ids.length) {
      const { error: woErr } = await supa.from('work_orders')
        .update({ invoiced: false, invoice_id: null })
        .in('wo_id', inv.wo_ids);
      if(woErr) throw woErr;
    }
    const { error } = await supa.from('mitra_invoices').update({ status:'CANCELLED' }).eq('id', id);
    if(error) throw error;
    showAlert('BAPS berhasil dibatalkan. WO terkait dapat ditagihkan kembali.','Dibatalkan');
    await loadHistoryBaps();
  } catch(err) {
    showAlert('Gagal membatalkan BAPS: '+(err.message||''),'Error');
  }
}

// ── KONFIGURASI BAPS ─────────────────────────────────────────
async function loadBapsConfig() {
  const form = document.getElementById('form-baps-config');
  if(!form) return;
  try {
    const { data, error } = await supa.from('baps_config').select('*').limit(1).single();
    if(error && error.code !== 'PGRST116') throw error;
    if(data) {
      (document.getElementById('baps-cfg-perusahaan')||{}).value = data.perusahaan || '';
      (document.getElementById('baps-cfg-alamat')||{}).value      = data.alamat     || '';
      (document.getElementById('baps-cfg-pic-nama')||{}).value    = data.pic_nama   || '';
      (document.getElementById('baps-cfg-pic-jabatan')||{}).value = data.pic_jabatan|| '';
      (document.getElementById('baps-cfg-prefix')||{}).value      = data.nomor_surat_prefix || 'BAPS/SINU';
      (document.getElementById('baps-cfg-counter')||{}).value     = data.nomor_surat_counter || 1;
      (document.getElementById('baps-cfg-footer')||{}).value      = data.footer_teks || '';
      // Simpan id untuk update
      const hiddenId = document.getElementById('baps-cfg-id');
      if(hiddenId) hiddenId.value = data.id;
    }
  } catch(err) {
    showAlert('Gagal memuat konfigurasi BAPS: '+(err.message||''),'Error');
  }
}

async function simpanBapsConfig(e) {
  e.preventDefault();
  const id          = (document.getElementById('baps-cfg-id')||{}).value;
  const perusahaan  = (document.getElementById('baps-cfg-perusahaan')||{}).value.trim();
  const alamat      = (document.getElementById('baps-cfg-alamat')||{}).value.trim();
  const picNama     = (document.getElementById('baps-cfg-pic-nama')||{}).value.trim();
  const picJabatan  = (document.getElementById('baps-cfg-pic-jabatan')||{}).value.trim();
  const prefix      = (document.getElementById('baps-cfg-prefix')||{}).value.trim();
  const counter     = parseInt((document.getElementById('baps-cfg-counter')||{}).value)||1;
  const footer      = (document.getElementById('baps-cfg-footer')||{}).value.trim();

  if(!perusahaan || !picNama || !picJabatan || !prefix) {
    showAlert('Nama perusahaan, PIC, jabatan, dan prefix nomor surat wajib diisi.','Validasi');
    return;
  }
  const btn = document.getElementById('btn-simpan-baps-config');
  const orig = btn ? btn.innerHTML : '';
  if(btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner animate-spin"></i> Menyimpan...'; }
  try {
    const payload = { perusahaan, alamat, pic_nama: picNama, pic_jabatan: picJabatan, nomor_surat_prefix: prefix, nomor_surat_counter: counter, footer_teks: footer, updated_at: new Date().toISOString() };
    let err;
    if(id) {
      ({ error: err } = await supa.from('baps_config').update(payload).eq('id', id));
    } else {
      ({ error: err } = await supa.from('baps_config').insert(payload));
    }
    if(err) throw err;
    // Reset cache invoice-mitra.js
    if(typeof _bapsConfigCache !== 'undefined') window._bapsConfigCache = null;
    showAlert('Konfigurasi BAPS berhasil disimpan.','Tersimpan ✅');
    await loadBapsConfig();
  } catch(err) {
    showAlert('Gagal menyimpan konfigurasi: '+(err.message||''),'Error');
  }
  if(btn) { btn.disabled = false; btn.innerHTML = orig || '<i class="fa-solid fa-floppy-disk mr-1"></i>Simpan Konfigurasi'; }
}
