import { Router } from 'express';
import leadRoutes from './lead.routes.js';
import whatsappRoutes from './whatsapp.routes.js';
import instagramRoutes from './instagram.routes.js';
import { successResponse } from '../utils/apiResponse.js';

const apiRouter = Router();

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
        createLead: 'POST /api/leads',
        listLeads: 'GET /api/leads',
        getLeadById: 'GET /api/leads/:id',
        updateLeadStatus: 'PATCH /api/leads/:id/status',
        deleteLead: 'DELETE /api/leads/:id',
        whatsappWebhook: 'POST /api/webhook/whatsapp',
        instagramWebhook: 'POST /api/webhook/instagram',
      },
    },
    'Car Detailing CRM API is online'
  );
});

export default apiRouter;
