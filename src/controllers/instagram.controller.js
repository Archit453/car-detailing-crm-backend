import { supabase, isConfigured } from '../config/supabase.js';
import { config } from '../config/env.js';

const SERVICE_MAP = {
  '1': 'PPF',
  'ppf': 'PPF',
  'paint protection': 'PPF',
  '2': 'Ceramic Coating',
  'ceramic': 'Ceramic Coating',
  'ceramic coating': 'Ceramic Coating',
  '3': 'Paint Correction',
  'paint correction': 'Paint Correction',
  'correction': 'Paint Correction',
  '4': 'Interior Detailing',
  'interior': 'Interior Detailing',
  'interior detailing': 'Interior Detailing',
  '5': 'Full Detail Package',
  'full detail': 'Full Detail Package',
};

const WELCOME_TEXT =
  `Welcome to Signature Detailing 🚗✨\n\n` +
  `Which service are you interested in?\n\n` +
  `Tap a button below or reply with 1, 2, 3, 4, or 5:`;

export const SERVICE_QUICK_REPLIES = [
  { content_type: 'text', title: '1. PPF 🛡️', payload: '1' },
  { content_type: 'text', title: '2. Ceramic ✨', payload: '2' },
  { content_type: 'text', title: '3. Correction 🚘', payload: '3' },
  { content_type: 'text', title: '4. Interior 🧼', payload: '4' },
  { content_type: 'text', title: '5. Full Detail 🏎️', payload: '5' },
];

export const WHATSAPP_LINK_BUTTONS = [
  {
    type: 'web_url',
    url: 'https://wa.me/919876543210?text=Hi%20Signature%20Detailing,%20I%20am%20inquiring%20from%20Instagram',
    title: 'Chat on WhatsApp 💬',
  },
  {
    type: 'postback',
    title: 'View Services 🚗',
    payload: 'menu',
  },
];

/**
 * Meta Instagram Webhook Verification Handshake (GET /api/webhook/instagram)
 */
export const verifyInstagramWebhook = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === config.instagram.verifyToken) {
    console.log('[Instagram Webhook] Handshake verified successfully.');
    return res.status(200).send(challenge);
  }

  console.warn('[Instagram Webhook] Handshake failed: Invalid verify token or mode.');
  return res.status(403).json({ error: 'Forbidden: Invalid verify token' });
};

export let latestInstagramWebhookEvent = {
  receivedAt: null,
  object: null,
  senderId: null,
  text: null,
  status: 'Ready - Awaiting incoming webhook',
  count: 0,
};

/**
 * Dispatches an outbound message to an Instagram user via Meta Graph API
 * Supports plain text, Quick Reply buttons, and Button Templates
 */
