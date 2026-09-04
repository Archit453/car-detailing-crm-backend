import { supabase, isConfigured } from '../config/supabase.js';
import { config } from '../config/env.js';
import { ApiError } from '../utils/apiError.js';
import { successResponse, createdResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendMetaWhatsAppMessage } from './whatsapp.controller.js';
import {
  sendInstagramOutboundMessage,
  latestInstagramWebhookEvent,
  handleInstagramMessage,
  SERVICE_QUICK_REPLIES,
  WHATSAPP_LINK_BUTTONS,
  latestInstagramComments,
  sendInstagramCommentReply,
  processIncomingInstagramComment,
} from './instagram.controller.js';

const assertConfigured = () => {
  if (!isConfigured) {
    throw new ApiError(503, 'Database service is not configured');
  }
};

/**
 * @desc    Get all active WhatsApp conversations with latest message preview
 * @route   GET /api/inbox/whatsapp/conversations
 * @access  Protected (Admin)
 */
export const getConversations = asyncHandler(async (req, res) => {
  assertConfigured();

  // Fetch recent messages to build conversation previews
  const { data: messages, error } = await supabase
    .from('whatsapp_messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(300);

  if (error) {
    if (error.code === 'PGRST205') {
      console.warn('[Inbox Notice] Table public.whatsapp_messages does not exist yet in Supabase schema cache.');
      return successResponse(res, [], 'Inbox online (Run schema.sql in Supabase to enable message history)');
    }
    throw new ApiError(500, `Failed to fetch conversations: ${error.message}`, error);
  }

  // Group latest message per phone number
  const conversationsMap = new Map();
  for (const msg of messages || []) {
    if (!conversationsMap.has(msg.phone)) {
      conversationsMap.set(msg.phone, {
        phone: msg.phone,
        customer_name: msg.customer_name || 'Customer',
        last_message: msg.message_text,
        last_message_at: msg.created_at,
        last_sender: msg.sender,
        direction: msg.direction,
      });
    }
  }

  const conversations = Array.from(conversationsMap.values());

  return successResponse(res, conversations, 'Conversations retrieved successfully');
});

/**
 * @desc    Get full message thread for a specific phone number
 * @route   GET /api/inbox/whatsapp/messages/:phone
 * @access  Protected (Admin)
 */
export const getMessagesByPhone = asyncHandler(async (req, res) => {
  assertConfigured();
  const rawPhone = req.params.phone;
  const cleanPhone = rawPhone.replace(/[^0-9]/g, '');

  if (!cleanPhone || cleanPhone.length < 5) {
    throw new ApiError(400, 'Invalid phone number parameter');
  }

  const { data: messages, error } = await supabase
    .from('whatsapp_messages')
    .select('*')
    .eq('phone', cleanPhone)
    .order('created_at', { ascending: true })
    .limit(150);

  if (error) {
    if (error.code === 'PGRST205') {
      return successResponse(res, [], 'Message thread empty');
    }
    throw new ApiError(500, `Failed to fetch message thread: ${error.message}`, error);
  }

  // Check if bot is currently paused for this customer (Human Takeover mode)
  let botPaused = false;
  try {
    const { data: session } = await supabase
      .from('whatsapp_sessions')
      .select('step')
      .eq('phone', cleanPhone)
      .single();
    botPaused = session?.step === 'human_takeover';
  } catch (err) {
    // Graceful fallback
  }

  return successResponse(res, messages || [], 'Message thread retrieved successfully', 200, { botPaused });
});

/**
 * @desc    Send manual outbound WhatsApp reply to customer
 * @route   POST /api/inbox/whatsapp/send
 * @access  Protected (Admin)
 */
export const sendManualMessage = asyncHandler(async (req, res) => {
  assertConfigured();
  const { phone, message, customerName, buttons, list, interactive } = req.body || {};

  if (!phone || typeof phone !== 'string') {
    throw new ApiError(400, 'Valid customer phone number is required');
  }

  if (!interactive && !buttons && !list && (!message || typeof message !== 'string' || message.trim().length === 0)) {
    throw new ApiError(400, 'Message text cannot be empty');
  }

  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const trimmedMessage = (typeof message === 'string' && message.trim().length > 0)
    ? message.trim()
    : (list?.body?.text || list?.body || interactive?.body?.text || 'Interactive Menu');

  // 1. Send via Meta WhatsApp Cloud API (supports text, interactive buttons, or interactive lists)
  await sendMetaWhatsAppMessage(cleanPhone, trimmedMessage, null, { buttons, list, interactive });

  // 2. Automatically activate Human Takeover (silences bot for this customer)
  try {
    await supabase.from('whatsapp_sessions').upsert({
      phone: cleanPhone,
      step: 'human_takeover',
      customer_name: customerName || null,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[Session update error]', err.message);
  }

  // 3. Log outbound agent message in database
  const { data: savedMessage, error } = await supabase
    .from('whatsapp_messages')
    .insert([
      {
        phone: cleanPhone,
        customer_name: customerName || 'Customer',
        direction: 'outbound',
        sender: 'agent',
        message_text: trimmedMessage,
      },
    ])
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST205') {
      console.warn('[Inbox Notice] Table public.whatsapp_messages does not exist yet. Outbound message delivered via Meta WhatsApp.');
      return createdResponse(
        res,
        {
          id: 'temp-' + Date.now(),
          phone: cleanPhone,
          customer_name: customerName || 'Customer',
          direction: 'outbound',
          sender: 'agent',
          message_text: trimmedMessage,
          created_at: new Date().toISOString(),
        },
        'WhatsApp message sent successfully'
      );
    }
    throw new ApiError(500, `Message dispatched to WhatsApp but failed to log in CRM: ${error.message}`, error);
  }

  return createdResponse(res, savedMessage, 'WhatsApp message sent successfully');
});

/**
 * @desc    Pause or resume the automated bot for a customer
 * @route   POST /api/inbox/whatsapp/bot-toggle
 * @access  Protected (Admin)
 */
export const toggleBotStatus = asyncHandler(async (req, res) => {
  assertConfigured();
  const { phone, botActive } = req.body || {};

  if (!phone || typeof phone !== 'string') {
    throw new ApiError(400, 'Valid customer phone number is required');
  }

  const cleanPhone = phone.replace(/[^0-9]/g, '');

  if (botActive) {
    // Resume bot: remove human_takeover step so bot responds on next message
    try {
      await supabase
        .from('whatsapp_sessions')
        .delete()
        .eq('phone', cleanPhone);
    } catch (err) {
      console.warn('[Resume bot error]', err.message);
    }

    return successResponse(res, { phone: cleanPhone, botPaused: false }, 'Bot resumed successfully');
  } else {
    // Pause bot: activate human_takeover
    try {
      await supabase
        .from('whatsapp_sessions')
        .upsert({
          phone: cleanPhone,
          step: 'human_takeover',
          updated_at: new Date().toISOString(),
        });
    } catch (err) {
      console.warn('[Pause bot error]', err.message);
    }

    return successResponse(res, { phone: cleanPhone, botPaused: true }, 'Bot paused for human takeover');
  }
});

/**
 * Handles completion of Meta Embedded Signup for WhatsApp Coexistence
 */
export const handleEmbeddedSignup = asyncHandler(async (req, res) => {
  const { code, phoneNumberId, wabaId } = req.body;

  console.log('[Meta Embedded Signup Callback Received]', {
    codeReceived: Boolean(code),
    phoneNumberId,
    wabaId,
  });

  if (phoneNumberId) {
    config.whatsapp.phoneNumberId = String(phoneNumberId);
  }

  return successResponse(
    res,
    {
      phoneNumberId: phoneNumberId || config.whatsapp.phoneNumberId,
      wabaId: wabaId || null,
      coexistenceActive: true,
    },
    'WhatsApp Coexistence successfully connected to your CRM!'
  );
});

/**
 * ============================================================================
 * INSTAGRAM LIVE INBOX CONTROLLER
 * ============================================================================
 */

/**
 * @desc    Get all active Instagram conversations with latest message preview
 * @route   GET /api/inbox/instagram/conversations
 * @access  Protected (Admin)
 */
export const getInstagramConversations = asyncHandler(async (req, res) => {
  assertConfigured();

  // Fetch recent messages matching 'ig_%'
  const { data: messages, error } = await supabase
    .from('whatsapp_messages')
    .select('*')
    .like('phone', 'ig_%')
    .order('created_at', { ascending: false })
    .limit(300);

  if (error) {
    if (error.code === 'PGRST205') {
      return successResponse(res, [], 'Instagram Inbox online');
    }
    throw new ApiError(500, `Failed to fetch Instagram conversations: ${error.message}`, error);
  }

  // Fetch bot states for Instagram sessions
  const { data: sessions } = await supabase
    .from('whatsapp_sessions')
    .select('phone, step, customer_name')
    .like('phone', 'ig_%');

  const sessionMap = new Map((sessions || []).map((s) => [s.phone, s]));

  // Group latest message per Instagram sender
  const conversationsMap = new Map();
  for (const msg of messages || []) {
    if (!conversationsMap.has(msg.phone)) {
      const rawSenderId = msg.phone.replace(/^ig_/, '');
      const sess = sessionMap.get(msg.phone);
      conversationsMap.set(msg.phone, {
        senderId: rawSenderId,
        phoneKey: msg.phone,
        customer_name: msg.customer_name || `Instagram User (${rawSenderId.slice(-4)})`,
        last_message: msg.message_text,
        last_message_at: msg.created_at,
        last_sender: msg.sender,
        direction: msg.direction,
        botPaused: sess?.step === 'human_takeover',
      });
    }
  }

  const conversations = Array.from(conversationsMap.values());
  return successResponse(res, conversations, 'Instagram conversations retrieved successfully');
});

/**
 * @desc    Get full message thread for a specific Instagram user
 * @route   GET /api/inbox/instagram/messages/:senderId
 * @access  Protected (Admin)
 */
export const getInstagramMessages = asyncHandler(async (req, res) => {
  assertConfigured();
  const rawId = req.params.senderId;
  const cleanId = rawId.replace(/^ig_/, '').trim();

  if (!cleanId) {
    throw new ApiError(400, 'Invalid Instagram sender ID parameter');
  }

  const phoneKey = `ig_${cleanId}`;

  const { data: messages, error } = await supabase
    .from('whatsapp_messages')
    .select('*')
    .eq('phone', phoneKey)
    .order('created_at', { ascending: true })
    .limit(150);

  if (error) {
    if (error.code === 'PGRST205') {
      return successResponse(res, [], 'Message thread empty');
    }
    throw new ApiError(500, `Failed to fetch message thread: ${error.message}`, error);
  }

  // Check if bot is paused for this Instagram user
  let botPaused = false;
  try {
    const { data: session } = await supabase
      .from('whatsapp_sessions')
      .select('step')
      .eq('phone', phoneKey)
      .single();
    botPaused = session?.step === 'human_takeover';
  } catch (err) {
    // Graceful fallback
  }

  return successResponse(res, messages || [], 'Instagram message thread retrieved successfully', 200, { botPaused });
});

/**
 * @desc    Send manual outbound Instagram reply to customer
 * @route   POST /api/inbox/instagram/send
 * @access  Protected (Admin)
 */
export const sendInstagramManualMessage = asyncHandler(async (req, res) => {
  assertConfigured();
  const { senderId, message, customerName, quick_replies, buttons, elements } = req.body || {};

  if (!senderId || typeof senderId !== 'string') {
    throw new ApiError(400, 'Valid Instagram sender ID is required');
  }

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    throw new ApiError(400, 'Message text cannot be empty');
  }

  const cleanId = senderId.replace(/^ig_/, '').trim();
  const phoneKey = `ig_${cleanId}`;
  const trimmedMessage = message.trim();

  // 1. Send via Meta Instagram Graph API (supports Carousel Elements, Quick Replies and Button Templates)
  const sendResult = await sendInstagramOutboundMessage(cleanId, trimmedMessage, {
    quick_replies,
    buttons,
    elements,
  });

  // If Meta API failed, DO NOT pretend success! Throw clear error so UI shows red toast!
  if (!sendResult.success) {
    throw new ApiError(
      400,
      `Instagram delivery failed: ${sendResult.error}`
    );
  }

  // 2. Automatically activate Human Takeover (silences bot for this customer)
  try {
    await supabase.from('whatsapp_sessions').upsert({
      phone: phoneKey,
      step: 'human_takeover',
      customer_name: customerName || null,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[Session update error]', err.message);
  }

  // 3. Log outbound agent message in database
  const { data: savedMessage, error } = await supabase
    .from('whatsapp_messages')
    .insert([
      {
        phone: phoneKey,
        customer_name: customerName || `Instagram User (${cleanId.slice(-4)})`,
        direction: 'outbound',
        sender: 'agent',
        message_text: trimmedMessage,
      },
    ])
    .select()
    .single();

  if (error) {
    return createdResponse(
      res,
      {
        id: 'temp-' + Date.now(),
        senderId: cleanId,
        customer_name: customerName || `Instagram User (${cleanId.slice(-4)})`,
        direction: 'outbound',
        sender: 'agent',
        message_text: trimmedMessage,
        created_at: new Date().toISOString(),
        human_takeover: true,
        meta_api_result: sendResult,
      },
      'Instagram message dispatched successfully (session updated to human takeover)'
    );
  }

  return createdResponse(
    res,
    {
      ...savedMessage,
      human_takeover: true,
      meta_api_result: sendResult,
    },
    'Instagram message sent and logged successfully'
  );
});

/**
 * @desc    Toggle automated bot pause / resume for an Instagram user
 * @route   POST /api/inbox/instagram/bot-toggle
 * @access  Protected (Admin)
 */
export const toggleInstagramBotStatus = asyncHandler(async (req, res) => {
  assertConfigured();
  const { senderId, botActive } = req.body || {};

  if (!senderId || typeof senderId !== 'string') {
    throw new ApiError(400, 'Valid Instagram sender ID is required');
  }

  if (typeof botActive !== 'boolean') {
    throw new ApiError(400, 'botActive boolean flag is required (true to resume, false to pause)');
  }

  const cleanId = senderId.replace(/^ig_/, '').trim();
  const phoneKey = `ig_${cleanId}`;

  if (botActive) {
    // Resume bot
    try {
      await supabase
        .from('whatsapp_sessions')
        .delete()
        .eq('phone', phoneKey);
    } catch (err) {
      console.warn('[Resume Instagram bot error]', err.message);
    }

    return successResponse(res, { senderId: cleanId, botPaused: false }, 'Instagram bot resumed successfully');
  } else {
    // Pause bot (human takeover)
    try {
      await supabase
        .from('whatsapp_sessions')
        .upsert({
          phone: phoneKey,
          step: 'human_takeover',
          updated_at: new Date().toISOString(),
        });
    } catch (err) {
      console.warn('[Pause Instagram bot error]', err.message);
    }

    return successResponse(res, { senderId: cleanId, botPaused: true }, 'Instagram bot paused for human takeover');
  }
});

/**
 * @desc    Get real-time Instagram Webhook & account health status
 * @route   GET /api/inbox/instagram/status
 * @access  Protected (Admin)
 */
export const getInstagramWebhookStatus = asyncHandler(async (req, res) => {
  const token = config.instagram.pageAccessToken;
  const isConfigured = Boolean(token);

  return successResponse(
    res,
    {
      webhookUrl: 'https://car-detailing-crm-backend.vercel.app/api/webhook/instagram',
      verifyToken: config.instagram.verifyToken,
      tokenConfigured: isConfigured,
      tokenPrefix: isConfigured ? token.slice(0, 10) + '...' : null,
      accountInfo: {
        username: 'creationindia_',
        accountType: 'MEDIA_CREATOR',
      },
      latestEvent: latestInstagramWebhookEvent,
    },
    'Instagram Webhook status retrieved successfully'
  );
});

/**
 * @desc    Simulate/test incoming Instagram DM for instant dashboard verification
 * @route   POST /api/inbox/instagram/test-ping
 * @access  Protected (Admin)
 */
export const triggerInstagramTestPing = asyncHandler(async (req, res) => {
  const { senderId = 'arc____hit_simulated', message = 'Hello from simulated DM test' } = req.body || {};

  const simulatedPayload = {
    object: 'instagram',
    entry: [
      {
        id: '29347217818200339',
        messaging: [
          {
            sender: { id: senderId },
            recipient: { id: '29347217818200339' },
            timestamp: Date.now(),
            message: {
              mid: 'sim_mid_' + Date.now(),
              text: message,
            },
          },
        ],
      },
    ],
  };

  // Process via the real webhook handler
  const mockReq = { body: simulatedPayload };
  const mockRes = {
    status: () => ({ json: (d) => d }),
  };

  await handleInstagramMessage(mockReq, mockRes);

  return successResponse(
    res,
    {
      simulated: true,
      senderId,
      message,
      event: latestInstagramWebhookEvent,
    },
    'Simulated Instagram message dispatched successfully'
  );
});

/**
 * @desc    Sync active conversations directly from Meta Instagram Graph API
 * @route   POST /api/inbox/instagram/sync
 * @access  Protected (Admin)
 */
export const syncInstagramConversations = asyncHandler(async (req, res) => {
  const token = config.instagram.pageAccessToken;
  if (!token) {
    throw new ApiError(500, 'No Instagram Access Token configured');
  }

  try {
    const url = `https://graph.instagram.com/v21.0/me/conversations?fields=id,updated_time,participants,messages{id,message,from,to,created_time}&access_token=${encodeURIComponent(token)}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(data.error?.code === 190 ? 401 : 400, data.error?.message || 'Failed to query Meta conversations API');
    }

    const conversations = data.data || [];
    let importedCount = 0;

    for (const conv of conversations) {
      const otherParticipant = conv.participants?.data?.find((p) => p.username !== 'creationindia_') || conv.participants?.data?.[0];
      if (!otherParticipant) continue;

      const igsid = otherParticipant.id;
      const username = otherParticipant.username || `Instagram User (${igsid.slice(-4)})`;
      const phoneKey = `ig_${igsid}`;

      if (Array.isArray(conv.messages?.data)) {
        for (const msg of conv.messages.data) {
          const isFromCustomer = msg.from?.id === igsid;
          const direction = isFromCustomer ? 'inbound' : 'outbound';
          const sender = isFromCustomer ? 'customer' : 'agent';
          const text = msg.message;

          if (text) {
            try {
              await supabase.from('whatsapp_messages').upsert({
                phone: phoneKey,
                customer_name: username,
                direction,
                sender,
                message_text: text,
                created_at: msg.created_time || new Date().toISOString(),
              }, { onConflict: 'id' });
              importedCount++;
            } catch (err) {
              // Ignore individual message conflict
            }
          }
        }
      }
    }

    return successResponse(
      res,
      {
        count: conversations.length,
        importedMessages: importedCount,
        conversations,
        notice: conversations.length === 0
          ? 'Meta returned 0 conversations. Please verify in Instagram mobile app: Settings > Messages and story replies > Message controls > Connected tools > "Allow access to messages" is toggled ON, and app is switched to Live mode in Meta Developer Portal.'
          : 'Conversations synced successfully from Meta Graph API',
      },
      conversations.length === 0
        ? 'No conversations found on Meta Graph API yet'
        : `Successfully synced ${conversations.length} conversation(s) from Meta Graph API`
    );
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(500, `Meta sync failed: ${err.message}`, err);
  }
});

/**
 * @desc    Get currently configured Instagram Ice Breaker buttons from Meta
 * @route   GET /api/inbox/instagram/icebreakers
 * @access  Protected (Admin)
 */
export const getInstagramIceBreakers = asyncHandler(async (req, res) => {
  const token = config.instagram.pageAccessToken;
  if (!token) {
    throw new ApiError(500, 'No Instagram Access Token configured');
  }

  try {
    const isIGToken = token.startsWith('IGAA') || token.startsWith('IGA');
    const baseUrl = isIGToken
      ? 'https://graph.instagram.com/v21.0/me/messenger_profile'
      : 'https://graph.facebook.com/v21.0/me/messenger_profile';

    const url = `${baseUrl}?fields=ice_breakers&access_token=${encodeURIComponent(token)}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(400, data.error?.message || 'Failed to fetch ice breakers from Meta');
    }

    const iceBreakers = data.data?.[0]?.ice_breakers || [];
    return successResponse(res, { iceBreakers }, 'Ice breakers retrieved successfully');
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(500, `Failed to query ice breakers: ${err.message}`, err);
  }
});

/**
 * @desc    Configure or restore Instagram Ice Breaker buttons on Meta profile
 * @route   POST /api/inbox/instagram/icebreakers
 * @access  Protected (Admin)
 */
export const configureInstagramIceBreakers = asyncHandler(async (req, res) => {
  const token = config.instagram.pageAccessToken;
  if (!token) {
    throw new ApiError(500, 'No Instagram Access Token configured');
  }

  const customIceBreakers = req.body?.ice_breakers;
  const defaultIceBreakers = [
    { question: '🚗 Detailing Packages', payload: 'menu' },
    { question: '🛡️ PPF Protection', payload: '1' },
    { question: '✨ Ceramic Coating', payload: '2' },
    { question: '📍 Location & Visit', payload: 'location' },
  ];

  const iceBreakers = Array.isArray(customIceBreakers) && customIceBreakers.length > 0
    ? customIceBreakers
    : defaultIceBreakers;

  try {
    const isIGToken = token.startsWith('IGAA') || token.startsWith('IGA');
    const baseUrl = isIGToken
      ? 'https://graph.instagram.com/v21.0/me/messenger_profile'
      : 'https://graph.facebook.com/v21.0/me/messenger_profile';

    const url = `${baseUrl}?access_token=${encodeURIComponent(token)}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform: 'instagram',
        ice_breakers: iceBreakers,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new ApiError(400, data.error?.message || 'Failed to update ice breakers on Meta');
    }

    return successResponse(
      res,
      { result: data.result, iceBreakers },
      'Ice breaker buttons configured on Instagram profile successfully'
    );
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(500, `Failed to set ice breakers: ${err.message}`, err);
  }
});

/**
 * @desc    Delete/clear Instagram Ice Breaker buttons from Meta profile
 * @route   DELETE /api/inbox/instagram/icebreakers
 * @access  Protected (Admin)
 */
export const deleteInstagramIceBreakers = asyncHandler(async (req, res) => {
  const token = config.instagram.pageAccessToken;
  if (!token) {
    throw new ApiError(500, 'No Instagram Access Token configured');
  }

  try {
    const isIGToken = token.startsWith('IGAA') || token.startsWith('IGA');
    const baseUrl = isIGToken
      ? 'https://graph.instagram.com/v21.0/me/messenger_profile'
      : 'https://graph.facebook.com/v21.0/me/messenger_profile';

    const url = `${baseUrl}?access_token=${encodeURIComponent(token)}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform: 'instagram',
        fields: ['ice_breakers'],
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new ApiError(400, data.error?.message || 'Failed to delete ice breakers on Meta');
    }

    return successResponse(res, { result: data.result }, 'Ice breakers deleted from Instagram profile successfully');
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(500, `Failed to delete ice breakers: ${err.message}`, err);
  }
});

