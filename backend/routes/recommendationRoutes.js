// Routes mounted at /api/ai/recommendations
import { Router } from 'express';
import { getRecommendations } from '../controllers/recommendationController.js';
import { authenticate, attachAuthenticatedUserId } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/:userId', authenticate, attachAuthenticatedUserId, getRecommendations); // GET /api/ai/recommendations/:userId

export default router;
