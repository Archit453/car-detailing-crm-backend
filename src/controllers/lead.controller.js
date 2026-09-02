import { supabase, isConfigured } from '../config/supabase.js';
import { ApiError } from '../utils/apiError.js';
import { successResponse, createdResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const assertConfigured = () => {
  if (!isConfigured) {
    throw new ApiError(
      503,
      'Supabase database service is not configured. Please set SUPABASE_URL and SUPABASE_KEY in your Vercel Project Settings > Environment Variables.'
    );
  }
};

/**
 * @desc    Create a new lead
 * @route   POST /api/leads
 * @access  Public / CRM Client
 */
export const createLead = asyncHandler(async (req, res) => {
  assertConfigured();
  const { name, phone, service, source = 'website', status = 'new' } = req.body;

  const { data, error } = await supabase
    .from('leads')
    .insert([
      {
        name,
        phone,
        service,
        source,
        status,
      },
    ])
    .select()
    .single();

  if (error) {
    throw new ApiError(500, `Failed to create lead: ${error.message}`, error);
  }

  return createdResponse(res, data, 'Lead created successfully');
});

/**
 * @desc    Get all leads with filtering, search, sorting & pagination
 * @route   GET /api/leads
 * @access  Public / Authenticated
 */
export const getLeads = asyncHandler(async (req, res) => {
  assertConfigured();
  const {
    page = 1,
    limit = 20,
    status,
    service,
    source,
    search,
    sortBy = 'created_at',
    order = 'desc',
  } = req.query;

  // Initialize query with exact row counting
  let query = supabase.from('leads').select('*', { count: 'exact' });

  // Apply filters if provided
  if (status) {
    query = query.eq('status', status);
  }

  if (service) {
    query = query.ilike('service', `%${service}%`);
  }

  if (source) {
    query = query.eq('source', source);
  }

  // Search across name or phone
  if (search) {
    query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  // Apply sorting
  query = query.order(sortBy, { ascending: order === 'asc' });

  // Apply pagination range
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, count, error } = await query;

  if (error) {
    throw new ApiError(500, `Failed to fetch leads: ${error.message}`, error);
  }

  const totalItems = count || 0;
  const totalPages = Math.ceil(totalItems / limit);

  const meta = {
    page,
    limit,
    totalItems,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };

  return successResponse(res, data || [], 'Leads retrieved successfully', 200, meta);
});

/**
 * @desc    Get single lead by UUID
 * @route   GET /api/leads/:id
 * @access  Public / Authenticated
 */
export const getLeadById = asyncHandler(async (req, res) => {
  assertConfigured();
  const { id } = req.params;

  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw ApiError.notFound(`Lead with ID '${id}' was not found`);
    }
    throw new ApiError(500, `Failed to retrieve lead: ${error.message}`, error);
  }

  if (!data) {
    throw ApiError.notFound(`Lead with ID '${id}' was not found`);
  }

  return successResponse(res, data, 'Lead retrieved successfully');
});

/**
 * @desc    Update status of a lead
 * @route   PATCH /api/leads/:id/status
 * @access  Public / Authenticated
 */
export const updateLeadStatus = asyncHandler(async (req, res) => {
  assertConfigured();
  const { id } = req.params;
  const { status } = req.body;

  const { data, error } = await supabase
    .from('leads')
    .update({ status })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw ApiError.notFound(`Lead with ID '${id}' was not found`);
    }
    throw new ApiError(500, `Failed to update lead status: ${error.message}`, error);
  }

  if (!data) {
    throw ApiError.notFound(`Lead with ID '${id}' was not found`);
  }

  return successResponse(res, data, 'Lead status updated successfully');
});

/**
 * @desc    Delete a lead by UUID
 * @route   DELETE /api/leads/:id
 * @access  Public / Authenticated
 */
export const deleteLead = asyncHandler(async (req, res) => {
  assertConfigured();
  const { id } = req.params;

  const { data, error } = await supabase
    .from('leads')
    .delete()
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw ApiError.notFound(`Lead with ID '${id}' was not found`);
    }
    throw new ApiError(500, `Failed to delete lead: ${error.message}`, error);
  }

  if (!data) {
    throw ApiError.notFound(`Lead with ID '${id}' was not found`);
  }

  return successResponse(res, { id: data.id, deleted: true }, 'Lead deleted successfully');
});
