import { Router } from 'express';
import { getIncome, createIncome, removeIncome } from '../controllers/incomeController.js';
import { authenticate, attachAuthenticatedUserId } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/:userId', authenticate, attachAuthenticatedUserId, getIncome);
router.post('/', authenticate, attachAuthenticatedUserId, createIncome);
router.delete('/:incomeId', authenticate, attachAuthenticatedUserId, removeIncome);

export default router;
