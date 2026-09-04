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
  getInstagramIceBreakers,
  configureInstagramIceBreakers,
  deleteInstagramIceBreakers,
  getInstagramComments,
  replyToInstagramComment,
  triggerInstagramCommentTestPing,
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
router.get('/instagram/icebreakers', getInstagramIceBreakers);
router.post('/instagram/icebreakers', configureInstagramIceBreakers);
router.delete('/instagram/icebreakers', deleteInstagramIceBreakers);

// Instagram Post Comments Routes
router.get('/instagram/comments', getInstagramComments);
router.post('/instagram/comments/reply', replyToInstagramComment);
router.post('/instagram/comments/test-ping', triggerInstagramCommentTestPing);

export default router;

