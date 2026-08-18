import { Router } from 'express';
import { notificationsController } from './notifications.controller';
import { authenticate, requireRole } from '../../middleware/auth';

const router = Router();
router.use(authenticate);
router.get('/',                    notificationsController.list);
router.put('/:id/read',            notificationsController.markRead);
router.put('/mark-all-read',       notificationsController.markAllRead);
router.post('/reminder',           notificationsController.sendReminder);
router.post(
  '/trigger-missing-log-reminder',
  requireRole('manager', 'admin'),
  notificationsController.triggerMissingLogReminder
);
export default router;