/**
 * @desc    Get recent Instagram post/reel comments and their auto-reply status
 * @route   GET /api/inbox/instagram/comments
 * @access  Protected (Admin)
 */
export const getInstagramComments = asyncHandler(async (req, res) => {
  return successResponse(
    res,
    {
      count: latestInstagramComments.length,
      comments: latestInstagramComments,
    },
    'Instagram post comments retrieved successfully'
  );
});

/**
 * @desc    Send manual staff reply to an Instagram comment
 * @route   POST /api/inbox/instagram/comments/reply
 * @access  Protected (Admin)
 */
export const replyToInstagramComment = asyncHandler(async (req, res) => {
  const { commentId, message } = req.body || {};

  if (!commentId || typeof commentId !== 'string') {
    throw new ApiError(400, 'Valid comment ID is required');
  }

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    throw new ApiError(400, 'Reply message text cannot be empty');
  }

  const cleanCommentId = commentId.trim();
  const trimmedMessage = message.trim();

  const result = await sendInstagramCommentReply(cleanCommentId, trimmedMessage);
  if (!result.success) {
    throw new ApiError(400, `Meta rejected comment reply: ${result.error}`);
  }

  // Update in-memory record if exists
  const existing = latestInstagramComments.find((c) => c.id === cleanCommentId);
  if (existing) {
    existing.manualReply = trimmedMessage;
    existing.manualReplyAt = new Date().toISOString();
  }

  return successResponse(
    res,
    { commentId: cleanCommentId, message: trimmedMessage, result },
    'Comment reply published successfully on Instagram'
  );
});

/**
 * @desc    Simulate an incoming Instagram post comment to verify auto-reply & DM dispatch
 * @route   POST /api/inbox/instagram/comments/test-ping
 * @access  Protected (Admin)
 */
export const triggerInstagramCommentTestPing = asyncHandler(async (req, res) => {
  const {
    username = 'car_enthusiast_india',
    comment = 'What is the price for Ceramic Coating on Scorpio-N?',
    mediaId = '17999887766554433',
  } = req.body || {};

  const simulatedCommentPayload = {
    id: 'sim_comment_' + Date.now(),
    text: comment,
    from: {
      id: '17841400998877665',
      username,
    },
    media: {
      id: mediaId,
      media_product_type: 'FEED',
    },
    created_time: Math.floor(Date.now() / 1000),
  };

  const outcome = await processIncomingInstagramComment(simulatedCommentPayload);

  return successResponse(
    res,
    {
      simulated: true,
      comment: simulatedCommentPayload,
      outcome,
    },
    'Simulated Instagram comment processed: Auto public reply & private DM quick-replies dispatched'
  );
});
