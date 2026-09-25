// ===================== JADWAL SHIFT & MONITORING ABSENSI =====================
// Editor jadwal bulanan untuk Admin, jadwal pribadi untuk karyawan,
// dan monitoring absensi harian berdasarkan jadwal yang sudah dipublish.

var _jadwalAccounts = [];
var _jadwalPeriod = null;
var _jadwalRows = [];
var _jadwalWeekRanges = [];
var _jadwalWorkConfig = {};

var JADWAL_WORK_CONFIG_DEFAULTS = {
  'Teknisi|Shift1': {configKey:'Teknisi|Shift1', scheduleRole:'Teknisi', shiftCode:'Shift1', effectiveShiftCode:'Shift1', scheduleMode:'SHIFT', weekdayStart:'08:00', weekdayEnd:'16:00', saturdayStart:'09:00', saturdayEnd:'17:00', sundayStart:'', sundayEnd:''},
  'Teknisi|Shift2': {configKey:'Teknisi|Shift2', scheduleRole:'Teknisi', shiftCode:'Shift2', effectiveShiftCode:'Shift2', scheduleMode:'SHIFT', weekdayStart:'14:00', weekdayEnd:'22:00', saturdayStart:'', saturdayEnd:'', sundayStart:'09:00', sundayEnd:'17:00'},
  'Teknisi|NonShift': {configKey:'Teknisi|NonShift', scheduleRole:'Teknisi', shiftCode:'NonShift', effectiveShiftCode:'NonShift', scheduleMode:'SHIFT', weekdayStart:'09:00', weekdayEnd:'17:00', saturdayStart:'09:00', saturdayEnd:'17:00', sundayStart:'', sundayEnd:''},
  'CS|Shift1': {configKey:'CS|Shift1', scheduleRole:'CS', shiftCode:'Shift1', effectiveShiftCode:'Shift1', scheduleMode:'SHIFT', weekdayStart:'07:00', weekdayEnd:'15:00', saturdayStart:'09:00', saturdayEnd:'17:00', sundayStart:'', sundayEnd:''},
  'CS|Shift2': {configKey:'CS|Shift2', scheduleRole:'CS', shiftCode:'Shift2', effectiveShiftCode:'Shift2', scheduleMode:'SHIFT', weekdayStart:'13:00', weekdayEnd:'21:00', saturdayStart:'', saturdayEnd:'', sundayStart:'09:00', sundayEnd:'17:00'},
  'CS|NonShift': {configKey:'CS|NonShift', scheduleRole:'CS', shiftCode:'NonShift', effectiveShiftCode:'NonShift', scheduleMode:'SHIFT', weekdayStart:'09:00', weekdayEnd:'17:00', saturdayStart:'09:00', saturdayEnd:'17:00', sundayStart:'', sundayEnd:''},
  'NON_SHIFT_STAFF|Shift1': {configKey:'NON_SHIFT_STAFF|Shift1', scheduleRole:'NON_SHIFT_STAFF', shiftCode:'Shift1', effectiveShiftCode:'Shift1', scheduleMode:'NON_SHIFT', weekdayStart:'08:00', weekdayEnd:'16:00', saturdayStart:'09:00', saturdayEnd:'17:00', sundayStart:'', sundayEnd:''},
  'NON_SHIFT_STAFF|Shift2': {configKey:'NON_SHIFT_STAFF|Shift2', scheduleRole:'NON_SHIFT_STAFF', shiftCode:'Shift2', effectiveShiftCode:'Shift2', scheduleMode:'NON_SHIFT', weekdayStart:'14:00', weekdayEnd:'22:00', saturdayStart:'', saturdayEnd:'', sundayStart:'09:00', sundayEnd:'17:00'},
  'NON_SHIFT_STAFF|NonShift': {configKey:'NON_SHIFT_STAFF|NonShift', scheduleRole:'NON_SHIFT_STAFF', shiftCode:'NonShift', effectiveShiftCode:'NonShift', scheduleMode:'NON_SHIFT', weekdayStart:'09:00', weekdayEnd:'17:00', saturdayStart:'10:00', saturdayEnd:'18:00', sundayStart:'', sundayEnd:''},
  'NOC|Shift1': {configKey:'NOC|Shift1', scheduleRole:'NOC', shiftCode:'Shift1', effectiveShiftCode:'Shift1', scheduleMode:'NON_SHIFT', weekdayStart:'08:00', weekdayEnd:'16:00', saturdayStart:'09:00', saturdayEnd:'17:00', sundayStart:'', sundayEnd:''},
  'NOC|Shift2': {configKey:'NOC|Shift2', scheduleRole:'NOC', shiftCode:'Shift2', effectiveShiftCode:'Shift2', scheduleMode:'NON_SHIFT', weekdayStart:'14:00', weekdayEnd:'22:00', saturdayStart:'', saturdayEnd:'', sundayStart:'09:00', sundayEnd:'17:00'},
  'NOC|NonShift': {configKey:'NOC|NonShift', scheduleRole:'NOC', shiftCode:'NonShift', effectiveShiftCode:'NonShift', scheduleMode:'NON_SHIFT', weekdayStart:'10:00', weekdayEnd:'18:00', saturdayStart:'10:00', saturdayEnd:'18:00', sundayStart:'', sundayEnd:''}
};

var JADWAL_WORK_GROUP_DEFINITIONS = [
  {group:'Teknisi', label:'Teknisi', hint:'Mode Shift menampilkan Shift 1 dan Shift 2 untuk akun Teknisi.'},
  {group:'CS', label:'CS', hint:'Mode Shift menampilkan Shift 1 dan Shift 2 untuk akun CS.'},
  {group:'NON_SHIFT_STAFF', label:'Admin / Finance / SPV', hint:'Mode Shift menampilkan Shift 1 dan Shift 2 untuk role umum.'},
  {group:'NOC', label:'NOC', hint:'Mode Shift menampilkan Shift 1 dan Shift 2 untuk akun NOC.'}
];

var JADWAL_WORK_CONFIG_DEFINITIONS = [
  {key:'Teknisi|Shift1', group:'Teknisi', label:'Teknisi — Shift 1', hint:'Contoh: weekday 09:00, Sabtu 10:00'},
  {key:'Teknisi|Shift2', group:'Teknisi', label:'Teknisi — Shift 2', hint:'Jam kerja Shift 2 Teknisi'},
  {key:'Teknisi|NonShift', group:'Teknisi', label:'Teknisi — Non Shift', hint:'Satu jam kerja otomatis untuk seluruh akun Teknisi'},
  {key:'CS|Shift1', group:'CS', label:'CS — Shift 1', hint:'Jam kerja Shift 1 CS'},
  {key:'CS|Shift2', group:'CS', label:'CS — Shift 2', hint:'Jam kerja Shift 2 CS'},
  {key:'CS|NonShift', group:'CS', label:'CS — Non Shift', hint:'Satu jam kerja otomatis untuk seluruh akun CS'},
  {key:'NON_SHIFT_STAFF|Shift1', group:'NON_SHIFT_STAFF', label:'Admin / Finance / SPV — Shift 1', hint:'Jam kerja Shift 1 role umum'},
  {key:'NON_SHIFT_STAFF|Shift2', group:'NON_SHIFT_STAFF', label:'Admin / Finance / SPV — Shift 2', hint:'Jam kerja Shift 2 role umum'},
  {key:'NON_SHIFT_STAFF|NonShift', group:'NON_SHIFT_STAFF', label:'Admin / Finance / SPV — Non Shift', hint:'Satu jam kerja otomatis untuk role umum'},
  {key:'NOC|Shift1', group:'NOC', label:'NOC — Shift 1', hint:'Jam kerja Shift 1 NOC'},
  {key:'NOC|Shift2', group:'NOC', label:'NOC — Shift 2', hint:'Jam kerja Shift 2 NOC'},
  {key:'NOC|NonShift', group:'NOC', label:'NOC — Non Shift', hint:'Satu jam kerja otomatis untuk seluruh akun NOC'}
];

function jadwalDefaultWorkConfig() {
  var result = {};
  Object.keys(JADWAL_WORK_CONFIG_DEFAULTS).forEach(function(key) {
    result[key] = Object.assign({}, JADWAL_WORK_CONFIG_DEFAULTS[key]);
  });
  return result;
}

function jadwalWorkConfigFor(scheduleRole, shiftCode) {
  var key = shiftCode === undefined ? String(scheduleRole || '') : jadwalWorkConfigKey(scheduleRole, shiftCode);
  return (_jadwalWorkConfig && _jadwalWorkConfig[key]) || JADWAL_WORK_CONFIG_DEFAULTS[key] || null;
}

function jadwalWorkConfigGroup(scheduleRole) {
  var role = String(scheduleRole || '').trim();
  var normalizedRole = role.toUpperCase();
  if(normalizedRole === 'NOC') return 'NOC';
  if(normalizedRole === 'ADMIN' || normalizedRole === 'FINANCE' || normalizedRole === 'SUPERVISOR' || normalizedRole === 'SPV' || normalizedRole === 'NON_SHIFT_STAFF') return 'NON_SHIFT_STAFF';
  if(normalizedRole === 'TEKNISI') return 'Teknisi';
  if(normalizedRole === 'CS') return 'CS';
  return role;
}

