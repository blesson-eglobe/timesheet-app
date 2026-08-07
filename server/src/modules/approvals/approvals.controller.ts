import { Request, Response, NextFunction } from 'express';
import { approvalsService } from './approvals.service';

export const approvalsController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { filter, role, searchName, searchDate } = req.query as { filter?: string; role?: string; searchName?: string; searchDate?: string };
      const managerId = (role === 'manager' || req.user!.role === 'manager') ? req.user!.id : undefined;
      const data = await approvalsService.list(req.user!.role, filter, managerId, searchName, searchDate, req.user!.id);
      res.json(data);
    } catch (err) { next(err); }
  },

  async getDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await approvalsService.getDetails(req.params['id']!);
      res.json(data);
    } catch (err) { next(err); }
  },

  async approve(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await approvalsService.approve(req.params['id']!, req.user!.id);
      res.json(data);
    } catch (err) { next(err); }
  },

  async reject(req: Request, res: Response, next: NextFunction) {
    try {
      const { comments } = req.body as { comments?: string };
      const data = await approvalsService.reject(req.params['id']!, req.user!.id, comments || '');
      res.json(data);
    } catch (err) { next(err); }
  },

  async bulkApprove(req: Request, res: Response, next: NextFunction) {
    try {
      const { ids } = req.body as { ids: string[] };
      const data = await approvalsService.bulkApprove(ids, req.user!.id);
      res.json(data);
    } catch (err) { next(err); }
  },

  async bulkReject(req: Request, res: Response, next: NextFunction) {
    try {
      const { ids, comments } = req.body as { ids: string[]; comments?: string };
      const data = await approvalsService.bulkReject(ids, req.user!.id, comments || '');
      res.json(data);
    } catch (err) { next(err); }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await approvalsService.updateTimesheet(req.params['id']!, req.body);
      res.json(data);
    } catch (err) { next(err); }
  },
};
