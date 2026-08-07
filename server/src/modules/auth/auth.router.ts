import { Router } from 'express';
import { authController } from './auth.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.post('/login',    authController.validateLogin,    authController.login);
router.post('/register', authController.validateRegister, authController.register);
router.post('/check-username', authController.checkUsername);
router.get('/me',        authenticate,                    authController.me);

export default router;
