import { Router } from 'express';
import { settingsController } from './settings.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();
router.use(authenticate);
router.get('/',  settingsController.get);
router.put('/',  settingsController.update);
export default router;
