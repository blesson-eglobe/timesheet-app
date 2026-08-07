import { Request, Response, NextFunction } from 'express';
import { body, query as queryValidator, validationResult } from 'express-validator';
import CryptoJS from 'crypto-js';
import { invitesService } from './invites.service';
import { env } from '../../config/env';

const decryptPassword = (encryptedPassword: string): string => {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedPassword, env.encryptionKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch {
    return encryptedPassword;
  }
};

export const invitesController = {
  validateCreate: [
    body('email').isEmail().normalizeEmail(),
    body('role').isIn(['employee', 'manager', 'admin']),
    body('department').trim().notEmpty(),
  ],

  validateAccept: [
    body('token').trim().notEmpty(),
    body('firstName').trim().isLength({ min: 1, max: 100 }),
    body('lastName').trim().optional(),
    body('username').trim().isLength({ min: 3, max: 100 }),
    body('password').isLength({ min: 1 }),
  ],

  /** POST /api/invites — admin/manager creates invite */
  async create(req: Request, res: Response, next: NextFunction) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(422).json({ error: 'VALIDATION_ERROR', errors: errors.array() });
      return;
    }
    try {
      const { email, role, department } = req.body as {
        email: string;
        role: 'employee' | 'manager' | 'admin';
        department: string;
      };
      const origin = typeof req.headers.origin === 'string' ? req.headers.origin : undefined;
      const result = await invitesService.createInvite(email, role, department, req.user!.id, origin);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },

  /** GET /api/invites/validate?token= — public, called when invite page loads */
  async validate(req: Request, res: Response, next: NextFunction) {
    try {
      const token = (req.query['token'] as string | undefined) || '';
      if (!token) {
        res.status(400).json({ error: 'BAD_REQUEST', message: 'Token is required' });
        return;
      }
      const data = await invitesService.validateToken(token);
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  /** POST /api/invites/accept — public, employee completes registration */
  async accept(req: Request, res: Response, next: NextFunction) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(422).json({ error: 'VALIDATION_ERROR', errors: errors.array() });
      return;
    }
    try {
      const { token, firstName, lastName, username, password } = req.body as {
        token: string;
        firstName: string;
        lastName: string;
        username: string;
        password: string;
      };
      const decryptedPassword = decryptPassword(password);
      if (decryptedPassword.length < 6) {
        res.status(422).json({ error: 'VALIDATION_ERROR', errors: [{ msg: 'Password must be at least 6 characters', path: 'password' }] });
        return;
      }
      const data = await invitesService.acceptInvite(token, firstName, lastName, username, decryptedPassword);
      res.status(201).json(data);
    } catch (err) {
      next(err);
    }
  },
};
