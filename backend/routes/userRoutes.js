// Routes mounted at /api/users
import { Router } from 'express';
import { createUser } from '../controllers/userController.js';

const router = Router();

router.post('/', createUser); // POST /api/users

export default router;
