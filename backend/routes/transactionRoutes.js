import { Router } from 'express';
import { getTransactions, createTransaction } from '../controllers/transactionController.js';
import { authenticate, attachAuthenticatedUserId } from '../middleware/authMiddleware.js';

const router = Router();
router.get('/:userId', authenticate, attachAuthenticatedUserId, getTransactions);   // GET  /api/transactions/:userId
router.post('/', authenticate, attachAuthenticatedUserId, createTransaction);        // POST /api/transactions
export default router;
