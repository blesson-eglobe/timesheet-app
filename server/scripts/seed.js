/**
 * Seed Script - Clears DB and creates test users, projects, and assignments
 * Run: node server/scripts/seed.js
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const DB = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '',
  database: 'timesheet_db',
  multipleStatements: true,
};

const uuid = () => crypto.randomUUID();
const hash = (pw) => bcrypt.hashSync(pw, 10);

// ─── Users ────────────────────────────────────────────────────────────────────
const ADMIN_ID    = uuid();
const MGR1_ID     = uuid();
const MGR2_ID     = uuid();
const EMP1_ID     = uuid();
const EMP2_ID     = uuid();
const EMP3_ID     = uuid();

// ─── Projects ─────────────────────────────────────────────────────────────────
const PROJ1_ID = uuid(); // E-Commerce Platform
const PROJ2_ID = uuid(); // Mobile Banking App
const PROJ3_ID = uuid(); // Analytics Dashboard

async function main() {
  const conn = await mysql.createConnection(DB);
  console.log('✅ Connected to MySQL');

  // ── 1. Clear all data (order matters for FK) ──────────────────────────────
  console.log('\n🗑️  Clearing existing data...');
  await conn.execute('SET FOREIGN_KEY_CHECKS = 0');
  await conn.execute('DELETE FROM notifications');
  await conn.execute('DELETE FROM approvals');
  await conn.execute('DELETE FROM timesheets');
  await conn.execute('DELETE FROM work_log_tickets');
  await conn.execute('DELETE FROM tickets');
  await conn.execute('DELETE FROM work_logs');
  await conn.execute('DELETE FROM project_members');
  await conn.execute('DELETE FROM projects');
  await conn.execute('DELETE FROM user_preferences');
  await conn.execute('DELETE FROM users');
  await conn.execute('SET FOREIGN_KEY_CHECKS = 1');
  console.log('  ✓ All tables cleared');

  // ── 2. Create Users ───────────────────────────────────────────────────────
  console.log('\n👥 Creating users...');

  const users = [
    {
      id: ADMIN_ID,
      first_name: 'Sarah', last_name: 'Connor',
      email: 'admin@eglobe.com', username: 'admin',
      password_hash: hash('Admin@123'),
      role: 'admin', department: 'Management', designation: 'System Administrator',
      initials: 'SC', color: '#7c3aed', reporting_manager_id: null,
    },
    {
      id: MGR1_ID,
      first_name: 'David', last_name: 'Park',
      email: 'david.park@eglobe.com', username: 'david.park',
      password_hash: hash('Manager@123'),
      role: 'manager', department: 'Engineering', designation: 'Engineering Lead',
      initials: 'DP', color: '#2563eb', reporting_manager_id: ADMIN_ID,
    },
    {
      id: MGR2_ID,
      first_name: 'Priya', last_name: 'Nair',
      email: 'priya.nair@eglobe.com', username: 'priya.nair',
      password_hash: hash('Manager@123'),
      role: 'manager', department: 'Design', designation: 'Design Lead',
      initials: 'PN', color: '#0891b2', reporting_manager_id: ADMIN_ID,
    },
    {
      id: EMP1_ID,
      first_name: 'Alex', last_name: 'Johnson',
      email: 'alex.johnson@eglobe.com', username: 'alex.johnson',
      password_hash: hash('Employee@123'),
      role: 'employee', department: 'Engineering', designation: 'Senior Developer',
      initials: 'AJ', color: '#059669', reporting_manager_id: MGR1_ID,
    },
    {
      id: EMP2_ID,
      first_name: 'Maria', last_name: 'Santos',
      email: 'maria.santos@eglobe.com', username: 'maria.santos',
      password_hash: hash('Employee@123'),
      role: 'employee', department: 'Engineering', designation: 'Frontend Developer',
      initials: 'MS', color: '#d97706', reporting_manager_id: MGR1_ID,
    },
    {
      id: EMP3_ID,
      first_name: 'James', last_name: 'Kim',
      email: 'james.kim@eglobe.com', username: 'james.kim',
      password_hash: hash('Employee@123'),
      role: 'employee', department: 'Design', designation: 'UI/UX Designer',
      initials: 'JK', color: '#dc2626', reporting_manager_id: MGR2_ID,
    },
  ];

  for (const u of users) {
    await conn.execute(
      `INSERT INTO users (id,first_name,last_name,email,username,password_hash,role,department,designation,initials,color,avatar,status,reporting_manager_id)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,'',?,?)`,
      [u.id,u.first_name,u.last_name,u.email,u.username,u.password_hash,u.role,u.department,u.designation,u.initials,u.color,'Active',u.reporting_manager_id]
    );
    console.log(`  ✓ Created ${u.role}: ${u.first_name} ${u.last_name} | ${u.email} | pw: ${u.role === 'admin' ? 'Admin@123' : u.role === 'manager' ? 'Manager@123' : 'Employee@123'}`);
  }

  // ── 3. Create Projects ────────────────────────────────────────────────────
  console.log('\n📁 Creating projects...');

  const projects = [
    {
      id: PROJ1_ID,
      name: 'E-Commerce Platform V2',
      description: 'Rebuild of the main e-commerce storefront with modern stack.',
      status: 'On Track', priority: 'High',
      start_date: '2026-07-01', end_date: '2026-09-30',
      estimated_hours: 400,
    },
    {
      id: PROJ2_ID,
      name: 'Mobile Banking App',
      description: 'Native mobile app for retail banking customers.',
      status: 'On Track', priority: 'Critical',
      start_date: '2026-07-01', end_date: '2026-10-31',
      estimated_hours: 600,
    },
    {
      id: PROJ3_ID,
      name: 'Analytics Dashboard',
      description: 'Real-time business intelligence dashboard for executives.',
      status: 'At Risk', priority: 'Medium',
      start_date: '2026-06-15', end_date: '2026-08-31',
      estimated_hours: 200,
    },
  ];

  for (const p of projects) {
    await conn.execute(
      `INSERT INTO projects (id,name,description,status,priority,start_date,end_date,estimated_hours,logged_hours,progress)
       VALUES (?,?,?,?,?,?,?,?,0,0)`,
      [p.id,p.name,p.description,p.status,p.priority,p.start_date,p.end_date,p.estimated_hours]
    );
    console.log(`  ✓ Created project: ${p.name}`);
  }

  // ── 4. Assign members to projects ────────────────────────────────────────
  console.log('\n🔗 Assigning members to projects...');

  const assignments = [
    // Project 1: E-Commerce - MGR1 leads, EMP1 & EMP2
    { project_id: PROJ1_ID, user_id: MGR1_ID },
    { project_id: PROJ1_ID, user_id: EMP1_ID },
    { project_id: PROJ1_ID, user_id: EMP2_ID },
    // Project 2: Mobile Banking - MGR1 leads, EMP1 & EMP3
    { project_id: PROJ2_ID, user_id: MGR1_ID },
    { project_id: PROJ2_ID, user_id: EMP1_ID },
    { project_id: PROJ2_ID, user_id: EMP3_ID },
    // Project 3: Analytics - MGR2 leads, EMP2 & EMP3
    { project_id: PROJ3_ID, user_id: MGR2_ID },
    { project_id: PROJ3_ID, user_id: EMP2_ID },
    { project_id: PROJ3_ID, user_id: EMP3_ID },
  ];

  for (const a of assignments) {
    await conn.execute(
      'INSERT INTO project_members (project_id, user_id) VALUES (?,?)',
      [a.project_id, a.user_id]
    );
  }
  console.log('  ✓ 9 member assignments created');

  // ── 5. Summary ────────────────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ SEED COMPLETE — Login credentials:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  ADMIN   : admin@eglobe.com         / Admin@123');
  console.log('  MANAGER : david.park@eglobe.com    / Manager@123');
  console.log('  MANAGER : priya.nair@eglobe.com    / Manager@123');
  console.log('  EMPLOYEE: alex.johnson@eglobe.com  / Employee@123');
  console.log('  EMPLOYEE: maria.santos@eglobe.com  / Employee@123');
  console.log('  EMPLOYEE: james.kim@eglobe.com     / Employee@123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n  Projects:');
  console.log('  1. E-Commerce Platform V2  → David (mgr), Alex, Maria');
  console.log('  2. Mobile Banking App      → David (mgr), Alex, James');
  console.log('  3. Analytics Dashboard     → Priya (mgr), Maria, James');

  await conn.end();
}

main().catch(err => { console.error('\n❌ Error:', err.message); process.exit(1); });
