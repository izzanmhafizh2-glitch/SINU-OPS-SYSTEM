// ===================== OWNER / SUPER ADMIN CONTROL =====================
// Fitur kontrol penuh khusus role "owner": reset seluruh data operasional
// dalam satu klik (dengan konfirmasi ketik) dan pengelolaan akun penuh.
// Catatan: akun & karyawan TIDAK ikut direset agar owner tidak terkunci.

function sinuIsOwner() {
  return !!(currentUser && String(currentUser.role || '').toLowerCase() === 'owner');
}

// Urutan penting: tabel anak/FK dihapus lebih dulu agar tidak melanggar constraint.
const OWNER_RESET_TABLES = [
  { table: 'dismantle_items',       label: 'Item Dismantle' },
  { table: 'tiket_dismantle',       label: 'Tiket Dismantle' },
  { table: 'device_history',        label: 'Riwayat Perangkat' },
  { table: 'perangkat_teknisi',     label: 'Alokasi Perangkat Teknisi' },
  { table: 'material_requests',     label: 'Request Material' },
  { table: 'pickup_requests',       label: 'Request Pickup' },
  { table: 'provisioning_requests', label: 'Request Provisioning' },
  { table: 'wo_photos',             label: 'Foto Work Order' },
  { table: 'work_orders',           label: 'Work Order' },
  { table: 'perangkat',             label: 'Perangkat Gudang' }
];

// Hapus semua baris sebuah tabel. Menangani tabel yang belum ada.
async function _ownerDeleteAllRows(table) {
  // Coba delete berbasis kolom umum. Supabase butuh filter, jadi pakai
  // kondisi yang selalu benar melalui kolom yang pasti ada.
  let res = await supa.from(table).delete().not('id', 'is', null);
  if(res.error && /column .*id.* does not exist/i.test(res.error.message || '')) {
    // Tabel tanpa kolom id (mis. memakai wo_id / sn) — pakai created_at.
    res = await supa.from(table).delete().not('created_at', 'is', null);
  }
  if(res.error) {
    const msg = res.error.message || '';
    if(/does not exist|Not Found|schema cache/i.test(msg) || res.error.code === 'PGRST106') {
      return { status: 'missing' };
    }
    throw res.error;
  }
  return { status: 'deleted' };
}

