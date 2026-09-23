// ===================== MITRA MODULE =====================
// Dipakai oleh: SPV (registrasi mitra), Koordinator (invoice, perangkat)

// ── Helpers ──────────────────────────────────────────────────
function mitraText(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}
function mitraToday() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}
function mitraFormatDate(s) {
  if(!s) return '-';
  const d = new Date(String(s)+'T00:00:00');
  return d.toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'});
}

// ── BAGIAN SPV: Registrasi & Kelola Mitra ────────────────────

var _daftarMitraData = [];

async function loadDaftarMitraSpv() {
  const el = document.getElementById('spv-mitra-list');
  if(!el) return;
  el.innerHTML = '<p class="text-xs text-slate-400 text-center py-6"><i class="fa-solid fa-spinner animate-spin mr-1"></i>Memuat...</p>';
  try {
    const { data, error } = await supa.from('mitra').select('*').order('nama');
    if(error) throw error;
    _daftarMitraData = data || [];
    if(!_daftarMitraData.length) {
      el.innerHTML = '<p class="text-xs text-slate-400 text-center py-6"><i class="fa-solid fa-inbox text-lg block mb-1"></i>Belum ada mitra terdaftar.</p>';
      return;
    }
    el.innerHTML = _daftarMitraData.map(m => `
      <div class="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-slate-700/40 rounded-2xl border border-slate-200 dark:border-slate-600">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <p class="text-sm font-extrabold text-slate-900 dark:text-white">${mitraText(m.nama)}</p>
            <span class="px-2 py-0.5 rounded-full text-[9px] font-black ${m.aktif ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'}">${m.aktif ? 'Aktif' : 'Nonaktif'}</span>
          </div>
          <p class="text-[10px] text-slate-500 mt-0.5"><i class="fa-solid fa-user mr-1"></i>${mitraText(m.pic_nama||'-')} • ${mitraText(m.pic_jabatan||'-')}</p>
          <p class="text-[10px] text-slate-400">${mitraText(m.alamat||'-')}</p>
        </div>
        <div class="flex gap-2 shrink-0">
          <button onclick="bukaEditMitra('${m.id}')" class="px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-xl text-[10px] font-bold"><i class="fa-solid fa-pen-to-square"></i></button>
          <button onclick="toggleAktifMitra('${m.id}',${m.aktif})" class="px-3 py-1.5 ${m.aktif ? 'bg-rose-100 hover:bg-rose-200 text-rose-600' : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-600'} rounded-xl text-[10px] font-bold">
            <i class="fa-solid ${m.aktif ? 'fa-ban' : 'fa-check'}"></i>
          </button>
        </div>
      </div>`).join('');
  } catch(err) {
    el.innerHTML = `<p class="text-xs text-rose-500 text-center py-4">Gagal memuat: ${mitraText(err.message)}</p>`;
  }
}

async function handleTambahMitra(e) {
  e.preventDefault();
  const nama    = document.getElementById('mitra-nama').value.trim();
  const alamat  = document.getElementById('mitra-alamat').value.trim();
  const picNama = document.getElementById('mitra-pic-nama').value.trim();
  const picJab  = document.getElementById('mitra-pic-jabatan').value.trim();
  const picTel  = document.getElementById('mitra-pic-telepon').value.trim();
  if(!nama) { showAlert('Nama mitra wajib diisi.','Form Tidak Lengkap'); return; }
  const btn = document.getElementById('btn-tambah-mitra');
  const orig = btn.innerHTML;
  btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner animate-spin"></i> Menyimpan...';
  try {
    const existing = await supa.from('mitra').select('id').ilike('nama', nama).maybeSingle();
    if(existing.data) { showAlert(`Mitra "${nama}" sudah terdaftar.`,'Duplikat'); return; }
    const { error } = await supa.from('mitra').insert({ nama, alamat, pic_nama: picNama, pic_jabatan: picJab, pic_telepon: picTel });
    if(error) throw error;
    showAlert(`Mitra "${nama}" berhasil ditambahkan.`,'Mitra Tersimpan ✅');
    document.getElementById('form-tambah-mitra').reset();
    await loadDaftarMitraSpv();
    // Refresh dropdown mitra di form akun jika ada
    if(typeof loadMitraDropdown === 'function') {
      loadMitraDropdown('akun-mitra-id','');
      loadMitraDropdown('edit-akun-mitra-id','');
    }
  } catch(err) {
    showAlert('Gagal menyimpan mitra: '+(err.message||''),'Error');
  }
  btn.disabled = false; btn.innerHTML = orig;
}

