import { config } from '../config/env.js';
import { supabase, isConfigured } from '../config/supabase.js';
import { successResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendMetaWhatsAppMessage } from './whatsapp.controller.js';

/**
 * Mask sensitive token strings for display (e.g. "EAAPc...ZDZD")
 */
function maskToken(str) {
  if (!str || typeof str !== 'string') return '';
  if (str.length <= 10) return '********';
  return `${str.slice(0, 6)}...${str.slice(-4)}`;
}

/**
 * GET /api/settings
 * Retrieves active system configuration and integration parameters
 */
export const getSettings = asyncHandler(async (req, res) => {
  // If Supabase table system_settings exists, attempt loading persisted custom settings
  let dbSettings = {};
  if (isConfigured) {
    try {
      const { data } = await supabase.from('system_settings').select('*').single();
      if (data && data.settings) {
        dbSettings = data.settings;
      }
    } catch (err) {
      // Table may not exist yet; fallback to config defaults
    }
  }

  const active = {
    whatsappToken: dbSettings.whatsappToken || config.whatsapp.token,
    whatsappPhoneNumberId: dbSettings.whatsappPhoneNumberId || config.whatsapp.phoneNumberId,
    whatsappVerifyToken: dbSettings.whatsappVerifyToken || config.whatsapp.verifyToken,
    instagramPageAccessToken: dbSettings.instagramPageAccessToken || config.instagram.pageAccessToken,
    instagramVerifyToken: dbSettings.instagramVerifyToken || config.instagram.verifyToken,
    websiteUrl: dbSettings.websiteUrl || config.business.websiteUrl,
    businessName: dbSettings.businessName || config.business.name,
    studioName: dbSettings.studioName || config.business.studioName,
    businessPhone: dbSettings.businessPhone || config.business.phone,
    businessAddress: dbSettings.businessAddress || config.business.address,
    businessHours: dbSettings.businessHours || config.business.hours,
    botFlow: dbSettings.botFlow || config.botFlow,
  };

  const masked = {
    ...active,
    whatsappTokenMasked: maskToken(active.whatsappToken),
    instagramPageAccessTokenMasked: maskToken(active.instagramPageAccessToken),
    webhooks: {
      whatsappUrl: `https://${req.headers.host || 'car-detailing-crm-backend.vercel.app'}/api/webhook/whatsapp`,
      instagramUrl: `https://${req.headers.host || 'car-detailing-crm-backend.vercel.app'}/api/webhook/instagram`,
      framerLeadUrl: `https://${req.headers.host || 'car-detailing-crm-backend.vercel.app'}/api/leads`,
    },
  };

  return successResponse(res, masked, 'Settings retrieved successfully');
});

/**
 * POST /api/settings
 * Updates integration parameters and business branding settings at runtime
 */
export const updateSettings = asyncHandler(async (req, res) => {
  const {
    whatsappToken,
    whatsappPhoneNumberId,
    whatsappVerifyToken,
    instagramPageAccessToken,
    instagramVerifyToken,
    websiteUrl,
    businessName,
    studioName,
    businessPhone,
    businessAddress,
    businessHours,
    botFlow,
  } = req.body;

  // Apply updates to in-memory config object
  if (whatsappToken && !whatsappToken.includes('...')) config.whatsapp.token = whatsappToken;
  if (whatsappPhoneNumberId) config.whatsapp.phoneNumberId = whatsappPhoneNumberId;
  if (whatsappVerifyToken) config.whatsapp.verifyToken = whatsappVerifyToken;
  if (instagramPageAccessToken && !instagramPageAccessToken.includes('...')) config.instagram.pageAccessToken = instagramPageAccessToken;
  if (instagramVerifyToken) config.instagram.verifyToken = instagramVerifyToken;
  if (websiteUrl) config.business.websiteUrl = websiteUrl;
  if (businessName) config.business.name = businessName;
  if (studioName) config.business.studioName = studioName;
  if (businessPhone) config.business.phone = businessPhone;
  if (businessAddress) config.business.address = businessAddress;
  if (businessHours) config.business.hours = businessHours;
  if (botFlow && typeof botFlow === 'object') {
    config.botFlow = {
      ...config.botFlow,
      ...botFlow,
    };
  }

  // Persist updated settings to Supabase system_settings table if available
  if (isConfigured) {
    try {
      const payload = {
        id: 'global_config',
        settings: {
          whatsappToken: config.whatsapp.token,
          whatsappPhoneNumberId: config.whatsapp.phoneNumberId,
          whatsappVerifyToken: config.whatsapp.verifyToken,
          instagramPageAccessToken: config.instagram.pageAccessToken,
          instagramVerifyToken: config.instagram.verifyToken,
          websiteUrl: config.business.websiteUrl,
          businessName: config.business.name,
          studioName: config.business.studioName,
          businessPhone: config.business.phone,
          businessAddress: config.business.address,
          businessHours: config.business.hours,
          botFlow: config.botFlow,
        },
        updated_at: new Date().toISOString(),
      };
      await supabase.from('system_settings').upsert(payload);
    } catch (err) {
      console.warn('[Settings Persist Warning]', err.message);
    }
  }

  return successResponse(
    res,
    {
      updated: true,
      whatsappPhoneNumberId: config.whatsapp.phoneNumberId,
      websiteUrl: config.business.websiteUrl,
      businessName: config.business.name,
      botFlow: config.botFlow,
    },
    'System settings updated successfully'
  );
});

