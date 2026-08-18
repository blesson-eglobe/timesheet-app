import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import { env } from '../config/env';
import { pool } from '../config/db';

async function runMigrations() {
  console.log('Connecting to database...');
  try {
    const initConn = await mysql.createConnection({
      host: env.db.host,
      port: env.db.port,
      user: env.db.user,
      password: env.db.password,
      ssl: env.db.ssl ? { rejectUnauthorized: false } : undefined,
    });
    await initConn.query(`CREATE DATABASE IF NOT EXISTS \`${env.db.database}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;`);
    await initConn.end();
  } catch (err: any) {
    console.log('Notice: Skipping database creation query (cloud database already exists).');
  }

  const sql = fs.readFileSync(path.join(__dirname, 'migrations.sql'), 'utf-8');
  console.log('Running table migrations...');
  
  // Strip out comments and split by semicolon
  const cleanSql = sql.replace(/--.*(\r?\n|$)/g, '\n');
  const statements = cleanSql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    if (statement) {
      await pool.query(statement);
    }
  }

  // ── Column Sync Alter Checks ───────────────────────────────────────────
  try {
    await pool.query(
      "ALTER TABLE projects ADD COLUMN project_type VARCHAR(20) NOT NULL DEFAULT 'Billable'"
    );
    console.log("  ✓ Added missing project_type column to projects table");
  } catch (err: any) {
    // Ignore if column already exists (ER_DUP_FIELDNAME / 1060)
  }

  try {
    await pool.query(
      "ALTER TABLE notifications ADD COLUMN meta VARCHAR(255) NOT NULL DEFAULT ''"
    );
    console.log("  ✓ Added missing meta column to notifications table");
  } catch (err: any) {
    // Ignore if column already exists
  }

  console.log('✅ Migrations complete.');
  await pool.end();
}

runMigrations().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
