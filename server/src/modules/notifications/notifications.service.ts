import crypto from 'crypto';
import { query } from '../../config/db';

export const notificationsService = {
  async list(userId: string) {
    const res = await query(
      `SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 20`,
      [userId]
    );
    return res.rows.map((n: Record<string, unknown>) => ({
      id: n['id'],
      type: n['type'],
      message: n['message'],
      time: formatTime(n['created_at'] as Date),
      read: n['is_read'] ?? n['read_status'] ?? false,
    }));
  },

  async markRead(id: string, userId: string) {
    await query(
      `UPDATE notifications SET is_read=TRUE WHERE id=$1 AND user_id=$2`,
      [id, userId]
    );
    return { ok: true };
  },

  async markAllRead(userId: string) {
    await query(`UPDATE notifications SET is_read=TRUE WHERE user_id=$1`, [userId]);
    return { ok: true };
  },

  async create(userId: string, message: string, type: string) {
    const id = crypto.randomUUID();
    await query(
      `INSERT INTO notifications (id, user_id, title, message, type, is_read) VALUES ($1,$2,$3,$4,$5,false)`,
      [id, userId, 'System Notification', message, type]
    );
  },

  async sendReminderToManagers(message: string) {
    try {
      const usersRes = await query(`SELECT id FROM users WHERE role IN ('manager', 'ceo', 'admin')`);
      for (const u of usersRes.rows as { id: string }[]) {
        const id = crypto.randomUUID();
        await query(
          `INSERT INTO notifications (id, user_id, title, message, type, is_read) VALUES ($1,$2,$3,$4,$5,false)`,
          [id, u.id, 'Approval Reminder from HR', message, 'reminder']
        );
      }
    } catch (e) {
      console.error('Failed to send reminder in DB:', e);
    }
    return { ok: true };
  },
};

function formatTime(date: Date): string {
  const now = new Date();
  const d = new Date(date);
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 172800) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
