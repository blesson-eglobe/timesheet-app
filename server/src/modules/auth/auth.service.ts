import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { query } from '../../config/db';
import { env } from '../../config/env';
import { createError } from '../../middleware/errorHandler';

export interface DbUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  password_hash: string;
  role: 'employee' | 'manager';
  department: string;
  designation: string;
  initials: string;
  color: string;
  avatar: string;
  status: string;
}

const formatUser = (u: DbUser) => ({
  id: u.id,
  name: `${u.first_name} ${u.last_name}`,
  firstName: u.first_name,
  lastName: u.last_name,
  email: u.email,
  role: u.role,
  department: u.department,
  designation: u.designation,
  initials: u.initials,
  color: u.color,
  avatar: u.avatar,
  status: u.status,
});

const signToken = (user: DbUser) =>
  jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn } as jwt.SignOptions
  );

export const authService = {
  async login(emailOrUsername: string, password: string) {
    const normalized = emailOrUsername.toLowerCase().trim();
    // Try email first, then username
    let result = await query<DbUser>(
      'SELECT * FROM users WHERE email = $1 LIMIT 1',
      [normalized]
    );
    if (!result.rows[0]) {
      result = await query<DbUser>(
        'SELECT * FROM users WHERE username = $1 LIMIT 1',
        [normalized]
      );
    }
    const user = result.rows[0];
    if (!user) throw createError('Invalid email or password', 401, 'INVALID_CREDENTIALS');

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw createError('Invalid email or password', 401, 'INVALID_CREDENTIALS');

    const token = signToken(user);
    return { token, user: formatUser(user) };
  },

  async register(firstName: string, lastName: string, username: string, email: string, password: string) {
    const existing = await query('SELECT id FROM users WHERE email=$1 OR username=$2', [email.toLowerCase(), username.toLowerCase()]);
    if (existing.rows.length > 0) throw createError('Email or username already in use', 409, 'TAKEN');

    const passwordHash = await bcrypt.hash(password, 10);
    const initials = `${firstName[0]}${lastName?.[0] || ''}`.toUpperCase();
    const colors = ['#2563EB','#9333EA','#EA580C','#059669','#7C3AED','#0891B2'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const id = crypto.randomUUID();

    await query(
      `INSERT INTO users (id, first_name, last_name, username, email, password_hash, role, initials, color)
       VALUES ($1,$2,$3,$4,$5,$6,'employee',$7,$8)`,
      [id, firstName, lastName, username.toLowerCase(), email.toLowerCase(), passwordHash, initials, color]
    );
    
    const userRes = await query<DbUser>('SELECT * FROM users WHERE id = $1', [id]);
    const user = userRes.rows[0];

    // Create default preferences
    await query('INSERT INTO user_preferences (user_id) VALUES ($1)', [user.id]);

    const token = signToken(user);
    return { token, user: formatUser(user) };
  },

  async getMe(userId: string) {
    const result = await query<DbUser>('SELECT * FROM users WHERE id=$1 LIMIT 1', [userId]);
    if (!result.rows[0]) throw createError('User not found', 404, 'NOT_FOUND');
    return formatUser(result.rows[0]);
  },

  async checkUsername(username: string, fullName?: string) {
    const result = await query('SELECT id FROM users WHERE username = $1 LIMIT 1', [username.toLowerCase()]);
    const exists = result.rows.length > 0;
    
    if (!exists || !fullName) {
      return { exists, suggestions: [] };
    }

    const names = fullName.trim().toLowerCase().split(' ').filter(Boolean);
    const first = names[0] || 'user';
    const last = names.length > 1 ? names[names.length - 1] : '';
    
    const candidates = [
      `${first}${last}`,
      `${first}.${last}`,
      `${first}_${last}`,
      `${first}${Math.floor(Math.random() * 1000)}`,
      `${first}.${Math.floor(Math.random() * 100)}`
    ].filter(c => c !== username.toLowerCase() && c.length > 2);

    const suggestions = [];
    for (const c of candidates) {
      const res = await query('SELECT id FROM users WHERE username = $1 LIMIT 1', [c]);
      if (res.rows.length === 0) {
        suggestions.push(c);
        if (suggestions.length >= 3) break;
      }
    }
    return { exists, suggestions };
  },
};