function jadwalWorkConfigKey(scheduleRole, shiftCode) {
  return jadwalWorkConfigGroup(scheduleRole) + '|' + String(shiftCode || 'NonShift');
}

function jadwalScheduleModeFor(group, config) {
  var source = config || _jadwalWorkConfig || {};
  var marker = source[String(group || '') + '|NonShift'];
  if(marker && (marker.scheduleMode === 'SHIFT' || marker.scheduleMode === 'NON_SHIFT')) return marker.scheduleMode;
  return group === 'Teknisi' || group === 'CS' ? 'SHIFT' : 'NON_SHIFT';
}

function jadwalWorkConfigModeChanged(group, value) {
  var mode = value === 'SHIFT' ? 'SHIFT' : 'NON_SHIFT';
  if(!_jadwalWorkConfig || !Object.keys(_jadwalWorkConfig).length) _jadwalWorkConfig = jadwalDefaultWorkConfig();
  JADWAL_WORK_CONFIG_DEFINITIONS.filter(function(definition) { return definition.group === group; }).forEach(function(definition) {
    if(_jadwalWorkConfig[definition.key]) _jadwalWorkConfig[definition.key].scheduleMode = mode;
  });
  renderJadwalWorkConfigForm();
}

function jadwalWorkTime(config, dow) {
  if(!config) return null;
  var start = dow === 6 ? config.saturdayStart : dow === 0 ? config.sundayStart : config.weekdayStart;
  var end = dow === 6 ? config.saturdayEnd : dow === 0 ? config.sundayEnd : config.weekdayEnd;
  if(!start || !end) return null;
  return {start:start, end:end};
}

function jadwalTimeMinutes(value) {
  if(!/^\d{2}:\d{2}$/.test(String(value || ''))) return null;
  var parts = String(value).split(':').map(Number);
  if(parts[0] > 23 || parts[1] > 59) return null;
  return parts[0] * 60 + parts[1];
}

function jadwalValidateWorkConfig(config) {
  var errors = [];
  JADWAL_WORK_CONFIG_DEFINITIONS.forEach(function(definition) {
    var item = config[definition.key];
    if(!item) { errors.push(definition.label + ' belum lengkap.'); return; }
    var pairs = [
      ['weekdayStart','weekdayEnd','Senin–Jumat'],
      ['saturdayStart','saturdayEnd','Sabtu'],
      ['sundayStart','sundayEnd','Minggu']
    ];
    pairs.forEach(function(pair) {
      var start = item[pair[0]] || '', end = item[pair[1]] || '';
      if((start && !end) || (!start && end)) errors.push(definition.label + ' ' + pair[2] + ' harus mengisi jam masuk dan pulang.');
      if(start && end && (jadwalTimeMinutes(start) === null || jadwalTimeMinutes(end) === null || jadwalTimeMinutes(start) >= jadwalTimeMinutes(end))) errors.push(definition.label + ' ' + pair[2] + ' memiliki rentang jam tidak valid.');
    });
    if(definition.key.slice(-9) === '|NonShift' && ['NON_SHIFT','SHIFT'].indexOf(item.scheduleMode) < 0) errors.push(definition.label + ' memiliki mode kerja yang tidak valid.');
  });
  return errors.length ? errors[0] : '';
}

function jadwalWorkTimeInput(field, label, value) {
  return '<label class="block text-[10px] font-bold text-slate-500 dark:text-slate-300">' + label + '<input type="time" data-work-config-field="' + field + '" value="' + jadwalText(value || '') + '" class="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-2.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-100"></label>';
}

function renderJadwalWorkConfigForm() {
  var container = document.getElementById('jadwal-work-config-fields');
  if(!container) return;
  var config = _jadwalWorkConfig && Object.keys(_jadwalWorkConfig).length ? _jadwalWorkConfig : jadwalDefaultWorkConfig();
  container.innerHTML = JADWAL_WORK_GROUP_DEFINITIONS.map(function(groupDefinition) {
    var mode = jadwalScheduleModeFor(groupDefinition.group, config);
    var visibleDefinitions = JADWAL_WORK_CONFIG_DEFINITIONS.filter(function(definition) {
      if(definition.group !== groupDefinition.group) return false;
      return mode === 'SHIFT' ? definition.key.slice(-9) !== '|NonShift' : definition.key.slice(-9) === '|NonShift';
    });
    return '<div class="space-y-3 rounded-2xl border border-slate-200 dark:border-slate-700 p-3">' +
      '<div class="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/20 p-3 flex flex-wrap items-center justify-between gap-3">' +
        '<div><p class="text-xs font-extrabold text-slate-800 dark:text-slate-100">Mode Kerja ' + groupDefinition.label + '</p><p class="text-[10px] text-slate-500 dark:text-slate-300">' + groupDefinition.hint + '</p></div>' +
        '<select data-work-config-mode-group="' + groupDefinition.group + '" onchange="jadwalWorkConfigModeChanged(\'' + groupDefinition.group + '\', this.value)" class="rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-700 px-2.5 py-2 text-[10px] font-extrabold text-slate-700 dark:text-slate-100">' +
          '<option value="NON_SHIFT" ' + (mode === 'NON_SHIFT' ? 'selected' : '') + '>Non Shift</option>' +
          '<option value="SHIFT" ' + (mode === 'SHIFT' ? 'selected' : '') + '>Shift (Shift 1 &amp; Shift 2)</option>' +
        '</select>' +
      '</div>' +
      '<div class="space-y-3">' + visibleDefinitions.map(function(definition) {
        var item = config[definition.key] || JADWAL_WORK_CONFIG_DEFAULTS[definition.key];
        return '<div class="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-700/30 p-3 space-y-3" data-work-config-key="' + definition.key + '">' +
          '<div><p class="text-xs font-extrabold text-slate-800 dark:text-slate-100">' + definition.label + '</p><p class="text-[10px] text-slate-400">' + definition.hint + '</p></div>' +
          '<div class="grid grid-cols-2 md:grid-cols-6 gap-2">' +
            jadwalWorkTimeInput('weekdayStart','Senin–Jumat masuk',item.weekdayStart) + jadwalWorkTimeInput('weekdayEnd','Senin–Jumat pulang',item.weekdayEnd) +
            jadwalWorkTimeInput('saturdayStart','Sabtu masuk',item.saturdayStart) + jadwalWorkTimeInput('saturdayEnd','Sabtu pulang',item.saturdayEnd) +
            jadwalWorkTimeInput('sundayStart','Minggu masuk',item.sundayStart) + jadwalWorkTimeInput('sundayEnd','Minggu pulang',item.sundayEnd) +
          '</div></div>';
      }).join('') + '</div>' +
    '</div>';
  }).join('');
}

function jadwalReadWorkConfigForm() {
  var result = jadwalDefaultWorkConfig();
  document.querySelectorAll('#jadwal-work-config-fields [data-work-config-mode-group]').forEach(function(select) {
    var group = select.getAttribute('data-work-config-mode-group');
    var mode = select.value === 'SHIFT' ? 'SHIFT' : 'NON_SHIFT';
    JADWAL_WORK_CONFIG_DEFINITIONS.filter(function(definition) { return definition.group === group; }).forEach(function(definition) {
      result[definition.key].scheduleMode = mode;
    });
  });
  document.querySelectorAll('#jadwal-work-config-fields [data-work-config-key]').forEach(function(card) {
    var key = card.getAttribute('data-work-config-key');
    var base = result[key];
    if(!base) return;
    card.querySelectorAll('[data-work-config-field]').forEach(function(input) { base[input.getAttribute('data-work-config-field')] = input.value || ''; });
  });
  return result;
}

async function loadJadwalWorkConfig() {
  _jadwalWorkConfig = jadwalDefaultWorkConfig();
  try {
    var result = await supa.from('attendance_work_time_configs').select('*').order('config_key');
    if(result.error) throw result.error;
    (result.data || []).forEach(function(row) {
      var fallback = JADWAL_WORK_CONFIG_DEFAULTS[row.config_key];
      if(!fallback) return;
      _jadwalWorkConfig[row.config_key] = Object.assign({}, fallback, {
        effectiveShiftCode: row.effective_shift_code || fallback.effectiveShiftCode,
        scheduleMode: row.schedule_mode || fallback.scheduleMode,
        weekdayStart: String(row.weekday_start || fallback.weekdayStart).slice(0,5),
        weekdayEnd: String(row.weekday_end || fallback.weekdayEnd).slice(0,5),
        saturdayStart: row.saturday_start ? String(row.saturday_start).slice(0,5) : '',
        saturdayEnd: row.saturday_end ? String(row.saturday_end).slice(0,5) : '',
        sundayStart: row.sunday_start ? String(row.sunday_start).slice(0,5) : '',
        sundayEnd: row.sunday_end ? String(row.sunday_end).slice(0,5) : ''
      });
    });
  } catch(e) {
    console.warn('[Jadwal] Konfigurasi jam belum tersedia, memakai default:', e.message);
  }
  renderJadwalWorkConfigForm();
  return _jadwalWorkConfig;
}

