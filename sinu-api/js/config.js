// ===================== DATA MASTER =====================
// ACCOUNTS lokal hanya sebagai fallback jika MySQL tidak tersedia
// Data akun utama diambil dari tabel 'akun' di database MySQL
const ACCOUNTS = [];

// API Endpoint configuration
const API_BASE = '';

// ODP — diambil dari MySQL tabel 'odp'
let odpMaster = [];

// Karyawan — diambil dari MySQL tabel 'karyawan'
let employeeMaster = [];

// State global aplikasi
let currentUser = null, locationData = null, capturedImageData = null, faceModel = null;
let mainChartInstance = null, donutChartInstance = null;
let currentRoleFilter = 'All', currentChartPeriod = 'monthly';
let activeCancelWOType = null, myPickedTasks = [];
let sickHasDoc = true;

// Release tickets — diambil dari MySQL tabel 'work_orders' status RELEASE
const releaseTickets = [];

// KPI WO data — diambil dari MySQL tabel 'work_orders'
let kpiWOData = [];

// Device histories — diambil dari MySQL tabel 'device_history'
const deviceHistories = {};

// Absensi points — diambil dari MySQL tabel 'absensi'
let absensiPoints = {};
