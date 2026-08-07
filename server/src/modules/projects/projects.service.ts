import crypto from 'crypto';
import { query, withTransaction } from '../../config/db';
import { createError } from '../../middleware/errorHandler';

const formatProject = (p: Record<string, unknown>, members: unknown[]) => {
  const typedMembers = members as Array<Record<string, unknown>>;
  const managers = typedMembers.filter(m => m['role'] === 'manager');
  const total = Number(p['estimated_hours']) || 0;
  const logged = Number(p['actual_logged_hours'] !== undefined ? p['actual_logged_hours'] : p['logged_hours']) || 0;
  const rawProgress = total > 0 ? (logged / total) * 100 : 0;
  const computedProgress = rawProgress > 0 && rawProgress < 1
    ? Math.round(rawProgress * 10) / 10
    : Math.min(100, Math.round(rawProgress));
  return {
    id: p['id'],
    name: p['name'],
    description: p['description'],
    status: p['status'],
    priority: p['priority'],
    type: p['project_type'] || 'Billable',
    projectType: p['project_type'] || 'Billable',
    totalHours: total,
    loggedHours: logged,
    progress: computedProgress,
    dueDate: p['end_date'] ? new Date(p['end_date'] as string).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : '',
    startDate: p['start_date'] ? String(p['start_date']).split('T')[0] : '',
    endDate: p['end_date'] ? String(p['end_date']).split('T')[0] : '',
    teamMembers: typedMembers,
    managers,
    createdAt: p['created_at'],
  };
};

const getMembers = async (projectId: string, client?: { query: typeof query }) => {
  const q = client ? client.query.bind(client) : query;
  const res = await q(
    `SELECT u.id, u.first_name, u.last_name, u.initials, u.color, u.designation, u.department, u.role
     FROM users u JOIN project_members pm ON pm.user_id = u.id
     WHERE pm.project_id = $1`,
    [projectId]
  );
  return res.rows.map((u: Record<string, unknown>) => ({
    id: u['id'],
    name: `${u['first_name']} ${u['last_name']}`,
    initials: u['initials'],
    color: u['color'],
    designation: u['designation'],
    department: u['department'],
    role: u['role'],
  }));
};

