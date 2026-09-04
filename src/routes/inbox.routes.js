import { Router } from 'express';
import {
  getConversations,
  getMessagesByPhone,
  sendManualMessage,
  toggleBotStatus,
  handleEmbeddedSignup,
  getInstagramConversations,
  getInstagramMessages,
  sendInstagramManualMessage,
  toggleInstagramBotStatus,
  getInstagramWebhookStatus,
  triggerInstagramTestPing,
  syncInstagramConversations,
} from '../controllers/inbox.controller.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

// Apply authentication to all CRM inbox routes
router.use(requireAuth);

// WhatsApp Live Inbox Routes
router.get('/whatsapp/conversations', getConversations);
router.get('/whatsapp/messages/:phone', getMessagesByPhone);
router.post('/whatsapp/send', sendManualMessage);
router.post('/whatsapp/bot-toggle', toggleBotStatus);
router.post('/whatsapp/embedded-signup', handleEmbeddedSignup);

// Instagram Live Inbox Routes
router.get('/instagram/conversations', getInstagramConversations);
router.get('/instagram/messages/:senderId', getInstagramMessages);
router.post('/instagram/send', sendInstagramManualMessage);
router.post('/instagram/bot-toggle', toggleInstagramBotStatus);
router.get('/instagram/status', getInstagramWebhookStatus);
router.post('/instagram/test-ping', triggerInstagramTestPing);
router.post('/instagram/sync', syncInstagramConversations);

export default router;

