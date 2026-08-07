import { Request, Response, NextFunction } from 'express';
import { workLogsService } from './workLogs.service';

export const workLogsController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { weekStart, search, page, limit } = req.query as Record<string, string>;
      const data = await workLogsService.list(req.user!.id, {
        weekStart, search,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 50,
      });
      res.json(data);
    } catch (err) { next(err); }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await workLogsService.create(req.user!.id, req.body as Parameters<typeof workLogsService.create>[1]);
      res.status(201).json(data);
    } catch (err) { next(err); }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await workLogsService.update(req.params['id']!, req.user!.id, req.body as Parameters<typeof workLogsService.update>[2]);
      res.json(data);
    } catch (err) { next(err); }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      await workLogsService.delete(req.params['id']!, req.user!.id);
      res.json({ ok: true });
    } catch (err) { next(err); }
  },

  async submitWeek(req: Request, res: Response, next: NextFunction) {
    try {
      const { weekStart } = req.body as { weekStart: string };
      const data = await workLogsService.submitWeek(req.user!.id, weekStart);
      res.json(data);
    } catch (err) { next(err); }
  },
};