function bukaEditMitra(id) {
  const m = _daftarMitraData.find(x => x.id === id);
  if(!m) return;
  document.getElementById('edit-mitra-id').value = id;
  document.getElementById('edit-mitra-nama').value = m.nama || '';
  document.getElementById('edit-mitra-alamat').value = m.alamat || '';
  document.getElementById('edit-mitra-pic-nama').value = m.pic_nama || '';
  document.getElementById('edit-mitra-pic-jabatan').value = m.pic_jabatan || '';
  document.getElementById('edit-mitra-pic-telepon').value = m.pic_telepon || '';
  document.getElementById('edit-mitra-modal').classList.remove('hidden');
}
function tutupEditMitra() {
  document.getElementById('edit-mitra-modal').classList.add('hidden');
}

async function handleSimpanEditMitra(e) {
  e.preventDefault();
  const id      = document.getElementById('edit-mitra-id').value;
  const nama    = document.getElementById('edit-mitra-nama').value.trim();
  const alamat  = document.getElementById('edit-mitra-alamat').value.trim();
  const picNama = document.getElementById('edit-mitra-pic-nama').value.trim();
  const picJab  = document.getElementById('edit-mitra-pic-jabatan').value.trim();
  const picTel  = document.getElementById('edit-mitra-pic-telepon').value.trim();
  if(!nama) { showAlert('Nama mitra wajib diisi.','Validasi'); return; }
  const btn = document.getElementById('btn-simpan-edit-mitra');
  const orig = btn.innerHTML;
  btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner animate-spin"></i>';
  try {
    const { error } = await supa.from('mitra').update({ nama, alamat, pic_nama: picNama, pic_jabatan: picJab, pic_telepon: picTel, updated_at: new Date().toISOString() }).eq('id', id);
    if(error) throw error;
    showAlert('Data mitra berhasil diperbarui.','Tersimpan ✅');
    tutupEditMitra();
    await loadDaftarMitraSpv();
  } catch(err) {
    showAlert('Gagal update mitra: '+(err.message||''),'Error');
  }
  btn.disabled = false; btn.innerHTML = orig;
}

async function toggleAktifMitra(id, aktif) {
  const action = aktif ? 'Nonaktifkan' : 'Aktifkan';
  if(!confirm(`${action} mitra ini?`)) return;
  try {
    const { error } = await supa.from('mitra').update({ aktif: !aktif, updated_at: new Date().toISOString() }).eq('id', id);
    if(error) throw error;
    await loadDaftarMitraSpv();
  } catch(err) {
    showAlert('Gagal update status mitra: '+(err.message||''),'Error');
  }
}

// ── LOAD AKUN MITRA (untuk SPV lihat) ────────────────────────
async function loadAkunMitraList() {
  const el = document.getElementById('sub-mitra-content-akun-mitra');
  if(!el || !currentUser) return;
  const listEl = el.querySelector('#mitra-akun-list') || el;
  listEl.innerHTML = '<p class="text-xs text-slate-400 text-center py-6"><i class="fa-solid fa-spinner animate-spin mr-1"></i>Memuat akun mitra...</p>';
  try {
    const { data, error } = await supa.from('akun')
      .select('username, display_name, role, division, account_type, mitra(nama)')
      .eq('account_type','mitra').order('mitra_id').order('display_name');
    if(error) throw error;
    if(!data || !data.length) {
      listEl.innerHTML = '<p class="text-xs text-slate-400 text-center py-6">Belum ada akun mitra.</p>';
      return;
    }
    const ROLE_LABEL = {koordinator:'Koordinator',teknisi_mitra:'Teknisi',noc_mitra:'NOC',cs_mitra:'CS'};
    listEl.innerHTML = data.map(a => `
      <div class="flex items-center justify-between gap-3 py-2.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-600">
        <div>
          <p class="text-xs font-bold text-slate-800 dark:text-slate-100">${mitraText(a.display_name)} <span class="font-mono text-slate-400 text-[10px]">(${mitraText(a.username)})</span></p>
          <p class="text-[10px] text-slate-500">${mitraText(ROLE_LABEL[a.role]||a.role)} • ${mitraText(a.mitra?.nama||'—')}</p>
        </div>
        <span class="px-2 py-0.5 rounded-full text-[9px] font-black bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300"><i class="fa-solid fa-handshake mr-1"></i>Mitra</span>
      </div>`).join('');
  } catch(err) {
    listEl.innerHTML = `<p class="text-xs text-rose-500 text-center py-4">Gagal load: ${mitraText(err.message)}</p>`;
  }
}

