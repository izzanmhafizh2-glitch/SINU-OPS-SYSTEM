// ===================== DB ABSTRACTION LAYER =====================
// Pengganti Supabase client — semua query dikirim ke REST API backend
// Backend: Node.js/Express + MySQL (lihat /db/schema.sql)
// ================================================================

// URL backend Node.js/Express via Cloudflare Tunnel
// CATATAN: Quick tunnel URL berubah setiap restart cloudflared
// Untuk URL permanen, daftar akun Cloudflare dan buat named tunnel
const API_BASE_URL = (typeof window !== 'undefined' && window.SINU_API_URL)
  ? window.SINU_API_URL
  : 'https://measuring-races-education-antonio.trycloudflare.com';

// ── AUTH TOKEN ────────────────────────────────────────────────
function dbGetToken() {
  try {
    const s = localStorage.getItem('sinu_user');
    if (!s) return null;
    const u = JSON.parse(s);
    return u && u.token ? u.token : null;
  } catch(e) { return null; }
}

// ── CORE FETCH HELPER ─────────────────────────────────────────
// Menggantikan pola: const { data, error } = await supa.from(table)...
// Setiap fungsi mengembalikan { data, error } agar kompatibel dengan kode lama.
async function dbFetch(path, options = {}) {
  const token = dbGetToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  if (options.headers) Object.assign(headers, options.headers);

  try {
    const res = await fetch(API_BASE_URL + path, {
      ...options,
      headers
    });
    const text = await res.text();
    let body;
    try { body = text ? JSON.parse(text) : null; } catch(e) { body = { message: text }; }

    if (!res.ok) {
      return { data: null, error: { message: body && body.message ? body.message : 'HTTP ' + res.status } };
    }
    // Backend selalu kembalikan { data: [...] } atau { data: {...} }
    return { data: body && body.data !== undefined ? body.data : body, error: null };
  } catch(e) {
    return { data: null, error: { message: e.message || 'Network error' } };
  }
}

// ── QUERY BUILDER ─────────────────────────────────────────────
// Meniru pola Supabase: db.from('table').select().eq().order().limit()
// Semua method chainable, diakhiri dengan .get() / .single() / .run()

function db() {
  return {
    _table: '',
    _select: '*',
    _filters: [],
    _order: null,
    _orderAsc: true,
    _limit: null,
    _single: false,

    from(table) { this._table = table; return this; },

    select(cols) { this._select = cols || '*'; return this; },

    eq(col, val)     { this._filters.push({ op: 'eq',     col, val }); return this; },
    neq(col, val)    { this._filters.push({ op: 'neq',    col, val }); return this; },
    ilike(col, val)  { this._filters.push({ op: 'ilike',  col, val }); return this; },
    like(col, val)   { this._filters.push({ op: 'like',   col, val }); return this; },
    in(col, arr)     { this._filters.push({ op: 'in',     col, val: arr }); return this; },
    not(col, op, val){ this._filters.push({ op: 'not_'+op, col, val }); return this; },
    gte(col, val)    { this._filters.push({ op: 'gte',    col, val }); return this; },
    lte(col, val)    { this._filters.push({ op: 'lte',    col, val }); return this; },
    gt(col, val)     { this._filters.push({ op: 'gt',     col, val }); return this; },
    lt(col, val)     { this._filters.push({ op: 'lt',     col, val }); return this; },

    order(col, opts) {
      this._order = col;
      this._orderAsc = opts && opts.ascending === false ? false : true;
      return this;
    },

    limit(n) { this._limit = n; return this; },

    // Bangun query params
    _buildParams(extra = {}) {
      const p = {
        select: this._select,
        filters: JSON.stringify(this._filters),
        ...extra
      };
      if (this._order) { p.orderBy = this._order; p.orderAsc = this._orderAsc ? '1' : '0'; }
      if (this._limit) p.limit = this._limit;
      return new URLSearchParams(p).toString();
    },

    // SELECT — kembalikan array
    async get() {
      const qs = this._buildParams();
      return dbFetch('/api/' + this._table + '?' + qs);
    },

    // SELECT SINGLE — kembalikan satu objek atau null
    async maybeSingle() {
      this._limit = 1;
      const qs = this._buildParams();
      const res = await dbFetch('/api/' + this._table + '?' + qs);
      if (res.error) return res;
      const arr = Array.isArray(res.data) ? res.data : (res.data ? [res.data] : []);
      return { data: arr.length ? arr[0] : null, error: null };
    },

    // INSERT
    async insert(row) {
      return dbFetch('/api/' + this._table, {
        method: 'POST',
        body: JSON.stringify(row)
      });
    },

    // UPDATE — gunakan filter .eq() sebelum .update()
    async update(patch) {
      const qs = this._buildParams();
      return dbFetch('/api/' + this._table + '?' + qs, {
        method: 'PATCH',
        body: JSON.stringify(patch)
      });
    },

    // DELETE — gunakan filter .eq() sebelum .delete()
    async delete() {
      const qs = this._buildParams();
      return dbFetch('/api/' + this._table + '?' + qs, { method: 'DELETE' });
    },

    // UPSERT — INSERT ... ON DUPLICATE KEY UPDATE
    async upsert(row, opts) {
      return dbFetch('/api/' + this._table + '/upsert', {
        method: 'POST',
        body: JSON.stringify({ row, onConflict: opts && opts.onConflict ? opts.onConflict : null })
      });
    }
  };
}

