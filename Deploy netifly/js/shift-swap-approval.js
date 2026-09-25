// ===================== SHIFT SWAP APPROVAL (ADMIN) =====================
var _shiftSwapApprovalList = [];
var _shiftSwapApprovalProcessing = {};

function shiftSwapApprovalText(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, function(char) {
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char];
  });
}

function shiftSwapApprovalLabel(code) {
  return code === 'NonShift' ? 'Non Shift' : String(code || '').replace('Shift', 'Shift ');
}

function shiftSwapApprovalStatusBadge(status) {
  var label = {WAITING:'Menunggu',PARTNER_ACCEPTED:'Diterima Rekan',APPROVED:'Disetujui',REJECTED:'Ditolak',CANCELLED:'Dibatalkan'}[status] || status || '--';
  var className = status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 
                  status === 'REJECTED' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' : 
                  status === 'CANCELLED' ? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' : 
                  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
  return '<span class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ' + className + '">' + label + '</span>';
}

function shiftSwapApprovalFormatDate(dateStr) {
  var date = new Date(String(dateStr) + 'T00:00:00');
  var days = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
  return days[date.getDay()] + ', ' + String(date.getDate()).padStart(2,'0') + ' ' + ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][date.getMonth()] + ' ' + date.getFullYear();
}

function shiftSwapApprovalSetMessage(message, type) {
  var el = document.getElementById('shift-swap-approval-message');
  if(!el) return;
  var icon = type === 'error' ? 'fa-circle-exclamation' : type === 'success' ? 'fa-check-circle' : 'fa-info-circle';
  el.innerHTML = '<i class="fa-solid ' + icon + '"></i><span>' + shiftSwapApprovalText(message) + '</span>';
  if(type === 'error') {
    el.className = 'shift-swap-approval-message rounded-xl px-3 py-2 text-xs font-semibold bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 flex items-center gap-2';
  } else if(type === 'success') {
    el.className = 'shift-swap-approval-message rounded-xl px-3 py-2 text-xs font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 flex items-center gap-2';
  } else {
    el.className = 'shift-swap-approval-message rounded-xl px-3 py-2 text-xs font-semibold bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 flex items-center gap-2';
  }
  el.classList.remove('hidden');
}

function shiftSwapApprovalRenderScheduleSnapshot(snapshot) {
  if(!snapshot) return '<span class="text-slate-400">--</span>';
  if(snapshot.date) {
    // SINGLE_DAY
    if(snapshot.status === 'OFF') return '<span class="text-rose-500 font-semibold">LIBUR</span>';
    return '<span class="font-semibold">' + shiftSwapApprovalLabel(snapshot.shift_code) + '</span><span class="text-[10px] text-slate-500">(' + String(snapshot.jam_masuk || '').slice(0,5) + '–' + String(snapshot.jam_pulang || '').slice(0,5) + ')</span>';
  }
  // WEEKEND_PAIR
  var satHtml = snapshot.saturday && snapshot.saturday.status === 'OFF' ? '<span class="text-rose-500">LIBUR</span>' : '<span class="font-semibold">' + (snapshot.saturday ? shiftSwapApprovalLabel(snapshot.saturday.shift_code) : 'OFF') + '</span>';
  var sunHtml = snapshot.sunday && snapshot.sunday.status === 'OFF' ? '<span class="text-rose-500">LIBUR</span>' : '<span class="font-semibold">' + (snapshot.sunday ? shiftSwapApprovalLabel(snapshot.sunday.shift_code) : 'OFF') + '</span>';
  return '<div class="text-xs space-y-1"><div><b>Sabtu:</b> ' + satHtml + '</div><div><b>Minggu:</b> ' + sunHtml + '</div></div>';
}

