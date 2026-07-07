// Routes mounted at /api
import { Router } from 'express';
import {
  setupBudget,
  updateBudgetAllocation,
} from '../controllers/setupController.js';
import { authenticate, attachAuthenticatedUserId } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/setup-budget', authenticate, attachAuthenticatedUserId, setupBudget); // POST /api/setup-budget
router.put('/budget-allocation', authenticate, attachAuthenticatedUserId, updateBudgetAllocation); // PUT /api/budget-allocation

export default router;
