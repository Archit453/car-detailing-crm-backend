import { Router } from 'express';
import {
  getConversations,
  getMessagesByPhone,
  sendManualMessage,
  toggleBotStatus,
  handleEmbeddedSignup,
} from '../controllers/inbox.controller.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

// Apply authentication to all WhatsApp CRM inbox routes
router.use(requireAuth);

// Get list of active conversations
router.get('/whatsapp/conversations', getConversations);

// Get full conversation history with a specific customer
router.get('/whatsapp/messages/:phone', getMessagesByPhone);

// Send manual reply to customer via WhatsApp
router.post('/whatsapp/send', sendManualMessage);

// Toggle automated bot pause / resume for a customer
router.post('/whatsapp/bot-toggle', toggleBotStatus);

// Complete Meta Embedded Signup for WhatsApp Coexistence
router.post('/whatsapp/embedded-signup', handleEmbeddedSignup);

export default router;

