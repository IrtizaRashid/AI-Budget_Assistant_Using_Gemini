// Routes mounted at /api/expenses
import { Router } from 'express';
import {
  createExpense,
  getExpenses,
} from '../controllers/expenseController.js';

const router = Router();

router.post('/', createExpense);     // POST /api/expenses
router.get('/:userId', getExpenses); // GET  /api/expenses/:userId

export default router;
