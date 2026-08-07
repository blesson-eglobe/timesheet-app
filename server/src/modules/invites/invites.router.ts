import { Router } from 'express';
import { invitesController } from './invites.controller';
import { authenticate, requireRole } from '../../middleware/auth';

const router = Router();

// Protected: only manager/admin can create invites
router.post(
  '/',
  authenticate,
  requireRole('manager', 'admin'),
  invitesController.validateCreate,
  invitesController.create,
);

// Public: validate a token when the invite page loads
router.get('/validate', invitesController.validate);

// Public: accept the invite and create the account
router.post('/accept', invitesController.validateAccept, invitesController.accept);

export default router;
