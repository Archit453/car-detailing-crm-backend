import { supabase, isConfigured } from '../config/supabase.js';
import { config } from '../config/env.js';

const SERVICE_MAP = {
  '1': 'PPF',
  'ppf': 'PPF',
  'paint protection': 'PPF',
  '🛡️ ppf': 'PPF',
  '2': 'Ceramic Coating',
  'ceramic': 'Ceramic Coating',
  'ceramic coating': 'Ceramic Coating',
  '✨ ceramic coating': 'Ceramic Coating',
  '3': 'Paint Correction',
  'paint correction': 'Paint Correction',
  'correction': 'Paint Correction',
  '🚘 paint correction': 'Paint Correction',
  '4': 'Interior Detailing',
  'interior': 'Interior Detailing',
  'interior detailing': 'Interior Detailing',
  '🧼 interior detail': 'Interior Detailing',
  '5': 'Full Detail Package',
  'full detail': 'Full Detail Package',
  'full detailing': 'Full Detail Package',
  '🏎️ full detailing': 'Full Detail Package',
};

const WELCOME_TEXT =
  `Welcome to Signature Detailing 🚗✨\n\n` +
  `Which service are you interested in?\n\n` +
  `Tap a button below or reply with 1, 2, 3, 4, or 5:`;

// Native In-Bubble Button Templates (Meta limit: 3 buttons per bubble, <= 20 chars per title)
export const SERVICE_BUTTONS_P1 = [
  { type: 'postback', title: '🛡️ PPF', payload: '1' },
  { type: 'postback', title: '✨ Ceramic Coating', payload: '2' },
  { type: 'postback', title: '🚘 Paint Correction', payload: '3' },
];

export const SERVICE_BUTTONS_P2 = [
  { type: 'postback', title: '🧼 Interior Detail', payload: '4' },
  { type: 'postback', title: '🏎️ Full Detailing', payload: '5' },
];

export const REENGAGE_BUTTONS = [
  { type: 'postback', title: '✅ Yes', payload: 'REENGAGE_YES' },
  { type: 'postback', title: '❌ No', payload: 'REENGAGE_NO' },
];

export const MORE_HELP_BUTTONS_P1 = [
  { type: 'postback', title: '📍 Studio Location', payload: 'MORE_LOCATION' },
  { type: 'postback', title: '💰 Pricing Packages', payload: 'MORE_PRICING' },
  { type: 'postback', title: '📞 Request Callback', payload: 'MORE_CALLBACK' },
];