async function loadShiftSwapApprovalList() {
  var el = document.getElementById('shift-swap-approval-list');
  if(!el) return;
  el.innerHTML = '<div class="text-xs text-slate-400 text-center py-6"><i class="fa-solid fa-spinner animate-spin mr-1"></i>Memuat daftar pengajuan...</div>';
  try {
    var result = await supa.from('attendance_shift_swap_requests')
      .select('*')
      .in('status', ['WAITING','PARTNER_ACCEPTED'])
      .order('created_at', {ascending:false});
    if(result.error) throw result.error;
    _shiftSwapApprovalList = result.data || [];
    if(!_shiftSwapApprovalList.length) {
      el.innerHTML = '<div class="text-xs text-slate-400 text-center py-6"><i class="fa-solid fa-inbox text-lg mb-2"></i><p>Tidak ada pengajuan yang menunggu approval.</p></div>';
      return;
    }
    el.innerHTML = _shiftSwapApprovalList.map(function(row, idx) {
      var scopeLabel = row.swap_scope === 'WEEKEND_PAIR' ? 'Pola Akhir Pekan (Sabtu–Minggu)' : 'Hari Tunggal';
      var dateRange = row.swap_scope === 'WEEKEND_PAIR' ? row.schedule_date + ' hingga ' + row.swap_end_date : row.schedule_date;
      var requesterSnap = row.requester_weekend_snapshot || {date: {shift_code: row.requester_shift_code, jam_masuk: row.requester_start, jam_pulang: row.requester_end, status: row.requester_shift_code ? 'TERJADWAL' : 'OFF'}};
      var targetSnap = row.target_weekend_snapshot || {date: {shift_code: row.target_shift_code, jam_masuk: row.target_start, jam_pulang: row.target_end, status: row.target_shift_code ? 'TERJADWAL' : 'OFF'}};
      return '<div class="shift-swap-approval-card border border-slate-200 dark:border-slate-700 rounded-2xl p-4 bg-white dark:bg-slate-800 space-y-3 fade-up" style="animation-delay:' + (idx * 50) + 'ms">' +
        '<div class="flex flex-wrap items-center justify-between gap-2">' +
          '<div class="flex-1 min-w-0">' +
            '<p class="text-xs font-bold text-slate-500 uppercase mb-1">Pengajuan Tukar Shift</p>' +
            '<p class="text-sm font-extrabold text-slate-900 dark:text-white truncate">' + shiftSwapApprovalText(row.requester_name) + ' ↔ ' + shiftSwapApprovalText(row.target_name) + '</p>' +
          '</div>' +
          '<div>' + shiftSwapApprovalStatusBadge(row.status) + '</div>' +
        '</div>' +
        '<div class="border-t border-slate-100 dark:border-slate-700 pt-3">' +
          '<p class="text-[10px] font-bold text-slate-500 uppercase mb-2">Detail Pengajuan</p>' +
          '<div class="grid grid-cols-2 gap-3 text-xs">' +
            '<div class="bg-slate-50 dark:bg-slate-700/50 p-2 rounded-lg">' +
              '<p class="font-bold text-slate-700 dark:text-slate-300 mb-1">' + shiftSwapApprovalText(row.requester_name) + '</p>' +
              shiftSwapApprovalRenderScheduleSnapshot(requesterSnap) +
            '</div>' +
            '<div class="bg-slate-50 dark:bg-slate-700/50 p-2 rounded-lg">' +
              '<p class="font-bold text-slate-700 dark:text-slate-300 mb-1">' + shiftSwapApprovalText(row.target_name) + '</p>' +
              shiftSwapApprovalRenderScheduleSnapshot(targetSnap) +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="border-t border-slate-100 dark:border-slate-700 pt-3">' +
          '<p class="text-[10px] font-bold text-slate-500 uppercase mb-1">Tanggal & Lingkup</p>' +
          '<p class="text-xs text-slate-600 dark:text-slate-400"><i class="fa-solid fa-calendar-days mr-1"></i>' + shiftSwapApprovalFormatDate(row.schedule_date) + ' (' + scopeLabel + ')</p>' +
        '</div>' +
        '<div class="border-t border-slate-100 dark:border-slate-700 pt-3">' +
          '<p class="text-[10px] font-bold text-slate-500 uppercase mb-1">Alasan</p>' +
          '<p class="text-xs text-slate-600 dark:text-slate-400 italic">"' + shiftSwapApprovalText(row.reason) + '"</p>' +
        '</div>' +
        '<div class="border-t border-slate-100 dark:border-slate-700 pt-3 flex gap-2">' +
          '<button type="button" onclick="approveShiftSwap(\'' + shiftSwapApprovalText(row.id) + '\')" class="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-all shadow-sm flex items-center justify-center gap-1"><i class="fa-solid fa-check"></i>Setujui</button>' +
          '<button type="button" onclick="rejectShiftSwap(\'' + shiftSwapApprovalText(row.id) + '\')" class="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg transition-all shadow-sm flex items-center justify-center gap-1"><i class="fa-solid fa-xmark"></i>Tolak</button>' +
        '</div>' +
      '</div>';
    }).join('');
  } catch(error) {
    el.innerHTML = '<div class="text-xs text-rose-500 text-center py-6"><i class="fa-solid fa-exclamation-circle mr-1"></i>Gagal memuat daftar: ' + shiftSwapApprovalText(error.message) + '</div>';
  }
}

