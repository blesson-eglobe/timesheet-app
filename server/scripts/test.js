/**
 * Timesheet App — Full Scenario Test Runner
 * Tests real-world timesheet workflows via the live REST API
 * Run: node server/scripts/test.js
 */

const http = require('http');
const CryptoJS = require('crypto-js');

const ENCRYPTION_KEY = 'supersecret_aes_key_2026';
const encryptPw = (pw) => CryptoJS.AES.encrypt(pw, ENCRYPTION_KEY).toString();

const BASE = 'http://localhost:4000/api';
let PASS = 0, FAIL = 0, SKIP = 0;
const LOG = [];

// ─── HTTP helpers ─────────────────────────────────────────────────────────────
const req = (method, path, body, token) => new Promise((resolve, reject) => {
  const data = body ? JSON.stringify(body) : null;
  const url = new URL(BASE + path);
  const opts = {
    hostname: url.hostname, port: url.port || 4000,
    path: url.pathname + url.search,
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(data && { 'Content-Length': Buffer.byteLength(data) }),
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  };
  const r = http.request(opts, res => {
    let raw = '';
    res.on('data', c => raw += c);
    res.on('end', () => {
      try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
      catch { resolve({ status: res.statusCode, body: raw }); }
    });
  });
  r.on('error', reject);
  if (data) r.write(data);
  r.end();
});

const get  = (path, token)        => req('GET',    path, null, token);
const post = (path, body, token)  => req('POST',   path, body, token);
const put  = (path, body, token)  => req('PUT',    path, body, token);
const del  = (path, token)        => req('DELETE', path, null, token);

// ─── Test logger ─────────────────────────────────────────────────────────────
function test(group, name, passed, detail = '') {
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  const line = `  ${icon} | ${name}${detail ? ` → ${detail}` : ''}`;
  LOG.push({ group, name, passed, detail });
  console.log(line);
  if (passed) PASS++; else FAIL++;
}

function header(title) {
  const bar = '─'.repeat(60);
  console.log(`\n┌${bar}┐`);
  console.log(`│  ${title.padEnd(58)}│`);
  console.log(`└${bar}┘`);
}

