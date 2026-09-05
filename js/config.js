// ===================== DATA MASTER =====================
// ACCOUNTS lokal hanya sebagai fallback jika Supabase tidak tersedia
// Data akun utama diambil dari tabel 'akun' di Supabase
const ACCOUNTS = [];

// ODP — diambil dari Supabase tabel 'odp', array ini hanya default kosong
let odpMaster = [];

// Karyawan — diambil dari Supabase tabel 'karyawan'
let employeeMaster = [];

// State global aplikasi
let currentUser = null, locationData = null, capturedImageData = null, faceModel = null;
let mainChartInstance = null, donutChartInstance = null;
let currentRoleFilter = 'All', currentChartPeriod = 'monthly';
let activeCancelWOType = null, myPickedTasks = [];
let sickHasDoc = true;

// Release tickets — diambil dari Supabase tabel 'work_orders' status RELEASE
const releaseTickets = [];

// KPI WO data — diambil dari Supabase tabel 'work_orders'
let kpiWOData = [];

// KPI history — diambil dari Supabase
let kpiHistory = [];

// Device histories — diambil dari Supabase tabel 'device_history'
const deviceHistories = {};

// Absensi points — diambil dari Supabase tabel 'absensi'
let absensiPoints = {};