async function approveShiftSwap(requestId) {
  if(!requestId || _shiftSwapApprovalProcessing[requestId]) return;
  _shiftSwapApprovalProcessing[requestId] = true;
  shiftSwapApprovalSetMessage('Memproses approval...', 'info');
  try {
    // Dapatkan data request
    var reqResult = await supa.from('attendance_shift_swap_requests').select('*').eq('id', requestId).single();
    if(reqResult.error) throw reqResult.error;
    var request = reqResult.data;
    if(!request) throw new Error('Pengajuan tidak ditemukan');
    
    // Validasi: tergantung scope
    if(request.swap_scope === 'SINGLE_DAY') {
      // SINGLE_DAY: kedua schedule_id harus ada
      if(!request.requester_schedule_id || !request.target_schedule_id) {
        throw new Error('Salah satu jadwal tidak valid (OFF atau tidak ada). Tidak bisa melakukan swap.');
      }
    } else if(request.swap_scope === 'WEEKEND_PAIR') {
      // WEEKEND_PAIR: cukup ada snapshot, biar salah satu pihak ada hari yang OFF
      if(!request.requester_weekend_snapshot || !request.target_weekend_snapshot) {
        throw new Error('Snapshot jadwal weekend tidak lengkap.');
      }
    }
    
    // Update status request
    var updateResult = await supa.from('attendance_shift_swap_requests')
      .update({status: 'APPROVED', reviewed_by: currentUser ? currentUser.username : 'system', reviewed_at: new Date().toISOString()})
      .eq('id', requestId);
    if(updateResult.error) throw updateResult.error;
    
    // Swap jadwal sesuai scope
    if(request.swap_scope === 'SINGLE_DAY') {
      // SINGLE_DAY: swap shift_code kedua schedule
      var swapUpdates = [
        supa.from('attendance_schedule_rows').update({shift_code: request.target_shift_code}).eq('id', request.requester_schedule_id),
        supa.from('attendance_schedule_rows').update({shift_code: request.requester_shift_code}).eq('id', request.target_schedule_id)
      ];
      var swapResults = await Promise.all(swapUpdates);
      swapResults.forEach(function(res) { if(res.error) throw res.error; });
    } else if(request.swap_scope === 'WEEKEND_PAIR') {
      // WEEKEND_PAIR: query langsung dari DB untuk dapat row yang aktual
      // Jangan andalkan snapshot karena schedule_id bisa null kalau snapshot lama
      var satDate = request.schedule_date;
      var sunDate = request.swap_end_date;

      // Query semua row jadwal untuk kedua pihak di periode Sabtu-Minggu
      var rowsResult = await supa.from('attendance_schedule_rows')
        .select('id, username, schedule_date, shift_code, jam_masuk, jam_pulang')
        .in('username', [request.requester_username, request.target_username])
        .in('schedule_date', [satDate, sunDate])
        .eq('status_jadwal', 'TERJADWAL');
      if(rowsResult.error) throw rowsResult.error;

      var allRows = rowsResult.data || [];

      // Pisahkan row berdasarkan username
      var reqRowsDb = allRows.filter(function(r) {
        return String(r.username).toLowerCase() === String(request.requester_username).toLowerCase();
      });
      var tgtRowsDb = allRows.filter(function(r) {
        return String(r.username).toLowerCase() === String(request.target_username).toLowerCase();
      });

      if(reqRowsDb.length === 0 || tgtRowsDb.length === 0) {
        throw new Error('Tidak ditemukan row jadwal TERJADWAL untuk salah satu pihak di periode ' + satDate + '–' + sunDate + '.');
      }

      // Tukar: requester row → ganti ke username/data target, dan sebaliknya
      var reqRowDb = reqRowsDb[0];
      var tgtRowDb = tgtRowsDb[0];

      var swapUpdates = [
        // Row requester → sekarang milik target
        supa.from('attendance_schedule_rows').update({
          username: request.target_username,
          employee_name: request.target_name,
          shift_code: tgtRowDb.shift_code,
          jam_masuk: tgtRowDb.jam_masuk,
          jam_pulang: tgtRowDb.jam_pulang,
          swap_request_id: requestId
        }).eq('id', reqRowDb.id),

        // Row target → sekarang milik requester
        supa.from('attendance_schedule_rows').update({
          username: request.requester_username,
          employee_name: request.requester_name,
          shift_code: reqRowDb.shift_code,
          jam_masuk: reqRowDb.jam_masuk,
          jam_pulang: reqRowDb.jam_pulang,
          swap_request_id: requestId
        }).eq('id', tgtRowDb.id)
      ];

      var swapResults = await Promise.all(swapUpdates);
      swapResults.forEach(function(res) { if(res.error) throw res.error; });
    }
    
    shiftSwapApprovalSetMessage('Pengajuan berhasil disetujui dan jadwal telah ditukar.', 'success');
    await loadShiftSwapApprovalList();
  } catch(error) {
    shiftSwapApprovalSetMessage('Gagal approve: ' + error.message, 'error');
  } finally {
    delete _shiftSwapApprovalProcessing[requestId];
  }
}

