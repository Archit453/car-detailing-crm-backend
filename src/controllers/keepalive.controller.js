import { supabase, isConfigured } from '../config/supabase.js';
import { config } from '../config/env.js';
import { successResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * @desc    Lightweight database ping to prevent Supabase Free Tier inactivity pause
 * @route   GET /api/keepalive, POST /api/keepalive
 * @access  Public / Vercel Cron
 */
export const pingDatabase = asyncHandler(async (req, res) => {
  // Optional cron secret verification if configured
  if (config.cron.secret) {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${config.cron.secret}`) {
      throw new ApiError(401, 'Unauthorized: Invalid cron secret');
    }
  }

  if (!isConfigured) {
    throw new ApiError(503, 'Database service is not configured');
  }

  const startTime = Date.now();

  // Execute zero-egress HEAD query (transfers 0 rows over network)
  const { count, error } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true });

  const latencyMs = Date.now() - startTime;

  if (error) {
    console.error(`[KeepAlive Ping Failed] Latency: ${latencyMs}ms | Error:`, error.message);
    throw new ApiError(500, `Database keepalive query failed: ${error.message}`);
  }

  console.log(`[KeepAlive Ping OK] Supabase responsive (${latencyMs}ms) | Timestamp: ${new Date().toISOString()} | Leads: ${count}`);

  return successResponse(
    res,
    {
      status: 'alive',
      database: 'connected',
      latencyMs,
      leadsCount: count || 0,
      timestamp: new Date().toISOString(),
    },
    'Supabase keepalive ping successful'
  );
});

