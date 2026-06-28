// Routes mounted at /api/expenses
import { Router } from 'express';
import {
  createExpense,
  getExpenses,
  deleteExpense,
} from '../controllers/expenseController.js';

const router = Router();

router.post('/', createExpense);            // POST   /api/expenses
router.get('/:userId', getExpenses);        // GET    /api/expenses/:userId
router.delete('/:expenseId', deleteExpense); // DELETE /api/expenses/:expenseId

export default router;
