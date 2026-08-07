import { query } from '../../config/db';

export const settingsService = {
  async get(userId: string) {
    const prefRes = await query('SELECT * FROM user_preferences WHERE user_id=$1', [userId]);
    const userRes = await query('SELECT first_name, last_name, email, designation, department, initials, color FROM users WHERE id=$1', [userId]);
    const pref = (prefRes.rows[0] || {}) as Record<string, unknown>;
    const user = (userRes.rows[0] || {}) as Record<string, unknown>;
    return {
      name: `${user['first_name']} ${user['last_name']}`,
      email: user['email'],
      designation: user['designation'],
      department: user['department'],
      initials: user['initials'],
      color: user['color'],
      dailyTarget: Number(pref['daily_hours_target']) || 8,
      timezone: pref['timezone'] || 'Asia/Kolkata',
      weekStartDay: pref['week_start_day'] || 'Monday',
      notifSubmission: pref['notif_submission'] !== false,
      notifApproval: pref['notif_approval'] !== false,
      notifReminder: pref['notif_reminder'] === true,
    };
  },

  async update(userId: string, data: {
    name?: string; email?: string;
    dailyTarget?: number; timezone?: string; weekStartDay?: string;
    notifSubmission?: boolean; notifApproval?: boolean; notifReminder?: boolean;
  }) {
    if (data.name !== undefined) {
      const parts = data.name.trim().split(' ');
      const firstName = parts[0] || '';
      const lastName  = parts.slice(1).join(' ') || '';
      await query(
        `UPDATE users SET first_name=$1, last_name=$2, updated_at=NOW() WHERE id=$3`,
        [firstName, lastName, userId]
      );
    }
    if (data.email !== undefined) {
      await query(`UPDATE users SET email=$1, updated_at=NOW() WHERE id=$2`, [data.email.toLowerCase(), userId]);
    }

    const prefFields: string[] = [];
    const prefParams: unknown[] = [];
    let idx = 1;
    if (data.dailyTarget    !== undefined) { prefFields.push(`daily_hours_target=$${idx++}`); prefParams.push(data.dailyTarget); }
    if (data.timezone       !== undefined) { prefFields.push(`timezone=$${idx++}`);           prefParams.push(data.timezone); }
    if (data.weekStartDay   !== undefined) { prefFields.push(`week_start_day=$${idx++}`);     prefParams.push(data.weekStartDay); }
    if (data.notifSubmission !== undefined) { prefFields.push(`notif_submission=$${idx++}`);   prefParams.push(data.notifSubmission); }
    if (data.notifApproval  !== undefined) { prefFields.push(`notif_approval=$${idx++}`);     prefParams.push(data.notifApproval); }
    if (data.notifReminder  !== undefined) { prefFields.push(`notif_reminder=$${idx++}`);     prefParams.push(data.notifReminder); }

    if (prefFields.length > 0) {
      prefFields.push('updated_at=NOW()');
      prefParams.push(userId);
      await query(
        `INSERT INTO user_preferences (user_id) VALUES ($${idx}) ON DUPLICATE KEY UPDATE ${prefFields.join(',')}`,
        prefParams
      );
    }

    return settingsService.get(userId);
  },
};