// ── PERANGKAT MITRA (Koordinator) ────────────────────────────
async function loadPerangkatMitra() {
  const el = document.getElementById('mitra-perangkat-list');
  if(!el || !currentUser || !currentUser.mitraId) return;
  el.innerHTML = '<p class="text-xs text-slate-400 text-center py-4"><i class="fa-solid fa-spinner animate-spin mr-1"></i>Memuat...</p>';
  try {
    const { data, error } = await supa.from('perangkat')
      .select('sn, merk, jenis, kondisi, status, lokasi')
      .eq('mitra_id', currentUser.mitraId)
      .eq('ownership','mitra')
      .order('jenis').order('sn');
    if(error) throw error;
    if(!data || !data.length) {
      el.innerHTML = '<p class="text-xs text-slate-400 text-center py-4">Belum ada perangkat yang dialokasikan ke mitra ini.</p>';
      return;
    }
    el.innerHTML = data.map(p => `
      <div class="flex items-center justify-between gap-2 py-2.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-600">
        <div>
          <p class="text-xs font-bold font-mono text-slate-800 dark:text-slate-100">${mitraText(p.sn)}</p>
          <p class="text-[10px] text-slate-500">${mitraText(p.merk||'—')} • ${mitraText(p.jenis||'—')} • ${mitraText(p.kondisi||'—')}</p>
        </div>
        <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${p.status==='Gudang'?'bg-slate-100 text-slate-600':'bg-blue-100 text-blue-700'}">${mitraText(p.status||'—')}</span>
      </div>`).join('');
  } catch(err) {
    el.innerHTML = `<p class="text-xs text-rose-500 text-center py-4">Gagal: ${mitraText(err.message)}</p>`;
  }
}

// ── APPROVAL PERANGKAT MITRA (Koordinator approve request teknisi mitra) ──
async function loadApprovalPerangkatMitra() {
  const el = document.getElementById('mitra-approval-perangkat-list');
  if(!el || !currentUser || !currentUser.mitraId) return;
  el.innerHTML = '<p class="text-xs text-slate-400 text-center py-4"><i class="fa-solid fa-spinner animate-spin mr-1"></i>Memuat...</p>';
  try {
    // Ambil semua akun teknisi mitra yang sama
    const { data: akunMitra, error: akunErr } = await supa.from('akun')
      .select('display_name').eq('mitra_id', currentUser.mitraId).in('role',['teknisi_mitra']);
    if(akunErr) throw akunErr;
    const names = (akunMitra||[]).map(a => a.display_name);
    if(!names.length) {
      el.innerHTML = '<p class="text-xs text-slate-400 text-center py-4">Tidak ada teknisi mitra yang terdaftar.</p>';
      return;
    }
    const { data, error } = await supa.from('pickup_requests')
      .select('*').in('teknisi_name', names).eq('status','WAITING')
      .order('created_at',{ascending:false});
    if(error) throw error;
    if(!data || !data.length) {
      el.innerHTML = '<p class="text-xs text-slate-400 text-center py-4">Tidak ada request pickup yang menunggu.</p>';
      return;
    }
    el.innerHTML = data.map(r => `
      <div class="p-3 bg-slate-50 dark:bg-slate-700/40 rounded-2xl border border-slate-200 dark:border-slate-600 space-y-2">
        <div class="flex items-center justify-between gap-2">
          <div>
            <p class="text-xs font-bold text-slate-800 dark:text-slate-100">Pickup SN: ${mitraText(r.sn)}</p>
            <p class="text-[10px] text-slate-500">${mitraText(r.teknisi_name)} • ${new Date(r.created_at).toLocaleString('id-ID',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</p>
          </div>
          <span class="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-100 text-amber-700">Menunggu</span>
        </div>
        <div class="flex gap-2">
          <button onclick="approvePickupMitra('${r.id}','${mitraText(r.sn)}','${mitraText(r.jenis||'')}','${mitraText(r.teknisi_name)}',true)" class="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1"><i class="fa-solid fa-check"></i>Setujui</button>
          <button onclick="approvePickupMitra('${r.id}','${mitraText(r.sn)}','${mitraText(r.jenis||'')}','${mitraText(r.teknisi_name)}',false)" class="flex-1 py-2 bg-rose-100 hover:bg-rose-200 text-rose-600 text-xs font-bold rounded-lg flex items-center justify-center gap-1"><i class="fa-solid fa-xmark"></i>Tolak</button>
        </div>
      </div>`).join('');
  } catch(err) {
    el.innerHTML = `<p class="text-xs text-rose-500 text-center py-4">Gagal: ${mitraText(err.message)}</p>`;
  }
}

