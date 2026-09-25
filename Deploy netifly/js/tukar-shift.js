// ===================== TUKAR SHIFT =====================
var _shiftSwapAccounts = [];
var _shiftSwapPreviewToken = 0;

function shiftSwapRoleLabel(role) {
  var normalized = String(role || '').toLowerCase();
  return normalized === 'cs' ? 'CS' : normalized === 'teknisi' ? 'Teknisi' : '';
}

function shiftSwapToday() {
  if(typeof jadwalTodayValue === 'function') return jadwalTodayValue();
  var now = new Date();
  return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
}

function shiftSwapText(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, function(char) {
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char];
  });
}

function shiftSwapLabel(code) {
  return code === 'NonShift' ? 'Non Shift' : String(code || '').replace('Shift', 'Shift ');
}

function shiftSwapSetStatus(message, type) {
  var el = document.getElementById('shift-swap-status');
  if(!el) return;
  var icon = type === 'error' ? 'fa-circle-exclamation' : type === 'success' ? 'fa-check-circle' : 'fa-info-circle';
  el.innerHTML = '<i class="fa-solid ' + icon + '"></i><span>' + shiftSwapText(message) + '</span>';
  if(type === 'error') {
    el.className = 'shift-swap-status rounded-xl px-3 py-2 text-xs font-semibold bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30';
  } else if(type === 'success') {
    el.className = 'shift-swap-status rounded-xl px-3 py-2 text-xs font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30';
  } else {
    el.className = 'shift-swap-status rounded-xl px-3 py-2 text-xs font-semibold bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30';
  }
  el.classList.remove('hidden');
}

function shiftSwapSetButtonState(enabled) {
  var button = document.getElementById('btn-submit-shift-swap');
  if(!button) return;
  button.disabled = !enabled;
  button.classList.toggle('opacity-50', !enabled);
  button.classList.toggle('cursor-not-allowed', !enabled);
}

function shiftSwapAddDays(dateValue, days) {
  var date = new Date(String(dateValue) + 'T00:00:00');
  date.setDate(date.getDate() + days);
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}

function shiftSwapWeekendDates(dateValue) {
  var date = new Date(String(dateValue) + 'T00:00:00');
  var day = date.getDay();
  if(day !== 6 && day !== 0) return null;
  var saturday = day === 6 ? String(dateValue) : shiftSwapAddDays(dateValue, -1);
  return {startDate:saturday, endDate:shiftSwapAddDays(saturday, 1)};
}

async function getShiftSwapSchedule(username, date) {
  var result = await supa.from('attendance_schedule_rows')
    .select('*, attendance_schedule_periods!inner(status)')
    .eq('attendance_schedule_periods.status', 'PUBLISHED')
    .ilike('username', username)
    .eq('schedule_date', date)
    .eq('status_jadwal', 'TERJADWAL')
    .order('created_at', {ascending:false})
    .limit(1);
  if(result.error) throw result.error;
  return Array.isArray(result.data) && result.data.length ? result.data[0] : null;
}

async function getShiftSwapContext(username, dateValue) {
  var weekend = shiftSwapWeekendDates(dateValue);
  if(!weekend) {
    return {scope:'SINGLE_DAY',startDate:dateValue,endDate:dateValue,selectedDate:dateValue,row:await getShiftSwapSchedule(username, dateValue)};
  }
  var rows = await Promise.all([getShiftSwapSchedule(username, weekend.startDate), getShiftSwapSchedule(username, weekend.endDate)]);
  return {scope:'WEEKEND_PAIR',startDate:weekend.startDate,endDate:weekend.endDate,selectedDate:dateValue,saturday:rows[0],sunday:rows[1]};
}

function shiftSwapContextHasSchedule(context) {
  if(!context) return false;
  if(context.scope === 'SINGLE_DAY') return !!context.row;
  // WEEKEND_PAIR: cukup salah satu hari ada jadwal (satu hari bisa OFF)
  return !!(context.saturday || context.sunday);
}

function shiftSwapContextsCompatible(mine, target) {
  if(!mine || !target || !shiftSwapContextHasSchedule(mine) || !shiftSwapContextHasSchedule(target)) return false;
  if(mine.scope === 'WEEKEND_PAIR' && target.scope === 'WEEKEND_PAIR') {
    // Pola berlawanan: tepat satu pihak kerja Sabtu, tepat satu pihak kerja Minggu
    var mineSatWorking = !!mine.saturday;
    var mineSunWorking = !!mine.sunday;
    var targetSatWorking = !!target.saturday;
    var targetSunWorking = !!target.sunday;
    // Sabtu: satu kerja satu libur; Minggu: satu kerja satu libur
    var satOpposite = mineSatWorking !== targetSatWorking;
    var sunOpposite = mineSunWorking !== targetSunWorking;
    return satOpposite && sunOpposite;
  }
  if(mine.scope === 'SINGLE_DAY' && target.scope === 'SINGLE_DAY') return !!mine.row && !!target.row && mine.row.shift_code !== target.row.shift_code;
  return false;
}

