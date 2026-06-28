// Routes mounted at /api/statistics
import { Router } from 'express';
import { getStatistics } from '../controllers/statisticsController.js';

const router = Router();

router.get('/:userId', getStatistics); // GET /api/statistics/:userId

export default router;