// ─── Date helpers ─────────────────────────────────────────────────────────────
const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n) => {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};
const daysFwd = (n) => {
  const d = new Date(); d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🧪  TIMESHEET APP — FULL SCENARIO TEST SUITE');
  console.log('='.repeat(62));

  // ═══════════════════════════════════════════════════════════════
  // S1 — AUTHENTICATION
  // ═══════════════════════════════════════════════════════════════
  header('S1: Authentication');

  // S1.1 Login with correct credentials
  let r = await post('/auth/login', { email: 'admin', password: encryptPw('Admin@123') });
  test('auth', 'Admin login with correct credentials', r.status === 200 && r.body.token, `status=${r.status}`);
  const ADMIN_TOKEN = r.body.token;

  r = await post('/auth/login', { email: 'david.park', password: encryptPw('Manager@123') });
  test('auth', 'Manager1 (David) login', r.status === 200 && r.body.token, `status=${r.status}`);
  const MGR1_TOKEN = r.body.token;

  r = await post('/auth/login', { email: 'priya.nair', password: encryptPw('Manager@123') });
  test('auth', 'Manager2 (Priya) login', r.status === 200 && r.body.token, `status=${r.status}`);
  const MGR2_TOKEN = r.body.token;

  r = await post('/auth/login', { email: 'alex.johnson', password: encryptPw('Employee@123') });
  test('auth', 'Employee1 (Alex) login', r.status === 200 && r.body.token, `status=${r.status}`);
  const EMP1_TOKEN = r.body.token;
  const EMP1_ID = r.body.user?.id;

  r = await post('/auth/login', { email: 'maria.santos', password: encryptPw('Employee@123') });
  test('auth', 'Employee2 (Maria) login', r.status === 200 && r.body.token, `status=${r.status}`);
  const EMP2_TOKEN = r.body.token;
  const EMP2_ID = r.body.user?.id;

  r = await post('/auth/login', { email: 'james.kim', password: encryptPw('Employee@123') });
  test('auth', 'Employee3 (James) login', r.status === 200 && r.body.token, `status=${r.status}`);
  const EMP3_TOKEN = r.body.token;
  const EMP3_ID = r.body.user?.id;

  // S1.2 Wrong password
  r = await post('/auth/login', { email: 'admin', password: encryptPw('wrongpassword') });
  test('auth', 'Login with wrong password returns 401', r.status === 401, `status=${r.status}`);

  // S1.3 Non-existent user
  r = await post('/auth/login', { email: 'ghost@eglobe.com', password: encryptPw('pass') });
  test('auth', 'Login with non-existent user returns 401', r.status === 401, `status=${r.status}`);

  // S1.4 Missing token access
  r = await get('/work-logs');
  test('auth', 'Protected route without token returns 401', r.status === 401, `status=${r.status}`);

  if (!EMP1_TOKEN || !MGR1_TOKEN) {
    console.log('\n❌ Cannot proceed without valid tokens. Check server is running on port 4000.');
    process.exit(1);
  }

  // ═══════════════════════════════════════════════════════════════
  // S2 — PROJECTS
  // ═══════════════════════════════════════════════════════════════
  header('S2: Project Access');

  r = await get('/projects', EMP1_TOKEN);
  test('projects', 'Employee sees only assigned projects', r.status === 200 && Array.isArray(r.body), `count=${r.body?.length}`);
  const emp1Projects = r.body || [];

  r = await get('/projects', MGR1_TOKEN);
  test('projects', 'Manager sees projects they manage', r.status === 200, `count=${r.body?.length}`);
  const proj1 = emp1Projects.find(p => p.name === 'E-Commerce Platform V2');
  const proj2 = emp1Projects.find(p => p.name === 'Mobile Banking App');

  test('projects', 'Alex is assigned to E-Commerce Platform V2', !!proj1, `found=${!!proj1}`);
  test('projects', 'Alex is assigned to Mobile Banking App', !!proj2, `found=${!!proj2}`);

  r = await get('/projects', EMP3_TOKEN);
  const jamesProjects = r.body || [];
  const proj3 = jamesProjects.find(p => p.name === 'Analytics Dashboard');
  test('projects', 'James sees Analytics Dashboard (Priya manages)', !!proj3, `found=${!!proj3}`);

  // ═══════════════════════════════════════════════════════════════
  // S3 — LOGGING TASKS (Normal Flow)
  // ═══════════════════════════════════════════════════════════════
  header('S3: Logging Work (Valid Entries)');

  // Alex logs 4 tasks this week across 2 projects
  const WEEK_START = daysAgo(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1);

  r = await post('/work-logs', {
    projectId: proj1?.id, taskName: 'Implement product listing page',
    hours: 4, date: daysAgo(4), status: 'In Progress', taskStatus: 'In Progress',
  }, EMP1_TOKEN);
  test('worklogs', 'Alex logs 4h on E-Commerce (Mon)', r.status === 201, `status=${r.status}`);
  const LOG1_ID = r.body?.id;

  r = await post('/work-logs', {
    projectId: proj1?.id, taskName: 'Fix cart checkout bug',
    hours: 3, date: daysAgo(4), status: 'In Progress', taskStatus: 'Completed',
  }, EMP1_TOKEN);
  test('worklogs', 'Alex logs 3h completed task (Mon)', r.status === 201, `status=${r.status}`);
  const LOG2_ID = r.body?.id;

  r = await post('/work-logs', {
    projectId: proj2?.id, taskName: 'Design auth flow wireframes',
    hours: 5, date: daysAgo(3), status: 'In Progress', taskStatus: 'In Progress',
  }, EMP1_TOKEN);
  test('worklogs', 'Alex logs 5h on Mobile Banking (Tue)', r.status === 201, `status=${r.status}`);
  const LOG3_ID = r.body?.id;

  r = await post('/work-logs', {
    projectId: proj2?.id, taskName: 'API integration testing',
    hours: 6, date: daysAgo(2), status: 'In Progress', taskStatus: 'Not Started',
  }, EMP1_TOKEN);
  test('worklogs', 'Alex logs 6h Not Started task (Wed)', r.status === 201, `status=${r.status}`);
  const LOG4_ID = r.body?.id;

  // Maria logs tasks
  r = await get('/projects', EMP2_TOKEN);
  const mariaProjects = r.body || [];
  const mariaProjEcomm = mariaProjects.find(p => p.name === 'E-Commerce Platform V2');
  const mariaProjAnalytics = mariaProjects.find(p => p.name === 'Analytics Dashboard');

  r = await post('/work-logs', {
    projectId: mariaProjEcomm?.id, taskName: 'Build responsive header component',
    hours: 5, date: daysAgo(4), status: 'In Progress', taskStatus: 'Completed',
  }, EMP2_TOKEN);
  test('worklogs', 'Maria logs 5h completed (Mon)', r.status === 201, `status=${r.status}`);
  const LOG5_ID = r.body?.id;

  r = await post('/work-logs', {
    projectId: mariaProjAnalytics?.id, taskName: 'Dashboard chart components',
    hours: 4, date: daysAgo(3), status: 'In Progress', taskStatus: 'In Progress',
  }, EMP2_TOKEN);
  test('worklogs', 'Maria logs 4h on Analytics (Tue)', r.status === 201, `status=${r.status}`);
  const LOG6_ID = r.body?.id;

  // James logs tasks
  r = await get('/projects', EMP3_TOKEN);
  const jamesProjectsFull = r.body || [];
  const jamesProjMobile = jamesProjectsFull.find(p => p.name === 'Mobile Banking App');
  const jamesProjAnalytics = jamesProjectsFull.find(p => p.name === 'Analytics Dashboard');

  r = await post('/work-logs', {
    projectId: jamesProjMobile?.id, taskName: 'Create onboarding UI screens',
    hours: 6, date: daysAgo(4), status: 'In Progress', taskStatus: 'In Progress',
  }, EMP3_TOKEN);
  test('worklogs', 'James logs 6h on Mobile (Mon)', r.status === 201, `status=${r.status}`);
  const LOG7_ID = r.body?.id;

  r = await post('/work-logs', {
    projectId: jamesProjAnalytics?.id, taskName: 'Analytics UX review',
    hours: 3, date: daysAgo(2), status: 'In Progress', taskStatus: 'Completed',
  }, EMP3_TOKEN);
  test('worklogs', 'James logs 3h completed Analytics (Wed)', r.status === 201, `status=${r.status}`);
  const LOG8_ID = r.body?.id;

  // ═══════════════════════════════════════════════════════════════
  // S4 — VALIDATION EDGE CASES
  // ═══════════════════════════════════════════════════════════════
  header('S4: Validation & Edge Cases');

  // Future date
  r = await post('/work-logs', {
    projectId: proj1?.id, taskName: 'Future task',
    hours: 4, date: daysFwd(1), status: 'In Progress', taskStatus: 'In Progress',
  }, EMP1_TOKEN);
  test('validation', 'Cannot log task with future date', r.status === 400, `status=${r.status}`);

  // Zero hours
  r = await post('/work-logs', {
    projectId: proj1?.id, taskName: 'Zero hour task',
    hours: 0, date: today(), status: 'In Progress', taskStatus: 'In Progress',
  }, EMP1_TOKEN);
  test('validation', 'Cannot log 0 hours (if validated)', r.status >= 400, `status=${r.status}`);

  // Very large hours
  r = await post('/work-logs', {
    projectId: proj1?.id, taskName: 'All-day task',
    hours: 25, date: today(), status: 'In Progress', taskStatus: 'In Progress',
  }, EMP1_TOKEN);
  test('validation', 'Cannot log more than 24h per entry', r.status >= 400, `status=${r.status}`);

  // Missing project
  r = await post('/work-logs', {
    projectId: '', taskName: 'No project',
    hours: 4, date: today(), status: 'In Progress', taskStatus: 'In Progress',
  }, EMP1_TOKEN);
  test('validation', 'Cannot log without project', r.status >= 400, `status=${r.status}`);

  // ═══════════════════════════════════════════════════════════════
  // S5 — EDITING WORK LOGS
  // ═══════════════════════════════════════════════════════════════
  header('S5: Editing Work Logs');

  // Alex edits own log
  r = await put(`/work-logs/${LOG1_ID}`, {
    taskName: 'Implement product listing page (revised)', hours: 5, date: daysAgo(4), taskStatus: 'In Progress',
  }, EMP1_TOKEN);
  test('edit', 'Employee can edit own unsubmitted log', r.status === 200, `status=${r.status}`);

  // Alex tries to edit Maria's log
  r = await put(`/work-logs/${LOG5_ID}`, { taskName: 'Hack attempt', hours: 1, date: today() }, EMP1_TOKEN);
  test('edit', "Employee cannot edit another employee's log", r.status >= 400, `status=${r.status}`);

  // Manager tries to edit employee log via worklogs API
  r = await put(`/work-logs/${LOG1_ID}`, { taskName: 'Manager hack', hours: 8, date: today() }, MGR1_TOKEN);
  test('edit', 'Manager cannot edit employee log via work-logs endpoint', r.status >= 400, `status=${r.status}`);

  // ═══════════════════════════════════════════════════════════════
  // S6 — TASK STATUS (PROGRESS FIELD)
  // ═══════════════════════════════════════════════════════════════
  header('S6: Task Status (Progress Field)');

  // Check taskStatus is returned and correct
  r = await get('/work-logs', EMP1_TOKEN);
  const alexLogs = r.body || [];
  const log2 = alexLogs.find(l => l.id === LOG2_ID);
  test('taskStatus', 'Completed task has taskStatus=Completed', log2?.taskStatus === 'Completed', `taskStatus=${log2?.taskStatus}`);

  const log4 = alexLogs.find(l => l.id === LOG4_ID);
  test('taskStatus', 'Not Started task has taskStatus=Not Started', log4?.taskStatus === 'Not Started', `taskStatus=${log4?.taskStatus}`);

  // Update task status via edit
  r = await put(`/work-logs/${LOG4_ID}`, { taskStatus: 'In Progress' }, EMP1_TOKEN);
  test('taskStatus', 'Can update taskStatus from Not Started → In Progress', r.status === 200 && r.body?.taskStatus === 'In Progress', `taskStatus=${r.body?.taskStatus}`);

  // ═══════════════════════════════════════════════════════════════
  // S7 — SUBMITTING WEEK
  // ═══════════════════════════════════════════════════════════════
  header('S7: Submitting Timesheets');

  // Alex submits this week
  r = await post('/work-logs/submit-week', { weekStart: WEEK_START }, EMP1_TOKEN);
  test('submit', 'Alex submits current week successfully', r.status === 200 || r.status === 201, `status=${r.status}`);

  // Alex tries to submit same week again
  r = await post('/work-logs/submit-week', { weekStart: WEEK_START }, EMP1_TOKEN);
  test('submit', 'Duplicate week submission handled gracefully', r.status === 200 || r.status === 400, `status=${r.status}`);

  // Maria submits her week
  r = await post('/work-logs/submit-week', { weekStart: WEEK_START }, EMP2_TOKEN);
  test('submit', 'Maria submits current week successfully', r.status === 200 || r.status === 201, `status=${r.status}`);

  // James submits his week
  r = await post('/work-logs/submit-week', { weekStart: WEEK_START }, EMP3_TOKEN);
  test('submit', 'James submits current week successfully', r.status === 200 || r.status === 201, `status=${r.status}`);

  // ═══════════════════════════════════════════════════════════════
  // S8 — EDITING AFTER SUBMISSION
  // ═══════════════════════════════════════════════════════════════
  header('S8: Editing / Deleting After Submission');

  // Alex tries to edit a submitted log
  r = await put(`/work-logs/${LOG1_ID}`, { hours: 8, date: daysAgo(4), taskStatus: 'In Progress' }, EMP1_TOKEN);
  test('lockdown', 'Cannot edit submitted log (locked)', r.status === 400, `status=${r.status}`);

  // Alex tries to delete a submitted log
  r = await del(`/work-logs/${LOG2_ID}`, EMP1_TOKEN);
  test('lockdown', 'Cannot delete submitted log (locked)', r.status === 400, `status=${r.status}`);

  // ═══════════════════════════════════════════════════════════════
  // S9 — MANAGER APPROVAL FLOW
  // ═══════════════════════════════════════════════════════════════
  header('S9: Manager Approval Flow');

  // Manager fetches pending approvals
  r = await get('/approvals', MGR1_TOKEN);
  test('approvals', 'David (MGR1) can view pending approvals', r.status === 200, `count=${r.body?.length}`);
  const pendingApprovals = r.body || [];

  const alexApproval = pendingApprovals.find(a =>
    a.employee?.name?.includes('Alex') && a.status === 'Pending'
  );
  test('approvals', 'Alex\'s submitted logs appear as Pending for David', !!alexApproval, `found=${!!alexApproval}`);

  // David approves Alex's entry
  if (alexApproval) {
    r = await post(`/approvals/${alexApproval.id}/approve`, {}, MGR1_TOKEN);
    test('approvals', 'David approves Alex\'s timesheet entry', r.status === 200, `status=${r.status}`);

    // Check work_log status updated
    r = await get('/work-logs', EMP1_TOKEN);
    const approvedLog = (r.body || []).find(l => l.id === alexApproval.id);
    test('approvals', 'Approved log shows timesheetStatus=Approved', approvedLog?.timesheetStatus === 'Approved' || approvedLog?.status === 'Approved', `status=${approvedLog?.timesheetStatus || approvedLog?.status}`);
  } else {
    test('approvals', 'David approves Alex\'s timesheet entry', false, 'No pending approval found');
    test('approvals', 'Approved log shows timesheetStatus=Approved', false, 'Skipped');
  }

  // Priya fetches her approvals (James & Maria)
  r = await get('/approvals', MGR2_TOKEN);
  test('approvals', 'Priya (MGR2) can view her pending approvals', r.status === 200, `count=${r.body?.length}`);
  const priyaApprovals = r.body || [];

  const jamesApproval = priyaApprovals.find(a =>
    a.employee?.name?.includes('James') && a.status === 'Pending'
  );
  test('approvals', 'James\'s logs appear as Pending for Priya', !!jamesApproval, `found=${!!jamesApproval}`);

  // Priya rejects James's entry
  if (jamesApproval) {
    r = await post(`/approvals/${jamesApproval.id}/reject`, { comments: 'Hours seem incorrect, please revise.' }, MGR2_TOKEN);
    test('approvals', 'Priya rejects James\'s entry with comments', r.status === 200, `status=${r.status}`);
  } else {
    test('approvals', 'Priya rejects James\'s entry with comments', false, 'No pending approval found');
  }

  // ═══════════════════════════════════════════════════════════════
  // S10 — CROSS-MANAGER APPROVAL BOUNDARY
  // ═══════════════════════════════════════════════════════════════
  header('S10: Approval Boundaries (Security)');

  // David tries to approve Priya's team member
  const jamesApproval2 = priyaApprovals.find(a => a.employee?.name?.includes('James'));
  if (jamesApproval2) {
    r = await post(`/approvals/${jamesApproval2.id}/approve`, {}, MGR1_TOKEN);
    // Should either 403 or return empty/no records
    test('security', 'David cannot approve James (Priya\'s team)', r.status === 403 || r.status === 404 || r.status === 400, `status=${r.status}`);
  } else {
    SKIP++;
    console.log('  ⚠️  SKIP | Cross-manager approval test (no James approval found)');
  }

  // Employee tries to approve their own timesheet
  r = await get('/approvals', EMP1_TOKEN);
  test('security', 'Employee cannot access approvals endpoint', r.status === 403 || r.status === 401, `status=${r.status}`);

  // ═══════════════════════════════════════════════════════════════
  // S11 — EDITING AFTER APPROVAL/REJECTION
  // ═══════════════════════════════════════════════════════════════
  header('S11: Edit Lock After Approval/Rejection');

  if (alexApproval) {
    r = await put(`/work-logs/${alexApproval.id}`, { hours: 1, date: daysAgo(4), taskStatus: 'In Progress' }, EMP1_TOKEN);
    test('lockdown', 'Cannot edit Approved log', r.status === 400, `status=${r.status}`);
  }
  if (jamesApproval) {
    r = await put(`/work-logs/${jamesApproval.id}`, { hours: 1, date: daysAgo(2), taskStatus: 'In Progress' }, EMP3_TOKEN);
    test('lockdown', 'Cannot edit Rejected log', r.status === 400, `status=${r.status}`);
  }

  // ═══════════════════════════════════════════════════════════════
  // S12 — DASHBOARD & REPORTS
  // ═══════════════════════════════════════════════════════════════
  header('S12: Dashboard & Reports');

  r = await get('/dashboard', EMP1_TOKEN);
  test('dashboard', 'Employee dashboard loads successfully', r.status === 200, `status=${r.status}`);

  r = await get('/dashboard', MGR1_TOKEN);
  test('dashboard', 'Manager dashboard loads successfully', r.status === 200, `status=${r.status}`);

  r = await get('/dashboard', ADMIN_TOKEN);
  test('dashboard', 'Admin dashboard loads successfully', r.status === 200, `status=${r.status}`);

  r = await get('/reports', MGR1_TOKEN);
  test('reports', 'Manager can access reports', r.status === 200, `status=${r.status}`);

  // ═══════════════════════════════════════════════════════════════
  // S13 — ADMIN OPERATIONS
  // ═══════════════════════════════════════════════════════════════
  header('S13: Admin Operations');

  r = await get('/users', ADMIN_TOKEN);
  test('admin', 'Admin can list all users', r.status === 200, `count=${r.body?.length}`);

  r = await get('/users', EMP1_TOKEN);
  test('admin', 'Employee cannot list all users', r.status === 403 || r.status === 401, `status=${r.status}`);

  r = await get('/projects', ADMIN_TOKEN);
  test('admin', 'Admin can see all projects', r.status === 200, `count=${r.body?.length}`);

  // ═══════════════════════════════════════════════════════════════
  // S14 — DELETION (un-submitted logs)
  // ═══════════════════════════════════════════════════════════════
  header('S14: Deletion of Work Logs');

  // Log a fresh entry and delete it (un-submitted)
  r = await post('/work-logs', {
    projectId: proj1?.id, taskName: 'Temp task to delete',
    hours: 1, date: today(), status: 'In Progress', taskStatus: 'In Progress',
  }, EMP1_TOKEN);
  const TEMP_LOG_ID = r.body?.id;
  test('delete', 'Employee can create a deletable log', r.status === 201, `id=${TEMP_LOG_ID}`);

  if (TEMP_LOG_ID) {
    r = await del(`/work-logs/${TEMP_LOG_ID}`, EMP1_TOKEN);
    test('delete', 'Employee can delete own un-submitted log', r.status === 200, `status=${r.status}`);
  }

  // ═══════════════════════════════════════════════════════════════
  // FINAL SUMMARY
  // ═══════════════════════════════════════════════════════════════
  const TOTAL = PASS + FAIL;
  const PCT = TOTAL > 0 ? Math.round((PASS / TOTAL) * 100) : 0;

  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                  TEST RESULTS SUMMARY                       ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  Total Tests : ${String(TOTAL).padEnd(44)} ║`);
  console.log(`║  ✅ Passed   : ${String(PASS).padEnd(44)} ║`);
  console.log(`║  ❌ Failed   : ${String(FAIL).padEnd(44)} ║`);
  console.log(`║  ⚠️  Skipped  : ${String(SKIP).padEnd(43)} ║`);
  console.log(`║  Score      : ${String(PCT + '%').padEnd(44)} ║`);
  console.log('╠══════════════════════════════════════════════════════════════╣');

  if (FAIL > 0) {
    console.log('║  FAILED TESTS:                                               ║');
    LOG.filter(l => !l.passed).forEach(l => {
      const line = `║    • [${l.group}] ${l.name}`.slice(0, 63).padEnd(63) + '║';
      console.log(line);
    });
    console.log('╠══════════════════════════════════════════════════════════════╣');
  }

  console.log(`║  ${FAIL === 0 ? '🎉 ALL TESTS PASSED!' : '⚠️  Some tests failed — see details above'}`.padEnd(63) + '║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
}

main().catch(err => { console.error('\n❌ Unexpected error:', err.message); });
