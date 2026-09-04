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

export let latestInstagramComments = [];

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
 * Publishes a public reply to an Instagram comment on a post or reel
 */
export async function sendInstagramCommentReply(commentId, message) {
  const token = config.instagram.pageAccessToken;
  if (!token) {
    return { success: false, error: 'No Instagram Access Token configured in environment' };
  }

  const cleanCommentId = String(commentId || '').trim();
  if (!cleanCommentId) {
    return { success: false, error: 'Valid comment ID is required' };
  }

  try {
    const isIGToken = token.startsWith('IGAA') || token.startsWith('IGA');
    const baseUrl = isIGToken
      ? `https://graph.instagram.com/v21.0/${cleanCommentId}/replies`
      : `https://graph.facebook.com/v21.0/${cleanCommentId}/replies`;

    const url = `${baseUrl}?access_token=${encodeURIComponent(token)}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('[Instagram Comment Reply Error]', data);
      return { success: false, error: data.error?.message || 'Meta rejected comment reply', details: data };
    }

    console.log(`[Instagram Public Comment Reply Posted] -> Comment (${cleanCommentId}): "${message.slice(0, 50)}..."`);
    return { success: true, data };
  } catch (err) {
    console.error('[Instagram Comment Reply Network Error]', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Sends a private DM reply to an Instagram commenter via comment_id
 * Supports attaching Quick Reply buttons
 */
export async function sendInstagramPrivateReply(commentId, text, options = {}) {
  const token = config.instagram.pageAccessToken;
  if (!token) {
    return { success: false, error: 'No Instagram Access Token configured in environment' };
  }

  const cleanCommentId = String(commentId || '').trim();
  if (!cleanCommentId) {
    return { success: false, error: 'Valid comment ID is required' };
  }

  try {
    const isIGToken = token.startsWith('IGAA') || token.startsWith('IGA');
    const baseUrl = isIGToken
      ? 'https://graph.instagram.com/v21.0/me/messages'
      : 'https://graph.facebook.com/v21.0/me/messages';

    const url = `${baseUrl}?access_token=${encodeURIComponent(token)}`;

    let messageObj = { text };
    if (Array.isArray(options.quick_replies) && options.quick_replies.length > 0) {
      messageObj = {
        text,
        quick_replies: options.quick_replies,
      };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { comment_id: cleanCommentId },
        message: messageObj,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('[Instagram Private Reply Error]', data);
      return { success: false, error: data.error?.message || 'Meta rejected private reply', details: data };
    }

    console.log(`[Instagram Private Reply DM Sent] -> Comment (${cleanCommentId}): "${text.slice(0, 50)}..." [Buttons: ${Boolean(options.quick_replies)}]`);
    return { success: true, data };
  } catch (err) {
    console.error('[Instagram Private Reply Network Error]', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Processes an incoming comment event from Instagram posts or reels
 */
export async function processIncomingInstagramComment(commentData) {
  const commentId = commentData.id;
  const commentText = commentData.text || '';
  const fromUsername = commentData.from?.username || 'user';
  const fromId = commentData.from?.id;
  const mediaId = commentData.media?.id || 'post';

  console.log(`[Instagram Post Comment Received] From @${fromUsername} on Media ${mediaId}: "${commentText}"`);

  // Prevent infinite reply loops if comment is from own account
  if (fromUsername === 'creationindia_' || fromId === '29347217818200339') {
    console.log('[Instagram Comment Ignored] Comment made by own account @creationindia_.');
    return { status: 'IGNORED_OWN_ACCOUNT' };
  }

  // 1. Compose automated public reply for post
  const publicReplyMessage = `Hi @${fromUsername}! Thanks for reaching out. We just sent you a DM with our detailing packages & pricing. Please check your message requests! 🚗✨`;

  // 2. Compose private reply DM with interactive service buttons
  const privateDmMessage = `Hi @${fromUsername}! Thanks for your comment on our post 🚗✨\n\nWhich detailing package can we help you with? Tap an option below:`;

  // 3. Dispatch public reply
  const publicResult = await sendInstagramCommentReply(commentId, publicReplyMessage);

  // 4. Dispatch private reply DM with Quick Reply buttons
  const privateResult = await sendInstagramPrivateReply(commentId, privateDmMessage, {
    quick_replies: SERVICE_QUICK_REPLIES,
  });

  // 5. Store in latestInstagramComments feed
  const commentRecord = {
    id: commentId,
    mediaId,
    fromUsername,
    fromId: fromId || null,
    text: commentText,
    createdAt: new Date().toISOString(),
    publicReplied: publicResult.success,
    publicReplyText: publicReplyMessage,
    publicError: publicResult.error || null,
    privateReplied: privateResult.success,
    privateError: privateResult.error || null,
  };

  latestInstagramComments.unshift(commentRecord);
  if (latestInstagramComments.length > 50) {
    latestInstagramComments.pop();
  }

  // 6. Log to message history if numeric user ID exists
  if (fromId && /^\d+$/.test(String(fromId))) {
    await logInstagramMessage(
      fromId,
      `@${fromUsername}`,
      'inbound',
      'customer',
      `[Comment on Post ${mediaId}]: ${commentText}`
    );
    await logInstagramMessage(
      fromId,
      `@${fromUsername}`,
      'outbound',
      'bot',
      `[Auto-DM to Comment]: ${privateDmMessage}`
    );
  }

  return { status: 'COMMENT_PROCESSED', commentRecord };
}

/**
 * Parses customer name and phone from freeform text input
 */
function parseNameAndPhone(input, fallbackId, existingName = null) {
  const cleanInput = input.trim();

  // Extract phone number (standard mobile patterns: optional +, 10-15 digits with optional spaces/hyphens)
  const phoneMatch = cleanInput.match(/(\+?[0-9][0-9\s-]{8,14}[0-9])/);
  let phone = null;
  let hasValidPhone = false;

  if (phoneMatch) {
    const rawPhone = phoneMatch[0].trim().replace(/\s+/g, '');
    const digitsOnly = rawPhone.replace(/\D/g, '');
    if (digitsOnly.length >= 10 && digitsOnly.length <= 15) {
      phone = rawPhone;
      hasValidPhone = true;
    }
  }

  // Extract name by removing the matched phone part
  let extractedName = cleanInput
    .replace(phoneMatch ? phoneMatch[0] : '', '')
    .replace(/[,:/\-()]/g, ' ')
    .trim();

  // Determine cleanest customer name
  let name = existingName;
  if (extractedName.length >= 2 && !/^\d+$/.test(extractedName)) {
    name = extractedName;
  } else if (!name) {
    name = `Instagram User (${fallbackId.slice(-4)})`;
  }

  return { name, phone, hasValidPhone };
}

/**
 * Handles Incoming Instagram Direct Messages (POST /api/webhook/instagram)
 */
export const handleInstagramMessage = async (req, res) => {
  const body = req.body || {};
  console.log('[Instagram Webhook Received]', JSON.stringify(body));

  const firstMsg = body.entry?.[0]?.messaging?.[0] || body.entry?.[0]?.changes?.[0]?.value;
  const firstChange = body.entry?.[0]?.changes?.[0];
  const isCommentEvent = firstChange?.field === 'comments' || firstChange?.field === 'live_comments';

  const rawText =
    firstMsg?.message?.quick_reply?.payload ||
    firstMsg?.message?.text ||
    firstMsg?.postback?.payload ||
    firstMsg?.postback?.title ||
    firstMsg?.text ||
    (isCommentEvent ? firstChange.value?.text : null) ||
    null;

  const senderId =
    firstMsg?.sender?.id ||
    firstMsg?.from?.id ||
    (isCommentEvent ? firstChange.value?.from?.username || firstChange.value?.from?.id : null) ||
    null;

  const status = isCommentEvent
    ? `Post Comment from @${firstChange.value?.from?.username || 'user'}: "${(firstChange.value?.text || '').slice(0, 40)}"`
    : 'Webhook event processed';

  latestInstagramWebhookEvent = {
    receivedAt: new Date().toISOString(),
    object: body.object,
    senderId,
    text: rawText,
    status,
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
          // Direct Messages received via changes
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
          // Post and Reel Comments received via changes
          else if ((change.field === 'comments' || change.field === 'live_comments') && change.value) {
            await processIncomingInstagramComment(change.value);
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
      // 1. Check if customer tapped or sent another service button instead of contact info
      const reselectedService = SERVICE_MAP[normalizedText];
      if (reselectedService) {
        await setInstagramSession(senderId, {
          ...session,
          selected_service: reselectedService,
        });

        const reply =
          `Updated! You selected: ${reselectedService} 🚗\n\n` +
          `Please reply with your Name and 10-digit Phone Number (e.g. Rahul Sharma, 98765 43210):`;

        await sendInstagramReply(senderId, reply);
        await logInstagramMessage(senderId, customerName, 'outbound', 'bot', reply);
        return;
      }

      // 2. Parse name and phone number
      const { name, phone, hasValidPhone } = parseNameAndPhone(text, senderId, session.customer_name);

      // 3. If NO valid 10-digit phone number was provided, do NOT create a lead in CRM
      if (!hasValidPhone) {
        if (name && !name.startsWith('Instagram User')) {
          await setInstagramSession(senderId, {
            ...session,
            customer_name: name,
          });
        }

        const selectedService = session.selected_service || 'Detailing Service';
        const displayName = name && !name.startsWith('Instagram User') ? ` ${name}` : '';
        const promptPhoneMsg =
          `Thanks${displayName}! 🏎️\n\n` +
          `To prepare your customized quote for ${selectedService}, please reply with your 10-digit mobile phone number (e.g. 98765 43210):`;

        await sendInstagramReply(senderId, promptPhoneMsg);
        await logInstagramMessage(senderId, customerName, 'outbound', 'bot', promptPhoneMsg);
        return;
      }

      const selectedService = session.selected_service || 'Ceramic Coating';

      // 4. Insert Lead into CRM leads table ONLY when a real valid phone number is present!
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