function shiftSwapSnapshot(context) {
  function snapshot(row, dateValue) {
    return {
      date: dateValue,
      schedule_id: row ? row.id : null,
      shift_code: row ? row.shift_code : null,
      jam_masuk: row ? row.jam_masuk : null,
      jam_pulang: row ? row.jam_pulang : null,
      status: row ? 'TERJADWAL' : 'OFF'
    };
  }
  if(context.scope === 'WEEKEND_PAIR') {
    return {
      saturday: snapshot(context.saturday, context.startDate),
      sunday: snapshot(context.sunday, context.endDate)
    };
  }
  return {date: snapshot(context.row, context.startDate)};
}

function shiftSwapSelectedRow(context) {
  if(!context) return null;
  if(context.scope === 'SINGLE_DAY') return context.row;
  return context.selectedDate === context.startDate ? context.saturday : context.sunday;
}

function shiftSwapSetScope(context) {
  var el = document.getElementById('shift-swap-scope');
  if(!el) return;
  if(context && context.scope === 'WEEKEND_PAIR') {
    el.innerHTML = '<i class="fa-solid fa-arrows-rotate mr-1"></i><strong>Tukar pola akhir pekan:</strong> Sabtu ' + shiftSwapText(context.startDate) + ' dan Minggu ' + shiftSwapText(context.endDate) + ' diproses sebagai satu paket.';
    el.classList.remove('hidden');
  } else {
    el.classList.add('hidden');
    el.textContent = '';
  }
}

function shiftSwapSetContextPreview(prefix, context) {
  var scheduleEl = document.getElementById('shift-swap-' + prefix + '-schedule');
  var timeEl = document.getElementById('shift-swap-' + prefix + '-time');
  if(!scheduleEl || !timeEl) return;
  if(!context || !shiftSwapContextHasSchedule(context)) {
    scheduleEl.textContent = context && context.scope === 'WEEKEND_PAIR' ? 'Pola weekend tidak tersedia' : 'Hari libur / OFF';
    timeEl.textContent = '--';
    return;
  }
  if(context.scope === 'SINGLE_DAY') {
    scheduleEl.textContent = shiftSwapLabel(context.row.shift_code);
    timeEl.textContent = String(context.row.jam_masuk).slice(0,5) + '–' + String(context.row.jam_pulang).slice(0,5) + ' WIB';
    return;
  }
  function dayText(label, row) {
    return '<span class="block"><b>' + label + ':</b> ' + (row ? shiftSwapText(shiftSwapLabel(row.shift_code)) + ' (' + shiftSwapText(String(row.jam_masuk).slice(0,5) + '–' + String(row.jam_pulang).slice(0,5)) + ')' : '<span class="text-rose-500">LIBUR</span>') + '</span>';
  }
  scheduleEl.textContent = 'Pola Akhir Pekan';
  timeEl.innerHTML = dayText('Sabtu', context.saturday) + dayText('Minggu', context.sunday);
}

async function loadShiftSwapAccounts() {
  var select = document.getElementById('shift-swap-target');
  if(!select || !currentUser) return;
  var role = shiftSwapRoleLabel(currentUser.role);
  if(!role) {
    select.innerHTML = '<option value="">Fitur ini hanya untuk Teknisi atau CS</option>';
    select.disabled = true;
    return;
  }
  var result = await supa.from('akun').select('username,display_name,role').ilike('role', role.toLowerCase()).order('display_name');
  if(result.error) throw result.error;
  _shiftSwapAccounts = (result.data || []).filter(function(account) {
    return String(account.username || '').toLowerCase() !== String(currentUser.username || '').toLowerCase();
  });
  if(!_shiftSwapAccounts.length) {
    select.innerHTML = '<option value="">Rekan satu role belum tersedia</option>';
    select.disabled = true;
    return;
  }
  select.disabled = false;
  select.innerHTML = '<option value="">-- Pilih rekan --</option>' + _shiftSwapAccounts.map(function(account) {
    return '<option value="' + shiftSwapText(account.username) + '">' + shiftSwapText(account.display_name || account.username) + '</option>';
  }).join('');
}

