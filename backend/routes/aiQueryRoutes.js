import express from 'express';
import { universalQuery } from '../controllers/aiQueryController.js';
import { authenticate, attachAuthenticatedUserId } from '../middleware/authMiddleware.js';

const router = express.Router();

// POST /api/ai/query
router.post('/query', authenticate, attachAuthenticatedUserId, universalQuery);

export default router;
