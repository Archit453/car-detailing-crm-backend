import { z } from 'zod';

export const LEAD_STATUSES = [
  'new',
  'contacted',
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
];

export const LEAD_SERVICES = [
  'Full Detail',
  'Interior Detail',
  'Exterior Wash',
  'Ceramic Coating',
  'Paint Correction',
  'Headlight Restoration',
  'Engine Bay Detail',
  'Other',
];

export const LEAD_SOURCES = [
  'website',
  'instagram',
  'facebook',
  'google',
  'referral',
  'walk-in',
  'phone',
  'other',
];

/**
 * UUID parameter schema for /api/leads/:id
 */
export const leadIdParamSchema = z.object({
  id: z.string().uuid({ message: 'Lead ID must be a valid UUID format (e.g. 123e4567-e89b-12d3-a456-426614174000)' }),
});

/**
 * Validation schema for POST /api/leads
 */
export const createLeadSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .trim()
    .min(2, { message: 'Name must be at least 2 characters long' })
    .max(255, { message: 'Name cannot exceed 255 characters' }),
  phone: z
    .string({ required_error: 'Phone number is required' })
    .trim()
    .min(5, { message: 'Phone number must be at least 5 digits/characters long' })
    .max(50, { message: 'Phone number cannot exceed 50 characters' }),
  service: z
    .string({ required_error: 'Service requested is required' })
    .trim()
    .min(2, { message: 'Service must be at least 2 characters long' })
    .max(100, { message: 'Service cannot exceed 100 characters' }),
  source: z
    .string()
    .trim()
    .max(100, { message: 'Source cannot exceed 100 characters' })
    .default('website')
    .optional(),
  status: z
    .string()
    .trim()
    .max(50, { message: 'Status cannot exceed 50 characters' })
    .default('new')
    .optional(),
});

/**
 * Validation schema for PATCH /api/leads/:id/status
 */
export const updateLeadStatusSchema = z.object({
  status: z
    .string({ required_error: 'Status is required' })
    .trim()
    .min(2, { message: 'Status must be at least 2 characters long' })
    .max(50, { message: 'Status cannot exceed 50 characters' }),
});

/**
 * Validation schema for GET /api/leads query parameters
 */
export const listLeadsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.string().trim().optional(),
  service: z.string().trim().optional(),
  source: z.string().trim().optional(),
  search: z.string().trim().optional(),
  sortBy: z.enum(['created_at', 'updated_at', 'name', 'status', 'service']).default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
});
