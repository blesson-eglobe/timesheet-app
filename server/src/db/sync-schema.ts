import { pool } from '../config/db';

async function syncSchema() {
  console.log('🔄 Syncing schema columns on Aiven Cloud MySQL...');

  const alters = [
    `ALTER TABLE users ADD COLUMN username VARCHAR(100) UNIQUE NULL;`,
    `ALTER TABLE users ADD COLUMN department VARCHAR(100) NOT NULL DEFAULT '';`,
    `ALTER TABLE users ADD COLUMN designation VARCHAR(100) NOT NULL DEFAULT '';`,
    `ALTER TABLE users ADD COLUMN initials VARCHAR(4) NOT NULL DEFAULT '';`,
    `ALTER TABLE users ADD COLUMN color VARCHAR(20) NOT NULL DEFAULT '#2563EB';`,
    `ALTER TABLE users ADD COLUMN avatar VARCHAR(500) NOT NULL DEFAULT '';`,
    `ALTER TABLE users ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'Active';`,
    `ALTER TABLE users ADD COLUMN reporting_manager_id VARCHAR(36) NULL;`,

    `ALTER TABLE work_logs ADD COLUMN task_description TEXT;`,
    `ALTER TABLE work_logs ADD COLUMN task_status VARCHAR(20) NOT NULL DEFAULT 'In Progress';`,

    `ALTER TABLE projects ADD COLUMN description TEXT;`,
    `ALTER TABLE projects ADD COLUMN priority VARCHAR(20) NOT NULL DEFAULT 'Medium';`,
    `ALTER TABLE projects ADD COLUMN logged_hours DECIMAL(8,2) NOT NULL DEFAULT 0;`,
    `ALTER TABLE projects ADD COLUMN progress INT NOT NULL DEFAULT 0;`,
    `ALTER TABLE projects ADD COLUMN project_type VARCHAR(20) NOT NULL DEFAULT 'Billable';`,
  ];

  for (const sql of alters) {
    try {
      await pool.query(sql);
    } catch (err: any) {
      if (err.code === 'ER_DUP_FIELDNAME' || err.errno === 1060) {
        // Column already exists
      } else {
        console.log(`Notice [${sql.slice(0, 40)}]: ${err.message}`);
      }
    }
  }

  console.log('✅ Schema sync completed successfully.');
  await pool.end();
}

syncSchema().catch((err) => {
  console.error('❌ Schema sync failed:', err);
  process.exit(1);
});
