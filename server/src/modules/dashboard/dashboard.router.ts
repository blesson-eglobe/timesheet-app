import { Router } from 'express';
import { dashboardController } from './dashboard.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();
router.use(authenticate);
router.get('/employee', dashboardController.employee);
router.get('/manager',  dashboardController.manager);
export default router;
