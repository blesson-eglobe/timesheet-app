import { Router } from 'express';
import { usersController } from './users.controller';
import { authenticate, requireRole } from '../../middleware/auth';

const router = Router();
router.use(authenticate);

// Full user list is restricted to managers and admins
router.get('/',     requireRole('manager', 'admin'), usersController.list);
// Profile lookup stays open to all authenticated users (employees need it for team views)
router.get('/:id',  usersController.getById);
// Create and update restricted to manager/admin
router.post('/',    requireRole('manager', 'admin'), usersController.create);
router.put('/:id',  requireRole('manager', 'admin'), usersController.update);
export default router;
