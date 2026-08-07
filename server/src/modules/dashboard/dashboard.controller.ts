import { Request, Response, NextFunction } from 'express';
import { dashboardService } from './dashboard.service';

export const dashboardController = {
  async employee(req: Request, res: Response, next: NextFunction) {
    try { res.json(await dashboardService.employee(req.user!.id)); }
    catch (err) { next(err); }
  },
  async manager(req: Request, res: Response, next: NextFunction) {
    try { res.json(await dashboardService.manager(req.user!.role, req.user!.id)); }
    catch (err) { next(err); }
  },
};