async function initJadwalWorkConfig() {
  var role = currentUser ? String(currentUser.role || '').toLowerCase() : '';
  if(role !== 'admin') return;
  var container = document.getElementById('jadwal-work-config-fields');
  if(container) container.innerHTML = '<p class="text-xs text-slate-400 text-center py-6"><i class="fa-solid fa-spinner animate-spin mr-2"></i>Memuat konfigurasi jam...</p>';
  await loadJadwalWorkConfig();
}

async function saveJadwalWorkConfig(event) {
  if(event) event.preventDefault();
  var role = currentUser ? String(currentUser.role || '').toLowerCase() : '';
  if(role !== 'admin') { showAlert('Hanya akun Admin yang dapat mengubah pengaturan jam kerja.', 'Akses Ditolak'); return; }
  var config = jadwalReadWorkConfigForm();
  var error = jadwalValidateWorkConfig(config);
  if(error) { showAlert(error, 'Jam Kerja Tidak Valid'); return; }
  var button = document.getElementById('btn-save-jadwal-work-config');
  if(button) button.disabled = true;
  try {
    var payload = JADWAL_WORK_CONFIG_DEFINITIONS.map(function(definition) {
      var item = config[definition.key];
      return {config_key:item.configKey, schedule_role:item.scheduleRole, shift_code:item.shiftCode, effective_shift_code:item.effectiveShiftCode, schedule_mode:item.scheduleMode, weekday_start:item.weekdayStart, weekday_end:item.weekdayEnd, saturday_start:item.saturdayStart || null, saturday_end:item.saturdayEnd || null, sunday_start:item.sundayStart || null, sunday_end:item.sundayEnd || null, timezone:'Asia/Jakarta', updated_by:currentUser.username || currentUser.displayName, updated_at:new Date().toISOString()};
    });
    var result = await supa.from('attendance_work_time_configs').upsert(payload, {onConflict:'config_key'});
    if(result.error) throw result.error;
    _jadwalWorkConfig = config;
    renderJadwalWorkConfigForm();
    if(typeof loadJadwalAccounts === 'function') await loadJadwalAccounts();
    showAlert('Pengaturan jam kerja tersimpan. Buka Jadwal Shift lalu klik Update & Publish agar berlaku.', 'Jam Kerja Tersimpan');
  } catch(e) {
    showAlert('Gagal menyimpan jam kerja: ' + e.message + '. Pastikan SQL konfigurasi jam sudah dijalankan.', 'Error Jam Kerja');
  } finally {
    if(button) button.disabled = false;
  }
}

function jadwalText(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, function(ch) {
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];
  });
}

function jadwalDate(year, month, day) {
  return String(year) + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');
}

function jadwalMonthValue() {
  var el = document.getElementById('jadwal-period-month');
  if(el && /^\d{4}-\d{2}$/.test(el.value)) return el.value;
  var now = new Date();
  return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
}

function jadwalMonthParts(value) {
  var parts = String(value || jadwalMonthValue()).split('-').map(Number);
  return {year: parts[0] || new Date().getFullYear(), month: parts[1] || new Date().getMonth() + 1};
}

function jadwalRoleAccounts(role) {
  return _jadwalAccounts.filter(function(a) { return a.scheduleRole === role; });
}

function jadwalFixedSchedule(accountRole) {
  var role = String(accountRole || '').toLowerCase();
  var group = jadwalWorkConfigGroup(role);
  if(['Teknisi','CS','NOC','NON_SHIFT_STAFF'].indexOf(group) < 0 || jadwalScheduleModeFor(group) === 'SHIFT') return null;
  var config = jadwalWorkConfigFor(group, 'NonShift');
  if(!config) return null;
  var scheduleRole = role === 'noc' ? 'NOC' : role === 'finance' ? 'Finance' : (role === 'supervisor' || role === 'spv' ? 'SPV' : role === 'admin' ? 'Admin' : role === 'teknisi' ? 'Teknisi' : role === 'cs' ? 'CS' : '');
  if(!scheduleRole) return null;
  return {scheduleRole:scheduleRole, days:[0,1,2,3,4,5,6], start:config.weekdayStart, end:config.weekdayEnd, saturdayStart:config.saturdayStart, saturdayEnd:config.saturdayEnd, sundayStart:config.sundayStart, sundayEnd:config.sundayEnd, effectiveShiftCode:config.effectiveShiftCode || 'NonShift', workConfig:config};
}

function jadwalDisplayRole(accountRole) {
  var role = String(accountRole || '').toLowerCase();
  if(role === 'teknisi') return 'Teknisi';
  if(role === 'cs') return 'CS';
  if(role === 'noc') return 'NOC';
  if(role === 'admin') return 'Admin';
  if(role === 'finance') return 'Finance';
  if(role === 'supervisor' || role === 'spv') return 'SPV';
  return '';
}

function jadwalShiftFor(weekNo, username, draftSelections) {
  var draftKey = Number(weekNo) + '|' + String(username || '').toLowerCase();
  if(draftSelections && Object.prototype.hasOwnProperty.call(draftSelections, draftKey)) return draftSelections[draftKey];
  var shifts = [], hasNonShift = false;
  _jadwalRows.forEach(function(row) {
    var rowWeek = Number(row.week_no);
    if(row.schedule_date && _jadwalWeekRanges && _jadwalWeekRanges.length) {
      rowWeek = null;
      _jadwalWeekRanges.some(function(range, index) {
        if(String(row.schedule_date) >= range.start_date && String(row.schedule_date) <= range.end_date) {
          rowWeek = index + 1;
          return true;
        }
        return false;
      });
    }
    if(rowWeek !== Number(weekNo)) return;
    if(String(row.username || '').toLowerCase() !== String(username || '').toLowerCase()) return;
    if((row.shift_code === 'Shift1' || row.shift_code === 'Shift2') && shifts.indexOf(row.shift_code) < 0) shifts.push(row.shift_code);
    if(row.shift_code === 'NonShift') hasNonShift = true;
  });
  // Data lama seharusnya hanya memiliki satu shift per karyawan/minggu.
  // Jika data lama tidak konsisten, pilih Shift1 secara deterministik agar aman.
  return shifts.indexOf('Shift1') >= 0 ? 'Shift1' : (shifts.indexOf('Shift2') >= 0 ? 'Shift2' : (hasNonShift ? 'NonShift' : 'OFF'));
}

function jadwalShiftOptions(selected, includeNonShift) {
  var value = selected === 'Shift1' || selected === 'Shift2' || (includeNonShift && selected === 'NonShift') ? selected : 'OFF';
  return '<option value="OFF" ' + (value === 'OFF' ? 'selected' : '') + '>OFF</option>' +
    '<option value="Shift1" ' + (value === 'Shift1' ? 'selected' : '') + '>Shift 1</option>' +
    '<option value="Shift2" ' + (value === 'Shift2' ? 'selected' : '') + '>Shift 2</option>' +
    (includeNonShift ? '<option value="NonShift" ' + (value === 'NonShift' ? 'selected' : '') + '>Non Shift</option>' : '');
}

function jadwalApplyCellStyle(select) {
  if(!select) return;
  var colors = {
    OFF: {background:'#f8fafc', border:'#cbd5e1', color:'#64748b'},
    Shift1: {background:'#fef9c3', border:'#facc15', color:'#a16207'},
    Shift2: {background:'#dbeafe', border:'#60a5fa', color:'#1d4ed8'},
    NonShift: {background:'#d1fae5', border:'#34d399', color:'#047857'}
  };
  var style = colors[select.value] || colors.OFF;
  select.style.backgroundColor = style.background;
  select.style.borderColor = style.border;
  select.style.color = style.color;
}

function jadwalDateObject(value) {
  return new Date(String(value) + 'T00:00:00');
}

function jadwalDateFromObject(date) {
  return jadwalDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

function jadwalFirstMonday(year, month) {
  var date = new Date(year, month - 1, 1);
  var offset = (8 - date.getDay()) % 7;
  date.setDate(date.getDate() + offset);
  return date;
}

function jadwalLastMonday(year, month) {
  var date = new Date(year, month, 0);
  var offset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - offset);
  return date;
}

function jadwalDateLabel(value) {
  var date = jadwalDateObject(value);
  return date.toLocaleDateString('id-ID', {day:'numeric', month:'short'});
}

function jadwalDefaultWeekRanges(year, month) {
  var firstMonday = jadwalFirstMonday(year, month);
  var lastMonday = jadwalLastMonday(year, month);
  var ranges = [];
  var weekNo = 1;
  for(var startDate = new Date(firstMonday); startDate <= lastMonday; startDate.setDate(startDate.getDate() + 7)) {
    var endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    ranges.push({
      week_no: weekNo++,
      start_date: jadwalDateFromObject(startDate),
      end_date: jadwalDateFromObject(endDate)
    });
  }
  return ranges;
}

function jadwalNormalizeWeekRanges(raw, year, month) {
  var parsed = raw;
  if(typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed); } catch(e) { parsed = null; }
  }
  if(!Array.isArray(parsed) || !parsed.length) return jadwalDefaultWeekRanges(year, month);
  var ranges = parsed.map(function(item, index) {
    return {
      week_no: index + 1,
      start_date: String(item.start_date || item.start || ''),
      end_date: String(item.end_date || item.end || '')
    };
  });
  // Data lama dapat berisi minggu parsial. Gunakan kalender Senin-Minggu
  // terbaru agar Admin tidak menerbitkan kembali rentang yang tidak utuh.
  return jadwalValidateWeekRanges(ranges, year, month) ? jadwalDefaultWeekRanges(year, month) : ranges;
}

