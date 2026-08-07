import { Router } from 'express';
import { workLogsController } from './workLogs.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();
router.use(authenticate);
router.get('/',              workLogsController.list);
router.post('/',             workLogsController.create);
router.put('/:id',           workLogsController.update);
router.delete('/:id',        workLogsController.remove);
router.post('/submit-week',  workLogsController.submitWeek);
export default router;
