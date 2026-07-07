// Routes mounted at /api
import { Router } from 'express';
import { chat } from '../controllers/chatController.js';
import { authenticate, attachAuthenticatedUserId } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/chat', authenticate, attachAuthenticatedUserId, chat); // POST /api/chat

export default router;
