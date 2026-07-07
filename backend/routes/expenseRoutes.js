// Routes mounted at /api/expenses
import { Router } from 'express';
import {
  createExpense,
  getExpenses,
  deleteExpense,
  confirmExpense,
} from '../controllers/expenseController.js';
import { authenticate, attachAuthenticatedUserId } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/confirm', authenticate, attachAuthenticatedUserId, confirmExpense);    // POST   /api/expenses/confirm
router.post('/', authenticate, attachAuthenticatedUserId, createExpense);            // POST   /api/expenses
router.get('/:userId', authenticate, attachAuthenticatedUserId, getExpenses);        // GET    /api/expenses/:userId
router.delete('/:expenseId', authenticate, attachAuthenticatedUserId, deleteExpense); // DELETE /api/expenses/:expenseId

export default router;
