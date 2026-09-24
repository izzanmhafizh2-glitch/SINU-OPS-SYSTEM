# MySQL Database Guide for SINU OPS SYSTEM

**Status:** FULLY OPERATIONAL  
**Created:** September 2026  
**Last Updated:** September 15, 2026

---

## Overview

The SINU OPS SYSTEM has been successfully migrated from Supabase (PostgreSQL) to MySQL database running on the local server. The API server is powered by Node.js + Express.js.

---

## System Information

| Component | Version/Location |
|-----------|------------------|
| **OS** | Linux (Ubuntu) |
| **MySQL** | 8.4.11 |
| **Node.js** | v22.22.1 |
| **npm** | 9.2.0 |
| **API Server** | `/home/sinu/CONTOH APK/Deploy netifly/mysql/server.js` |
| **Database Name** | `sinu_ops` |
| **API Port** | 3000 |

---

## Database Setup

### Database Credentials

```javascript
{
  host: 'localhost',
  port: 3306,
  user: 'sinu_user',
  password: 'sinu_password',
  database: 'sinu_ops'
}
```

### Connection

```bash
mysql -u sinu_user -psinu_password sinu_ops
```

---

## Available Tables (12 tables)

| Table | Purpose |
|-------|---------|
| `akun` | User accounts (login, role, display_name) |
| `karyawan` | Employee data (nama, role, avatar) |
| `absensi` | Daily attendance records |
| `odp` | ODP inventory (location, capacity) |
| `work_orders` | All WO tickets (status, type, customer) |
| `perangkat` | Warehouse material inventory |
| `perangkat_teknisi` | Materials assigned to technicians |
| `device_history` | Device movement history |
| `pickup_requests` | Material pickup requests |
| `material_requests` | Material send/return requests |
| `provisioning_requests` | Provisioning queue |
| `wo_photos` | WO documentation photos |
| `push_subscriptions` | Web push device subscriptions |

---

## API Endpoints

### Authentication
- `POST /api/login` - User login

### Users
- `GET /api/users` - List all users
- `POST /api/users` - Create new user

### Employees
- `GET /api/employees` - List all employees
- `POST /api/employees` - Create new employee

### Attendance
- `GET /api/attendance/:date` - Get attendance by date
- `POST /api/attendance` - Create attendance record

### ODP
- `GET /api/odp` - List all ODPs
- `GET /api/odp/:id` - Get ODP by ID
- `POST /api/odp` - Create/Update ODP

### Work Orders
- `GET /api/work-orders` - List all WO (with filters)
- `GET /api/work-orders/:id` - Get WO by ID
- `GET /api/work-orders/status/:status` - Get WO by status
- `POST /api/work-orders` - Create new WO
- `PUT /api/work-orders/:id/status` - Update WO status

### Materials
- `GET /api/materials` - List all materials
- `POST /api/materials` - Create material
- `GET /api/materials/teknisi/:teknisi` - Get tecnici's materials

### Pickup Requests
- `GET /api/pickup-requests` - List all requests
- `GET /api/pickup-requests/:teknisi` - Get requests by teknisi
- `POST /api/pickup-requests` - Create request
- `PUT /api/pickup-requests/:id` - Update status (Admin)

### Provisioning
- `GET /api/provisioning` - List all provisioning requests
- `POST /api/provisioning` - Create provisioning request
- `PUT /api/provisioning/:id` - Update provisioning status

### WO Photos
- `GET /api/wo-photos/:woId` - Get photos for WO
- `POST /api/wo-photos` - Add photo to WO

### Push Subscriptions
- `GET /api/push-subscriptions` - List subscriptions
- `POST /api/push-subscriptions` - Create subscription

### Device History
- `GET /api/device-history/:sn` - Get device history
- `POST /api/device-history` - Create device history

### System
- `GET /health` - Health check

---

## API Usage Examples

### Login
```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### Create Work Order
```bash
curl -X POST http://localhost:3000/api/work-orders \
  -H "Content-Type: application/json" \
  -d '{
    "wo_id":"WO-2026-001",
    "pelanggan":"PT. Customer Indah",
    "tipe":"INSTALASI",
    "cs_name":"CS - Jane",
    "teknisi_1":"John Doe",
    "teknisi_2":"Bob Smith",
    "t1":"2026-09-15T08:00:00",
    "t2":"2026-09-15T09:30:00",
    "status":"RELEASE",
    "bulan":9,
    "tahun":2026,
    "registrasi":500000,
    "paket":150000,
    "nama_paket":"Business Plus",
    "marketing":"Marketing A",
    "username_pppoe":"cp_001",
    "password_pppoe":"pass123",
    "status_koneksi":"Rumahan",
    "nohp":"081234567890",
    "koordinat":"-6.200000,106.816666"
  }'
