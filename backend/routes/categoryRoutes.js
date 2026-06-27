// Routes mounted at /api/categories
import { Router } from 'express';
import {
  createCategories,
  getCategories,
} from '../controllers/categoryController.js';

const router = Router();

router.post('/', createCategories);     // POST /api/categories
router.get('/:userId', getCategories);  // GET  /api/categories/:userId

export default router;
