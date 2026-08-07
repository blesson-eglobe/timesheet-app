import { Router } from 'express';
import { approvalsController } from './approvals.controller';
import { authenticate, requireRole } from '../../middleware/auth';

const router = Router();
router.use(authenticate);
router.use(requireRole('manager', 'admin'));   // ← employees blocked here

router.get('/',                     approvalsController.list);
router.get('/:id/details',          approvalsController.getDetails);
router.put('/:id/approve',          approvalsController.approve);
router.put('/:id/reject',           approvalsController.reject);
router.put('/:id/update',           approvalsController.update);
router.post('/bulk-approve',        approvalsController.bulkApprove);
router.post('/bulk-reject',         approvalsController.bulkReject);
export default router;
