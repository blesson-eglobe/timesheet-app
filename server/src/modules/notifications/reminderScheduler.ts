import crypto from 'crypto';
import { query } from '../../config/db';

// ─── Date Helpers ─────────────────────────────────────────────────────────────

/** Returns the Monday of the ISO week containing `date` (UTC). */
function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** Returns Mon–Fri date strings (YYYY-MM-DD) for the *previous* ISO week. */
function getPreviousWeekWorkdays(): string[] {
  const today = new Date();
  const thisMonday = getMondayOf(today);
  const lastMonday = new Date(thisMonday);
  lastMonday.setUTCDate(lastMonday.getUTCDate() - 7);

  const days: string[] = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(lastMonday);
    d.setUTCDate(d.getUTCDate() + i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

/** Returns a short label like "Mon, Aug 11" for a YYYY-MM-DD string. */
function shortDay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserRow {
  id: string;
  first_name: string;
  last_name: string;
  reporting_manager_id: string | null;
}

// ─── Core Query ───────────────────────────────────────────────────────────────

/**
 * For each active employee (with reminders enabled), finds which workdays
 * in `weekDays` have no logged hours.
 */
async function findUsersWithMissingDays(
  weekDays: string[]
): Promise<Map<string, { user: UserRow; missingDays: string[] }>> {
  const usersRes = await query(
    `SELECT u.id, u.first_name, u.last_name, u.reporting_manager_id
     FROM users u
     LEFT JOIN user_preferences up ON up.user_id = u.id
     WHERE u.status != 'Disabled'
       AND u.role = 'employee'
       AND (up.notif_reminder IS NULL OR up.notif_reminder = TRUE)`
  );
  const users = usersRes.rows as unknown as UserRow[];
  if (users.length === 0) return new Map();

  const userIds = users.map((u) => u.id);
  const userPlaceholders = userIds.map((_, i) => `$${i + 1}`).join(',');
  const dayPlaceholders = weekDays.map((_, i) => `$${userIds.length + i + 1}`).join(',');

  const logsRes = await query(
    `SELECT DISTINCT user_id, DATE_FORMAT(date, '%Y-%m-%d') AS log_date
     FROM work_logs
     WHERE user_id IN (${userPlaceholders})
       AND date IN (${dayPlaceholders})`,
    [...userIds, ...weekDays]
  );

  const loggedSet = new Set<string>(
    (logsRes.rows as { user_id: string; log_date: string }[]).map(
      (r) => `${r.user_id}|${r.log_date}`
    )
  );

  const result = new Map<string, { user: UserRow; missingDays: string[] }>();
  for (const user of users) {
    const missingDays = weekDays.filter((d) => !loggedSet.has(`${user.id}|${d}`));
    if (missingDays.length > 0) {
      result.set(user.id, { user, missingDays });
    }
  }
  return result;
}

// ─── Deduplication ───────────────────────────────────────────────────────────

function makeMetaKey(
  type: 'employee_reminder' | 'manager_escalation',
  userId: string,
  weekStart: string
): string {
  return `${type}:${userId}:${weekStart}`;
}

async function alreadySent(metaKey: string): Promise<boolean> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const res = await query(
    `SELECT id FROM notifications WHERE meta = $1 AND created_at >= $2 LIMIT 1`,
    [metaKey, todayStart.toISOString().slice(0, 19).replace('T', ' ')]
  );
  return res.rows.length > 0;
}

// ─── Employee Reminders ───────────────────────────────────────────────────────

async function sendEmployeeReminders(weekDays: string[], weekStart: string): Promise<number> {
  const missing = await findUsersWithMissingDays(weekDays);
  let sent = 0;

  for (const [userId, { missingDays }] of missing) {
    const metaKey = makeMetaKey('employee_reminder', userId, weekStart);
    if (await alreadySent(metaKey)) continue;

    const dayLabels = missingDays.map(shortDay).join(', ');
    const count = missingDays.length;
    const message =
      `You missed logging hours for ${count} day${count > 1 ? 's' : ''} last week ` +
      `(${dayLabels}). Please update your timesheet to keep project records accurate.`;

    await query(
      `INSERT INTO notifications (id, user_id, title, message, type, is_read, meta)
       VALUES ($1, $2, $3, $4, $5, false, $6)`,
      [
        crypto.randomUUID(),
        userId,
        'Missing Timesheet Entries',
        message,
        'reminder',
        metaKey,
      ]
    );
    sent++;
  }

  console.log(`[Reminder] Employee reminders sent: ${sent} (week: ${weekStart})`);
  return sent;
}

// ─── Manager Escalations ──────────────────────────────────────────────────────

async function sendManagerEscalations(weekDays: string[], weekStart: string): Promise<number> {
  const missing = await findUsersWithMissingDays(weekDays);
  let sent = 0;

  for (const [, { user, missingDays }] of missing) {
    if (!user.reporting_manager_id) continue;

    const metaKey = makeMetaKey('manager_escalation', user.id, weekStart);
    if (await alreadySent(metaKey)) continue;

    const dayLabels = missingDays.map(shortDay).join(', ');
    const count = missingDays.length;
    const name = `${user.first_name} ${user.last_name}`;
    const message =
      `${name} has not logged hours for ${count} day${count > 1 ? 's' : ''} last week ` +
      `(${dayLabels}). Please follow up with them to ensure their timesheet is completed.`;

    await query(
      `INSERT INTO notifications (id, user_id, title, message, type, is_read, meta)
       VALUES ($1, $2, $3, $4, $5, false, $6)`,
      [
        crypto.randomUUID(),
        user.reporting_manager_id,
        'Timesheet Follow-up Required',
        message,
        'reminder',
        metaKey,
      ]
    );
    sent++;
  }

  console.log(`[Reminder] Manager escalations sent: ${sent} (week: ${weekStart})`);
  return sent;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Run the reminder check immediately.
 * @param forceEscalation — also run manager escalations (normally only on Wednesdays).
 */
export async function runReminderCheck(
  forceEscalation = false
): Promise<{ employeeSent: number; managerSent: number }> {
  const weekDays = getPreviousWeekWorkdays();
  const weekStart = weekDays[0];
  console.log(`[Reminder] Checking missing logs for week starting ${weekStart}…`);

  const employeeSent = await sendEmployeeReminders(weekDays, weekStart);

  let managerSent = 0;
  const todayDow = new Date().getDay(); // 3 = Wednesday
  if (forceEscalation || todayDow === 3) {
    managerSent = await sendManagerEscalations(weekDays, weekStart);
  }

  return { employeeSent, managerSent };
}

/**
 * Starts the background reminder scheduler.
 * Fires employee reminders every Monday 09:00 and manager escalations every Wednesday 09:00.
 * Checks once per hour so the window is at most 1 h late.
 */
export function startReminderScheduler(): void {
  console.log('📅 Reminder scheduler started (checks hourly; fires Mon 09:00 / Wed 09:00)');

  const checkAndRun = async () => {
    try {
      const now = new Date();
      const hour = now.getHours();
      const dow = now.getDay();

      if (hour !== 9) return; // Only fire in the 09:xx window

      if (dow === 1) await runReminderCheck(false); // Monday — employee reminders
      if (dow === 3) await runReminderCheck(true);  // Wednesday — + manager escalations
    } catch (err) {
      console.error('[Reminder] Scheduler error:', err);
    }
  };

  setInterval(checkAndRun, 60 * 60 * 1000); // every hour
  setTimeout(checkAndRun, 5000);            // once after startup (catches a missed window)
}