// ── STORAGE (pengganti Supabase Storage) ──────────────────────
// Upload file ke backend, disimpan di server atau S3-compatible
const dbStorage = {
  from(bucket) {
    return {
      _bucket: bucket,
      async upload(path, file, opts) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('path', path);
        fd.append('bucket', bucket);
        const token = dbGetToken();
        const headers = {};
        if (token) headers['Authorization'] = 'Bearer ' + token;
        try {
          const res = await fetch(API_BASE_URL + '/api/storage/upload', {
            method: 'POST', headers, body: fd
          });
          const body = await res.json();
          if (!res.ok) return { data: null, error: { message: body.message || 'Upload gagal' } };
          return { data: body.data, error: null };
        } catch(e) {
          return { data: null, error: { message: e.message } };
        }
      },
      getPublicUrl(path) {
        return { data: { publicUrl: API_BASE_URL + '/storage/' + bucket + '/' + path } };
      }
    };
  }
};

// ── REALTIME (polling sederhana pengganti Supabase Realtime) ──
// Supabase Realtime diganti polling interval.
// Panggil dbRealtime.subscribe(fn, intervalMs) — fn dipanggil tiap interval.
const dbRealtime = {
  _channels: {},

  channel(name) {
    return {
      _name: name,
      _callbacks: [],
      on(event, opts, cb) {
        this._callbacks.push({ event, opts, cb });
        return this;
      },
      subscribe(statusCb) {
        // Simpan ke registry untuk polling
        dbRealtime._channels[this._name] = {
          callbacks: this._callbacks,
          interval: null
        };
        if (statusCb) statusCb('SUBSCRIBED');
        return this;
      }
    };
  },

  // Jalankan polling untuk semua channel terdaftar
  startPolling(fn, intervalMs = 10000) {
    const id = setInterval(fn, intervalMs);
    return id;
  },

  removeChannel(name) {
    if (this._channels[name] && this._channels[name].interval) {
      clearInterval(this._channels[name].interval);
    }
    delete this._channels[name];
  }
};

// ── GLOBAL ALIAS (kompatibilitas kode lama pakai 'supa') ──────
// Kode yang masih pakai supa.from() / supa.storage / supa.channel()
// akan otomatis diarahkan ke db layer ini.
const supa = {
  from: (table) => db().from(table),
  storage: dbStorage,
  channel: (name) => dbRealtime.channel(name),
  removeChannel: (ch) => { /* no-op */ }
};
