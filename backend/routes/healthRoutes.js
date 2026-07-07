// Route definitions for the health-check endpoint.
// Routes map an HTTP method + path to a controller function.
import { Router } from 'express';
import { getHealth, getSupabaseHealth } from '../controllers/healthController.js';

const router = Router();

// GET /api/health
router.get('/health', getHealth);
router.get('/health/supabase', getSupabaseHealth);

export default router;