async function rejectShiftSwap(requestId) {
  if(!requestId || _shiftSwapApprovalProcessing[requestId]) return;
  var reason = prompt('Alasan penolakan (opsional):');
  if(reason === null) return; // User batal
  _shiftSwapApprovalProcessing[requestId] = true;
  shiftSwapApprovalSetMessage('Memproses penolakan...', 'info');
  try {
    var updateResult = await supa.from('attendance_shift_swap_requests')
      .update({status: 'REJECTED', reviewed_by: currentUser ? currentUser.username : 'system', reviewed_at: new Date().toISOString(), review_note: reason || ''})
      .eq('id', requestId);
    if(updateResult.error) throw updateResult.error;
    shiftSwapApprovalSetMessage('Pengajuan berhasil ditolak.', 'success');
    await loadShiftSwapApprovalList();
  } catch(error) {
    shiftSwapApprovalSetMessage('Gagal reject: ' + error.message, 'error');
  } finally {
    delete _shiftSwapApprovalProcessing[requestId];
  }
}

async function loadShiftSwapApprovalPanel() {
  await loadShiftSwapApprovalList();
  // Auto-refresh setiap 5 detik saat panel approval aktif
  if(window._shiftSwapApprovalInterval) clearInterval(window._shiftSwapApprovalInterval);
  window._shiftSwapApprovalInterval = setInterval(function() {
    var el = document.getElementById('admin-sub-approval-shift');
    if(el && !el.classList.contains('hidden')) {
      loadShiftSwapApprovalList();
    }
  }, 5000);
}
