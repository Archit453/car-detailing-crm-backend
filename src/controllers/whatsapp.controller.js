import { supabase, isConfigured } from '../config/supabase.js';
import { config } from '../config/env.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const SERVICE_MAP = {
  '1': 'PPF',
  'ppf': 'PPF',
  'paint protection': 'PPF',
  'paint protection film': 'PPF',
  '2': 'Ceramic Coating',
  'ceramic': 'Ceramic Coating',
  'ceramic coating': 'Ceramic Coating',
  '3': 'Paint Correction',
  'paint correction': 'Paint Correction',
  'polishing': 'Paint Correction',
  'polish': 'Paint Correction',
  '4': 'Interior Detailing',
  'interior': 'Interior Detailing',
  'interior detailing': 'Interior Detailing',
};

const WELCOME_MESSAGE = 
`Welcome to Signature Detailing 🚗

Which service are you interested in?

1. PPF (Paint Protection Film)
2. Ceramic Coating
3. Paint Correction
4. Interior Detailing

Reply with 1, 2, 3, or 4 (or type the service name).`;

/**
 * Sends outbound WhatsApp message via Meta Cloud API
 */
async function sendMetaWhatsAppMessage(to, text, phoneNumberId) {
  const token = config.whatsapp.token;
  const targetPhoneId = phoneNumberId || config.whatsapp.phoneNumberId;

  if (!token || !targetPhoneId) {
    console.log(`[Meta WhatsApp (Simulated)] -> ${to}:\n${text}`);
    return;
  }

  try {
    const url = `https://graph.facebook.com/v19.0/${targetPhoneId}/messages`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'text',
        text: { body: text },
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('[Meta WhatsApp API Error]', data);
    } else {
      console.log(`[Meta WhatsApp Message Sent] to ${to}`);
    }
  } catch (err) {
    console.error('[Meta WhatsApp Network Error]', err.message);
  }
}

/**
 * Handles incoming WhatsApp webhook messages (Meta Cloud API & Twilio Fallback)
 */
export const handleWhatsAppMessage = asyncHandler(async (req, res) => {
  if (!isConfigured) {
    throw new ApiError(503, 'Database service is not configured');
  }

  let fromNumber = '';
  let incomingText = '';
  let isMeta = false;
  let phoneNumberId = '';
  let profileName = '';

  if (req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
    // Meta Cloud API Webhook Format
    isMeta = true;
    const value = req.body.entry[0].changes[0].value;
    const message = value.messages[0];
    fromNumber = message.from;
    incomingText = message.text?.body?.trim() || '';
    phoneNumberId = value.metadata?.phone_number_id || config.whatsapp.phoneNumberId;
    profileName = value.contacts?.[0]?.profile?.name || '';
  } else if (req.body.From && req.body.Body) {
    // Twilio Webhook Format
    fromNumber = req.body.From.replace('whatsapp:', '').trim();
    incomingText = req.body.Body.trim();
  } else {
    // Return 200 to acknowledge other webhook events (e.g. read receipts / delivery statuses)
    return res.status(200).json({ status: 'ignored' });
  }

  if (!fromNumber || !incomingText) {
    return res.status(200).json({ status: 'no_message_content' });
  }

  // Fetch current session for this sender phone
  const { data: session } = await supabase
    .from('whatsapp_sessions')
    .select('*')
    .eq('phone', fromNumber)
    .single();

  let replyText = '';

  // Check if session exists or is fresh
  if (!session || session.step === 'completed') {
    // Step 1: Initialize session and send welcome menu
    await supabase
      .from('whatsapp_sessions')
      .upsert({
        phone: fromNumber,
        step: 'awaiting_service',
        selected_service: null,
        customer_name: null,
        updated_at: new Date().toISOString(),
      });

    replyText = WELCOME_MESSAGE;
  } else if (session.step === 'awaiting_service') {
    // Step 2: Validate service selection
    const normalizedChoice = incomingText.toLowerCase();
    const matchedService = SERVICE_MAP[normalizedChoice] || SERVICE_MAP[incomingText];

    if (!matchedService) {
      replyText = `Please select a valid option from the menu:\n\n1. PPF\n2. Ceramic Coating\n3. Paint Correction\n4. Interior Detailing\n\nReply with 1, 2, 3, or 4.`;
    } else {
      await supabase
        .from('whatsapp_sessions')
        .update({
          step: 'awaiting_name',
          selected_service: matchedService,
          updated_at: new Date().toISOString(),
        })
        .eq('phone', fromNumber);

      replyText = `Great choice! ${matchedService} is one of our specialty services. ✨\n\nMay I know your full name?`;
    }
  } else if (session.step === 'awaiting_name') {
    // Step 3: Collect name & create CRM lead
    const customerName = incomingText || profileName || 'WhatsApp Customer';
    const chosenService = session.selected_service || 'Ceramic Coating';

    // Insert lead into Supabase leads table
    const { error: leadError } = await supabase.from('leads').insert([
      {
        name: customerName,
        phone: `+${fromNumber.replace('+', '')}`,
        service: chosenService,
        source: 'whatsapp',
        status: 'new',
      },
    ]);

    if (leadError) {
      console.error('[WhatsApp Lead Error]', leadError);
    } else {
      console.log(`[WhatsApp Lead Created] ${customerName} (${fromNumber}) for ${chosenService}`);
    }

    // Mark session completed / clean up
    await supabase
      .from('whatsapp_sessions')
      .delete()
      .eq('phone', fromNumber);

    replyText = `Thank you, ${customerName}! 🎉\n\nWe have received your request for *${chosenService}*. Our detailing specialist will reach out to you shortly on this number.`;
  }

  // If Meta Cloud API, send message via Meta Graph API
  if (isMeta) {
    await sendMetaWhatsAppMessage(fromNumber, replyText, phoneNumberId);
    return res.status(200).json({ status: 'EVENT_RECEIVED', reply: replyText });
  }

  // Format response for Twilio (TwiML)
  if (req.body.From) {
    res.setHeader('Content-Type', 'text/xml');
    return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${replyText}</Message></Response>`);
  }

  return res.status(200).json({
    status: 'success',
    reply: replyText,
  });
});

/**
 * Verification endpoint for Meta Cloud API Webhook handshake
 */
export const verifyWhatsAppWebhook = (req, res) => {
  const verifyToken = config.whatsapp.verifyToken || 'signature_crm_verify_token';

  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('[Meta WhatsApp Webhook] Handshake verified successfully.');
    return res.status(200).send(challenge);
  }

  console.warn('[Meta WhatsApp Webhook] Handshake verification failed.');
  return res.status(403).json({ error: 'Verification token mismatch' });
};
