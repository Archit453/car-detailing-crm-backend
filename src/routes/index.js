import { Router } from 'express';
import leadRoutes from './lead.routes.js';
import whatsappRoutes from './whatsapp.routes.js';
import instagramRoutes from './instagram.routes.js';
import authRoutes from './auth.routes.js';
import keepaliveRoutes from './keepalive.routes.js';
import inboxRoutes from './inbox.routes.js';
import { successResponse } from '../utils/apiResponse.js';

const apiRouter = Router();

// Authentication sub-router
apiRouter.use('/auth', authRoutes);

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
        logout: 'POST /api/auth/logout',
        inboxConversations: 'GET /api/inbox/whatsapp/conversations (Protected)',
        inboxMessages: 'GET /api/inbox/whatsapp/messages/:phone (Protected)',
        inboxSend: 'POST /api/inbox/whatsapp/send (Protected)',
        createLead: 'POST /api/leads (Public)',
        listLeads: 'GET /api/leads (Protected)',
        getLeadById: 'GET /api/leads/:id (Protected)',
        updateLeadStatus: 'PATCH /api/leads/:id/status (Protected)',
        deleteLead: 'DELETE /api/leads/:id (Protected)',
        whatsappWebhook: 'POST /api/webhook/whatsapp',
        instagramWebhook: 'POST /api/webhook/instagram',
      },
    },
    'Car Detailing CRM API is online'
  );
});

export default apiRouter;