export const projectsService = {
  async list(search?: string, status?: string, userId?: string) {
    // Ensure default 'Internal' project exists
    try {
      await query(
        `INSERT IGNORE INTO projects (id, name, description, status, priority, project_type, estimated_hours)
         VALUES ('internal', 'Internal', 'Internal company activities, administrative work, and team training.', 'Ongoing', 'Medium', 'Internal', 1000)`
      );
    } catch {
      /* ignore if exists */
    }

    let sql = `SELECT p.*, COALESCE((SELECT SUM(wl.hours) FROM work_logs wl WHERE wl.project_id = p.id), 0) AS actual_logged_hours FROM projects p WHERE 1=1`;
    const params: unknown[] = [];
    let idx = 1;
    if (search) { sql += ` AND p.name LIKE $${idx++}`; params.push(`%${search}%`); }
    if (status && status !== 'All') {
      if (status === 'Ongoing') {
        sql += ` AND p.status IN ('Ongoing', 'Active', 'On Track', 'In Progress', 'In Review', 'Planning')`;
      } else {
        sql += ` AND p.status = $${idx++}`;
        params.push(status);
      }
    }
    // Employee: ONLY projects where they are assigned as a member (in project_members)
    if (userId) {
      sql += ` AND EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = $${idx})`;
      params.push(userId);
      idx++;
    }
    sql += ` ORDER BY p.name ASC`;
    const res = await query(sql, params);
    const projects = await Promise.all(
      res.rows.map(async (row: Record<string, unknown>) => {
        const members = await getMembers(row['id'] as string);
        return formatProject(row, members);
      })
    );
    return projects;
  },

  async getById(id: string) {
    const res = await query('SELECT p.*, COALESCE((SELECT SUM(wl.hours) FROM work_logs wl WHERE wl.project_id = p.id), 0) AS actual_logged_hours FROM projects p WHERE p.id=$1', [id]);
    const p = res.rows[0] as Record<string, unknown>;
    if (!p) throw createError('Project not found', 404, 'NOT_FOUND');
    const members = await getMembers(id);

    // Get recent work logs for this project
    const logsRes = await query(
      `SELECT wl.*, u.first_name, u.last_name, u.initials, u.color
       FROM work_logs wl JOIN users u ON wl.user_id = u.id
       WHERE wl.project_id=$1 ORDER BY wl.date DESC`,
      [id]
    );
    const tasks = logsRes.rows.map((l: Record<string, unknown>) => ({
      id: l['id'],
      taskName: l['task_name'],
      employeeName: `${l['first_name']} ${l['last_name']}`,
      employeeInitials: l['initials'],
      employeeColor: l['color'],
      assignee: {
        name: `${l['first_name']} ${l['last_name']}`,
        initials: l['initials'],
        color: l['color'],
      },
      date: String(l['date']).split('T')[0],
      hours: Number(l['hours']),
      status: l['status'] || 'In Progress',
      taskStatus: l['task_status'] || 'In Progress',
      priority: 'Medium',
    }));

    return { ...formatProject(p, members), tasks, recentTasks: tasks };
  },

  async create(data: { name: string; description?: string; status?: string; priority?: string; type?: string; projectType?: string; estimatedHours?: number; endDate?: string; memberIds?: string[] }, userId: string) {
    if (!data.name || !data.name.trim()) {
      throw createError('Project name is required.', 400, 'MISSING_NAME');
    }

    const existing = await query('SELECT id FROM projects WHERE LOWER(TRIM(name)) = LOWER(TRIM($1))', [data.name.trim()]);
    if (existing.rows.length > 0) {
      throw createError('A project with this name already exists.', 400, 'DUPLICATE_PROJECT_NAME');
    }

    const projType = data.type || data.projectType || 'Billable';
    const formattedEndDate = data.endDate && data.endDate.trim() ? data.endDate.trim() : null;

    return withTransaction(async (client) => {
      const id = crypto.randomUUID();
      await client.query(
        `INSERT INTO projects (id, name, description, status, priority, project_type, estimated_hours, end_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [id, data.name.trim(), data.description ? data.description.trim() : '', data.status || 'Not Started', data.priority || 'Medium', projType, Number(data.estimatedHours) || 0, formattedEndDate]
      );
      const res = await client.query('SELECT * FROM projects WHERE id=$1', [id]);
      const p = res.rows[0] as Record<string, unknown>;
      
      const candidateIds = Array.from(new Set([userId, ...(data.memberIds || [])].filter(Boolean)));
      for (const mid of candidateIds) {
        const userExists = await client.query('SELECT id FROM users WHERE id = $1 LIMIT 1', [mid]);
        if (userExists.rows.length > 0) {
          await client.query(
            'INSERT IGNORE INTO project_members (project_id, user_id) VALUES ($1,$2)',
            [id, mid]
          );
        }
      }
      
      const members = await getMembers(id, client as { query: typeof query });
      return formatProject(p, members);
    });
  },

  async update(id: string, data: Partial<{ name: string; description: string; status: string; priority: string; type: string; projectType: string; estimatedHours: number; endDate: string; memberIds: string[] }>) {
    if (data.name !== undefined) {
      const existing = await query('SELECT id FROM projects WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) AND id != $2', [data.name, id]);
      if (existing.rows.length > 0) {
        throw createError('A project with this name already exists.', 400, 'DUPLICATE_PROJECT_NAME');
      }
    }
    
    return withTransaction(async (client) => {
      const fields: string[] = [];
    const params: unknown[] = [];
    let idx = 1;
    if (data.name        !== undefined) { fields.push(`name=$${idx++}`);             params.push(data.name); }
    if (data.description !== undefined) { fields.push(`description=$${idx++}`);      params.push(data.description); }
    if (data.status      !== undefined) { fields.push(`status=$${idx++}`);           params.push(data.status); }
    if (data.priority    !== undefined) { fields.push(`priority=$${idx++}`);         params.push(data.priority); }
    const pType = data.type || data.projectType;
    if (pType !== undefined)            { fields.push(`project_type=$${idx++}`);     params.push(pType); }
    if (data.estimatedHours !== undefined) { fields.push(`estimated_hours=$${idx++}`); params.push(data.estimatedHours); }
    if (data.endDate     !== undefined) { fields.push(`end_date=$${idx++}`);         params.push(data.endDate); }
    if (fields.length) {
      fields.push('updated_at=NOW()');
      params.push(id);
      await client.query(`UPDATE projects SET ${fields.join(',')} WHERE id=$${idx}`, params);
    }
    
    if (data.memberIds !== undefined) {
      await client.query('DELETE FROM project_members WHERE project_id=$1', [id]);
      const memberIds = Array.from(new Set(data.memberIds));
      for (const mid of memberIds) {
        await client.query('INSERT IGNORE INTO project_members (project_id, user_id) VALUES ($1,$2)', [id, mid]);
      }
    }

    const sel = await client.query('SELECT * FROM projects WHERE id=$1', [id]);
    const p = sel.rows[0] as Record<string, unknown>;
    const members = await getMembers(id, client as { query: typeof query });
    return formatProject(p, members);
    });
  },

  async addMember(projectId: string, userId: string) {
    await query('INSERT IGNORE INTO project_members (project_id, user_id) VALUES ($1,$2)', [projectId, userId]);
    return { ok: true };
  },

  async delete(id: string) {
    await query('DELETE FROM work_log_tickets WHERE work_log_id IN (SELECT id FROM work_logs WHERE project_id=$1)', [id]);
    await query('DELETE FROM work_logs WHERE project_id=$1', [id]);
    await query('DELETE FROM project_members WHERE project_id=$1', [id]);
    await query('DELETE FROM projects WHERE id=$1', [id]);
    return { ok: true };
  },
};

