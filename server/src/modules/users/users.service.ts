import { query } from '../../config/db';
import { createError } from '../../middleware/errorHandler';

const formatUser = (u: Record<string, unknown>) => ({
  id: u['id'],
  name: `${u['first_name']} ${u['last_name']}`,
  firstName: u['first_name'],
  lastName: u['last_name'],
  email: u['email'],
  role: u['role'],
  department: u['department'],
  designation: u['designation'],
  initials: u['initials'],
  color: u['color'],
  avatar: u['avatar'],
  status: u['status'],
  reportingManagerId: u['reporting_manager_id'],
});

export const usersService = {
  async list(search?: string, department?: string) {
    let sql = `SELECT u.*, 
      (SELECT COUNT(*) FROM project_members pm WHERE pm.user_id = u.id) AS project_count,
      COALESCE((SELECT SUM(wl.hours) FROM work_logs wl 
        WHERE wl.user_id = u.id 
        AND wl.date >= DATE_SUB(CURRENT_DATE, INTERVAL WEEKDAY(CURRENT_DATE) DAY)
        AND wl.date < DATE_ADD(DATE_SUB(CURRENT_DATE, INTERVAL WEEKDAY(CURRENT_DATE) DAY), INTERVAL 7 DAY)), 0) AS week_hours,
      COALESCE((SELECT t.status FROM timesheets t 
        WHERE t.user_id = u.id 
        ORDER BY t.week_start DESC LIMIT 1), 'Not Started') AS timesheet_status,
      (SELECT COALESCE(t.submitted_at, t.week_start) FROM timesheets t 
        WHERE t.user_id = u.id 
        ORDER BY t.week_start DESC LIMIT 1) AS timesheet_date,
      (SELECT t.id FROM timesheets t 
        WHERE t.user_id = u.id 
        ORDER BY t.week_start DESC LIMIT 1) AS timesheet_id,
      (SELECT a.id FROM approvals a JOIN timesheets t ON t.id = a.timesheet_id 
        WHERE t.user_id = u.id 
        ORDER BY t.week_start DESC LIMIT 1) AS approval_id
      FROM users u WHERE 1=1`;
    const params: unknown[] = [];
    let idx = 1;
    if (search) {
      sql += ` AND (u.first_name LIKE $${idx} OR u.last_name LIKE $${idx} OR u.email LIKE $${idx})`;
      params.push(`%${search}%`); idx++;
    }
    if (department && department !== 'All') {
      sql += ` AND u.department = $${idx}`;
      params.push(department); idx++;
    }
    sql += ' ORDER BY u.first_name';
    const res = await query(sql, params);
    return res.rows.map(u => ({
      ...formatUser(u),
      projectCount: Number(u['project_count']),
      weekHours: Number(u['week_hours']),
      timesheetStatus: u['timesheet_status'],
      timesheetDate: u['timesheet_date'] ? new Date(u['timesheet_date'] as string).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A',
      timesheetId: u['timesheet_id'] || '',
      approvalId: u['approval_id'] || '',
      utilization: Math.min(100, Math.round((Number(u['week_hours']) / 40) * 100)),
    }));
  },

  async getById(id: string) {
    const res = await query('SELECT * FROM users WHERE id=$1', [id]);
    if (!res.rows[0]) throw createError('User not found', 404, 'NOT_FOUND');
    return formatUser(res.rows[0]);
  },

  async create(data: { firstName: string; lastName: string; email: string; role?: string; department?: string; designation?: string; password?: string; reportingManagerId?: string | null }) {
    const existing = await query('SELECT id FROM users WHERE email=$1', [data.email.toLowerCase()]);
    if (existing.rows.length > 0) throw createError('Email already in use', 409, 'EMAIL_TAKEN');

    const bcrypt = require('bcryptjs');
    const crypto = require('crypto');
    const passwordHash = await bcrypt.hash(data.password || 'password123', 10);
    const firstChar = data.firstName && data.firstName[0] ? data.firstName[0].toUpperCase() : 'U';
    const lastChar = data.lastName && data.lastName[0] ? data.lastName[0].toUpperCase() : '';
    const initials = `${firstChar}${lastChar}`;
    const colors = ['#2563EB','#9333EA','#EA580C','#059669','#7C3AED','#0891B2'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const id = crypto.randomUUID();

    const res = await query(
      `INSERT INTO users (id, first_name, last_name, email, password_hash, role, department, designation, initials, color, status, reporting_manager_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'Active',$11)
       RETURNING *`,
      [id, data.firstName || '', data.lastName || '', data.email.toLowerCase(), passwordHash, data.role || 'employee', data.department || 'Engineering', data.designation || 'Team Member', initials, color, data.reportingManagerId || null]
    );
    const user = res.rows[0];
    await query('INSERT IGNORE INTO user_preferences (user_id) VALUES ($1)', [id]);
    return formatUser(user);
  },

  async update(id: string, data: { firstName?: string; lastName?: string; email?: string; department?: string; designation?: string; role?: string; status?: string; reportingManagerId?: string | null }) {
    const fields: string[] = [];
    const params: unknown[] = [];
    let idx = 1;
    if (data.firstName !== undefined) { fields.push(`first_name=$${idx++}`); params.push(data.firstName); }
    if (data.lastName  !== undefined) { fields.push(`last_name=$${idx++}`);  params.push(data.lastName); }
    if (data.email     !== undefined) { fields.push(`email=$${idx++}`);       params.push(data.email.toLowerCase()); }
    if (data.department !== undefined){ fields.push(`department=$${idx++}`);  params.push(data.department); }
    if (data.designation !== undefined){ fields.push(`designation=$${idx++}`); params.push(data.designation); }
    if (data.role !== undefined)       { fields.push(`role=$${idx++}`);        params.push(data.role); }
    if (data.status !== undefined)     { fields.push(`status=$${idx++}`);      params.push(data.status); }
    if (data.reportingManagerId !== undefined) { fields.push(`reporting_manager_id=$${idx++}`); params.push(data.reportingManagerId); }
    if (fields.length === 0) throw createError('No fields to update', 400, 'NO_FIELDS');
    fields.push(`updated_at=NOW()`);
    params.push(id);
    const res = await query(
      `UPDATE users SET ${fields.join(',')} WHERE id=$${idx} RETURNING *`,
      params
    );
    return formatUser(res.rows[0]);
  },
};
