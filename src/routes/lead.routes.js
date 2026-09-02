import { Router } from 'express';
import {
  createLead,
  getLeads,
  getLeadById,
  updateLeadStatus,
  deleteLead,
} from '../controllers/lead.controller.js';
import { validate } from '../middlewares/validate.js';
import { requireAuth } from '../middlewares/auth.js';
import {
  createLeadSchema,
  updateLeadStatusSchema,
  leadIdParamSchema,
  listLeadsQuerySchema,
} from '../validators/lead.validator.js';

const router = Router();

// Lead collection routes
router
  .route('/')
  .post(validate({ body: createLeadSchema }), createLead) // PUBLIC for website lead submissions
  .get(requireAuth, validate({ query: listLeadsQuerySchema }), getLeads); // PROTECTED for CRM Admin

// Single lead item routes (PROTECTED for CRM Admin)
router
  .route('/:id')
  .get(requireAuth, validate({ params: leadIdParamSchema }), getLeadById)
  .delete(requireAuth, validate({ params: leadIdParamSchema }), deleteLead);

// Lead status update route (PROTECTED for CRM Admin)
router.patch(
  '/:id/status',
  requireAuth,
  validate({ params: leadIdParamSchema, body: updateLeadStatusSchema }),
  updateLeadStatus
);

export default router;
