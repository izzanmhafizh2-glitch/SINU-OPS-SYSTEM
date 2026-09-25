// ===================== CONFIG & DATA MASTER =====================
// Database: MySQL via REST API (db.js)
// Ganti API_BASE_URL di db.js sesuai alamat backend Node.js Anda
// ================================================================

// ODP — diambil dari tabel 'odp' via REST API
let odpMaster = [];

// Karyawan — diambil dari tabel 'karyawan' via REST API
let employeeMaster = [];

// State global aplikasi
let currentUser = null, locationData = null, capturedImageData = null, faceModel = null;
let mainChartInstance = null, donutChartInstance = null;
let currentRoleFilter = 'All';
let absensiRawData = [];
let activeCancelWOType = null, myPickedTasks = [];
let sickHasDoc = true;

// ACCOUNTS lokal — fallback darurat jika API tidak tersedia
const ACCOUNTS = [];

// Release tickets — diambil dari tabel 'work_orders' status RELEASE
const releaseTickets = [];

// KPI WO data — diambil dari tabel 'work_orders'
let kpiWOData = [];

// Device histories — diambil dari tabel 'device_history'
const deviceHistories = {};

// Absensi points — diambil dari tabel 'absensi'
let absensiPoints = {};