async function approvePickupMitra(requestId, sn, jenis, teknisiName, approve) {
  // Cek apakah SN ada di stok koordinator (perangkat_teknisi milik koordinator)
  const koordinatorName = currentUser ? currentUser.displayName : '';
  try {
    if(approve) {
      const { data: stok, error: stokErr } = await supa.from('perangkat_teknisi')
        .select('id,kondisi').eq('sn', sn).eq('teknisi_name', koordinatorName).eq('status','READY').maybeSingle();
      if(stokErr) throw stokErr;
      if(!stok) {
        showAlert(`SN "${sn}" tidak tersedia di stok Koordinator.\nTeknisi tidak dapat pickup perangkat yang belum ada di gudang koordinator.`, 'SN Tidak Tersedia');
        return;
      }
      // Pindah dari koordinator ke teknisi
      await supa.from('perangkat_teknisi').update({ teknisi_name: teknisiName }).eq('id', stok.id);
      await supa.from('pickup_requests').update({ status:'APPROVED' }).eq('id', requestId);
      showAlert(`SN "${sn}" berhasil dipindahkan ke ${teknisiName}.`, 'Disetujui ✅');
    } else {
      await supa.from('pickup_requests').update({ status:'REJECTED' }).eq('id', requestId);
      showAlert(`Request SN "${sn}" dari ${teknisiName} ditolak.`, 'Ditolak');
    }
    await loadApprovalPerangkatMitra();
  } catch(err) {
    showAlert('Gagal proses approval: '+(err.message||''),'Error');
  }
}

// ── SCAN SN UNTUK TEKNISI MITRA ───────────────────────────────
// Teknisi mitra submit pickup request — validasi SN harus ada di koordinator
async function checkSnMitra(sn) {
  if(!sn || !currentUser) return;
  const mitraId = currentUser.mitraId;
  if(!mitraId) { showAlert('Akun Anda tidak terhubung dengan mitra manapun.','Error'); return; }
  try {
    // Cek SN ada di perangkat dengan ownership mitra ini
    const { data: perangkat, error } = await supa.from('perangkat')
      .select('sn, merk, jenis, kondisi, status').eq('sn', sn.toUpperCase()).eq('ownership','mitra').eq('mitra_id', mitraId).maybeSingle();
    if(error) throw error;
    if(!perangkat) {
      return { available: false, reason: `SN "${sn}" tidak tersedia. Admin perlu mengalihkan perangkat ini ke mitra Anda terlebih dahulu.` };
    }
    // Cek apakah SN ada di perangkat_teknisi koordinator
    const { data: akunKoor } = await supa.from('akun').select('display_name').eq('mitra_id', mitraId).eq('role','koordinator').limit(1).maybeSingle();
    if(!akunKoor) return { available: false, reason: 'Koordinator mitra belum terdaftar.' };
    const { data: stokKoor } = await supa.from('perangkat_teknisi')
      .select('id').eq('sn', sn.toUpperCase()).eq('teknisi_name', akunKoor.display_name).eq('status','READY').maybeSingle();
    if(!stokKoor) {
      return { available: false, reason: `SN "${sn}" belum ada di stok Koordinator. Hubungi koordinator mitra Anda.` };
    }
    return { available: true, data: perangkat };
  } catch(err) {
    return { available: false, reason: 'Gagal cek SN: '+err.message };
  }
}

