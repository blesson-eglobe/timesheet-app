const mysql = require('mysql2/promise');

async function syncProgress() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'timesheet_db',
  });

  await conn.execute(`
    UPDATE projects p
    SET logged_hours = (SELECT COALESCE(SUM(hours), 0) FROM work_logs wl WHERE wl.project_id = p.id),
        progress = COALESCE(LEAST(100, ROUND((SELECT COALESCE(SUM(hours), 0) FROM work_logs wl WHERE wl.project_id = p.id) / NULLIF(p.estimated_hours, 0) * 100)), 0)
  `);

  console.log('✅ Local project progress synced!');
  await conn.end();
}

syncProgress().catch(console.error);
