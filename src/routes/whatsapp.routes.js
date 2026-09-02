import { Router } from 'express';
import { handleWhatsAppMessage, verifyWhatsAppWebhook } from '../controllers/whatsapp.controller.js';

const whatsappRouter = Router();

// GET /api/webhook/whatsapp - Handshake verification for Meta WhatsApp Cloud API
whatsappRouter.get('/', verifyWhatsAppWebhook);

// POST /api/webhook/whatsapp - Incoming message handler (Twilio & Meta)
whatsappRouter.post('/', handleWhatsAppMessage);

export default whatsappRouter;