// ── AREA ODC MITRA (Admin) ────────────────────────────────────

var _areaMitraODCList    = [];  // semua ODC unik dari tabel odp
var _areaMitraAkses      = [];  // ODC yang sudah diizinkan untuk mitra terpilih
var _areaMitraSelectedId = '';  // mitra_id yang sedang diedit

async function loadAreaMitraInit() {
  // Load dropdown mitra
  const sel = document.getElementById('area-mitra-select');
  if(!sel) return;
  try {
    const { data, error } = await supa.from('mitra').select('id, nama').eq('aktif', true).order('nama');
    if(error) throw error;
    sel.innerHTML = '<option value="">-- Pilih Mitra --</option>' +
      (data||[]).map(m => `<option value="${m.id}">${mitraText(m.nama)}</option>`).join('');
  } catch(err) {
    sel.innerHTML = '<option value="">Gagal memuat mitra</option>';
  }
}

async function loadAreaMitraODC() {
  const sel = document.getElementById('area-mitra-select');
  const listEl = document.getElementById('area-mitra-odc-list');
  const saveWrap = document.getElementById('area-mitra-save-wrap');
  if(!sel || !listEl) return;

  _areaMitraSelectedId = sel.value;
  if(!_areaMitraSelectedId) {
    listEl.innerHTML = '<p class="text-xs text-slate-400 text-center py-4">Pilih mitra untuk melihat daftar ODC.</p>';
    if(saveWrap) saveWrap.classList.add('hidden');
    return;
  }

  listEl.innerHTML = '<p class="text-xs text-slate-400 text-center py-4"><i class="fa-solid fa-spinner animate-spin mr-1"></i>Memuat daftar ODC...</p>';

  try {
    // Ambil semua ODC unik dari tabel odp
    const { data: odpData, error: odpErr } = await supa.from('odp')
      .select('odc, odp_id')
      .not('odc', 'is', null)
      .order('odc');
    if(odpErr) throw odpErr;

    // Group ODP per ODC
    const odcMap = {};
    (odpData||[]).forEach(row => {
      const odc = String(row.odc||'').trim();
      if(!odc) return;
      if(!odcMap[odc]) odcMap[odc] = [];
      odcMap[odc].push(row.odp_id);
    });
    _areaMitraODCList = Object.keys(odcMap).sort();

    // Ambil akses ODC yang sudah ada untuk mitra ini
    const { data: aksesData, error: aksesErr } = await supa.from('mitra_odc_access')
      .select('odc').eq('mitra_id', _areaMitraSelectedId);
    if(aksesErr) throw aksesErr;
    _areaMitraAkses = (aksesData||[]).map(r => r.odc);

    if(!_areaMitraODCList.length) {
      listEl.innerHTML = '<p class="text-xs text-slate-400 text-center py-4">Belum ada data ODC di tabel ODP. Tambahkan kolom ODC pada asset ODP terlebih dahulu.</p>';
      return;
    }

    listEl.innerHTML = `
      <div class="space-y-2">
        <div class="flex items-center justify-between mb-3">
          <p class="text-xs text-slate-500 font-semibold">${_areaMitraODCList.length} ODC ditemukan</p>
          <div class="flex gap-2">
            <button onclick="toggleAllODC(true)" class="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg text-[10px] font-bold">Pilih Semua</button>
            <button onclick="toggleAllODC(false)" class="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-600 rounded-lg text-[10px] font-bold">Hapus Semua</button>
          </div>
        </div>
        ${_areaMitraODCList.map(odc => {
          const checked = _areaMitraAkses.includes(odc);
          const odcCount = odcMap[odc] ? odcMap[odc].length : 0;
          return `
            <label class="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${checked ? 'border-orange-300 bg-orange-50 dark:border-orange-700 dark:bg-orange-900/20' : 'border-slate-200 dark:border-slate-600 bg-slate-50/60 dark:bg-slate-700/30 hover:border-orange-200'}">
              <input type="checkbox" class="odc-checkbox w-4 h-4 rounded accent-orange-500" value="${mitraText(odc)}" ${checked ? 'checked' : ''} onchange="onODCCheckboxChange(this)">
              <div class="flex-1 min-w-0">
                <p class="text-xs font-extrabold text-slate-800 dark:text-slate-100">${mitraText(odc)}</p>
                <p class="text-[10px] text-slate-400">${odcCount} ODP dalam ODC ini</p>
              </div>
              ${checked ? '<span class="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-700 shrink-0"><i class="fa-solid fa-check mr-0.5"></i>Diizinkan</span>' : '<span class="px-2 py-0.5 rounded-full text-[9px] font-black bg-slate-200 text-slate-500 shrink-0">Tidak diizinkan</span>'}
            </label>`;
        }).join('')}
      </div>`;

    if(saveWrap) saveWrap.classList.remove('hidden');
  } catch(err) {
    listEl.innerHTML = `<p class="text-xs text-rose-500 text-center py-4">Gagal memuat: ${mitraText(err.message)}</p>`;
  }
}

