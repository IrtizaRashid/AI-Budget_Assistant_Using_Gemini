// Authentication routes
import express from 'express';
import * as authController from '../controllers/authController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/send-login-code', authController.sendLoginCode);
router.post('/verify-login-code', authController.verifyLoginCode);
router.post('/verify-signup', authController.verifySignup);
router.post('/resend-signup', authController.resendSignup);
router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-password-reset', authController.verifyPasswordReset);
router.post('/logout', authController.logout);

// Protected routes
router.get('/me', authenticate, authController.getCurrentUser);

export default router;
