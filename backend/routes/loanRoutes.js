import { Router } from 'express';
import { getLoans, createLoan, markPaid, updateLoan, removeLoan, getLoanSummary, createSplitExpense, getLoanPayments } from '../controllers/loanController.js';
import { authenticate, attachAuthenticatedUserId } from '../middleware/authMiddleware.js';

const router = Router();

// Specific routes must come before parameterised ones
router.post('/split', authenticate, attachAuthenticatedUserId, createSplitExpense);
router.get('/:userId/summary', authenticate, attachAuthenticatedUserId, getLoanSummary);
router.get('/:userId', authenticate, attachAuthenticatedUserId, getLoans);
router.post('/', authenticate, attachAuthenticatedUserId, createLoan);
router.get('/:loanId/payments', authenticate, attachAuthenticatedUserId, getLoanPayments);
router.put('/:loanId/paid', authenticate, attachAuthenticatedUserId, markPaid);
router.put('/:loanId', authenticate, attachAuthenticatedUserId, updateLoan);
router.delete('/:loanId', authenticate, attachAuthenticatedUserId, removeLoan);

export default router;
