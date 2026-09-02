import { Router } from 'express';
import { pingDatabase } from '../controllers/keepalive.controller.js';

const router = Router();

// Support both GET and POST for cron runners & health checks
router.get('/', pingDatabase);
router.post('/', pingDatabase);

export default router;