function onODCCheckboxChange(checkbox) {
  // Update visual badge saat checkbox berubah
  const label = checkbox.closest('label');
  if(!label) return;
  const badge = label.querySelector('span:last-child');
  if(checkbox.checked) {
    label.classList.add('border-orange-300','bg-orange-50','dark:border-orange-700','dark:bg-orange-900/20');
    label.classList.remove('border-slate-200','dark:border-slate-600','bg-slate-50/60','dark:bg-slate-700/30');
    if(badge) { badge.className = 'px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-700 shrink-0'; badge.innerHTML = '<i class="fa-solid fa-check mr-0.5"></i>Diizinkan'; }
  } else {
    label.classList.remove('border-orange-300','bg-orange-50','dark:border-orange-700','dark:bg-orange-900/20');
    label.classList.add('border-slate-200','dark:border-slate-600','bg-slate-50/60','dark:bg-slate-700/30');
    if(badge) { badge.className = 'px-2 py-0.5 rounded-full text-[9px] font-black bg-slate-200 text-slate-500 shrink-0'; badge.innerHTML = 'Tidak diizinkan'; }
  }
}

function toggleAllODC(checked) {
  document.querySelectorAll('.odc-checkbox').forEach(cb => {
    cb.checked = checked;
    onODCCheckboxChange(cb);
  });
}

