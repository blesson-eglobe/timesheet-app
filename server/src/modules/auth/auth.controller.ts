import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import CryptoJS from 'crypto-js';
import { authService } from './auth.service';
import { env } from '../../config/env';

const decryptPassword = (encryptedPassword: string) => {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedPassword, env.encryptionKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (err) {
    return encryptedPassword; // Fallback in case of raw password for backwards compatibility
  }
};

const handleValidation = (req: Request, res: Response): boolean => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ error: 'VALIDATION_ERROR', errors: errors.array() });
    return false;
  }
  return true;
};

export const authController = {
  validateLogin: [
    body('email').trim().notEmpty(), // Now represents email or username
    body('password').isLength({ min: 1 }), // Validation passes since encrypted str is long
  ],

  validateRegister: [
    body('firstName').trim().isLength({ min: 1, max: 100 }),
    body('lastName').trim().optional(),
    body('username').trim().isLength({ min: 3, max: 100 }),
    body('email').isEmail().normalizeEmail().matches(/@eglobeits\.com$/).withMessage('Work email must be an @eglobeits.com domain'),
    body('password').isLength({ min: 1 }), // Validation passes since encrypted str is long
  ],

  async login(req: Request, res: Response, next: NextFunction) {
    if (!handleValidation(req, res)) return;
    try {
      const { email, password } = req.body as { email: string; password: string };
      const decryptedPassword = decryptPassword(password);
      const data = await authService.login(email, decryptedPassword);
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  async register(req: Request, res: Response, next: NextFunction) {
    if (!handleValidation(req, res)) return;
    try {
      const { firstName, lastName, username, email, password } = req.body as {
        firstName: string; lastName: string; username: string; email: string; password: string;
      };
      const decryptedPassword = decryptPassword(password);
      if (decryptedPassword.length < 6) {
        res.status(422).json({ error: 'VALIDATION_ERROR', errors: [{ msg: 'Password must be at least 6 characters long', path: 'password' }] });
        return;
      }
      const data = await authService.register(firstName, lastName, username, email, decryptedPassword);
      res.status(201).json(data);
    } catch (err) {
      next(err);
    }
  },

  async me(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await authService.getMe(req.user!.id);
      res.json(user);
    } catch (err) {
      next(err);
    }
  },

  async checkUsername(req: Request, res: Response, next: NextFunction) {
    try {
      const { username, fullName } = req.body as { username: string; fullName?: string };
      if (!username) {
        res.status(400).json({ error: 'BAD_REQUEST', message: 'Username is required' });
        return;
      }
      const data = await authService.checkUsername(username, fullName);
      res.json(data);
    } catch (err) {
      next(err);
    }
  },
};
