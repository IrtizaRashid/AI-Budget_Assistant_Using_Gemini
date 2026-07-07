// Routes mounted at /api/users
import { Router } from 'express';
import { resetMonth, saveGeminiKey } from '../controllers/userController.js';
import { authenticate, attachAuthenticatedUserId } from '../middleware/authMiddleware.js';

const router = Router();

// POST /api/users is no longer needed — user creation happens via /api/auth/register
router.use(authenticate, attachAuthenticatedUserId);

router.put('/me/gemini-key', saveGeminiKey);
router.post('/:userId/reset-month', resetMonth); // POST /api/users/:userId/reset-month

export default router;
