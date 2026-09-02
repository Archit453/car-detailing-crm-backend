import { supabase, isConfigured } from '../config/supabase.js';
import { ApiError } from '../utils/apiError.js';
import { successResponse, createdResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendMetaWhatsAppMessage } from './whatsapp.controller.js';

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

  return successResponse(res, messages || [], 'Message thread retrieved successfully');
});

/**
 * @desc    Send manual outbound WhatsApp reply to customer
 * @route   POST /api/inbox/whatsapp/send
 * @access  Protected (Admin)
 */
export const sendManualMessage = asyncHandler(async (req, res) => {
  assertConfigured();
  const { phone, message, customerName } = req.body || {};

  if (!phone || typeof phone !== 'string') {
    throw new ApiError(400, 'Valid customer phone number is required');
  }

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    throw new ApiError(400, 'Message text cannot be empty');
  }

  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const trimmedMessage = message.trim();

  // 1. Send via Meta WhatsApp Cloud API
  await sendMetaWhatsAppMessage(cleanPhone, trimmedMessage);

  // 2. Log outbound agent message in database
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
