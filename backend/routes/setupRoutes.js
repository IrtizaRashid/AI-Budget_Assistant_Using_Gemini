// Routes mounted at /api
import { Router } from 'express';
import { setupBudget } from '../controllers/setupController.js';

const router = Router();

router.post('/setup-budget', setupBudget); // POST /api/setup-budget

export default router;
