import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export type UserRole = 'employee' | 'manager' | 'admin' | 'hr' | 'ceo';

export interface AuthPayload {
  id: string;
  role: UserRole;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const header = req.headers.authorization;
  const token = (header && header.startsWith('Bearer ')) ? header.split(' ')[1] : null;

  const activeEmail = req.headers['x-active-email'];

  if (token) {
    try {
      const payload = jwt.verify(token, env.jwt.secret) as AuthPayload;
      req.user = payload;
    } catch (e) {
      // Invalid or expired token
    }
  }

  // Optional fallback: query exact user by activeEmail header if no token set
  if (!req.user && activeEmail && typeof activeEmail === 'string') {
    try {
      const { query } = require('../config/db');
      const userRes = await query('SELECT id, role, email FROM users WHERE LOWER(email) = $1 LIMIT 1', [activeEmail.toLowerCase().trim()]);
      if (userRes.rows[0]) {
        req.user = {
          id: userRes.rows[0].id,
          role: userRes.rows[0].role as UserRole,
          email: userRes.rows[0].email
        };
      }
    } catch (e) {}
  }

  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired token' });
    return;
  }

  next();
};

/** Restrict access to specific roles. Usage: requireRole('manager', 'admin', 'hr', 'ceo') */
export const requireRole = (...roles: UserRole[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({
        error: 'Forbidden',
        message: `Access restricted to: ${roles.join(', ')}`,
      });
      return;
    }
    next();
  };

/** @deprecated Use requireRole('manager', 'admin') instead */
export const requireManager = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user || (req.user.role !== 'manager' && req.user.role !== 'admin' && req.user.role !== 'ceo' && req.user.role !== 'hr')) {
    res.status(403).json({ error: 'Forbidden', message: 'Manager or elevated access required' });
    return;
  }
  next();
};