async function loadShiftSwapTargetPreview() {
  var dateEl = document.getElementById('shift-swap-date');
  var targetEl = document.getElementById('shift-swap-target');
  if(!dateEl || !targetEl || !targetEl.value) {
    shiftSwapSetContextPreview('target', null);
    return null;
  }
  try {
    var context = await getShiftSwapContext(targetEl.value, dateEl.value);
    shiftSwapSetContextPreview('target', context);
    return context;
  } catch(error) {
    shiftSwapSetContextPreview('target', null);
    console.warn('[ShiftSwap] Jadwal rekan gagal dibaca:', error.message);
    return null;
  }
}

async function loadShiftSwapPreview() {
  var dateEl = document.getElementById('shift-swap-date');
  if(!dateEl || !currentUser) return;
  var date = dateEl.value;
  var token = ++_shiftSwapPreviewToken;
  shiftSwapSetButtonState(false);
  if(!date) {
    shiftSwapSetScope(null);
    shiftSwapSetContextPreview('my', null);
    shiftSwapSetContextPreview('target', null);
    return;
  }
  if(date < shiftSwapToday()) {
    shiftSwapSetScope(null);
    shiftSwapSetContextPreview('my', null);
    shiftSwapSetContextPreview('target', null);
    shiftSwapSetStatus('Tanggal tukar shift harus hari ini atau setelahnya.', 'error');
    return;
  }
  shiftSwapSetStatus('Membaca pola jadwal pada tanggal yang dipilih...', 'info');
  try {
    var myContext = await getShiftSwapContext(currentUser.username, date);
    if(token !== _shiftSwapPreviewToken) return;
    shiftSwapSetScope(myContext);
    shiftSwapSetContextPreview('my', myContext);
    var targetContext = await loadShiftSwapTargetPreview();
    if(token !== _shiftSwapPreviewToken) return;
    if(myContext && targetContext && shiftSwapContextsCompatible(myContext, targetContext)) {
      shiftSwapSetButtonState(true);
      shiftSwapSetStatus(myContext.scope === 'WEEKEND_PAIR' ? 'Pola Sabtu–Minggu berlawanan, cocok untuk ditukar sebagai satu paket.' : 'Jadwal asal berhasil ditemukan. Anda dapat mengajukan pertukaran.', 'success');
    } else if(myContext && targetContext) {
      shiftSwapSetStatus(myContext.scope === 'WEEKEND_PAIR' ? 'Pola weekend Anda dan rekan tidak berlawanan (misal: keduanya bekerja Sabtu, atau keduanya libur Minggu).' : 'Shift Anda dan rekan sama, tidak perlu ditukar.', 'error');
    } else {
      shiftSwapSetStatus(myContext && myContext.scope === 'WEEKEND_PAIR' ? 'Salah satu pihak tidak memiliki pola kerja weekend yang lengkap.' : 'Hari libur/OFF atau jadwal belum tersedia. Tukar shift tidak dapat diajukan.', 'error');
    }
  } catch(error) {
    if(token !== _shiftSwapPreviewToken) return;
    shiftSwapSetScope(null);
    shiftSwapSetContextPreview('my', null);
    shiftSwapSetContextPreview('target', null);
    shiftSwapSetStatus('Gagal membaca jadwal: ' + error.message, 'error');
  }
}

function shiftSwapStatusLabel(status) {
  return {WAITING:'Menunggu Persetujuan',PARTNER_ACCEPTED:'Menunggu Admin',APPROVED:'Disetujui',REJECTED:'Ditolak',CANCELLED:'Dibatalkan'}[status] || status || '--';
}

function shiftSwapStatusClass(status) {
  return status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : status === 'REJECTED' ? 'bg-rose-100 text-rose-700' : status === 'CANCELLED' ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-700';
}

