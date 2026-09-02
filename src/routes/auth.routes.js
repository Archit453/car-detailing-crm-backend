import { Router } from 'express';
import { login, logout, getMe } from '../controllers/auth.controller.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

// Public login endpoint
router.post('/login', login);

// Authenticated session management endpoints
router.post('/logout', logout);
router.get('/me', requireAuth, getMe);

export default router;
