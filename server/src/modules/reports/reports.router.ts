import { Router } from 'express';
import { reportsController } from './reports.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();
router.use(authenticate);
router.get('/',       reportsController.hours);
router.get('/export', reportsController.exportCsv);
export default router;
