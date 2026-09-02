import { Router } from 'express';
import {
  verifyInstagramWebhook,
  handleInstagramMessage,
} from '../controllers/instagram.controller.js';

const router = Router();

// Meta Instagram Webhook Verification Handshake
router.get('/', verifyInstagramWebhook);

// Meta Instagram Webhook Inbound Message Events
router.post('/', handleInstagramMessage);

export default router;

