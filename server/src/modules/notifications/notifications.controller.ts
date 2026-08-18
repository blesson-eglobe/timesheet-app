import { Request, Response, NextFunction } from 'express';
import { notificationsService } from './notifications.service';
import { runReminderCheck } from './reminderScheduler';

export const notificationsController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try { res.json(await notificationsService.list(req.user!.id)); }
    catch (err) { next(err); }
  },
  async markRead(req: Request, res: Response, next: NextFunction) {
    try { res.json(await notificationsService.markRead(req.params['id']!, req.user!.id)); }
    catch (err) { next(err); }
  },
  async markAllRead(req: Request, res: Response, next: NextFunction) {
    try { res.json(await notificationsService.markAllRead(req.user!.id)); }
    catch (err) { next(err); }
  },
  async sendReminder(req: Request, res: Response, next: NextFunction) {
    try {
      const msg = req.body?.message || 'HR (Reshma) sent a reminder to review and approve pending timesheets.';
      res.json(await notificationsService.sendReminderToManagers(msg));
    } catch (err) { next(err); }
  },
  async triggerMissingLogReminder(req: Request, res: Response, next: NextFunction) {
    try {
      const forceEscalation = req.body?.forceEscalation === true;
      const result = await runReminderCheck(forceEscalation);
      res.json({ ok: true, ...result });
    } catch (err) { next(err); }
  },
};
