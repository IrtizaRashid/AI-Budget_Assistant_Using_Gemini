// Routes mounted at /api/users
import { Router } from 'express';
import { createUser, resetMonth } from '../controllers/userController.js';

const router = Router();

router.post('/', createUser); // POST /api/users
router.post('/:userId/reset-month', resetMonth); // POST /api/users/:userId/reset-month

export default router;
