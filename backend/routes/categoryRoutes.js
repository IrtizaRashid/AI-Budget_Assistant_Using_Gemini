// Routes mounted at /api/categories
import { Router } from 'express';
import {
  createCategories,
  getCategories,
  transferToSavings,
} from '../controllers/categoryController.js';
import { authenticate, attachAuthenticatedUserId } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/', authenticate, attachAuthenticatedUserId, createCategories);           // POST /api/categories
router.post('/transfer', authenticate, attachAuthenticatedUserId, transferToSavings);  // POST /api/categories/transfer
router.get('/:userId', authenticate, attachAuthenticatedUserId, getCategories);        // GET  /api/categories/:userId

export default router;