export async function sendInstagramOutboundMessage(recipientId, text, options = {}) {
  const token = config.instagram.pageAccessToken;
  if (!token) {
    return { success: false, error: 'No Instagram Access Token configured in environment' };
  }

  const cleanId = String(recipientId || '').replace(/^ig_/, '').trim();

  // Validate that recipientId is a numeric string (IGSID)
  if (!/^\d+$/.test(cleanId)) {
    const errorMsg = `Recipient ID "${recipientId}" is a placeholder or username, NOT a numeric Instagram-Scoped User ID (IGSID). Meta only delivers messages to numeric IDs (e.g. 17841400123456789) assigned by Meta when a user sends a DM.`;
    console.error(`[Instagram Outbound Blocked] ${errorMsg}`);
    return { success: false, error: errorMsg };
  }

  try {
    const isIGToken = token.startsWith('IGAA') || token.startsWith('IGA');
    const baseUrl = isIGToken
      ? 'https://graph.instagram.com/v21.0/me/messages'
      : 'https://graph.facebook.com/v21.0/me/messages';

    const url = `${baseUrl}?access_token=${encodeURIComponent(token)}`;

    // Build message payload supporting Quick Replies or Button Template
    let messageObj = { text };

    if (Array.isArray(options.quick_replies) && options.quick_replies.length > 0) {
      messageObj = {
        text,
        quick_replies: options.quick_replies,
      };
    } else if (Array.isArray(options.buttons) && options.buttons.length > 0) {
      messageObj = {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'button',
            text: text.slice(0, 640),
            buttons: options.buttons,
          },
        },
      };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: cleanId },
        message: messageObj,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('[Instagram Graph API Error]', data);
      return { success: false, error: data.error?.message || 'Meta API rejected message', details: data };
    }

    console.log(`[Instagram Outbound Sent] -> User (${cleanId}): ${text.slice(0, 50)}... [Buttons: ${Boolean(options.quick_replies || options.buttons)}]`);
    return { success: true, data };
  } catch (err) {
    console.error('[Instagram API Network Error]', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Sends a message back to the Instagram user via Meta Graph API (Internal Bot)
 */
async function sendInstagramReply(recipientId, text, options = {}) {
  const result = await sendInstagramOutboundMessage(recipientId, text, options);
  if (!result.success) {
    console.warn(`[Instagram Bot Auto-Reply Warning] Message not sent via Meta: ${result.error}`);
  }
  return result;
}

/**
 * Parses customer name and phone from freeform text input
 */
function parseNameAndPhone(input, fallbackId) {
  const cleanInput = input.trim();
  
  // Look for phone number (digits, optional +, space, hyphens)
  const phoneMatch = cleanInput.match(/(\+?[0-9\s-]{7,15})/);
  let phone = phoneMatch ? phoneMatch[0].trim().replace(/\s+/g, '') : `IG-${fallbackId.slice(-6)}`;
  
  // Extract name by removing the matched phone part
  let name = cleanInput.replace(phoneMatch ? phoneMatch[0] : '', '').replace(/[,:-]/g, ' ').trim();
  if (!name || name.length < 2) {
    name = `Instagram User (${fallbackId.slice(-4)})`;
  }

  return { name, phone };
}

/**
 * Handles Incoming Instagram Direct Messages (POST /api/webhook/instagram)
 */
export const handleInstagramMessage = async (req, res) => {
  const body = req.body || {};
  console.log('[Instagram Webhook Received]', JSON.stringify(body));

  const firstMsg = body.entry?.[0]?.messaging?.[0] || body.entry?.[0]?.changes?.[0]?.value;
  const rawText =
    firstMsg?.message?.quick_reply?.payload ||
    firstMsg?.message?.text ||
    firstMsg?.postback?.payload ||
    firstMsg?.postback?.title ||
    firstMsg?.text ||
    null;

  latestInstagramWebhookEvent = {
    receivedAt: new Date().toISOString(),
    object: body.object,
    senderId: firstMsg?.sender?.id || firstMsg?.from?.id || null,
    text: rawText,
    status: 'Webhook event processed',
    count: (latestInstagramWebhookEvent.count || 0) + 1,
    raw: body,
  };

  // Acknowledge receipt immediately to satisfy Meta's webhook requirement
  if (body.object !== 'instagram' && body.object !== 'page') {
    console.log('[Instagram Webhook] Ignored object type:', body.object);
    return res.status(200).json({ status: 'IGNORED_NON_INSTAGRAM_OBJECT' });
  }

  // Iterate over each entry
  if (Array.isArray(body.entry)) {
    for (const entry of body.entry) {
      // 1. Standard Messenger/Instagram format (entry.messaging)
      if (Array.isArray(entry.messaging)) {
        for (const event of entry.messaging) {
          const senderId = event.sender?.id;
          if (!senderId) continue;

          // Inbound direct message (supports Quick Reply button taps)
          if (event.message && !event.message.is_echo) {
            const buttonPayload = event.message.quick_reply?.payload;
            const messageText = buttonPayload || event.message.text || '';
            await processIncomingInstagramMessage(senderId, messageText);
          }
          // Postback event (supports Button Template taps & Ice Breaker clicks)
          else if (event.postback) {
            const buttonPayload = event.postback.payload || event.postback.title || '';
            await processIncomingInstagramMessage(senderId, buttonPayload);
          }
        }
      }

      // 2. Instagram Graph API changes format (entry.changes)
      if (Array.isArray(entry.changes)) {
        for (const change of entry.changes) {
          if (change.field === 'messages' && change.value) {
            const val = change.value;
            const senderId = val.sender?.id || val.from?.id;
            const buttonPayload =
              val.message?.quick_reply?.payload ||
              val.postback?.payload ||
              val.postback?.title;
            const text = buttonPayload || val.message?.text || val.text || '';
            if (senderId && text) {
              await processIncomingInstagramMessage(senderId, text);
            }
          }
        }
      }
    }
  }

  return res.status(200).json({ status: 'EVENT_RECEIVED' });
};

async function getInstagramSession(senderId) {
  try {
    const { data } = await supabase
      .from('whatsapp_sessions')
      .select('*')
      .eq('phone', `ig_${senderId}`)
      .single();
    return data || null;
  } catch (err) {
    return null;
  }
}

async function setInstagramSession(senderId, sessionData) {
  try {
    await supabase.from('whatsapp_sessions').upsert({
      phone: `ig_${senderId}`,
      step: sessionData.step,
      selected_service: sessionData.selected_service || null,
      customer_name: sessionData.customer_name || null,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[Instagram Session Upsert Warning]', err.message);
  }
}

async function deleteInstagramSession(senderId) {
  try {
    await supabase.from('whatsapp_sessions').delete().eq('phone', `ig_${senderId}`);
  } catch (err) {
    console.warn('[Instagram Session Delete Warning]', err.message);
  }
}

async function logInstagramMessage(senderId, customerName, direction, sender, text) {
  try {
    await supabase.from('whatsapp_messages').insert([
      {
        phone: `ig_${senderId}`,
        customer_name: customerName,
        direction,
        sender,
        message_text: text,
      },
    ]);
  } catch (err) {
    console.warn('[Instagram Message Log Error]', err.message);
  }
}

/**
 * Process single user message with multi-turn session state
 */
async function processIncomingInstagramMessage(senderId, text) {
  const normalizedText = text.trim().toLowerCase();

  try {
    // 1. Check existing session for this Instagram user
    const session = await getInstagramSession(senderId);
    const customerName = session?.customer_name || `Instagram User (${senderId.slice(-4)})`;

    // 2. Log inbound customer message to Supabase
    await logInstagramMessage(senderId, customerName, 'inbound', 'customer', text);

    // 3. Check for Human Takeover (silences bot if staff has paused it)
    if (session && session.step === 'human_takeover') {
      console.log(`[Instagram Bot Silenced] Human takeover active for ig_${senderId}. Skipping automated reply.`);
      return;
    }

    // Reset command or Menu button click
    if (normalizedText === 'reset' || normalizedText === 'start' || normalizedText === 'menu') {
      await deleteInstagramSession(senderId);
      await sendInstagramReply(senderId, WELCOME_TEXT, { quick_replies: SERVICE_QUICK_REPLIES });
      await logInstagramMessage(senderId, customerName, 'outbound', 'bot', WELCOME_TEXT);
      return;
    }

    // Location inquiry (e.g. from Ice Breaker button "📍 Location & Visit")
    if (normalizedText === 'location' || normalizedText.includes('location') || normalizedText.includes('where')) {
      const locationText =
        `📍 Creation Auto Detailing Studio\n\n` +
        `🏢 Address: Studio 4, Detailing Bay Road, Automobile Hub, India\n` +
        `⏰ Hours: Mon-Sat 9:30 AM - 8:00 PM\n` +
        `📞 Phone: +91 98765 43210\n\n` +
        `Which service can we assist you with today? Tap an option below:`;
      await sendInstagramReply(senderId, locationText, { quick_replies: SERVICE_QUICK_REPLIES });
      await logInstagramMessage(senderId, customerName, 'outbound', 'bot', locationText);
      return;
    }

    // State 1: Awaiting Service Selection (or brand new conversation)
    if (!session || session.step === 'awaiting_service') {
      const matchedService = SERVICE_MAP[normalizedText];

      if (matchedService) {
        // Save selected service and advance state
        await setInstagramSession(senderId, {
          step: 'awaiting_contact',
          selected_service: matchedService,
        });

        const reply =
          `Great choice! You selected: ${matchedService} 🚗\n\n` +
          `To prepare your customized quote and check garage slot availability, please reply with your Name and Phone Number (e.g. Rahul Sharma, +91 98765 43210):`;
        
        await sendInstagramReply(senderId, reply);
        await logInstagramMessage(senderId, customerName, 'outbound', 'bot', reply);
      } else {
        // Send menu with interactive quick reply buttons
        await setInstagramSession(senderId, {
          step: 'awaiting_service',
        });

        await sendInstagramReply(senderId, WELCOME_TEXT, { quick_replies: SERVICE_QUICK_REPLIES });
        await logInstagramMessage(senderId, customerName, 'outbound', 'bot', WELCOME_TEXT);
      }
      return;
    }

    // State 2: Awaiting Name and Phone Number
    if (session.step === 'awaiting_contact') {
      const { name, phone } = parseNameAndPhone(text, senderId);
      const selectedService = session.selected_service || 'Ceramic Coating';

      // Insert Lead into CRM leads table
      const { error: insertError } = await supabase.from('leads').insert([
        {
          name,
          phone,
          service: selectedService,
          source: 'instagram',
          status: 'new',
        },
      ]);

      if (insertError) {
        console.error('[Instagram Bot Lead Insert Error]', insertError);
      } else {
        console.log(`[Instagram Bot] Lead created: ${name} (${phone}) for ${selectedService}`);
      }

      // Clear session after successful lead capture
      await deleteInstagramSession(senderId);

      // Send confirmation message to customer
      const confirmationMsg =
        `Thank you ${name}! 🏎️\n\n` +
        `Our detailing specialists have received your inquiry for ${selectedService}.\n` +
        `We will reach out to you on ${phone} shortly with quotation details and garage slot timings!`;

      await sendInstagramReply(senderId, confirmationMsg);
      await logInstagramMessage(senderId, name || customerName, 'outbound', 'bot', confirmationMsg);
    }
  } catch (err) {
    console.error('[Instagram Bot Session Error]', err);
    const fallbackMsg = `Thank you for contacting Signature Detailing! We have noted your request and our team will get back to you shortly.`;
    await sendInstagramReply(senderId, fallbackMsg);
    await logInstagramMessage(senderId, 'Customer', 'outbound', 'bot', fallbackMsg);
  }
}