// Reset seluruh data operasional. Dipanggil setelah konfirmasi ketik.
async function ownerResetSemuaData() {
  if(!sinuIsOwner()) { showAlert('Hanya Owner yang dapat mereset data.', 'Akses Ditolak'); return; }

  const input = (document.getElementById('owner-reset-confirm') || {}).value || '';
  if(input.trim().toUpperCase() !== 'RESET') {
    showAlert('Ketik kata RESET (huruf besar) untuk konfirmasi.', 'Konfirmasi Diperlukan');
    return;
  }

  const btn = document.getElementById('btn-owner-reset');
  const logEl = document.getElementById('owner-reset-log');
  if(btn){ btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner animate-spin"></i> Mereset...'; }
  if(logEl) logEl.innerHTML = '';

  let sukses = 0, dilewati = 0, gagal = 0;
  const lines = [];
  for(const item of OWNER_RESET_TABLES) {
    try {
      const result = await _ownerDeleteAllRows(item.table);
      if(result.status === 'missing') {
        lines.push(`<span class="text-amber-500">• ${item.label} — dilewati (tabel belum ada)</span>`);
        dilewati++;
      } else {
        lines.push(`<span class="text-emerald-500">• ${item.label} — direset</span>`);
        sukses++;
      }
    } catch(err) {
      lines.push(`<span class="text-rose-500">• ${item.label} — gagal: ${(err.message||'').replace(/</g,'&lt;')}</span>`);
      gagal++;
    }
    if(logEl) logEl.innerHTML = lines.join('<br>');
  }

  const inputEl = document.getElementById('owner-reset-confirm');
  if(inputEl) inputEl.value = '';
  if(btn){ btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Reset Semua Data'; }

  showAlert(
    `Reset selesai.\nBerhasil: ${sukses} • Dilewati: ${dilewati} • Gagal: ${gagal}\n\nData akun & karyawan tidak ikut dihapus.`,
    gagal === 0 ? 'Reset Berhasil' : 'Reset Selesai (ada kegagalan)'
  );

  // Segarkan tampilan yang mungkin sedang terbuka.
  if(typeof loadWOSummaryDashboard === 'function') loadWOSummaryDashboard();
  if(typeof refreshAdminTicketList === 'function') refreshAdminTicketList();
  if(typeof loadAndRenderListPerangkat === 'function') loadAndRenderListPerangkat();
  if(typeof loadRekapKabel === 'function') loadRekapKabel();
}

// ── OPER TUGAS (RELEASE WO) ─────────────────────────────────────────
// Menarik WO dari teknisi yang susah dihubungi kembali ke antrian pickup.
async function ownerLoadReleaseWO() {
  const sel = document.getElementById('owner-wo-select');
  if(!sel || typeof supa === 'undefined') return;
  try {
    // WO yang sedang dipegang teknisi (PICKUP/PROSES) → layak dioper.
    const { data, error } = await supa.from('work_orders')
      .select('wo_id, pelanggan, tipe, status, teknisi, teknisi_1')
      .in('status', ['PICKUP', 'PROSES'])
      .order('created_at', { ascending: false });
    if(error) throw error;
    const rows = data || [];
    if(!rows.length) {
      sel.innerHTML = '<option value="" disabled selected>Tidak ada WO yang sedang dikerjakan</option>';
      return;
    }
    sel.innerHTML = '<option value="" disabled selected>-- Pilih WO untuk dioper --</option>' +
      rows.map(r => {
        const teknisi = Array.isArray(r.teknisi) ? r.teknisi.filter(Boolean).join(', ') : (r.teknisi || r.teknisi_1 || '-');
        return `<option value="${r.wo_id}">${r.wo_id} — ${r.pelanggan || '-'} (${teknisi || '-'})</option>`;
      }).join('');
  } catch(e) {
    sel.innerHTML = `<option value="" disabled selected>Gagal memuat: ${e.message}</option>`;
  }
}

async function ownerReleaseWO() {
  if(!sinuIsOwner()) { showAlert('Hanya Owner yang dapat mengoper tugas.', 'Akses Ditolak'); return; }
  const sel = document.getElementById('owner-wo-select');
  const woId = sel ? sel.value : '';
  if(!woId) { showAlert('Pilih WO yang akan dioper terlebih dahulu.', 'Pilih WO'); return; }

  const btn = document.getElementById('btn-owner-release-wo');
  if(btn){ btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner animate-spin"></i> Memproses...'; }
  try {
    const releaseData = { status:'RELEASE', released_at:new Date().toISOString(), picked_up_at:null, teknisi:[], teknisi_1:null, teknisi_2:null };
    let res = await supa.from('work_orders').update(releaseData).eq('wo_id', woId);
    if(res.error && /released_at|picked_up_at|column/i.test(res.error.message || '')) {
      delete releaseData.released_at; delete releaseData.picked_up_at;
      res = await supa.from('work_orders').update(releaseData).eq('wo_id', woId);
    }
    if(res.error) throw res.error;
    showAlert(`WO ${woId} berhasil dioper. Kembali ke antrian Pickup untuk diambil teknisi lain.`, 'Tugas Dioper');
    await ownerLoadReleaseWO();
    if(typeof renderPickupListFromDB === 'function') renderPickupListFromDB();
    if(typeof refreshAdminTicketList === 'function') refreshAdminTicketList();
  } catch(e) {
    showAlert('Gagal mengoper tugas: ' + (e.message || ''), 'Error');
  } finally {
    if(btn){ btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> Oper Tugas (Release)'; }
  }
}

// ── PINDAH PERANGKAT INSTAN (tanpa approval) ────────────────────────
async function ownerLoadDeviceMove() {
  const selSN = document.getElementById('owner-device-select');
  const selTarget = document.getElementById('owner-device-target');
  if(typeof supa === 'undefined') return;

  try {
    if(selSN) {
      const { data, error } = await supa.from('perangkat_teknisi')
        .select('sn, jenis, teknisi_name, panjang_sisa')
        .eq('status', 'READY').order('teknisi_name');
      if(error) throw error;
      const rows = data || [];
      selSN.innerHTML = rows.length
        ? '<option value="" disabled selected>-- Pilih perangkat --</option>' +
          rows.map(r => {
            const isKabel = r.jenis && r.jenis.toLowerCase().includes('kabel');
            const sisa = isKabel && r.panjang_sisa != null ? ` — ${r.panjang_sisa}m` : '';
            return `<option value="${r.sn}|${r.teknisi_name}">${r.sn} (${r.jenis||'-'})${sisa} • di ${r.teknisi_name}</option>`;
          }).join('')
        : '<option value="" disabled selected>Tidak ada perangkat di teknisi</option>';
    }
    if(selTarget) {
      const { data: akun } = await supa.from('akun')
        .select('display_name').eq('role', 'teknisi').order('display_name');
      const opts = (akun || []).map(a => `<option value="${a.display_name}">${a.display_name}</option>`).join('');
      selTarget.innerHTML = '<option value="" disabled selected>-- Pilih tujuan --</option>' +
        '<option value="__GUDANG__">↩️ Kembalikan ke Gudang</option>' + opts;
    }
  } catch(e) {
    if(selSN) selSN.innerHTML = `<option value="" disabled selected>Gagal memuat: ${e.message}</option>`;
  }
}

async function ownerMoveDevice() {
  if(!sinuIsOwner()) { showAlert('Hanya Owner yang dapat memindahkan perangkat.', 'Akses Ditolak'); return; }
  const selSN = document.getElementById('owner-device-select');
  const selTarget = document.getElementById('owner-device-target');
  const val = selSN ? selSN.value : '';
  const target = selTarget ? selTarget.value : '';
  if(!val) { showAlert('Pilih perangkat yang akan dipindahkan.', 'Pilih Perangkat'); return; }
  if(!target) { showAlert('Pilih tujuan pemindahan.', 'Pilih Tujuan'); return; }

  const [sn, dari] = val.split('|');
  const keGudang = target === '__GUDANG__';

  const btn = document.getElementById('btn-owner-move-device');
  if(btn){ btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner animate-spin"></i> Memindahkan...'; }
  try {
    // Ambil alokasi teknisi asal (termasuk sisa kabel).
    const { data: ptData, error: ptError } = await supa.from('perangkat_teknisi')
      .select('jenis, kondisi, panjang_awal, panjang_sisa')
      .eq('sn', sn).eq('teknisi_name', dari).eq('status', 'READY').maybeSingle();
    if(ptError) throw ptError;
    if(!ptData) throw new Error('Alokasi perangkat tidak ditemukan lagi untuk ' + sn + '.');
    const isKabel = ptData.jenis && ptData.jenis.toLowerCase().includes('kabel');

    // Hapus alokasi di teknisi asal.
    const { error: delError } = await supa.from('perangkat_teknisi')
      .delete().eq('sn', sn).eq('teknisi_name', dari);
    if(delError) throw delError;

    if(keGudang) {
      // Kembalikan ke gudang. Untuk kabel, sisa alokasi ditambahkan ke stok gudang.
      const { data: g } = await supa.from('perangkat').select('panjang_sisa').eq('sn', sn).maybeSingle();
      const update = { status:'Gudang', lokasi:'Gudang Utama' };
      if(isKabel) update.panjang_sisa = Number(g?.panjang_sisa || 0) + Number(ptData.panjang_sisa || 0);
      const { error: upErr } = await supa.from('perangkat').update(update).eq('sn', sn);
      if(upErr) throw upErr;
      if(typeof catatHistory === 'function') await catatHistory(sn, dari, 'Gudang', 'RETURN', `Dipindahkan Owner ke Gudang`);
      showAlert(`Perangkat ${sn} dikembalikan ke Gudang.`, 'Perangkat Dipindahkan');
    } else {
      // Pindahkan langsung ke teknisi tujuan (tanpa approval).
      const newRow = { sn, teknisi_name: target, status:'READY', kondisi: ptData.kondisi || 'Baru', jenis: ptData.jenis || '-' };
      if(isKabel) { newRow.panjang_awal = ptData.panjang_awal || null; newRow.panjang_sisa = ptData.panjang_sisa || null; }
      const { error: upsertErr } = await supa.from('perangkat_teknisi').upsert(newRow);
      if(upsertErr) throw upsertErr;
      const { error: gErr } = await supa.from('perangkat').update({ status: target, lokasi: target }).eq('sn', sn);
      if(gErr) throw gErr;
      if(typeof catatHistory === 'function') await catatHistory(sn, dari, target, 'SEND', `Dipindahkan Owner dari ${dari} ke ${target}`);
      showAlert(`Perangkat ${sn} dipindahkan dari ${dari} ke ${target}.`, 'Perangkat Dipindahkan');
    }

    await ownerLoadDeviceMove();
    if(typeof loadAndRenderListPerangkat === 'function') loadAndRenderListPerangkat();
    if(typeof loadListPerangkatSaya === 'function') loadListPerangkatSaya();
  } catch(e) {
    showAlert('Gagal memindahkan perangkat: ' + (e.message || ''), 'Error');
  } finally {
    if(btn){ btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-truck-fast"></i> Pindahkan Perangkat'; }
  }
}

// Tampilkan / sembunyikan panel Owner Control berdasarkan role.
function renderOwnerControlVisibility() {
  const panel = document.getElementById('owner-control-panel');
  const show = sinuIsOwner();
  if(panel) panel.classList.toggle('hidden', !show);
  if(show) {
    ownerLoadReleaseWO();
    ownerLoadDeviceMove();
  }
}

window.addEventListener('load', function() {
  setTimeout(renderOwnerControlVisibility, 600);
});
