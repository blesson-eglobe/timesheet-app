import crypto from 'crypto';
import { query, withTransaction } from '../../config/db';
import { createError } from '../../middleware/errorHandler';

const formatLog = (l: Record<string, unknown>, tickets: unknown[] = []) => ({
  id: l['id'],
  userId: l['user_id'],
  projectId: l['project_id'],
  projectName: l['project_name'] || '',
  taskName: l['task_name'],
  taskDescription: l['task_description'] || '',
  hours: Number(l['hours']),
  date: String(l['date'] || '').split('T')[0],
  status: l['status'],
  taskStatus: l['task_status'] || 'In Progress',
  timesheetStatus: l['timesheet_status'] || (l['status'] === 'Approved' || l['status'] === 'Rejected' ? l['status'] : undefined),
  tickets,
  createdAt: l['created_at'],
});

const getTickets = async (workLogId: string) => {
  const res = await query(
    `SELECT t.id, t.ticket_number, t.ticket_url, t.provider
     FROM tickets t JOIN work_log_tickets wlt ON wlt.ticket_id = t.id
     WHERE wlt.work_log_id = $1`,
    [workLogId]
  );
  return res.rows.map((t: Record<string, unknown>) => ({
    id: t['id'],
    ticketNumber: t['ticket_number'],
    ticketUrl: t['ticket_url'] || '',
    provider: t['provider'] || '',
  }));
};