export const MORE_HELP_BUTTONS_P2 = [
  { type: 'postback', title: '💬 WhatsApp Support', payload: 'MORE_WHATSAPP' },
  { type: 'postback', title: '❌ Nothing Else', payload: 'MORE_NOTHING' },
];

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
 * Supports attaching in-bubble Button Templates or Quick Reply buttons
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
    if (Array.isArray(options.buttons) && options.buttons.length > 0) {
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
    } else if (Array.isArray(options.quick_replies) && options.quick_replies.length > 0) {
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

    console.log(`[Instagram Private Reply DM Sent] -> Comment (${cleanCommentId}): "${text.slice(0, 50)}..." [Buttons: ${Boolean(options.buttons || options.quick_replies)}]`);
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

  // 4. Dispatch private reply DM with native in-bubble buttons
  const privateResult = await sendInstagramPrivateReply(commentId, privateDmMessage, {
    buttons: SERVICE_BUTTONS_P1,
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

          // Strictly ignore echo messages or messages from our own Instagram account
          if (event.message?.is_echo || senderId === '29347217818200339') {
            console.log('[Instagram Webhook] Ignored outbound echo from own page in entry.messaging');
            continue;
          }

          // Inbound direct message (supports Quick Reply button taps)
          if (event.message) {
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

            // Strictly ignore echo messages or messages from our own Instagram account
            if (val.message?.is_echo || senderId === '29347217818200339') {
              console.log('[Instagram Webhook] Ignored outbound echo from own page in entry.changes');
              continue;
            }

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

    if (data) return data;

    // Check if this user previously completed an inquiry in message history
    const { data: previousMsg } = await supabase
      .from('whatsapp_messages')
      .select('customer_name')
      .eq('phone', `ig_${senderId}`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (previousMsg?.customer_name && !previousMsg.customer_name.startsWith('Instagram User')) {
      const { data: lead } = await supabase
        .from('leads')
        .select('*')
        .eq('source', 'instagram')
        .eq('name', previousMsg.customer_name)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lead) {
        return {
          phone: `ig_${senderId}`,
          step: 'completed',
          customer_name: lead.name,
          selected_service: lead.service,
        };
      }
    }

    return null;
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
      const welcomeCard1 = `Welcome to Signature Detailing 🚗✨\n\nWhich service are you interested in? Tap an option below:`;
      await sendInstagramReply(senderId, welcomeCard1, { buttons: SERVICE_BUTTONS_P1 });
      await logInstagramMessage(senderId, customerName, 'outbound', 'bot', welcomeCard1);

      const welcomeCard2 = `Or choose from our interior & complete packages 👇`;
      await sendInstagramReply(senderId, welcomeCard2, { buttons: SERVICE_BUTTONS_P2 });
      await logInstagramMessage(senderId, customerName, 'outbound', 'bot', welcomeCard2);
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
      await sendInstagramReply(senderId, locationText, { buttons: SERVICE_BUTTONS_P1 });
      await logInstagramMessage(senderId, customerName, 'outbound', 'bot', locationText);
      return;
    }

    // State: Completed - Customer previously submitted contact details
    if (session && session.step === 'completed') {
      const isAck = /^(ok|okay|thank\s*you|thanks|thx|sure|perfect|cool|got\s*it|great|k|alright|thumbs\s*up|👍|🙏|😊|❤️)$/i.test(normalizedText);
      if (isAck) {
        const ackMsg = `You're welcome, ${session.customer_name || 'there'}! We look forward to working on your vehicle at Creation Detailing. 🚗✨`;
        await sendInstagramReply(senderId, ackMsg);
        await logInstagramMessage(senderId, customerName, 'outbound', 'bot', ackMsg);
        return;
      }

      // Customer messaged again: Ask if they want to explore another service
      await setInstagramSession(senderId, {
        ...session,
        step: 'awaiting_reengagement_decision',
      });

      const reengageMsg =
        `Welcome back, ${session.customer_name || 'friend'}! 🚗✨\n\n` +
        `Would you like to explore another detailing service?`;

      await sendInstagramReply(senderId, reengageMsg, { buttons: REENGAGE_BUTTONS });
      await logInstagramMessage(senderId, customerName, 'outbound', 'bot', reengageMsg);
      return;
    }

    // State: Awaiting Decision on Exploring Another Service (YES / NO)
    if (session && session.step === 'awaiting_reengagement_decision') {
      const isYes =
        normalizedText === 'reengage_yes' ||
        normalizedText === 'yes' ||
        normalizedText === 'y' ||
        normalizedText === 'yeah' ||
        normalizedText === '1' ||
        normalizedText.includes('yes');

      if (isYes) {
        // YES Path: Show Services with native in-bubble buttons
        await setInstagramSession(senderId, {
          ...session,
          step: 'awaiting_additional_service',
        });

        const servicesCard1 = `Great! Which additional service would you like to explore? Tap an option below:`;
        await sendInstagramReply(senderId, servicesCard1, { buttons: SERVICE_BUTTONS_P1 });
        await logInstagramMessage(senderId, customerName, 'outbound', 'bot', servicesCard1);

        const servicesCard2 = `Or choose from our interior & complete packages 👇`;
        await sendInstagramReply(senderId, servicesCard2, { buttons: SERVICE_BUTTONS_P2 });
        await logInstagramMessage(senderId, customerName, 'outbound', 'bot', servicesCard2);
        return;
      }

      const isNo =
        normalizedText === 'reengage_no' ||
        normalizedText === 'no' ||
        normalizedText === 'n' ||
        normalizedText === 'nope' ||
        normalizedText === '2' ||
        normalizedText.includes('no');

      if (isNo) {
        // NO Path (Improved): Acknowledge on-file inquiry & offer help options with native buttons
        await setInstagramSession(senderId, {
          ...session,
          step: 'awaiting_more_help',
        });

        const previousService = session.selected_service || 'Detailing Service';
        const noPathMsg1 =
          `No problem at all, ${session.customer_name || 'friend'}! 👍\n\n` +
          `We already have your inquiry for ${previousService} on file.\n\n` +
          `Can we help you with anything else?`;

        await sendInstagramReply(senderId, noPathMsg1, { buttons: MORE_HELP_BUTTONS_P1 });
        await logInstagramMessage(senderId, customerName, 'outbound', 'bot', noPathMsg1);

        const noPathMsg2 = `Or connect directly / finish 👇`;
        await sendInstagramReply(senderId, noPathMsg2, { buttons: MORE_HELP_BUTTONS_P2 });
        await logInstagramMessage(senderId, customerName, 'outbound', 'bot', noPathMsg2);
        return;
      }
    }

    // State: Awaiting Additional Service Selection (YES Path)
    if (session && session.step === 'awaiting_additional_service') {
      const selectedService = SERVICE_MAP[normalizedText];
      if (selectedService) {
        try {
          const { data: existingLead } = await supabase
            .from('leads')
            .select('*')
            .eq('source', 'instagram')
            .eq('name', session.customer_name)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (existingLead) {
            const combinedService = existingLead.service.includes(selectedService)
              ? existingLead.service
              : `${existingLead.service}, ${selectedService}`;
            await supabase
              .from('leads')
              .update({ service: combinedService, updated_at: new Date().toISOString() })
              .eq('id', existingLead.id);
          }
        } catch (err) {
          console.warn('[Update Lead Additional Service Warning]', err.message);
        }

        // Return session to completed state
        await setInstagramSession(senderId, {
          ...session,
          step: 'completed',
          selected_service: selectedService,
        });

        const yesReply =
          `Great choice! 👍\n\n` +
          `We've added your interest in ${selectedService}.\n\n` +
          `Our team will contact you shortly.`;

        await sendInstagramReply(senderId, yesReply);
        await logInstagramMessage(senderId, customerName, 'outbound', 'bot', yesReply);
        return;
      }
    }

    // State: Awaiting More Help Choices (NO Path)
    if (session && session.step === 'awaiting_more_help') {
      // 1. Studio Location
      if (normalizedText === 'more_location' || normalizedText.includes('location') || normalizedText.includes('where') || normalizedText.includes('address')) {
        const locationMsg =
          `📍 Creation Auto Detailing Studio\n\n` +
          `🏢 Address: Studio 4, Detailing Bay Road, Automobile Hub, India\n` +
          `⏰ Hours: Mon-Sat 9:30 AM - 8:00 PM\n` +
          `📞 Phone: +91 98765 43210\n\n` +
          `Can we help you with anything else?`;

        const followUpButtons = [
          { type: 'postback', title: '💰 Pricing Packages', payload: 'MORE_PRICING' },
          { type: 'postback', title: '📞 Request Callback', payload: 'MORE_CALLBACK' },
          { type: 'postback', title: '❌ Nothing Else', payload: 'MORE_NOTHING' },
        ];
        await sendInstagramReply(senderId, locationMsg, { buttons: followUpButtons });
        await logInstagramMessage(senderId, customerName, 'outbound', 'bot', locationMsg);
        return;
      }

      // 2. Pricing & Packages
      if (normalizedText === 'more_pricing' || normalizedText.includes('pricing') || normalizedText.includes('price') || normalizedText.includes('package')) {
        const pricingMsg =
          `💰 Creation Detailing Packages Overview:\n\n` +
          `• PPF: Starting ₹45,000 (Self-healing TPU)\n` +
          `• Ceramic Coating: Starting ₹18,000 (9H/10H)\n` +
          `• Paint Correction: Starting ₹8,500\n` +
          `• Interior Detailing: Starting ₹4,500\n` +
          `• Full Detailing Package: Starting ₹28,000\n\n` +
          `Our specialist will provide the exact quotation for your vehicle!\n\n` +
          `Can we help you with anything else?`;

        const followUpButtons = [
          { type: 'postback', title: '📞 Request Callback', payload: 'MORE_CALLBACK' },
          { type: 'postback', title: '💬 WhatsApp Support', payload: 'MORE_WHATSAPP' },
          { type: 'postback', title: '❌ Nothing Else', payload: 'MORE_NOTHING' },
        ];
        await sendInstagramReply(senderId, pricingMsg, { buttons: followUpButtons });
        await logInstagramMessage(senderId, customerName, 'outbound', 'bot', pricingMsg);
        return;
      }

      // 3. Request Callback
      if (normalizedText === 'more_callback' || normalizedText.includes('callback') || normalizedText.includes('call')) {
        const callbackMsg =
          `📞 Priority Callback Requested!\n\n` +
          `We have notified our detailing manager to call you as soon as possible. 👍\n\n` +
          `Can we help you with anything else?`;

        const followUpButtons = [
          { type: 'postback', title: '💬 WhatsApp Support', payload: 'MORE_WHATSAPP' },
          { type: 'postback', title: '❌ Nothing Else', payload: 'MORE_NOTHING' },
        ];
        await sendInstagramReply(senderId, callbackMsg, { buttons: followUpButtons });
        await logInstagramMessage(senderId, customerName, 'outbound', 'bot', callbackMsg);
        return;
      }

      // 4. WhatsApp Support
      if (normalizedText === 'more_whatsapp' || normalizedText.includes('whatsapp')) {
        const waMsg =
          `💬 Chat with our detailing specialist directly on WhatsApp:\n` +
          `https://wa.me/919876543210?text=Hi%2C%20I%20inquired%20on%20Instagram%20and%20need%20assistance.\n\n` +
          `Can we help you with anything else?`;

        const followUpButtons = [
          {
            type: 'web_url',
            url: 'https://wa.me/919876543210?text=Hi%2C%20I%20inquired%20on%20Instagram%20and%20need%20assistance.',
            title: 'Chat on WhatsApp 💬',
          },
          { type: 'postback', title: '❌ Nothing Else', payload: 'MORE_NOTHING' },
        ];
        await sendInstagramReply(senderId, waMsg, { buttons: followUpButtons });
        await logInstagramMessage(senderId, customerName, 'outbound', 'bot', waMsg);
        return;
      }

      // 5. Nothing Else
      if (
        normalizedText === 'more_nothing' ||
        normalizedText.includes('nothing') ||
        normalizedText === 'no' ||
        normalizedText === 'nope' ||
        normalizedText === 'bye' ||
        normalizedText.includes("that's all") ||
        normalizedText.includes('thats all')
      ) {
        const nothingElseMsg =
          `Perfect! 🚗✨\n\n` +
          `Our team will reach out shortly.\n\n` +
          `Feel free to message us anytime if you need:\n` +
          `• PPF\n` +
          `• Ceramic Coating\n` +
          `• Paint Correction\n` +
          `• Interior Detailing\n` +
          `• Full Detailing\n\n` +
          `Have a great day!`;

        await sendInstagramReply(senderId, nothingElseMsg);
        await logInstagramMessage(senderId, customerName, 'outbound', 'bot', nothingElseMsg);

        // Mark bot_active = false and waiting_for_human
        await setInstagramSession(senderId, {
          step: 'human_takeover',
          customer_name: session.customer_name,
          selected_service: session.selected_service,
        });
        return;
      }
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
        // Send menu with native in-bubble Button Template cards
        await setInstagramSession(senderId, {
          step: 'awaiting_service',
        });

        const welcomeCard1 = `Welcome to Signature Detailing 🚗✨\n\nWhich service are you interested in? Tap an option below:`;
        await sendInstagramReply(senderId, welcomeCard1, { buttons: SERVICE_BUTTONS_P1 });
        await logInstagramMessage(senderId, customerName, 'outbound', 'bot', welcomeCard1);

        const welcomeCard2 = `Or choose from our interior & complete packages 👇`;
        await sendInstagramReply(senderId, welcomeCard2, { buttons: SERVICE_BUTTONS_P2 });
        await logInstagramMessage(senderId, customerName, 'outbound', 'bot', welcomeCard2);
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

      // Transition session to completed with customer profile (prevent duplicate welcome loop)
      await setInstagramSession(senderId, {
        step: 'completed',
        customer_name: name,
        selected_service: selectedService,
      });

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

