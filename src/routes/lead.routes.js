import { Router } from 'express';
import {
  createLead,
  getLeads,
  getLeadById,
  updateLeadStatus,
  deleteLead,
} from '../controllers/lead.controller.js';
import { validate } from '../middlewares/validate.js';
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
  .post(validate({ body: createLeadSchema }), createLead)
  .get(validate({ query: listLeadsQuerySchema }), getLeads);

// Single lead item routes
router
  .route('/:id')
  .get(validate({ params: leadIdParamSchema }), getLeadById)
  .delete(validate({ params: leadIdParamSchema }), deleteLead);

// Lead status update route
router.patch(
  '/:id/status',
  validate({ params: leadIdParamSchema, body: updateLeadStatusSchema }),
  updateLeadStatus
);

export default router;