export const workLogsService = {
  async list(userId: string, params: { weekStart?: string; weekEnd?: string; projectId?: string; search?: string; page?: number; limit?: number } = {}) {
    let sql = `SELECT wl.*, p.name AS project_name, ts.status AS timesheet_status
               FROM work_logs wl JOIN projects p ON p.id = wl.project_id
               LEFT JOIN timesheets ts ON ts.user_id = wl.user_id AND wl.date >= ts.week_start AND wl.date <= ts.week_end
               WHERE wl.user_id = $1`;
    const qParams: unknown[] = [userId];
    let idx = 2;
    if (params.weekStart) { sql += ` AND wl.date >= $${idx++}`; qParams.push(params.weekStart); }
    if (params.weekEnd)   { sql += ` AND wl.date <= $${idx++}`; qParams.push(params.weekEnd); }
    if (params.projectId && params.projectId !== 'All') { sql += ` AND wl.project_id = $${idx++}`; qParams.push(params.projectId); }
    if (params.search)    {
      sql += ` AND (wl.task_name LIKE $${idx} OR wl.task_description LIKE $${idx} OR p.name LIKE $${idx} OR EXISTS (SELECT 1 FROM work_log_tickets wlt JOIN tickets t ON t.id = wlt.ticket_id WHERE wlt.work_log_id = wl.id AND t.ticket_number LIKE $${idx}))`;
      qParams.push(`%${params.search}%`);
      idx++;
    }
    sql += ' ORDER BY wl.date DESC, wl.created_at DESC';

    if (params.limit) {
      sql += ` LIMIT $${idx++}`;
      qParams.push(params.limit);
      if (params.page && params.page > 1) {
        sql += ` OFFSET $${idx++}`;
        qParams.push((params.page - 1) * params.limit);
      }
    }

    const res = await query(sql, qParams);
    const logs = await Promise.all(
      res.rows.map(async (row: Record<string, unknown>) => {
        const tickets = await getTickets(row['id'] as string);
        return formatLog(row, tickets);
      })
    );
    return logs;
  },

  async listAll(weekStart?: string, weekEnd?: string, department?: string, status?: string) {
    let sql = `SELECT wl.*, p.name AS project_name, u.first_name, u.last_name, u.initials, u.color, u.department, u.designation
               FROM work_logs wl
               JOIN projects p ON p.id = wl.project_id
               JOIN users u ON u.id = wl.user_id WHERE 1=1`;
    const params: unknown[] = [];
    let idx = 1;
    if (weekStart) { sql += ` AND wl.date >= $${idx++}`; params.push(weekStart); }
    if (weekEnd)   { sql += ` AND wl.date <= $${idx++}`; params.push(weekEnd); }
    if (department && department !== 'All') { sql += ` AND u.department = $${idx++}`; params.push(department); }
    if (status && status !== 'All')         { sql += ` AND wl.status = $${idx++}`;    params.push(status); }
    sql += ' ORDER BY wl.date DESC LIMIT 200';

    const res = await query(sql, params);
    const logs = await Promise.all(
      res.rows.map(async (row: Record<string, unknown>) => {
        const tickets = await getTickets(row['id'] as string);
        return {
          ...formatLog(row, tickets),
          employee: {
            id: row['user_id'],
            name: `${row['first_name']} ${row['last_name']}`,
            initials: row['initials'],
            color: row['color'],
            department: row['department'],
            designation: row['designation'],
          },
        };
      })
    );
    return logs;
  },

  async create(userId: string, data: {
    projectId: string; taskName: string; taskDescription?: string;
    hours: number; date: string; status: string; taskStatus?: string;
    tickets?: { ticketNumber: string; ticketUrl?: string; provider?: string }[];
  }) {
    if (data.date) {
      const today = new Date().toISOString().slice(0, 10);
      if (String(data.date).split('T')[0] > today) {
        throw createError('Cannot log tasks for future dates.', 400, 'BAD_REQUEST');
      }
    }
    return withTransaction(async (client) => {
      // 1. Resolve User ID against MySQL database
      let resolvedUserId = userId;
      if (resolvedUserId) {
        const uCheck = await client.query('SELECT id, status FROM users WHERE id = $1 LIMIT 1', [resolvedUserId]);
        if (uCheck.rows[0]) {
          if ((uCheck.rows[0] as Record<string, unknown>)['status'] === 'Disabled') {
            throw createError('Account disabled. You are unable to log timesheets or submit tasks.', 403, 'ACCOUNT_DISABLED');
          }
        } else {
          const firstUser = await client.query('SELECT id, status FROM users LIMIT 1');
          if (firstUser.rows[0]) {
            if ((firstUser.rows[0] as Record<string, unknown>)['status'] === 'Disabled') {
              throw createError('Account disabled. You are unable to log timesheets or submit tasks.', 403, 'ACCOUNT_DISABLED');
            }
            resolvedUserId = (firstUser.rows[0] as Record<string, unknown>)['id'] as string;
          }
        }
      }

      // 2. Resolve Project ID (Internal or custom ID)
      let resolvedProjectId = data.projectId;
      const isInternal = !resolvedProjectId || resolvedProjectId === 'internal' || resolvedProjectId === 'internal-project' || resolvedProjectId.toLowerCase() === 'internal';

      if (isInternal) {
        const intCheck = await client.query("SELECT id FROM projects WHERE id = 'internal' OR LOWER(TRIM(name)) = 'internal' LIMIT 1");
        if (intCheck.rows[0]) {
          resolvedProjectId = (intCheck.rows[0] as Record<string, unknown>)['id'] as string;
        } else {
          resolvedProjectId = 'internal';
          await client.query(
            `INSERT INTO projects (id, name, description, status, priority, project_type, estimated_hours)
             VALUES ('internal', 'Internal', 'Internal company activities, administrative work, and team training.', 'Ongoing', 'Medium', 'Internal', 1000)
             ON DUPLICATE KEY UPDATE name = 'Internal'`
          );
        }
      } else {
        const pCheck = await client.query('SELECT id FROM projects WHERE id = $1 LIMIT 1', [resolvedProjectId]);
        if (!pCheck.rows[0]) {
          const intCheck = await client.query("SELECT id FROM projects WHERE id = 'internal' OR LOWER(TRIM(name)) = 'internal' LIMIT 1");
          if (intCheck.rows[0]) {
            resolvedProjectId = (intCheck.rows[0] as Record<string, unknown>)['id'] as string;
          } else {
            throw createError(`Project not found: ${resolvedProjectId}. Please create the project first or use a valid project ID.`, 400, 'BAD_REQUEST');
          }
        }
      }

      const wlId = crypto.randomUUID();
      await client.query(
        `INSERT INTO work_logs (id, user_id, project_id, task_name, task_description, hours, date, status, task_status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [wlId, resolvedUserId, resolvedProjectId, data.taskName, data.taskDescription || '', data.hours, data.date, data.status, data.taskStatus || data.status]
      );
      const res = await client.query('SELECT * FROM work_logs WHERE id=$1', [wlId]);
      const wl = res.rows[0] as Record<string, unknown>;

      await client.query(
        `UPDATE projects SET logged_hours = logged_hours + $1,
         progress = COALESCE(LEAST(100, ROUND((logged_hours + $1) / NULLIF(estimated_hours, 0) * 100)), 0),
         updated_at = NOW() WHERE id = $2`,
        [data.hours, resolvedProjectId]
      );

      // Automatically assign employee to project members when logging tasks
      if (resolvedUserId) {
        await client.query(
          'INSERT IGNORE INTO project_members (project_id, user_id) VALUES ($1,$2)',
          [resolvedProjectId, resolvedUserId]
        );

        if (isInternal) {
          await client.query(
            `DELETE pm FROM project_members pm
             JOIN users u ON pm.user_id = u.id
             WHERE pm.project_id = $1 AND u.role = 'manager'`,
            [resolvedProjectId]
          );
        }
      }

      const ticketRows: unknown[] = [];
      for (const t of data.tickets || []) {
        const tId = crypto.randomUUID();
        await client.query(
          `INSERT INTO tickets (id, ticket_number, ticket_url, provider) VALUES ($1,$2,$3,$4)`,
          [tId, t.ticketNumber, t.ticketUrl || '', t.provider || '']
        );
        const tRes = await client.query('SELECT * FROM tickets WHERE id=$1', [tId]);
        await client.query(
          'INSERT IGNORE INTO work_log_tickets (work_log_id, ticket_id) VALUES ($1,$2)',
          [wlId, tId]
        );
        const tr = tRes.rows[0] as Record<string, unknown>;
        ticketRows.push({ id: tr['id'], ticketNumber: tr['ticket_number'], ticketUrl: tr['ticket_url'], provider: tr['provider'] });
      }

      const pRes = await client.query('SELECT name FROM projects WHERE id=$1', [resolvedProjectId]);
      wl['project_name'] = pRes.rows[0]?.name || 'Internal';
      return formatLog(wl, ticketRows);
    });
  },

  async update(id: string, userId: string, data: Partial<{ taskName: string; taskDescription: string; hours: number; date: string; status: string; taskStatus: string; projectId: string }>) {
    if (data.date) {
      const today = new Date().toISOString().slice(0, 10);
      if (String(data.date).split('T')[0] > today) {
        throw createError('Cannot update task log to a future date.', 400, 'BAD_REQUEST');
      }
    }
    const existing = await query('SELECT * FROM work_logs WHERE id=$1 AND user_id=$2', [id, userId]);
    if (!existing.rows[0]) throw createError('Work log not found', 404, 'NOT_FOUND');
    const old = existing.rows[0] as Record<string, unknown>;

    const tsCheck = await query(
      `SELECT ts.status FROM work_logs wl LEFT JOIN timesheets ts ON ts.user_id = wl.user_id AND wl.date >= ts.week_start AND wl.date <= ts.week_end WHERE wl.id = $1`,
      [id]
    );
    const tsStatus = tsCheck.rows[0]?.['status'] || old['status'];
    if (tsStatus === 'Approved' || tsStatus === 'Rejected') {
      throw createError('Cannot modify a timesheet log that has already been approved or rejected.', 400, 'BAD_REQUEST');
    }

    const fields: string[] = [];
    const params: unknown[] = [];
    let idx = 1;
    if (data.taskName        !== undefined) { fields.push(`task_name=$${idx++}`);        params.push(data.taskName); }
    if (data.taskDescription !== undefined) { fields.push(`task_description=$${idx++}`); params.push(data.taskDescription); }
    if (data.hours           !== undefined) { fields.push(`hours=$${idx++}`);            params.push(data.hours); }
    if (data.date            !== undefined) { fields.push(`date=$${idx++}`);             params.push(data.date); }
    if (data.taskStatus      !== undefined) { fields.push(`task_status=$${idx++}`);      params.push(data.taskStatus); }
    if (!fields.length) return formatLog(old, await getTickets(id));
    fields.push('updated_at=NOW()');
    params.push(id);
    const res = await query(`UPDATE work_logs SET ${fields.join(',')} WHERE id=$${idx} RETURNING *`, params);
    const updated = res.rows[0] as Record<string, unknown>;

    if (data.hours !== undefined) {
      const diff = data.hours - Number(old['hours']);
      await query(
        `UPDATE projects SET logged_hours = GREATEST(0, logged_hours + $1),
         progress = COALESCE(LEAST(100, ROUND((GREATEST(0, logged_hours + $1)) / NULLIF(estimated_hours, 0) * 100)), 0),
         updated_at = NOW() WHERE id = $2`,
        [diff, old['project_id']]
      );
    }

    const pRes = await query('SELECT name FROM projects WHERE id=$1', [updated['project_id']]);
    updated['project_name'] = pRes.rows[0]?.name || '';
    return formatLog(updated, await getTickets(id));
  },

  async delete(id: string, userId: string) {
    const existing = await query('SELECT * FROM work_logs WHERE id=$1 AND user_id=$2', [id, userId]);
    if (!existing.rows[0]) throw createError('Work log not found', 404, 'NOT_FOUND');
    const old = existing.rows[0] as Record<string, unknown>;

    const tsCheck = await query(
      `SELECT ts.status FROM work_logs wl LEFT JOIN timesheets ts ON ts.user_id = wl.user_id AND wl.date >= ts.week_start AND wl.date <= ts.week_end WHERE wl.id = $1`,
      [id]
    );
    const tsStatus = tsCheck.rows[0]?.['status'] || old['status'];
    if (tsStatus === 'Approved' || tsStatus === 'Rejected') {
      throw createError('Cannot modify a timesheet log that has already been approved or rejected.', 400, 'BAD_REQUEST');
    }
    await query('DELETE FROM work_logs WHERE id=$1', [id]);
    await query(
      `UPDATE projects SET logged_hours = GREATEST(0, logged_hours - $1),
       progress = COALESCE(LEAST(100, ROUND((GREATEST(0, logged_hours - $1)) / NULLIF(estimated_hours, 0) * 100)), 0),
       updated_at = NOW() WHERE id = $2`,
      [old['hours'], old['project_id']]
    );
    return { ok: true };
  },

  async submitWeek(userId: string, weekStart: string) {
    const start = new Date(weekStart);
    const end = new Date(start); end.setDate(end.getDate() + 6);
    const weekEnd = end.toISOString().slice(0, 10);

    const totalRes = await query(
      `SELECT COALESCE(SUM(hours),0) AS total FROM work_logs 
       WHERE user_id=$1 AND date >= $2 AND date <= $3`,
      [userId, weekStart, weekEnd]
    );
    const total = Number((totalRes.rows[0] as Record<string, unknown>)['total']);
    const tsId = crypto.randomUUID();

    await query(
      `INSERT INTO timesheets (id, user_id, week_start, week_end, total_hours, status, submitted_at)
       VALUES ($1,$2,$3,$4,$5,'Submitted', NOW())
       ON DUPLICATE KEY UPDATE
         total_hours=$5, status='Submitted', submitted_at=NOW(), updated_at=NOW()`,
      [tsId, userId, weekStart, weekEnd, total]
    );
    const tsRes = await query('SELECT * FROM timesheets WHERE user_id=$1 AND week_start=$2', [userId, weekStart]);
    const ts = tsRes.rows[0] as Record<string, unknown>;

    // Step 1: Direct Reporting Manager (Highest Priority)
    let mgrRes = await query(`SELECT reporting_manager_id FROM users WHERE id = $1`, [userId]);
    let mgrId = (mgrRes.rows[0] as Record<string, unknown>)?.['reporting_manager_id'] as string || null;

    // Step 2: Route to the manager of the project(s) that the user logged hours for during this timesheet week
    if (!mgrId) {
      mgrRes = await query(
        `SELECT u.id 
         FROM work_logs wl
         JOIN project_members pm ON pm.project_id = wl.project_id
         JOIN users u ON u.id = pm.user_id
         WHERE wl.user_id = $1 
           AND wl.date >= $2 AND wl.date <= $3
           AND (u.role = 'manager' OR u.role = 'admin') 
           AND u.id != $1
         LIMIT 1`,
        [userId, weekStart, weekEnd]
      );
      mgrId = (mgrRes.rows[0] as Record<string, unknown>)?.['id'] as string || null;
    }

    // Step 3: Fallback to department / Engineering manager if no project manager matched
    if (!mgrId) {
      mgrRes = await query(
        `SELECT m.id FROM users m JOIN users u ON u.id = $1 WHERE (m.role = 'manager' OR m.role = 'admin') AND m.id != $1 AND (m.department = u.department OR m.department = 'Engineering') LIMIT 1`,
        [userId]
      );
      mgrId = (mgrRes.rows[0] as Record<string, unknown>)?.['id'] as string || null;
    }

    const appId = crypto.randomUUID();
    await query(
      `INSERT INTO approvals (id, timesheet_id, manager_id, status)
       VALUES ($1,$2,$3,'Pending')
       ON DUPLICATE KEY UPDATE status='Pending', manager_id=$3, comments='', approved_at=NULL`,
      [appId, ts['id'], mgrId]
    );

    let managerName = '';
    if (mgrId) {
      const uRes = await query('SELECT first_name, last_name FROM users WHERE id=$1', [mgrId]);
      if (uRes.rows[0]) {
        managerName = `${uRes.rows[0].first_name} ${uRes.rows[0].last_name}`;
      }
    }

    return {
      ...ts,
      managerId: mgrId,
      managerName,
    };
  },
};
