// ===================== MySQL Config — SINU OPS =====================
// Nilai diambil dari .env — jangan hardcode kredensial di sini
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

module.exports = {
  mysql: {
    host:            process.env.MYSQL_HOST     || '127.0.0.1',
    port:            parseInt(process.env.MYSQL_PORT || '6969'),
    user:            process.env.MYSQL_USER     || 'sinu_remote',
    password:        process.env.MYSQL_PASSWORD || 'sinu123456',
    database:        process.env.MYSQL_DATABASE || 'sinu_ops',
    connectionLimit: 10,
    timezone:        '+07:00',
    charset:         'utf8mb4'
  },
  server: {
    port:        parseInt(process.env.PORT || '3001'),
    jwtSecret:   process.env.JWT_SECRET   || 'sinu_ops_jwt_secret_2026',
    corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3001').split(',').map(s => s.trim())
  }
};
