import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query } from '../../config/db';
import { env } from '../../config/env';
import { createError } from '../../middleware/errorHandler';

const INVITE_TTL_HOURS = 48;

/** SHA-256 hex of token — used as DB index key */
const hashToken = (token: string) =>
  crypto.createHash('sha256').update(token).digest('hex');

interface InviteRow {
  id: string;
  email: string;
  role: 'employee' | 'manager' | 'admin';
  department: string;
  token: string;
  invited_by: string;
  used_at: string | null;
  expires_at: string;
}

interface InviterRow {
  first_name: string;
  last_name: string;
  email: string;
}

export const invitesService = {
  /** Admin creates an invite — returns the signed token and full invite URL */
  async createInvite(
    email: string,
    role: 'employee' | 'manager' | 'admin',
    department: string,
    invitedById: string,
    clientOrigin?: string,
  ) {
    const normalizedEmail = email.toLowerCase().trim();

    // Check if a user with this email already exists
    const existing = await query('SELECT id FROM users WHERE email = ? LIMIT 1', [normalizedEmail]);
    if (existing.rows.length > 0) {
      throw createError('A user with this email already exists', 409, 'EMAIL_TAKEN');
    }

    // Expire any old pending invites for the same email
    await query('DELETE FROM invites WHERE email = ? AND used_at IS NULL', [normalizedEmail]);

    const id = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + INVITE_TTL_HOURS * 60 * 60 * 1000);

    // Sign a JWT so we can embed the invite ID securely
    const token = jwt.sign(
      { inviteId: id, email: normalizedEmail, role, department },
      env.jwt.secret,
      { expiresIn: `${INVITE_TTL_HOURS}h` },
    );
    const tHash = hashToken(token);

    await query(
      `INSERT INTO invites (id, email, role, department, token, token_hash, invited_by, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, normalizedEmail, role, department, token, tHash, invitedById, expiresAt],
    );

    let baseUrl = env.clientUrl.split(',')[0].trim().replace(/\/+$/, '');
    if (clientOrigin) {
      const normalizedOrigin = clientOrigin.replace(/\/+$/, '');
      const configuredUrls = env.clientUrl.split(',').map(u => u.trim().replace(/\/+$/, ''));
      const matchingConfigured = configuredUrls.find(u => u.startsWith(normalizedOrigin));
      baseUrl = matchingConfigured || normalizedOrigin;
    }
    const inviteUrl = `${baseUrl}/invite?token=${token}`;
    return { token, inviteUrl, expiresAt };
  },

  /** Validate a token — used when the invite page loads */
  async validateToken(token: string) {
    let payload: { inviteId: string; email: string; role: string; department: string };
    try {
      payload = jwt.verify(token, env.jwt.secret) as typeof payload;
    } catch {
      throw createError('This invite link has expired or is invalid', 410, 'INVITE_EXPIRED');
    }

    const res = await query<InviteRow>(
      'SELECT * FROM invites WHERE token_hash = ? LIMIT 1',
      [hashToken(token)],
    );
    const invite = res.rows[0];
    if (!invite) throw createError('Invite not found', 404, 'INVITE_NOT_FOUND');
    if (invite.used_at) throw createError('This invite has already been used', 409, 'INVITE_USED');
    if (new Date(invite.expires_at) < new Date()) {
      throw createError('This invite link has expired', 410, 'INVITE_EXPIRED');
    }

    // Fetch inviter name
    const inviterRes = await query<InviterRow>(
      'SELECT first_name, last_name, email FROM users WHERE id = ? LIMIT 1',
      [invite.invited_by],
    );
    const inviter = inviterRes.rows[0];
    const inviterName = inviter
      ? `${inviter.first_name} ${inviter.last_name}`.trim()
      : 'an admin';

    return {
      email: invite.email,
      role: invite.role,
      department: invite.department,
      invitedBy: inviterName,
    };
  },

  /** Accept an invite — create the user and mark invite as used */
  async acceptInvite(
    token: string,
    firstName: string,
    lastName: string,
    username: string,
    password: string,
  ) {
    // Validate first
    const inviteData = await invitesService.validateToken(token);

    let payload: { inviteId: string };
    try {
      payload = jwt.verify(token, env.jwt.secret) as typeof payload;
    } catch {
      throw createError('This invite link has expired', 410, 'INVITE_EXPIRED');
    }

    // Check username availability
    const usernameCheck = await query('SELECT id FROM users WHERE username = ? LIMIT 1', [username.toLowerCase()]);
    if (usernameCheck.rows.length > 0) throw createError('Username is already taken', 409, 'USERNAME_TAKEN');

    const passwordHash = await bcrypt.hash(password, 10);
    const initials = `${firstName[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
    const colors = ['#2563EB', '#9333EA', '#EA580C', '#059669', '#7C3AED', '#0891B2'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const userId = crypto.randomUUID();

    await query(
      `INSERT INTO users (id, first_name, last_name, username, email, password_hash, role, department, initials, color, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active')`,
      [userId, firstName, lastName, username.toLowerCase(), inviteData.email, passwordHash, inviteData.role, inviteData.department, initials, color],
    );

    // Create default preferences
    await query('INSERT IGNORE INTO user_preferences (user_id) VALUES (?)', [userId]);

    // Mark invite used
    await query('UPDATE invites SET used_at = NOW() WHERE id = ?', [payload.inviteId]);

    const userRes = await query<Record<string, unknown>>('SELECT * FROM users WHERE id = ? LIMIT 1', [userId]);
    const user = userRes.rows[0];

    const jwtToken = jwt.sign(
      { id: user['id'], role: user['role'], email: user['email'] },
      env.jwt.secret,
      { expiresIn: env.jwt.expiresIn } as jwt.SignOptions,
    );

    return {
      token: jwtToken,
      user: {
        id: user['id'],
        name: `${user['first_name']} ${user['last_name']}`,
        firstName: user['first_name'],
        lastName: user['last_name'],
        email: user['email'],
        role: user['role'],
        department: user['department'],
        designation: user['designation'] || '',
        initials: user['initials'],
        color: user['color'],
        avatar: user['avatar'] || '',
        status: user['status'],
      },
    };
  },
};