async function simpanAreaMitra() {
  if(!_areaMitraSelectedId) { showAlert('Pilih mitra terlebih dahulu.','Validasi'); return; }

  const selectedODCs = Array.from(document.querySelectorAll('.odc-checkbox:checked')).map(cb => cb.value);
  const btn = document.querySelector('[onclick="simpanAreaMitra()"]');
  const orig = btn ? btn.innerHTML : '';
  if(btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner animate-spin"></i> Menyimpan...'; }

  try {
    // Hapus semua akses lama untuk mitra ini
    const { error: delErr } = await supa.from('mitra_odc_access').delete().eq('mitra_id', _areaMitraSelectedId);
    if(delErr) throw delErr;

    // Insert akses baru
    if(selectedODCs.length > 0) {
      const rows = selectedODCs.map(odc => ({ mitra_id: _areaMitraSelectedId, odc }));
      const { error: insErr } = await supa.from('mitra_odc_access').insert(rows);
      if(insErr) throw insErr;
    }

    // Update cache lokal
    _areaMitraAkses = selectedODCs;
    showAlert(`Akses area ODC berhasil disimpan.\n${selectedODCs.length} ODC diizinkan untuk mitra ini.`, 'Tersimpan ✅');
  } catch(err) {
    showAlert('Gagal menyimpan: '+(err.message||''), 'Error');
  }
  if(btn) { btn.disabled = false; btn.innerHTML = orig; }
}

// ── GET ODC YANG DIIZINKAN UNTUK MITRA (dipakai filter form WO) ───────
var _mitraODCCache = {};

async function getMitraODCAccess(mitraId) {
  if(!mitraId) return null; // null = tidak ada batasan (internal)
  if(_mitraODCCache[mitraId]) return _mitraODCCache[mitraId];
  try {
    const { data, error } = await supa.from('mitra_odc_access')
      .select('odc').eq('mitra_id', mitraId);
    if(error) throw error;
    const odcs = (data||[]).map(r => r.odc);
    _mitraODCCache[mitraId] = odcs;
    return odcs;
  } catch(err) {
    console.warn('[MitraODC] Gagal load akses:', err.message);
    return [];
  }
}

// ── CARI PELANGGAN UNTUK FORM PEMBAYARAN ─────────────────────
async function cariPelangganUntukBayar(query) {
  const dropdown = document.getElementById('pay-cari-dropdown');
  const selectedEl = document.getElementById('pay-pelanggan-selected');
  const namaEl = document.getElementById('pay-selected-nama');
  const infoEl = document.getElementById('pay-selected-info');
  if(!dropdown) return;

  if(!query || query.length < 2) {
    dropdown.classList.add('hidden');
    return;
  }

  try {
    const { data, error } = await supa.from('pelanggan')
      .select('id, nama, no_layanan, no_hp, status_billing, tanggal_jatuh_tempo')
      .or(`nama.ilike.%${query}%,no_layanan.ilike.%${query}%`)
      .in('status_billing', ['AKTIF','SUSPEND'])
      .limit(8);
    if(error) throw error;

    if(!data || !data.length) {
      dropdown.innerHTML = '<p class="text-xs text-slate-400 text-center py-3">Tidak ditemukan.</p>';
      dropdown.classList.remove('hidden');
      return;
    }

    dropdown.innerHTML = data.map(p => {
      const statusBadge = p.status_billing === 'SUSPEND'
        ? '<span class="text-[9px] font-black text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded-full">Suspend</span>'
        : '<span class="text-[9px] font-black text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full">Aktif</span>';
      return `<button type="button" onclick="pilihPelangganBayar('${p.id}','${mitraText(p.nama)}','${mitraText(p.no_layanan||'-')}','${mitraText(p.status_billing)}')"
        class="w-full text-left px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all border-b border-slate-100 dark:border-slate-700 last:border-0">
        <div class="flex items-center justify-between gap-2">
          <div>
            <p class="text-xs font-bold text-slate-800 dark:text-slate-100">${mitraText(p.nama)}</p>
            <p class="text-[10px] text-slate-400">No. Layanan: ${mitraText(p.no_layanan||'-')} • ${mitraText(p.no_hp||'-')}</p>
          </div>
          ${statusBadge}
        </div>
      </button>`;
    }).join('');
    dropdown.classList.remove('hidden');
  } catch(err) {
    dropdown.innerHTML = `<p class="text-xs text-rose-500 text-center py-2">Gagal: ${mitraText(err.message)}</p>`;
    dropdown.classList.remove('hidden');
  }
}

function pilihPelangganBayar(id, nama, noLayanan, status) {
  const idEl     = document.getElementById('pay-pelanggan-id');
  const dropdown = document.getElementById('pay-cari-dropdown');
  const cariEl   = document.getElementById('pay-cari-pelanggan');
  const selEl    = document.getElementById('pay-pelanggan-selected');
  const namaEl   = document.getElementById('pay-selected-nama');
  const infoEl   = document.getElementById('pay-selected-info');

  if(idEl) idEl.value = id;
  if(dropdown) dropdown.classList.add('hidden');
  if(cariEl) cariEl.value = nama;
  if(namaEl) namaEl.textContent = nama;
  if(infoEl) infoEl.textContent = `No. Layanan: ${noLayanan} • Status: ${status}`;
  if(selEl) selEl.classList.remove('hidden');
}
