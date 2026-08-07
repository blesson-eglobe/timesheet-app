import { Router } from 'express';
import { projectsController } from './projects.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();
router.use(authenticate);
router.get('/',              projectsController.list);
router.get('/:id',           projectsController.getById);
router.post('/',             projectsController.create);
router.put('/:id',           projectsController.update);
router.delete('/:id',        projectsController.delete);
router.post('/:id/members',  projectsController.addMember);
export default router;
