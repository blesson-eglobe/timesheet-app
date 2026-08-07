import { Request, Response, NextFunction } from 'express';
import { usersService } from './users.service';
import { createError } from '../../middleware/errorHandler';

export const usersController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { search, department } = req.query as Record<string, string>;
      const data = await usersService.list(search, department);
      res.json(data);
    } catch (err) { next(err); }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await usersService.getById(req.params['id']!);
      res.json(data);
    } catch (err) { next(err); }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (req.user?.role === 'employee') throw createError('Forbidden. Only admins and managers can create users.', 403, 'FORBIDDEN');
      const data = await usersService.create(req.body as any);
      res.status(201).json(data);
    } catch (err) { next(err); }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      if (req.user?.role === 'employee') throw createError('Forbidden. Only admins and managers can update users.', 403, 'FORBIDDEN');
      if (req.body?.status && req.user?.role !== 'admin') {
        throw createError('Forbidden. Only admins can enable or disable employees.', 403, 'FORBIDDEN');
      }
      const data = await usersService.update(req.params['id']!, req.body as Record<string, string>);
      res.json(data);
    } catch (err) { next(err); }
  },
};
