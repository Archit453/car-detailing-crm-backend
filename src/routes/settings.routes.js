import { Router } from 'express';
import {
  getSettings,
  updateSettings,
  testWhatsAppConnection,
  testInstagramConnection,
  testWebhookPing,
} from '../controllers/settings.controller.js';
import { requireAuth } from '../middlewares/auth.js';

const settingsRouter = Router();

// Protect all settings endpoints with session authentication
settingsRouter.use(requireAuth);

// GET & POST /api/settings - System & Integration Configuration
settingsRouter.get('/', getSettings);
settingsRouter.post('/', updateSettings);

// Diagnostic & Verification Test Endpoints
settingsRouter.post('/test-whatsapp', testWhatsAppConnection);
settingsRouter.post('/test-instagram', testInstagramConnection);
settingsRouter.post('/test-webhook-ping', testWebhookPing);

export default settingsRouter;
