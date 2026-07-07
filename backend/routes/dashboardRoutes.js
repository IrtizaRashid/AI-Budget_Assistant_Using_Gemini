// Routes mounted at /api/dashboard
import { Router } from 'express';
import { getDashboard } from '../controllers/dashboardController.js';
import { authenticate, attachAuthenticatedUserId } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/:userId', authenticate, attachAuthenticatedUserId, getDashboard); // GET /api/dashboard/:userId

export default router;
