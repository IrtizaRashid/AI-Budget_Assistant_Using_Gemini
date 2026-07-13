// AI chat session / history routes — mounted at /api/ai/sessions
import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import {
  listSessions,
  getLatest,
  createSession,
  getSessionMessages,
  renameSession,
  deleteSession,
} from '../controllers/chatSessionController.js';

const router = Router();

// Every route requires a valid Supabase session; the controller uses
// req.user.userId and validates ownership on each session.
router.get('/', authenticate, listSessions);
router.get('/latest', authenticate, getLatest);
router.post('/', authenticate, createSession);
router.get('/:id', authenticate, getSessionMessages);
router.patch('/:id', authenticate, renameSession);
router.delete('/:id', authenticate, deleteSession);

export default router;
