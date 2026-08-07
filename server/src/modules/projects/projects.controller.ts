import { Request, Response, NextFunction } from 'express';
import { projectsService } from './projects.service';

export const projectsController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { search, status } = req.query as Record<string, string>;
      const userId = (req.user?.role === 'admin' || req.user?.role === 'manager' || req.user?.role === 'ceo' || req.user?.role === 'hr') ? undefined : req.user?.id;
      const data = await projectsService.list(search, status, userId);
      res.json(data);
    } catch (err) { next(err); }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await projectsService.getById(req.params['id']!);
      res.json(data);
    } catch (err) { next(err); }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await projectsService.create(req.body as Parameters<typeof projectsService.create>[0], req.user!.id);
      res.status(201).json(data);
    } catch (err) { next(err); }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await projectsService.update(req.params['id']!, req.body as Parameters<typeof projectsService.update>[1]);
      res.json(data);
    } catch (err) { next(err); }
  },

  async addMember(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.body as { userId: string };
      await projectsService.addMember(req.params['id']!, userId);
      res.json({ ok: true });
    } catch (err) { next(err); }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await projectsService.delete(req.params['id']!);
      res.json(data);
    } catch (err) { next(err); }
  },
};

