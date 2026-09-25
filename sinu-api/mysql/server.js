// =====================================================================
// SINU OPS SYSTEM — Node.js/Express + MySQL Backend
// Port: 3001 | DB: MySQL port 6969 | User: sinu_remote
// =====================================================================
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express    = require('express');
const cors       = require('cors');
const mysql      = require('mysql2/promise');
const bodyParser = require('body-parser');
const path       = require('path');
const { mysql: dbConfig, server: srvConfig } = require('./config');

const app = express();

// ── MIDDLEWARE ────────────────────────────────────────────────
app.use(cors({ origin: srvConfig.corsOrigins, credentials: true }));
app.use(bodyParser.json({ limit: '20mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '20mb' }));

// ── DATABASE POOL ─────────────────────────────────────────────
let pool;
async function initDB() {
  pool = mysql.createPool({
    host:            dbConfig.host,
    port:            dbConfig.port,
    user:            dbConfig.user,
    password:        dbConfig.password,
    database:        dbConfig.database,
    connectionLimit: dbConfig.connectionLimit,
    timezone:        dbConfig.timezone,
    charset:         dbConfig.charset,
    waitForConnections: true
  });
  const conn = await pool.getConnection();
  console.log(`✅ MySQL connected — ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
  conn.release();
}

// ── HELPERS ───────────────────────────────────────────────────
const q    = (sql, p = []) => pool.execute(sql, p);
const nil  = v => (v === undefined || v === '') ? null : v;

// Tabel yang boleh diakses via generic endpoint
const ALLOWED_TABLES = new Set([
  'akun','karyawan','absensi','odp','work_orders','wo_photos',
  'perangkat','perangkat_teknisi','device_history',
  'pickup_requests','material_requests','provisioning_requests',
  'tiket_dismantle','dismantle_items',
  'mitra','mitra_odc_access','mitra_invoices','mitra_baps',
  'pelanggan','pembayaran','baps_config',
  'attendance_work_time_configs','attendance_schedule_periods',
  'attendance_schedule_rows','attendance_shift_swap_requests',
  'attendance_reminder_log','push_subscriptions'
]);

// Primary key tiap tabel
const TABLE_PK = {
  akun: 'username', karyawan: 'id', absensi: 'id', odp: 'odp_id',
  work_orders: 'wo_id', wo_photos: 'id', perangkat: 'sn',
  perangkat_teknisi: 'id', device_history: 'id',
  pickup_requests: 'id', material_requests: 'id',
  provisioning_requests: 'id', tiket_dismantle: 'id',
  dismantle_items: 'id', mitra: 'id', mitra_odc_access: 'id',
  mitra_invoices: 'id', mitra_baps: 'id', pelanggan: 'id',
  pembayaran: 'id', baps_config: 'id',
  attendance_work_time_configs: 'id', attendance_schedule_periods: 'id',
  attendance_schedule_rows: 'id', attendance_shift_swap_requests: 'id',
  attendance_reminder_log: 'id', push_subscriptions: 'id'
};

// Parse filter dari query string: filters=JSON
// Format: [{ op:'eq', col:'status', val:'RELEASE' }, ...]
function buildWhere(filtersStr) {
  if (!filtersStr) return { where: '', params: [] };
  let filters;
  try { filters = JSON.parse(filtersStr); } catch { return { where: '', params: [] }; }
  if (!Array.isArray(filters) || !filters.length) return { where: '', params: [] };

  const clauses = [], params = [];
  for (const f of filters) {
    if (!f.col) continue;
    const col = '`' + f.col.replace(/`/g, '') + '`';
    switch (f.op) {
      case 'eq':       clauses.push(`${col} = ?`);          params.push(f.val); break;
      case 'neq':      clauses.push(`${col} != ?`);         params.push(f.val); break;
      case 'ilike':
      case 'like':     clauses.push(`${col} LIKE ?`);       params.push(f.val); break;
      case 'in':       if (Array.isArray(f.val) && f.val.length) {
                         clauses.push(`${col} IN (${f.val.map(()=>'?').join(',')})`);
                         params.push(...f.val);
                       } break;
      case 'not_is':   clauses.push(`${col} IS NOT NULL`);  break;
      case 'gte':      clauses.push(`${col} >= ?`);         params.push(f.val); break;
      case 'lte':      clauses.push(`${col} <= ?`);         params.push(f.val); break;
      case 'gt':       clauses.push(`${col} > ?`);          params.push(f.val); break;
      case 'lt':       clauses.push(`${col} < ?`);          params.push(f.val); break;
    }
  }
  return { where: clauses.length ? ' WHERE ' + clauses.join(' AND ') : '', params };
}

// ── HEALTH CHECK ──────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), db: dbConfig.database, port: dbConfig.port });
});

// ── LOGIN ─────────────────────────────────────────────────────
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'username & password wajib' });

    const [rows] = await q(
      'SELECT * FROM akun WHERE username = ?',
      [username.toLowerCase().trim()]
    );
    if (!rows.length) return res.status(401).json({ error: 'Username tidak ditemukan' });

    const u = rows[0];
    if (u.password !== password) return res.status(401).json({ error: 'Password salah' });

    res.json({
      data: {
        username:    u.username,
        role:        u.role || 'teknisi',
        displayName: u.display_name || u.username,
        avatar:      u.avatar || u.username.substring(0, 2).toUpperCase(),
        division:    u.division || '',
        photoUrl:    u.avatar_url || null,
        accountType: u.account_type || 'internal',
        mitraId:     u.mitra_id || null,
        token:       Buffer.from(u.username + ':' + Date.now()).toString('base64')
      }
    });
  } catch (e) {
    console.error('[Login]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── GENERIC GET /api/:table ───────────────────────────────────
// Query params: select, filters (JSON), orderBy, orderAsc, limit
app.get('/api/:table', async (req, res) => {
  const { table } = req.params;
  if (!ALLOWED_TABLES.has(table)) return res.status(404).json({ error: 'Table not found' });

  try {
    const { select = '*', filters, orderBy, orderAsc, limit } = req.query;

    // Sanitasi kolom select
    const cols = select === '*' ? '*'
      : select.split(',').map(c => '`' + c.trim().replace(/`/g, '') + '`').join(', ');

    const { where, params } = buildWhere(filters);

    let sql = `SELECT ${cols} FROM \`${table}\`` + where;

    if (orderBy) {
      const col = '`' + orderBy.replace(/`/g, '') + '`';
      sql += ` ORDER BY ${col} ${orderAsc === '0' ? 'DESC' : 'ASC'}`;
    } else {
      // default: terbaru dulu
      sql += ' ORDER BY id DESC';
    }

    if (limit) sql += ` LIMIT ${parseInt(limit) || 100}`;

    const [rows] = await q(sql, params);
    res.json({ data: rows });
  } catch (e) {
    console.error(`[GET /api/${table}]`, e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── GENERIC POST /api/:table (INSERT) ────────────────────────
app.post('/api/:table', async (req, res) => {
  const { table } = req.params;
  if (!ALLOWED_TABLES.has(table)) return res.status(404).json({ error: 'Table not found' });

  try {
    const row = req.body;
    if (!row || typeof row !== 'object') return res.status(400).json({ error: 'Body tidak valid' });

    // Serialisasi JSON array/object ke string untuk kolom MySQL
    const processed = {};
    for (const [k, v] of Object.entries(row)) {
      processed[k] = (v !== null && typeof v === 'object') ? JSON.stringify(v) : v;
    }

    const keys   = Object.keys(processed).map(k => '`' + k + '`').join(', ');
    const placeholders = Object.keys(processed).map(() => '?').join(', ');
    const values = Object.values(processed);

    const [result] = await q(
      `INSERT INTO \`${table}\` (${keys}) VALUES (${placeholders})`,
      values
    );
    res.status(201).json({ data: { insertId: result.insertId } });
  } catch (e) {
    console.error(`[POST /api/${table}]`, e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── GENERIC PATCH /api/:table (UPDATE dengan filter) ─────────
app.patch('/api/:table', async (req, res) => {
  const { table } = req.params;
  if (!ALLOWED_TABLES.has(table)) return res.status(404).json({ error: 'Table not found' });

  try {
    const { filters } = req.query;
    const patch = req.body;
    if (!patch || !Object.keys(patch).length) return res.status(400).json({ error: 'Patch kosong' });

    const { where, params: whereParams } = buildWhere(filters);
    if (!where) return res.status(400).json({ error: 'Filter wajib untuk UPDATE' });

    const setClauses = Object.keys(patch).map(k => '`' + k + '` = ?').join(', ');
    const setValues  = Object.values(patch).map(v =>
      (v !== null && typeof v === 'object') ? JSON.stringify(v) : v
    );

    const [result] = await q(
      `UPDATE \`${table}\` SET ${setClauses} ${where}`,
      [...setValues, ...whereParams]
    );
    res.json({ data: { affectedRows: result.affectedRows } });
  } catch (e) {
    console.error(`[PATCH /api/${table}]`, e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── GENERIC DELETE /api/:table ────────────────────────────────
app.delete('/api/:table', async (req, res) => {
  const { table } = req.params;
  if (!ALLOWED_TABLES.has(table)) return res.status(404).json({ error: 'Table not found' });

  try {
    const { filters } = req.query;
    const { where, params } = buildWhere(filters);
    if (!where) return res.status(400).json({ error: 'Filter wajib untuk DELETE' });

    const [result] = await q(`DELETE FROM \`${table}\` ${where}`, params);
    res.json({ data: { affectedRows: result.affectedRows } });
  } catch (e) {
    console.error(`[DELETE /api/${table}]`, e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── UPSERT /api/:table/upsert ─────────────────────────────────
app.post('/api/:table/upsert', async (req, res) => {
  const { table } = req.params;
  if (!ALLOWED_TABLES.has(table)) return res.status(404).json({ error: 'Table not found' });

  try {
    const { row } = req.body;
    if (!row) return res.status(400).json({ error: 'row wajib diisi' });

    const processed = {};
    for (const [k, v] of Object.entries(row)) {
      processed[k] = (v !== null && typeof v === 'object') ? JSON.stringify(v) : v;
    }

    const keys   = Object.keys(processed).map(k => '`' + k + '`').join(', ');
    const ph     = Object.keys(processed).map(() => '?').join(', ');
    const values = Object.values(processed);

    // UPDATE semua kolom kecuali PK saat duplikat
    const pk = TABLE_PK[table] || 'id';
    const updateClauses = Object.keys(processed)
      .filter(k => k !== pk)
      .map(k => `\`${k}\` = VALUES(\`${k}\`)`)
      .join(', ');

    const sql = updateClauses
      ? `INSERT INTO \`${table}\` (${keys}) VALUES (${ph}) ON DUPLICATE KEY UPDATE ${updateClauses}`
      : `INSERT IGNORE INTO \`${table}\` (${keys}) VALUES (${ph})`;

    const [result] = await q(sql, values);
    res.status(201).json({ data: { insertId: result.insertId, affectedRows: result.affectedRows } });
  } catch (e) {
    console.error(`[UPSERT /api/${table}]`, e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── STORAGE UPLOAD /api/storage/upload ───────────────────────
// Simpan file sebagai base64 di tabel wo_photos
app.post('/api/storage/upload', async (req, res) => {
  try {
    const { bucket, path: filePath, file_base64, wo_id, step, key, label } = req.body;
    if (!file_base64 || !wo_id) return res.status(400).json({ error: 'file_base64 & wo_id wajib' });

    const [result] = await q(
      `INSERT INTO wo_photos (wo_id, step, \`key\`, label, photo_base64) VALUES (?,?,?,?,?)`,
      [wo_id, step || 'kendala', key || 'foto', label || filePath || 'foto', file_base64]
    );
    const publicUrl = `/api/storage/${bucket || 'wo-media'}/${filePath || result.insertId}`;
    res.json({ data: { insertId: result.insertId, publicUrl } });
  } catch (e) {
    console.error('[Storage Upload]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── SERVE FRONTEND (Deploy netifly/) ─────────────────────────
app.use(express.static(path.join(__dirname, '../')));

// SPA fallback — Express 5 menggunakan (req, res, next) tanpa wildcard '*'
app.use((req, res) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/health')) {
    res.sendFile(path.join(__dirname, '../index.html'));
  } else {
    res.status(404).json({ error: 'Route not found' });
  }
});

// ── START ─────────────────────────────────────────────────────
initDB().then(() => {
  app.listen(srvConfig.port, '0.0.0.0', () => {
    console.log(`🚀 SINU OPS API running on port ${srvConfig.port}`);
    console.log(`   Frontend : http://localhost:${srvConfig.port}/`);
    console.log(`   Health   : http://localhost:${srvConfig.port}/health`);
    console.log(`   DB       : ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
  });
}).catch(err => {
  console.error('❌ Gagal koneksi ke MySQL:', err.message);
  process.exit(1);
});

process.on('SIGTERM', () => { pool && pool.end(); process.exit(0); });
process.on('SIGINT',  () => { pool && pool.end(); process.exit(0); });