function jadwalWeekRangesForPeriod(year, month) {
  if(_jadwalWeekRanges && _jadwalWeekRanges.length) return _jadwalWeekRanges;
  return jadwalNormalizeWeekRanges(_jadwalPeriod && _jadwalPeriod.week_ranges, year, month);
}

function jadwalValidateWeekRanges(ranges, year, month) {
  var expected = jadwalDefaultWeekRanges(year, month);
  if(!Array.isArray(ranges) || !ranges.length) return 'Minimal harus ada satu rentang minggu.';
  if(ranges.length !== expected.length) return 'Bulan ini harus memiliki ' + expected.length + ' minggu kalender Senin–Minggu.';
  for(var i = 0; i < ranges.length; i++) {
    var range = ranges[i];
    if(!/^\d{4}-\d{2}-\d{2}$/.test(range.start_date) || !/^\d{4}-\d{2}-\d{2}$/.test(range.end_date)) return 'Tanggal Minggu ' + (i + 1) + ' belum lengkap.';
    var start = jadwalDateObject(range.start_date);
    var end = jadwalDateObject(range.end_date);
    if(isNaN(start.getTime()) || isNaN(end.getTime())) return 'Tanggal Minggu ' + (i + 1) + ' tidak valid.';
    if(start.getDay() !== 1 || end.getDay() !== 0) return 'Minggu ' + (i + 1) + ' harus dimulai Senin dan berakhir Minggu.';
    if(range.start_date !== expected[i].start_date || range.end_date !== expected[i].end_date) return 'Minggu ' + (i + 1) + ' harus mengikuti kalender Senin–Minggu: ' + jadwalDateLabel(expected[i].start_date) + ' – ' + jadwalDateLabel(expected[i].end_date) + '.';
    var expectedEnd = new Date(start);
    expectedEnd.setDate(expectedEnd.getDate() + 6);
    if(jadwalDateFromObject(expectedEnd) !== range.end_date) return 'Rentang Minggu ' + (i + 1) + ' harus tepat 7 hari.';
  }
  return '';
}

function jadwalReadWeekRanges() {
  var parts = jadwalMonthParts(jadwalMonthValue());
  return jadwalWeekRangesForPeriod(parts.year, parts.month).map(function(range, index) {
    return {week_no: index + 1, start_date: range.start_date, end_date: range.end_date};
  });
}

function jadwalCollectCellSelections() {
  var selections = {};
  document.querySelectorAll('#jadwal-week-editor select[data-jadwal-cell]').forEach(function(cell) {
    var week = cell.getAttribute('data-jadwal-week');
    var username = String(cell.getAttribute('data-jadwal-username') || '').toLowerCase();
    if(week && username) selections[Number(week) + '|' + username] = cell.value;
  });
  return selections;
}

function closeJadwalRangePicker() {
  var picker = document.getElementById('jadwal-range-picker');
  if(picker) picker.remove();
}

function openJadwalRangePicker(weekNo) {
  closeJadwalRangePicker();
  var parts = jadwalMonthParts(jadwalMonthValue());
  var ranges = jadwalWeekRangesForPeriod(parts.year, parts.month);
  var range = ranges[Number(weekNo) - 1];
  if(!range) return;
  var firstStart = jadwalDateFromObject(jadwalFirstMonday(parts.year, parts.month));
  var lastStart = jadwalDateFromObject(jadwalLastMonday(parts.year, parts.month));
  var rangeEndDate = jadwalDateObject(range.start_date);
  rangeEndDate.setDate(rangeEndDate.getDate() + 6);
  var rangeEnd = jadwalDateFromObject(rangeEndDate);
  var picker = document.createElement('div');
  picker.id = 'jadwal-range-picker';
  picker.setAttribute('data-jadwal-week', weekNo);
  picker.className = 'fixed z-[200] w-[min(19rem,calc(100vw-1rem))] rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-4 shadow-2xl';
  picker.innerHTML = '<div class="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-2 mb-3">' +
    '<div><p class="text-xs font-extrabold text-slate-800 dark:text-slate-100"><i class="fa-solid fa-calendar-days mr-1 text-indigo-500"></i>Minggu Kalender ' + weekNo + '</p><p class="text-[9px] text-slate-400">Rentang otomatis 7 hari, Senin sampai Minggu</p></div>' +
    '<button type="button" onclick="closeJadwalRangePicker()" class="w-7 h-7 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"><i class="fa-solid fa-xmark"></i></button>' +
  '</div>' +
  '<div class="space-y-2">' +
    '<label class="block text-[10px] font-bold text-slate-500 dark:text-slate-300">Mulai tanggal<input type="date" id="jadwal-picker-start" min="' + firstStart + '" max="' + lastStart + '" value="' + jadwalText(range.start_date) + '" class="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-100"></label>' +
    '<label class="block text-[10px] font-bold text-slate-500 dark:text-slate-300">Selesai tanggal<input type="date" id="jadwal-picker-end" min="' + range.start_date + '" max="' + rangeEnd + '" value="' + jadwalText(range.end_date) + '" class="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-100"></label>' +
  '</div>' +
  '<p class="mt-2 text-[9px] leading-relaxed text-slate-400">Minggu harus tepat 7 hari: Senin sampai Minggu. Jika melewati pergantian bulan, Sabtu/Minggu tetap mengikuti Senin pada minggu sebelumnya.</p>' +
  '<div class="flex justify-end gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700"><button type="button" onclick="closeJadwalRangePicker()" class="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-[10px] font-bold text-slate-600 dark:text-slate-200">Batal</button><button type="button" onclick="applyJadwalRangePicker()" class="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold"><i class="fa-solid fa-check mr-1"></i>Terapkan</button></div>';
  document.body.appendChild(picker);

  var button = document.getElementById('jadwal-week-calendar-' + weekNo);
  var rect = button ? button.getBoundingClientRect() : {left:20, top:20, bottom:50, right:20};
  var width = Math.min(304, window.innerWidth - 16);
  var left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
  var top = rect.bottom + 8;
  if(top + 300 > window.innerHeight) top = Math.max(8, rect.top - 308);
  picker.style.left = left + 'px';
  picker.style.top = top + 'px';

  var startInput = document.getElementById('jadwal-picker-start');
  if(startInput && typeof startInput.showPicker === 'function') {
    try { startInput.showPicker(); } catch(e) { /* browser dapat menolak picker otomatis */ }
  }
}

function applyJadwalRangePicker() {
  var picker = document.getElementById('jadwal-range-picker');
  if(!picker) return;
  var weekNo = Number(picker.getAttribute('data-jadwal-week'));
  var startInput = document.getElementById('jadwal-picker-start');
  var endInput = document.getElementById('jadwal-picker-end');
  var parts = jadwalMonthParts(jadwalMonthValue());
  var ranges = jadwalWeekRangesForPeriod(parts.year, parts.month).map(function(range, index) {
    return {week_no: index + 1, start_date: range.start_date, end_date: range.end_date};
  });
  if(!ranges[weekNo - 1] || !startInput || !endInput) return;
  ranges[weekNo - 1].start_date = startInput.value;
  ranges[weekNo - 1].end_date = endInput.value;
  var error = jadwalValidateWeekRanges(ranges, parts.year, parts.month);
  if(error) { showAlert(error, 'Rentang Minggu Tidak Valid'); return; }
  var selections = jadwalCollectCellSelections();
  _jadwalWeekRanges = ranges;
  closeJadwalRangePicker();
  renderJadwalEditor(ranges, selections);
  showAlert('Rentang Minggu ' + weekNo + ' berhasil diperbarui.', 'Rentang Diperbarui');
}

