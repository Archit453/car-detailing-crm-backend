import { Router } from 'express';
import leadRoutes from './lead.routes.js';
import whatsappRoutes from './whatsapp.routes.js';
import instagramRoutes from './instagram.routes.js';
import authRoutes from './auth.routes.js';
import keepaliveRoutes from './keepalive.routes.js';
import inboxRoutes from './inbox.routes.js';
import settingsRoutes from './settings.routes.js';
import { successResponse } from '../utils/apiResponse.js';

const apiRouter = Router();

// Authentication sub-router
apiRouter.use('/auth', authRoutes);

// System Settings & Integration Management sub-router (Protected)
apiRouter.use('/settings', settingsRoutes);

// Database keepalive sub-router (Vercel Cron & Health monitoring)
apiRouter.use('/keepalive', keepaliveRoutes);

// WhatsApp Live Inbox sub-router (Protected)
apiRouter.use('/inbox', inboxRoutes);

// Leads sub-router
apiRouter.use('/leads', leadRoutes);

// WhatsApp webhook sub-router
apiRouter.use('/webhook/whatsapp', whatsappRoutes);

// Instagram webhook sub-router
apiRouter.use('/webhook/instagram', instagramRoutes);

// API info endpoint
apiRouter.get('/', (req, res) => {
  return successResponse(
    res,
    {
      name: 'Car Detailing CRM REST API',
      version: '1.0.0',
      endpoints: {
        health: 'GET /health',
        keepalive: 'GET /api/keepalive',
        login: 'POST /api/auth/login',
        settings: 'GET /api/settings (Protected)',
        inboxConversations: 'GET /api/inbox/whatsapp/conversations (Protected)',
        createLead: 'POST /api/leads (Public)',
        listLeads: 'GET /api/leads (Protected)',
        whatsappWebhook: 'POST /api/webhook/whatsapp',
        instagramWebhook: 'POST /api/webhook/instagram',
      },
    },
    'Car Detailing CRM API is online'
  );
});

export default apiRouter;