```

### Get All Work Orders
```bash
curl http://localhost:3000/api/work-orders
```

### Get ODP by ID
```bash
curl http://localhost:3000/api/odp/ODP-001
```

### Get Attendance by Date
```bash
curl http://localhost:3000/api/attendance/2026-09-15
```

---

## MySQL Server Management

### Start Server
```bash
cd "/home/sinu/CONTOH APK/Deploy netifly"
node mysql/server.js
```

### Run as Background Process
```bash
cd "/home/sinu/CONTOH APK/Deploy netifly"
nohup node mysql/server.js > mysql/server.log 2>&1 &
```

### Using PM2 (Recommended)
```bash
npm install -g pm2
pm2 start mysql/server.js --name sinu-api
pm2 save
pm2 status
```

### Using Systemd
```bash
sudo nano /etc/systemd/system/sinu-api.service
# Paste config (see README.md)
sudo systemctl daemon-reload
sudo systemctl enable sinu-api
sudo systemctl start sinu-api
sudo systemctl status sinu-api
```

### Stop Server
```bash
pkill -f "node mysql/server.js"
# or
pm2 stop sinu-api
```

---

## Sample Data

Default admin account:
- **Username:** `admin`
- **Password:** `admin123`
- **Role:** `supervisor`

---

## Database Schema

See `mysql/schema.sql` for complete database schema. Key features:

- All tables use InnoDB engine
- UTF8MB4 character set for full Unicode support
- Proper indexes on frequently queried columns
- Auto-increment IDs where applicable
- Timestamp fields (created_at, updated_at) for audit trail

---

## Security Recommendations

For production deployment:

1. **Use Environment Variables**
   ```bash
   export MYSQL_HOST=localhost
   export MYSQL_PORT=3306
   export MYSQL_USER=sinu_user
   export MYSQL_PASSWORD=your_secure_password
   export MYSQL_DATABASE=sinu_ops
   export PORT=3000
   export NODE_ENV=production
   ```

2. **Enable MySQL SSL**
   - Configure SSL connections in MySQL
   - Update server config to use SSL

3. **Implement JWT Authentication**
   - Replace simple password check with JWT tokens
   - Add token refresh mechanism

4. **Network Security**
   - Firewall MySQL port (3306) to only allow localhost
   - Use Nginx as reverse proxy with SSL termination
   - Restrict API access by IP if needed

5. **Regular Backups**
   ```bash
   # Daily backup at 2 AM
   0 2 * * * mysqldump -u sinu_user -p'password' sinu_ops | gzip > /backup/sinu_ops_$(date +\%Y\%m\%d).sql.gz
   ```

---

## Troubleshooting

### Connection Refused
```bash
# Check MySQL is running
sudo systemctl status mysql

# Check server is running
ps aux | grep "node mysql/server.js"
```

### Permission Denied
```sql
-- Grant privileges
GRANT ALL PRIVILEGES ON sinu_ops.* TO 'sinu_user'@'localhost';
FLUSH PRIVILEGES;
```

### Column Count Doesn't Match
- Ensure SQL column count matches parameter count
- Check for trailing commas in SQL
- Verify all required fields are provided in request body

---

## Files Structure

```
Deploy netifly/
├── index.html              # Main application
├── css/
│   └── main.css
├── js/
│   ├── config.js
│   ├── supabase-init.js    # Old Supabase (to be removed)
│   └── ...
├── mysql/
│   ├── schema.sql          # Database schema
│   ├── config.js           # MySQL configuration
│   ├── server.js           # Express API server
│   └── README.md           # This file
└── package.json
```

---

## Migration Notes

The system was originally built with Supabase (PostgreSQL). The migration to MySQL includes:

1. **Database Schema** - Converted PostgreSQL syntax to MySQL
2. **API Layer** - Replaced Supabase client with Express.js + mysql2
3. **Data Types** - PostgreSQL `bigint` → MySQL `int`, `timestamptz` → `timestamp`
4. **String Handling** - PostgreSQL `||` → MySQL `CONCAT()` or JavaScript template literals

---

## Support

For issues or questions, contact:
- **Email:** support@sinu.co.id
- **Developer:** sinu@admin