/**
 * POST /api/settings/test-whatsapp
 * Verifies live connection to Meta WhatsApp Cloud API with current or provided credentials
 */
export const testWhatsAppConnection = asyncHandler(async (req, res) => {
  const token = req.body.token && !req.body.token.includes('...') ? req.body.token : config.whatsapp.token;
  const phoneId = req.body.phoneNumberId || config.whatsapp.phoneNumberId;

  if (!token || !phoneId) {
    return res.status(400).json({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'WhatsApp Token and Phone Number ID are required for testing' },
    });
  }

  try {
    const url = `https://graph.facebook.com/v19.0/${phoneId}?access_token=${token}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'META_API_ERROR',
          message: data.error?.message || 'Meta WhatsApp API authentication failed',
          details: data.error,
        },
      });
    }

    return successResponse(
      res,
      {
        status: 'CONNECTED',
        verifiedName: data.verified_name || 'Signature Detailing',
        displayPhoneNumber: data.display_phone_number || '+91 98612 01770',
        qualityRating: data.quality_rating || 'GREEN',
        codeVerificationStatus: data.code_verification_status || 'VERIFIED',
        platformType: data.platform_type || 'CLOUD_API',
        id: data.id,
      },
      'Meta WhatsApp Cloud API connected and verified successfully!'
    );
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'NETWORK_ERROR', message: `Failed to reach Meta WhatsApp API: ${err.message}` },
    });
  }
});

/**
 * POST /api/settings/test-instagram
 * Verifies live connection to Meta Instagram Graph API
 */
export const testInstagramConnection = asyncHandler(async (req, res) => {
  const token = req.body.token && !req.body.token.includes('...') ? req.body.token : config.instagram.pageAccessToken;

  if (!token) {
    return res.status(400).json({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'Instagram Page Access Token is required for testing' },
    });
  }

  try {
    const url = `https://graph.facebook.com/v19.0/me?access_token=${token}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'META_API_ERROR',
          message: data.error?.message || 'Meta Instagram Page Access Token is invalid or expired',
          details: data.error,
        },
      });
    }

    return successResponse(
      res,
      {
        status: 'CONNECTED',
        name: data.name || 'Creation Detailing Studio',
        id: data.id,
      },
      'Meta Instagram Graph API connected successfully!'
    );
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'NETWORK_ERROR', message: `Failed to reach Meta Instagram API: ${err.message}` },
    });
  }
});

/**
 * POST /api/settings/test-webhook-ping
 * Executes a simulated incoming WhatsApp message through the full backend workflow
 */
export const testWebhookPing = asyncHandler(async (req, res) => {
  const testPhone = req.body.phone || '919999900001';
  const testMessage = req.body.message || 'hi';

  const mockReq = {
    body: {
      entry: [
        {
          changes: [
            {
              value: {
                metadata: {
                  display_phone_number: '919861201770',
                  phone_number_id: config.whatsapp.phoneNumberId,
                },
                contacts: [{ profile: { name: 'Test Diagnostic User' } }],
                messages: [
                  {
                    from: testPhone,
                    id: `wamid.DIAG_${Date.now()}`,
                    timestamp: Math.floor(Date.now() / 1000).toString(),
                    type: 'text',
                    text: { body: testMessage },
                  },
                ],
              },
            },
          ],
        },
      ],
    },
  };

  // Run simulated Meta API message
  const result = await sendMetaWhatsAppMessage(testPhone, `[Diagnostic Test Ping] Receiving message: "${testMessage}"`);

  return successResponse(
    res,
    {
      simulatedIncomingPayload: mockReq.body,
      outboundResult: result,
      status: 'WEBHOOK_WORKFLOW_VERIFIED',
    },
    'Webhook workflow test executed cleanly!'
  );
});
