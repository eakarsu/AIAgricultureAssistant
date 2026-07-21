const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [741001]);
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    const directory = path.join(__dirname, '..', 'migrations');
    for (const filename of fs.readdirSync(directory).filter((name) => name.endsWith('.sql')).sort()) {
      const sql = fs.readFileSync(path.join(directory, filename), 'utf8');
      const checksum = crypto.createHash('sha256').update(sql).digest('hex');
      const prior = await client.query('SELECT checksum FROM schema_migrations WHERE filename=$1', [filename]);
      if (prior.rows.length) {
        if (prior.rows[0].checksum !== checksum) throw new Error(`Applied migration changed: ${filename}`);
        continue;
      }
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations(filename, checksum) VALUES ($1,$2)', [filename, checksum]);
        await client.query('COMMIT');
        console.log(`applied ${filename}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    try { await client.query('SELECT pg_advisory_unlock($1)', [741001]); } catch (_) {}
    client.release();
    await pool.end();
  }
}

migrate().catch((error) => { console.error(error.message); process.exitCode = 1; });