async function loadShiftSwapHistory() {
  var el = document.getElementById('shift-swap-history');
  if(!el || !currentUser) return;
  el.innerHTML = '<p class="text-xs text-slate-400 text-center py-4"><i class="fa-solid fa-spinner animate-spin mr-1"></i>Memuat riwayat...</p>';
  try {
    var requesterResult = await supa.from('attendance_shift_swap_requests').select('*').eq('requester_username', currentUser.username).order('created_at', {ascending:false}).limit(20);
    var targetResult = await supa.from('attendance_shift_swap_requests').select('*').eq('target_username', currentUser.username).order('created_at', {ascending:false}).limit(20);
    if(requesterResult.error) throw requesterResult.error;
    if(targetResult.error) throw targetResult.error;
    var byId = {};
    (requesterResult.data || []).concat(targetResult.data || []).forEach(function(row) { byId[row.id] = row; });
    var rows = Object.keys(byId).map(function(id) { return byId[id]; }).sort(function(a,b) { return String(b.created_at || '').localeCompare(String(a.created_at || '')); });
    if(!rows.length) { el.innerHTML = '<p class="text-xs text-slate-400 text-center py-4">Belum ada pengajuan tukar shift.</p>'; return; }
    el.innerHTML = rows.map(function(row) {
      var isRequester = String(row.requester_username).toLowerCase() === String(currentUser.username).toLowerCase();
      var otherName = isRequester ? row.target_name : row.requester_name;
      var direction = isRequester ? 'Anda mengajukan ke ' : 'Permintaan dari ';
      var dateText = row.swap_scope === 'WEEKEND_PAIR' ? row.schedule_date + '–' + row.swap_end_date + ' (akhir pekan)' : row.schedule_date;
      var shiftText = row.swap_scope === 'WEEKEND_PAIR' ? 'Pola Sabtu–Minggu' : shiftSwapLabel(row.requester_shift_code) + ' ↔ ' + shiftSwapLabel(row.target_shift_code);
      return '<div class="rounded-xl border border-slate-100 dark:border-slate-700 p-3 bg-slate-50/60 dark:bg-slate-700/30">' +
        '<div class="flex flex-wrap items-center justify-between gap-2"><p class="text-xs font-extrabold text-slate-800 dark:text-slate-100">' + shiftSwapText(direction + otherName) + '</p><span class="rounded-lg px-2 py-1 text-[9px] font-black ' + shiftSwapStatusClass(row.status) + '">' + shiftSwapText(shiftSwapStatusLabel(row.status)) + '</span></div>' +
        '<p class="mt-1 text-[10px] text-slate-500">Tanggal: ' + shiftSwapText(dateText) + ' • ' + shiftSwapText(shiftText) + '</p>' +
        '<p class="mt-1 text-[10px] text-slate-400">Alasan: ' + shiftSwapText(row.reason) + '</p></div>';
    }).join('');
  } catch(error) {
    el.innerHTML = '<p class="text-xs text-rose-500 text-center py-4">Gagal memuat riwayat: ' + shiftSwapText(error.message) + '</p>';
  }
}