function renderJadwalEditor(ranges, draftSelections) {
  var container = document.getElementById('jadwal-week-editor');
  if(!container) return;
  var parts = jadwalMonthParts(jadwalMonthValue());
  ranges = ranges || jadwalWeekRangesForPeriod(parts.year, parts.month);
  _jadwalWeekRanges = ranges;
  var accounts = (_jadwalAccounts || []).slice().sort(function(a, b) {
    var roleOrder = {'Teknisi': 1, 'CS': 2, 'Admin': 3, 'Finance': 4, 'SPV': 5, 'NOC': 6};
    var roleCompare = (roleOrder[a.scheduleRole] || 9) - (roleOrder[b.scheduleRole] || 9);
    if(roleCompare) return roleCompare;
    return String(a.display_name || a.username).localeCompare(String(b.display_name || b.username), 'id');
  });

  if(!accounts.length) {
    container.innerHTML = '<p class="text-xs text-slate-400 text-center py-6">Belum ada akun yang dapat dijadwalkan.</p>';
    return;
  }

  var header = '<tr>' +
    '<th class="sticky left-0 z-20 bg-slate-100 dark:bg-slate-700 px-3 py-2 text-left">No</th>' +
    '<th class="sticky left-10 z-20 min-w-[180px] bg-slate-100 dark:bg-slate-700 px-3 py-2 text-left">Karyawan</th>' +
    '<th class="sticky left-[220px] z-20 min-w-[90px] bg-slate-100 dark:bg-slate-700 px-3 py-2 text-left">Divisi</th>';
  ranges.forEach(function(range, index) {
    var weekNo = index + 1;
    header += '<th class="min-w-[132px] px-2 py-2 text-center"><div class="flex items-center justify-center gap-1"><span class="block">Minggu ' + weekNo + '</span><button type="button" id="jadwal-week-calendar-' + weekNo + '" onclick="openJadwalRangePicker(' + weekNo + ')" title="Atur rentang Minggu ' + weekNo + '" class="inline-flex h-5 w-5 items-center justify-center rounded-md text-indigo-500 hover:bg-indigo-100 dark:hover:bg-indigo-950/50"><i class="fa-solid fa-calendar-days text-[11px]"></i></button></div><span class="block text-[9px] font-medium text-slate-400">' + jadwalText(jadwalDateLabel(range.start_date)) + ' – ' + jadwalText(jadwalDateLabel(range.end_date)) + '</span></th>';
  });
  header += '</tr>';

  var body = accounts.map(function(account, accountIndex) {
    var cells = '';
    var fixed = account.scheduleMode === 'NON_SHIFT' && account.fixedSchedule;
    var fixedText = '';
    if(fixed) {
      var fixedLabel = fixed.effectiveShiftCode === 'NonShift' ? 'Non Shift' : String(fixed.effectiveShiftCode || 'NonShift').replace('Shift', 'Shift ');
      if(fixed.saturdayStart && fixed.saturdayStart !== fixed.start) {
        fixedText = 'Otomatis — ' + fixedLabel + '<br><span class="font-normal">Senin–Jumat<br>' + fixed.start + '–' + fixed.end + '<br>Sabtu<br>' + fixed.saturdayStart + '–' + fixed.saturdayEnd + '</span>';
      } else {
        fixedText = 'Otomatis — ' + fixedLabel + '<br><span class="font-normal">Senin–Sabtu<br>' + fixed.start + '–' + fixed.end + '</span>';
      }
    }
    ranges.forEach(function(range, index) {
      var week = index + 1;
      if(fixed) {
        cells += '<td class="border-t border-slate-100 dark:border-slate-700 px-2 py-2 align-middle"><span class="block rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-2 text-center text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300">' + fixedText + '</span></td>';
        return;
      }
      var selected = jadwalShiftFor(week, account.username, draftSelections);
      var cellId = 'jadwal-cell-w' + week + '-a' + accountIndex;
      cells += '<td class="border-t border-slate-100 dark:border-slate-700 px-2 py-2 align-middle">' +
        '<select id="' + cellId + '" data-jadwal-cell="true" data-jadwal-week="' + week + '" data-jadwal-role="' + jadwalText(account.scheduleRole) + '" data-jadwal-username="' + jadwalText(account.username) + '" onchange="jadwalApplyCellStyle(this)" class="w-full rounded-lg border-2 px-2 py-2 text-[11px] font-extrabold focus:outline-none focus:ring-2 focus:ring-blue-500/30">' +
          jadwalShiftOptions(selected, false) +
        '</select>' +
      '</td>';
    });
    return '<tr class="hover:bg-slate-50/70 dark:hover:bg-slate-700/30">' +
      '<td class="sticky left-0 z-10 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-center text-[11px] font-bold text-slate-400">' + (accountIndex + 1) + '</td>' +
      '<td class="sticky left-10 z-10 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"><p class="text-xs font-extrabold text-slate-800 dark:text-slate-100 whitespace-nowrap">' + jadwalText(account.display_name || account.username) + '</p><p class="text-[9px] text-slate-400 font-mono whitespace-nowrap">' + jadwalText(account.username) + '</p></td>' +
      '<td class="sticky left-[220px] z-10 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-[10px] font-bold text-slate-500 dark:text-slate-300">' + jadwalText(account.scheduleRole) + (fixed ? '<span class="block text-[9px] font-normal text-emerald-600 dark:text-emerald-300">Non Shift tetap</span>' : '') + '</td>' +
      cells +
    '</tr>';
  }).join('');

  container.innerHTML = '<div class="mb-3 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400">' +
    '<span><i class="fa-solid fa-circle-info mr-1 text-blue-500"></i>Pilih Shift 1, Shift 2, atau OFF untuk kelompok yang memakai mode Shift. Kelompok mode Non Shift dibuat otomatis sesuai jam kerja tunggal.</span>' +
    '<span class="flex flex-wrap items-center gap-2"><b class="rounded-md bg-slate-100 px-2 py-1 text-slate-500">OFF</b><b class="rounded-md bg-yellow-100 px-2 py-1 text-yellow-700">Shift 1</b><b class="rounded-md bg-blue-100 px-2 py-1 text-blue-700">Shift 2</b><b class="rounded-md bg-emerald-100 px-2 py-1 text-emerald-700">Non Shift</b></span>' +
  '</div>' +
  '<div class="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">' +
    '<table class="min-w-max w-full border-collapse text-left text-[10px] text-slate-600 dark:text-slate-300">' +
      '<thead class="bg-slate-100 dark:bg-slate-700 font-extrabold text-slate-600 dark:text-slate-200">' + header + '</thead>' +
      '<tbody>' + body + '</tbody>' +
    '</table>' +
  '</div>';

  container.querySelectorAll('select[data-jadwal-cell]').forEach(jadwalApplyCellStyle);
}

function collectJadwalAssignments() {
  var ranges = jadwalWeekRangesForPeriod.apply(null, (function() { var parts = jadwalMonthParts(jadwalMonthValue()); return [parts.year, parts.month]; })());
  var grouped = {};
  ranges.forEach(function(range, index) {
    var week = index + 1;
    ['Teknisi','CS','NOC','Admin','Finance','SPV'].forEach(function(role) {
      ['Shift1','Shift2'].forEach(function(shift) {
        grouped[week + '|' + role + '|' + shift] = {
          week_no: week,
          role: role,
          shift_code: shift,
          usernames: []
        };
      });
    });
  });

  var cells = document.querySelectorAll('#jadwal-week-editor select[data-jadwal-cell]');
  Array.from(cells).forEach(function(cell) {
    var shift = cell.value;
    if(shift !== 'Shift1' && shift !== 'Shift2' && shift !== 'NonShift') return;
    var week = Number(cell.getAttribute('data-jadwal-week'));
    var role = cell.getAttribute('data-jadwal-role');
    var username = cell.getAttribute('data-jadwal-username');
    var item = grouped[week + '|' + role + '|' + shift];
    if(!item || !username) return;
    if(item.usernames.indexOf(username) < 0) item.usernames.push(username);
  });

  return Object.keys(grouped).sort(function(a, b) {
    var pa = a.split('|'), pb = b.split('|');
    return Number(pa[0]) - Number(pb[0]) || pa[1].localeCompare(pb[1]) || pa[2].localeCompare(pb[2]);
  }).map(function(key) { return grouped[key]; });
}

async function loadJadwalAccounts() {
  var result = await supa.from('akun').select('username,display_name,role').order('display_name');
  if(result.error) throw result.error;
  _jadwalAccounts = (result.data || []).map(function(account) {
    var fixedSchedule = jadwalFixedSchedule(account.role);
    return {
      username: account.username,
      display_name: account.display_name || account.username,
      accountRole: account.role,
      scheduleRole: fixedSchedule ? fixedSchedule.scheduleRole : jadwalDisplayRole(account.role),
      scheduleMode: fixedSchedule ? 'NON_SHIFT' : 'SHIFT',
      fixedSchedule: fixedSchedule
    };
  }).filter(function(account) { return account.scheduleRole; });
}

