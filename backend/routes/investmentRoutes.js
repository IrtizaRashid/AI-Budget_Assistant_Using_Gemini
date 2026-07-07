import express from 'express';
import * as ctrl from '../controllers/investmentController.js';
import { authenticate, attachAuthenticatedUserId } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/:userId/portfolio',     authenticate, attachAuthenticatedUserId, ctrl.getPortfolio);
router.get('/:userId/summary',       authenticate, attachAuthenticatedUserId, ctrl.getSummary);
router.get('/:userId/transactions',  authenticate, attachAuthenticatedUserId, ctrl.getTransactions);
router.post('/buy',                  authenticate, attachAuthenticatedUserId, ctrl.buy);
router.post('/sell',                 authenticate, attachAuthenticatedUserId, ctrl.sell);
router.post('/dividend',             authenticate, attachAuthenticatedUserId, ctrl.dividend);

export default router;