async function submitShiftSwap(event) {
  event.preventDefault();
  var dateEl = document.getElementById('shift-swap-date');
  var targetEl = document.getElementById('shift-swap-target');
  var reasonEl = document.getElementById('shift-swap-reason');
  var button = document.getElementById('btn-submit-shift-swap');
  if(!dateEl || !targetEl || !reasonEl || !currentUser) return;
  var role = shiftSwapRoleLabel(currentUser.role);
  var date = dateEl.value;
  var targetUsername = targetEl.value;
  var reason = reasonEl.value.trim();
  if(!role) { shiftSwapSetStatus('Fitur tukar shift hanya tersedia untuk Teknisi dan CS.', 'error'); return; }
  if(!date || date < shiftSwapToday()) { shiftSwapSetStatus('Pilih tanggal hari ini atau tanggal setelahnya.', 'error'); return; }
  if(!targetUsername) { shiftSwapSetStatus('Pilih rekan penukar terlebih dahulu.', 'error'); return; }
  if(reason.length < 5) { shiftSwapSetStatus('Alasan tukar shift minimal 5 karakter.', 'error'); return; }
  if(button) { button.disabled = true; button.innerHTML = '<i class="fa-solid fa-spinner animate-spin"></i>Mengecek pola jadwal...'; }
  try {
    var myContext = await getShiftSwapContext(currentUser.username, date);
    var targetContext = await getShiftSwapContext(targetUsername, date);
    if(!shiftSwapContextsCompatible(myContext, targetContext)) throw new Error(myContext && myContext.scope === 'WEEKEND_PAIR' ? 'Pola Sabtu-Minggu Anda dan rekan harus berlawanan: satu bekerja saat yang lain libur.' : 'Kedua pihak harus memiliki jadwal berbeda pada tanggal tersebut.');
    var requestDate = myContext.startDate;
    var myPrimary = shiftSwapSelectedRow(myContext);
    var targetPrimary = shiftSwapSelectedRow(targetContext);
    
    // Cek duplicate request aktif — APPROVED adalah status final, tidak dihitung aktif
    var duplicateMineResult = await supa.from('attendance_shift_swap_requests')
      .select('id,status,swap_scope,schedule_date,swap_end_date')
      .eq('requester_username', currentUser.username)
      .in('status', ['WAITING','PARTNER_ACCEPTED']);
    if(duplicateMineResult.error) throw duplicateMineResult.error;
    
    var hasDuplicate = duplicateMineResult.data && duplicateMineResult.data.some(function(req) {
      if(myContext.scope === 'WEEKEND_PAIR' && req.swap_scope === 'WEEKEND_PAIR') {
        return (req.schedule_date === myContext.startDate || req.schedule_date === myContext.endDate);
      } else if(myContext.scope === 'SINGLE_DAY' && req.swap_scope === 'SINGLE_DAY') {
        return req.schedule_date === requestDate;
      }
      return false;
    });
    if(hasDuplicate) throw new Error('Anda sudah memiliki pengajuan aktif pada periode tersebut.');
    
    var duplicateTargetResult = await supa.from('attendance_shift_swap_requests')
      .select('id,status,swap_scope,schedule_date,swap_end_date')
      .eq('target_username', targetUsername)
      .in('status', ['WAITING','PARTNER_ACCEPTED']);
    if(duplicateTargetResult.error) throw duplicateTargetResult.error;
    
    var targetHasDuplicate = duplicateTargetResult.data && duplicateTargetResult.data.some(function(req) {
      if(myContext.scope === 'WEEKEND_PAIR' && req.swap_scope === 'WEEKEND_PAIR') {
        return (req.schedule_date === myContext.startDate || req.schedule_date === myContext.endDate);
      } else if(myContext.scope === 'SINGLE_DAY' && req.swap_scope === 'SINGLE_DAY') {
        return req.schedule_date === requestDate;
      }
      return false;
    });
    if(targetHasDuplicate) throw new Error('Rekan tersebut sudah memiliki pengajuan aktif pada periode tersebut.');
    if(button) button.innerHTML = '<i class="fa-solid fa-spinner animate-spin"></i>Menyimpan...';
    var targetAccount = _shiftSwapAccounts.find(function(account) { return String(account.username).toLowerCase() === String(targetUsername).toLowerCase(); });
    var result = await supa.from('attendance_shift_swap_requests').insert({
      schedule_date: requestDate,
      swap_scope: myContext.scope,
      swap_end_date: myContext.endDate,
      requester_username: currentUser.username,
      requester_name: currentUser.displayName || currentUser.username,
      requester_role: role,
      requester_schedule_id: myPrimary ? myPrimary.id : null,
      requester_shift_code: myPrimary ? myPrimary.shift_code : null,
      requester_start: myPrimary ? myPrimary.jam_masuk : null,
      requester_end: myPrimary ? myPrimary.jam_pulang : null,
      requester_weekend_snapshot: shiftSwapSnapshot(myContext),
      target_username: targetUsername,
      target_name: targetAccount ? (targetAccount.display_name || targetUsername) : targetUsername,
      target_role: role,
      target_schedule_id: targetPrimary ? targetPrimary.id : null,
      target_shift_code: targetPrimary ? targetPrimary.shift_code : null,
      target_start: targetPrimary ? targetPrimary.jam_masuk : null,
      target_end: targetPrimary ? targetPrimary.jam_pulang : null,
      target_weekend_snapshot: shiftSwapSnapshot(targetContext),
      reason: reason,
      status: 'WAITING',
      partner_status: 'WAITING'
    });
    if(result.error) throw result.error;
    reasonEl.value = '';
    shiftSwapSetStatus(myContext.scope === 'WEEKEND_PAIR' ? 'Pengajuan pola Sabtu–Minggu berhasil dikirim dan menunggu persetujuan.' : 'Pengajuan berhasil dikirim dan menunggu persetujuan.', 'success');
    await loadShiftSwapHistory();
  } catch(error) {
    shiftSwapSetStatus(error.message || 'Pengajuan gagal disimpan.', 'error');
  } finally {
    if(button) { button.disabled = false; button.innerHTML = '<i class="fa-solid fa-paper-plane"></i>Kirim Pengajuan'; }
  }
}

async function loadShiftSwapForm() {
  var dateEl = document.getElementById('shift-swap-date');
  if(!dateEl || !currentUser) return;
  var role = shiftSwapRoleLabel(currentUser.role);
  var today = shiftSwapToday();
  dateEl.min = today;
  if(!dateEl.value || dateEl.value < today) dateEl.value = today;
  shiftSwapSetButtonState(false);
  if(!role) shiftSwapSetStatus('Fitur tukar shift hanya tersedia untuk Teknisi dan CS.', 'error');
  try {
    await loadShiftSwapAccounts();
    await loadShiftSwapPreview();
    await loadShiftSwapHistory();
  } catch(error) {
    shiftSwapSetStatus('Gagal memuat form tukar shift: ' + error.message, 'error');
  }
}
