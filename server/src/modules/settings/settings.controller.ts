import { Request, Response, NextFunction } from 'express';
import { settingsService } from './settings.service';

export const settingsController = {
  async get(req: Request, res: Response, next: NextFunction) {
    try { res.json(await settingsService.get(req.user!.id)); }
    catch (err) { next(err); }
  },
  async update(req: Request, res: Response, next: NextFunction) {
    try { res.json(await settingsService.update(req.user!.id, req.body as Parameters<typeof settingsService.update>[1])); }
    catch (err) { next(err); }
  },
};