async function loadJadwalPeriod() {
  var parts = jadwalMonthParts(jadwalMonthValue());
  var periodResult = await supa.from('attendance_schedule_periods')
    .select('*').eq('period_year', parts.year).eq('period_month', parts.month).maybeSingle();
  if(periodResult.error) throw periodResult.error;
  _jadwalPeriod = periodResult.data || null;
  _jadwalRows = [];
  if(_jadwalPeriod) {
    var rowsResult = await supa.from('attendance_schedule_rows')
      .select('*').eq('period_id', _jadwalPeriod.id).order('schedule_date');
    if(rowsResult.error) throw rowsResult.error;
    _jadwalRows = rowsResult.data || [];
  }
  _jadwalWeekRanges = jadwalNormalizeWeekRanges(_jadwalPeriod && _jadwalPeriod.week_ranges, parts.year, parts.month);
  renderJadwalEditor(_jadwalWeekRanges);
  var status = document.getElementById('jadwal-period-status');
  if(status) {
    status.textContent = _jadwalPeriod ? (_jadwalPeriod.status === 'PUBLISHED' ? 'Sudah dipublish' : 'Draft') : 'Belum dibuat';
    status.className = 'text-[10px] font-extrabold px-2.5 py-1 rounded-lg ' + (_jadwalPeriod && _jadwalPeriod.status === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300');
  }
  var count = document.getElementById('jadwal-period-count');
  if(count) count.textContent = _jadwalRows.length + ' jadwal harian';
}

async function initJadwalAdmin() {
  var role = currentUser ? String(currentUser.role || '').toLowerCase() : '';
  if(role !== 'admin') return;
  var monthInput = document.getElementById('jadwal-period-month');
  if(monthInput && !monthInput.value) monthInput.value = jadwalMonthValue();
  var editor = document.getElementById('jadwal-week-editor');
  if(editor) editor.innerHTML = '<p class="text-xs text-slate-400 text-center py-6"><i class="fa-solid fa-spinner animate-spin mr-2"></i>Memuat akun dan jadwal...</p>';
  try {
    await loadJadwalWorkConfig();
    await loadJadwalAccounts();
    await loadJadwalPeriod();
  } catch(e) {
    if(editor) editor.innerHTML = '<p class="text-xs text-rose-500 text-center py-6">Gagal memuat: ' + jadwalText(e.message) + '<br><span class="text-[10px]">Pastikan SQL jadwal sudah dijalankan.</span></p>';
  }
}

function jadwalMaterializeRows(assignments, year, month, periodId, weekRanges) {
  var rows = [];
  var accountMap = {};
  _jadwalAccounts.forEach(function(a) { accountMap[String(a.username).toLowerCase()] = a; });
  var fixedAccounts = _jadwalAccounts.filter(function(a) { return a.scheduleMode === 'NON_SHIFT' && a.fixedSchedule; });
  (weekRanges || []).forEach(function(range, index) {
    var weekNo = index + 1;
    var startDate = jadwalDateObject(range.start_date);
    var endDate = jadwalDateObject(range.end_date);
    for(var date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      var dow = date.getDay();
      var dateValue = jadwalDateFromObject(date);
      fixedAccounts.forEach(function(account) {
        if(account.fixedSchedule.days.indexOf(dow) < 0) return;
        var fixedTimes = jadwalWorkTime(account.fixedSchedule.workConfig, dow);
        if(!fixedTimes) return;
        rows.push({
          period_id: periodId,
          schedule_date: dateValue,
          week_no: weekNo,
          username: account.username,
          employee_name: account.display_name,
          role: account.scheduleRole,
          shift_code: account.fixedSchedule.effectiveShiftCode || 'NonShift',
          jam_masuk: fixedTimes.start,
          jam_pulang: fixedTimes.end,
          timezone: 'Asia/Jakarta',
          status_jadwal: 'TERJADWAL'
        });
      });
      assignments.filter(function(a) { return a.week_no === weekNo; }).forEach(function(assignment) {
        // Sabtu hanya Shift 1, Minggu hanya Shift 2 sesuai aturan kerja.
        var activeShift = dow === 6 ? 'Shift1' : dow === 0 ? 'Shift2' : null;
        if(activeShift && assignment.shift_code !== activeShift && !(assignment.role === 'NOC' && assignment.shift_code === 'NonShift')) return;
        assignment.usernames.forEach(function(username) {
          var account = accountMap[String(username).toLowerCase()];
          if(!account) return;
          var workConfig = jadwalWorkConfigFor(assignment.role, assignment.shift_code);
          var times = jadwalWorkTime(workConfig, dow);
          if(!times) return;
          rows.push({
            period_id: periodId,
            schedule_date: dateValue,
            week_no: weekNo,
            username: account.username,
            employee_name: account.display_name,
            role: assignment.role,
            shift_code: assignment.shift_code,
            jam_masuk: times.start,
            jam_pulang: times.end,
            timezone: 'Asia/Jakarta',
            status_jadwal: 'TERJADWAL'
          });
        });
      });
    }
  });
  var unique = {};
  return rows.filter(function(row) {
    var key = row.schedule_date + '|' + String(row.username).toLowerCase();
    if(unique[key]) return false;
    unique[key] = true;
    return true;
  });
}

async function upsertJadwalPeriod(status) {
  var role = currentUser ? String(currentUser.role || '').toLowerCase() : '';
  if(role !== 'admin') { showAlert('Hanya akun Admin yang dapat membuat atau mempublish jadwal.', 'Akses Ditolak'); return; }
  if(!_jadwalWorkConfig || !Object.keys(_jadwalWorkConfig).length) await loadJadwalWorkConfig();
  if(status === 'DRAFT' && _jadwalPeriod && _jadwalPeriod.status === 'PUBLISHED') {
    showAlert('Jadwal bulan ini sudah dipublish. Gunakan Update & Publish agar jadwal aktif tidak terhapus oleh Draft.', 'Jadwal Sudah Aktif');
    return;
  }
  var parts = jadwalMonthParts(jadwalMonthValue());
  var ranges = jadwalReadWeekRanges();
  var rangeError = jadwalValidateWeekRanges(ranges, parts.year, parts.month);
  if(rangeError) { showAlert(rangeError, 'Rentang Minggu Tidak Valid'); return; }
  _jadwalWeekRanges = ranges;
  var assignments = collectJadwalAssignments();
  var saveButton = document.getElementById(status === 'PUBLISHED' ? 'btn-publish-jadwal' : 'btn-save-jadwal');
  if(saveButton) saveButton.disabled = true;
  try {
    var periodResult = await supa.from('attendance_schedule_periods').upsert({
      period_year: parts.year,
      period_month: parts.month,
      week_ranges: ranges,
      status: status,
      created_by: _jadwalPeriod && _jadwalPeriod.created_by ? _jadwalPeriod.created_by : (currentUser.username || currentUser.displayName),
      published_by: status === 'PUBLISHED' ? (currentUser.username || currentUser.displayName) : null,
      published_at: status === 'PUBLISHED' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    }, {onConflict:'period_year,period_month'}).select().single();
    if(periodResult.error) throw periodResult.error;
    var period = periodResult.data;
    var rows = jadwalMaterializeRows(assignments, parts.year, parts.month, period.id, ranges);
    var deleteResult = await supa.from('attendance_schedule_rows').delete().eq('period_id', period.id);
    if(deleteResult.error) throw deleteResult.error;
    for(var start = 0; start < rows.length; start += 500) {
      var insertResult = await supa.from('attendance_schedule_rows').insert(rows.slice(start, start + 500));
      if(insertResult.error) throw insertResult.error;
    }
    _jadwalPeriod = period;
    _jadwalRows = rows;
    renderJadwalEditor();
    var statusEl = document.getElementById('jadwal-period-status');
    if(statusEl) statusEl.textContent = status === 'PUBLISHED' ? 'Sudah dipublish' : 'Draft';
    var count = document.getElementById('jadwal-period-count');
    if(count) count.textContent = rows.length + ' jadwal harian';
    showAlert(status === 'PUBLISHED' ? 'Jadwal berhasil dipublish dan langsung tampil di menu Jadwal Absensi.' : 'Draft jadwal berhasil disimpan.', 'Jadwal Tersimpan');
    if(status === 'PUBLISHED') loadJadwalMonitoring();
  } catch(e) {
    showAlert('Gagal menyimpan jadwal: ' + e.message + '\nPastikan SQL jadwal sudah dijalankan.', 'Error Jadwal');
  } finally {
    if(saveButton) saveButton.disabled = false;
  }
}

async function saveJadwalDraft() { await upsertJadwalPeriod('DRAFT'); }
async function publishJadwal() { await upsertJadwalPeriod('PUBLISHED'); }

function absensiJadwalMonthValue() {
  var el = document.getElementById('absensi-jadwal-month');
  if(el && /^\d{4}-\d{2}$/.test(el.value)) return el.value;
  var now = new Date();
  return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
}

async function loadJadwalSaya() {
  var el = document.getElementById('absensi-jadwal-list');
  if(!el || !currentUser) return;
  var parts = jadwalMonthParts(absensiJadwalMonthValue());
  var first = jadwalDate(parts.year, parts.month, 1);
  var last = jadwalDate(parts.year, parts.month, new Date(parts.year, parts.month, 0).getDate());
  el.innerHTML = '<p class="text-xs text-slate-400 text-center py-6"><i class="fa-solid fa-spinner animate-spin mr-2"></i>Memuat kalender jadwal...</p>';
  try {
    var result = await supa.from('attendance_schedule_rows').select('*, attendance_schedule_periods!inner(status)')
      .eq('attendance_schedule_periods.status', 'PUBLISHED')
      .ilike('username', currentUser.username).gte('schedule_date', first).lte('schedule_date', last).order('schedule_date');
    if(result.error) throw result.error;
    var rows = result.data || [];
    if(!rows.length) { el.innerHTML = '<p class="text-xs text-slate-400 text-center py-6">Belum ada jadwal yang dipublish untuk bulan ini.</p>'; return; }

    var rowsByDate = {};
    rows.forEach(function(row) { rowsByDate[String(row.schedule_date)] = row; });
      var todayValue = typeof jadwalTodayValue === 'function' ? jadwalTodayValue() : jadwalDate(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
    var monthDays = new Date(parts.year, parts.month, 0).getDate();
    var firstDate = new Date(parts.year, parts.month - 1, 1);
    var mondayOffset = (firstDate.getDay() + 6) % 7;
    var cells = [];
    for(var blank = 0; blank < mondayOffset; blank++) cells.push('<div class="hidden lg:block min-h-[96px]"></div>');

    for(var dayNumber = 1; dayNumber <= monthDays; dayNumber++) {
      var dateValue = jadwalDate(parts.year, parts.month, dayNumber);
      var date = new Date(parts.year, parts.month - 1, dayNumber);
      var row = rowsByDate[dateValue];
      var weekend = date.getDay() === 0 || date.getDay() === 6;
      var dayLabel = date.toLocaleDateString('id-ID', {weekday:'short', day:'2-digit', month:'short'});
      var shift1 = row && row.shift_code === 'Shift1';
      var shift2 = row && row.shift_code === 'Shift2';
      var nonShift = row && row.shift_code === 'NonShift';
      var isSwapped = row && !!row.swap_request_id;
      var cardClass = row ? (shift1 ? 'border-yellow-200 dark:border-yellow-800 bg-yellow-50/70 dark:bg-yellow-950/30' : shift2 ? 'border-blue-200 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/30' : nonShift ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/30' : 'border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-700/30') : (weekend ? 'border-rose-200 dark:border-rose-900 bg-rose-50/60 dark:bg-rose-950/20' : 'border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-700/30');
      var isToday = dateValue === todayValue;
      var todayClass = isToday ? ' jadwal-today-card relative ring-2 ring-indigo-500 dark:ring-indigo-400 shadow-lg' : '';
      var todayBadge = isToday ? '<span class="jadwal-today-badge"><i class="fa-solid fa-location-dot"></i> HARI INI</span>' : '';
      var badgeClass = shift1 ? 'bg-yellow-600 text-white' : shift2 ? 'bg-blue-600 text-white' : nonShift ? 'bg-emerald-600 text-white' : weekend ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-200' : 'bg-slate-200 text-slate-500 dark:bg-slate-600 dark:text-slate-300';
      var statusText = row ? (nonShift ? 'Non Shift' : row.shift_code.replace('Shift', 'Shift ')) : (weekend ? 'LIBUR' : 'OFF');
      var timeText = row ? jadwalText(String(row.jam_masuk).slice(0,5) + '–' + String(row.jam_pulang).slice(0,5)) : 'Tidak ada jadwal';
      var swapBadge = isSwapped ? '<span class="jadwal-swap-badge"><i class="fa-solid fa-arrow-right-arrow-left"></i> Tukar Shift</span>' : '';
      cells.push('<div class="min-h-[96px] rounded-xl border p-3 ' + cardClass + todayClass + '">' +
        '<div class="flex items-start justify-between gap-2"><p class="text-xs font-extrabold text-slate-800 dark:text-slate-100">' + jadwalText(dayLabel) + '</p><div class="flex items-center gap-1 ' + (isToday ? 'pt-0' : '') + '">' + todayBadge + '<span class="rounded-lg px-2 py-1 text-[9px] font-black ' + badgeClass + '">' + jadwalText(statusText) + '</span></div></div>' +
        '<p class="mt-3 text-[10px] font-bold ' + (row ? 'text-slate-600 dark:text-slate-300' : 'text-slate-400') + '">' + timeText + '</p>' +
        (row ? '<p class="mt-1 text-[9px] text-slate-400">Minggu ke-' + jadwalText(row.week_no) + '</p>' : '') +
        swapBadge +
      '</div>');
    }

    var weekdayHeaders = ['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu'].map(function(label) {
      return '<div class="rounded-lg bg-slate-100 dark:bg-slate-700 px-2 py-2 text-center text-[10px] font-extrabold text-slate-500 dark:text-slate-300">' + label + '</div>';
    }).join('');
    el.innerHTML = '<div class="mb-3 flex flex-wrap items-center justify-between gap-2"><p class="text-[10px] text-slate-400">Kalender absensi bulan ' + jadwalText(new Date(parts.year, parts.month - 1, 1).toLocaleDateString('id-ID', {month:'long', year:'numeric'})) + '</p><div class="flex flex-wrap gap-2 text-[9px] font-bold"><span class="rounded-lg bg-yellow-100 px-2 py-1 text-yellow-700"><i class="fa-solid fa-sun mr-1"></i>Shift 1</span><span class="rounded-lg bg-blue-100 px-2 py-1 text-blue-700"><i class="fa-solid fa-moon mr-1"></i>Shift 2</span><span class="rounded-lg bg-emerald-100 px-2 py-1 text-emerald-700"><i class="fa-solid fa-briefcase mr-1"></i>Non Shift</span><span class="rounded-lg bg-rose-100 px-2 py-1 text-rose-700"><i class="fa-solid fa-bed mr-1"></i>LIBUR</span></div></div>' +
      '<div class="hidden lg:grid grid-cols-7 gap-2">' + weekdayHeaders + '</div>' +
      '<div class="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-7">' + cells.join('') + '</div>';
  } catch(e) { el.innerHTML = '<p class="text-xs text-rose-500 text-center py-6">Gagal memuat jadwal: ' + jadwalText(e.message) + '</p>'; }
}

function monitoringDateValue() {
  var el = document.getElementById('monitoring-absen-date');
  if(el && /^\d{4}-\d{2}-\d{2}$/.test(el.value)) return el.value;
  var now = new Date();
  return jadwalDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

function monitoringStatus(row, attendance, now) {
  if(attendance) return {key:'HADIR', label: attendance.status_kehadiran || 'HADIR', color:'text-emerald-600 dark:text-emerald-400', attendance:attendance};
  var start = String(row.jam_masuk).slice(0,5).split(':').map(Number);
  var startMinutes = start[0] * 60 + start[1];
  var currentMinutes = now.getHours() * 60 + now.getMinutes();
  if(currentMinutes < startMinutes) return {key:'BELUM_WAKTU', label:'Belum waktunya', color:'text-blue-600 dark:text-blue-400'};
  return {key:'BELUM_ABSEN', label:'Belum absen', color:'text-rose-600 dark:text-rose-400'};
}

async function loadJadwalMonitoring() {
  var el = document.getElementById('monitoring-absen-list');
  if(!el) return;
  var date = monitoringDateValue();
  el.innerHTML = '<p class="text-xs text-slate-400 text-center py-5"><i class="fa-solid fa-spinner animate-spin mr-2"></i>Memuat monitoring...</p>';
  try {
    var scheduleResult = await supa.from('attendance_schedule_rows').select('*, attendance_schedule_periods!inner(status)')
      .eq('attendance_schedule_periods.status', 'PUBLISHED')
      .eq('schedule_date', date).order('role').order('shift_code').order('employee_name');
    if(scheduleResult.error) throw scheduleResult.error;
    var attendanceResult = await supa.from('absensi').select('id,username,nama,status_kehadiran,tanggal,jam_masuk_aktual').eq('tanggal', date);
    if(attendanceResult.error) throw attendanceResult.error;
    var attendanceByKey = {};
    (attendanceResult.data || []).forEach(function(item) {
      if(item.username) attendanceByKey['u:' + String(item.username).toLowerCase()] = item;
      if(item.nama) attendanceByKey['n:' + String(item.nama).toLowerCase()] = item;
    });
    var now = new Date();
    var rows = (scheduleResult.data || []).map(function(row) {
      var attendance = attendanceByKey['u:' + String(row.username).toLowerCase()] || attendanceByKey['n:' + String(row.employee_name).toLowerCase()];
      var status = monitoringStatus(row, attendance, now);
      return {row:row, attendance:attendance, status:status};
    });
    var countNotYet = rows.filter(function(item) { return item.status.key === 'BELUM_ABSEN'; }).length;
    var countEl = document.getElementById('monitoring-absen-count');
    if(countEl) countEl.textContent = rows.length + ' terjadwal • ' + countNotYet + ' belum absen';
    if(!rows.length) { el.innerHTML = '<p class="text-xs text-slate-400 text-center py-6">Tidak ada jadwal kerja pada tanggal ini.</p>'; return; }
    el.innerHTML = rows.map(function(item) {
      var row = item.row, status = item.status;
      var canRemind = status.key === 'BELUM_ABSEN';
      return '<div class="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800">' +
        '<div class="min-w-0"><p class="text-xs font-extrabold text-slate-800 dark:text-slate-100 truncate">' + jadwalText(row.employee_name) + '</p><p class="text-[10px] text-slate-400">' + jadwalText(row.role) + ' • ' + jadwalText(row.shift_code) + ' • masuk ' + jadwalText(String(row.jam_masuk).slice(0,5)) + '</p></div>' +
        '<div class="flex items-center gap-2"><span class="text-[10px] font-extrabold ' + status.color + '">' + jadwalText(status.label) + '</span>' +
        (canRemind ? '<button type="button" onclick="remindAttendance(\'' + jadwalText(row.username) + '\',\'' + jadwalText(row.id) + '\',\'' + jadwalText(row.employee_name) + '\')" class="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold"><i class="fa-solid fa-bell mr-1"></i>Peringatkan</button>' : '') +
        '</div></div>';
    }).join('');
  } catch(e) { el.innerHTML = '<p class="text-xs text-rose-500 text-center py-5">Gagal memuat monitoring: ' + jadwalText(e.message) + '</p>'; }
}

async function remindAttendance(username, scheduleId, employeeName) {
  var role = currentUser ? String(currentUser.role || '').toLowerCase() : '';
  if(role !== 'admin' && role !== 'owner') { showAlert('Hanya Admin/Owner yang dapat mengirim peringatan.', 'Akses Ditolak'); return; }
  var date = monitoringDateValue();
  try {
    var logResult = await supa.from('attendance_reminder_log').insert({
      schedule_id: scheduleId,
      reminder_date: date,
      reminder_type: 'MANUAL',
      recipient_username: username,
      sent_by: currentUser.username || currentUser.displayName,
      status: 'SENT'
    }).select().single();
    if(logResult.error) {
      if(String(logResult.error.code) === '23505') { showAlert('Peringatan untuk ' + employeeName + ' sudah pernah dikirim hari ini.', 'Sudah Dikirim'); return; }
      throw logResult.error;
    }
    var pushResult = await supa.functions.invoke('send-push', {body:{usernames:[String(username).toLowerCase()], title:'Pengingat Absensi', body:'' + employeeName + ', jangan lupa melakukan absensi hari ini.', url:'/'}});
    if(pushResult.error) throw pushResult.error;
    showAlert('Peringatan absensi dikirim ke ' + employeeName + '.', 'Peringatan Terkirim');
  } catch(e) {
    await supa.from('attendance_reminder_log').update({status:'FAILED', error_message:e.message}).eq('schedule_id', scheduleId).eq('reminder_date', date).eq('reminder_type','MANUAL');
    showAlert('Gagal mengirim peringatan: ' + e.message, 'Error Notifikasi');
  }
}

async function remindAllNotYet() {
  var buttons = document.querySelectorAll('#monitoring-absen-list button[onclick^="remindAttendance"]');
  if(!buttons.length) { showAlert('Tidak ada anggota yang perlu diperingatkan.', 'Monitoring Absensi'); return; }
  showAlert('Peringatan akan dikirim satu per satu ke ' + buttons.length + ' anggota yang belum absen.', 'Proses Peringatan');
  for(var i = 0; i < buttons.length; i++) buttons[i].click();
}

// ── INTEGRASI FORM ABSENSI DENGAN JADWAL HARI INI ────────────────
var _sinuAttendanceSchedule = null;

function jadwalTodayValue() {
  var formatter = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Jakarta', year:'numeric', month:'2-digit', day:'2-digit'});
  var formatted = formatter.format(new Date());
  if(/^\d{4}-\d{2}-\d{2}$/.test(formatted)) return formatted;
  var parts = formatter.formatToParts(new Date()).reduce(function(result, item) { result[item.type] = item.value; return result; }, {});
  return parts.year + '-' + parts.month + '-' + parts.day;
}

var _sinuAttendanceScheduleLoading = false;
var _sinuAttendanceScheduleRefreshTimer = null;
var _sinuAttendanceScheduleEventsBound = false;

function startJadwalAutoRefresh() {
  if(!_sinuAttendanceScheduleRefreshTimer) {
    _sinuAttendanceScheduleRefreshTimer = setInterval(function() {
      if(currentUser && document.visibilityState === 'visible') applyJadwalHariIni();
    }, 30000);
  }
  if(!_sinuAttendanceScheduleEventsBound) {
    _sinuAttendanceScheduleEventsBound = true;
    window.addEventListener('focus', function() { if(currentUser) applyJadwalHariIni(); });
    document.addEventListener('visibilitychange', function() { if(document.visibilityState === 'visible' && currentUser) applyJadwalHariIni(); });
  }
}

async function applyJadwalHariIni() {
  _sinuAttendanceSchedule = null;
  if(!currentUser || typeof supa === 'undefined') return;
  var role = String(currentUser.role || '').toLowerCase();
  if(['teknisi','cs','admin','finance','supervisor','spv','noc'].indexOf(role) < 0) return;
  startJadwalAutoRefresh();

  var shiftInput = document.getElementById('selectedShift');
  var info = document.getElementById('shift-info-text');
  var currentLabel = document.getElementById('shift-current-label');
  var buttons = Array.from(document.querySelectorAll('.shift-btn'));
  _sinuAttendanceScheduleLoading = true;
  if(shiftInput) shiftInput.value = '';
  buttons.forEach(function(button) {
    button.disabled = true;
    button.classList.remove('active','border-blue-600','bg-blue-50','dark:bg-blue-950/40','text-blue-900','dark:text-blue-300','border-yellow-500','bg-yellow-50','dark:bg-yellow-950/40','text-yellow-900','dark:text-yellow-300','border-emerald-500','bg-emerald-50','dark:bg-emerald-950/40','text-emerald-900','dark:text-emerald-300','border-rose-500','bg-rose-50','dark:bg-rose-950/40','text-rose-900','dark:text-rose-300');
    button.classList.add('opacity-50','cursor-not-allowed');
    button.title = 'Shift mengikuti jadwal yang dipublish Admin.';
  });
  if(info) info.textContent = 'Mendeteksi jadwal Anda untuk hari ini...';

  try {
    var result = await supa.from('attendance_schedule_rows').select('*, attendance_schedule_periods!inner(status,updated_at)')
      .eq('attendance_schedule_periods.status','PUBLISHED')
      .ilike('username', currentUser.username)
      .eq('schedule_date', jadwalTodayValue())
      .eq('status_jadwal','TERJADWAL')
      .order('created_at',{ascending:false})
      .limit(1);
    if(result.error) throw result.error;
    var rows = Array.isArray(result.data) ? result.data : [];
    _sinuAttendanceSchedule = rows[0] || null;

    if(_sinuAttendanceSchedule) {
      var scheduleCode = _sinuAttendanceSchedule.shift_code;
      var isNonShift = scheduleCode === 'NonShift';
      if(['Shift1','Shift2','NonShift'].indexOf(scheduleCode) < 0) throw new Error('Kode shift pada jadwal tidak valid.');
      if(shiftInput) shiftInput.value = scheduleCode;
      buttons.forEach(function(button,index) {
        var isSelected = (index === 0 && scheduleCode === 'Shift1') || (index === 1 && scheduleCode === 'Shift2') || (index === 2 && isNonShift);
        button.disabled = true;
        button.classList.toggle('opacity-50', !isSelected);
        button.classList.add('cursor-not-allowed');
        button.classList.remove('border-blue-600','bg-blue-50','dark:bg-blue-950/40','text-blue-900','dark:text-blue-300','border-yellow-500','bg-yellow-50','dark:bg-yellow-950/40','text-yellow-900','dark:text-yellow-300','border-emerald-500','bg-emerald-50','dark:bg-emerald-950/40','text-emerald-900','dark:text-emerald-300','border-rose-500','bg-rose-50','dark:bg-rose-950/40','text-rose-900','dark:text-rose-300');
        if(isSelected) {
          button.classList.remove('opacity-50');
          var activeClasses = isNonShift ? ['border-emerald-500','bg-emerald-50','dark:bg-emerald-950/40','text-emerald-900','dark:text-emerald-300'] : scheduleCode === 'Shift1' ? ['border-yellow-500','bg-yellow-50','dark:bg-yellow-950/40','text-yellow-900','dark:text-yellow-300'] : ['border-blue-600','bg-blue-50','dark:bg-blue-950/40','text-blue-900','dark:text-blue-300'];
          button.classList.add.apply(button.classList, activeClasses);
        }
      });
      var start = String(_sinuAttendanceSchedule.jam_masuk).slice(0,5);
      var end = String(_sinuAttendanceSchedule.jam_pulang).slice(0,5);
      var shiftLabel = isNonShift ? 'Non Shift' : scheduleCode.replace('Shift','Shift ');
      if(currentLabel) currentLabel.textContent = shiftLabel + ' • ' + start + '–' + end + ' WIB';
      if(info) info.textContent = 'Jadwal Anda: ' + shiftLabel + ' • masuk ' + start + ' • pulang ' + end + ' • toleransi 15 menit.';
      var s1 = document.getElementById('shift1-jam-label'), s2 = document.getElementById('shift2-jam-label'), ns = document.getElementById('nonshift-jam-label');
      if(s1 && scheduleCode === 'Shift1') s1.textContent = start + ' WIB';
      if(s2 && scheduleCode === 'Shift2') s2.textContent = start + ' WIB';
      if(ns && isNonShift) ns.textContent = start + ' WIB';
    } else {
      if(shiftInput) shiftInput.value = '';
      if(currentLabel) currentLabel.textContent = 'Belum ada jadwal hari ini';
      if(info) info.textContent = 'Belum ada jadwal absensi Anda untuk hari ini. Hubungi Admin.';
    }
  } catch(e) {
    _sinuAttendanceSchedule = null;
    if(shiftInput) shiftInput.value = '';
    if(currentLabel) currentLabel.textContent = 'Jadwal gagal dibaca';
    buttons.forEach(function(button) { button.disabled = true; button.classList.add('opacity-50','cursor-not-allowed'); });
    if(info) info.textContent = 'Jadwal gagal dibaca. Silakan muat ulang atau hubungi Admin.';
    console.warn('[Jadwal] Gagal membaca jadwal hari ini:', e.message);
  } finally {
    _sinuAttendanceScheduleLoading = false;
  }
}

function getJadwalAbsensiHariIni() { return _sinuAttendanceSchedule; }
