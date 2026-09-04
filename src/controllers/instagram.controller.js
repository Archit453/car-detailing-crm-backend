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
  `1. PPF (Paint Protection Film)\n` +
  `2. Ceramic Coating\n` +
  `3. Paint Correction\n` +
  `4. Interior Detailing\n` +
  `5. Full Detail Package\n\n` +
  `Please reply with 1, 2, 3, 4, or 5.`;

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

/**
 * Sends a message back to the Instagram user via Meta Graph API
 */
async function sendInstagramReply(recipientId, text) {
  if (!config.instagram.pageAccessToken) {
    console.log(`[Instagram Bot (Simulated)] -> User (${recipientId}):\n${text}`);
    return;
  }

  try {
    const url = `https://graph.facebook.com/v19.0/me/messages?access_token=${encodeURIComponent(config.instagram.pageAccessToken)}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text },
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('[Instagram Graph API Error]', data);
    }
  } catch (err) {
    console.error('[Instagram API Network Error]', err.message);
  }
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
  const body = req.body;

  // Acknowledge receipt immediately to satisfy Meta's webhook requirement
  if (body.object !== 'instagram' && body.object !== 'page') {
    return res.status(200).json({ status: 'IGNORED_NON_INSTAGRAM_OBJECT' });
  }

  // Iterate over each entry
  if (Array.isArray(body.entry)) {
    for (const entry of body.entry) {
      if (Array.isArray(entry.messaging)) {
        for (const event of entry.messaging) {
          if (event.message && !event.message.is_echo && event.sender?.id) {
            await processIncomingInstagramMessage(event.sender.id, event.message.text || '');
          }
        }
      }
    }
  }

  return res.status(200).json({ status: 'EVENT_RECEIVED' });
};

const inMemoryInstagramSessions = new Map();

async function getInstagramSession(senderId) {
  try {
    const { data, error } = await supabase
      .from('instagram_sessions')
      .select('*')
      .eq('sender_id', senderId)
      .single();
    if (!error && data) return data;
  } catch (err) {
    // fallback
  }
  return inMemoryInstagramSessions.get(senderId) || null;
}

async function setInstagramSession(senderId, sessionData) {
  inMemoryInstagramSessions.set(senderId, sessionData);
  try {
    await supabase.from('instagram_sessions').upsert({
      sender_id: senderId,
      ...sessionData,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    // silently fallback to memory
  }
}

async function deleteInstagramSession(senderId) {
  inMemoryInstagramSessions.delete(senderId);
  try {
    await supabase.from('instagram_sessions').delete().eq('sender_id', senderId);
  } catch (err) {
    // silently fallback
  }
}

/**
 * Process single user message with multi-turn session state
 */
async function processIncomingInstagramMessage(senderId, text) {
  const normalizedText = text.trim().toLowerCase();

  if (!isConfigured) {
    console.warn('[Instagram Bot] Database not configured. Sending fallback.');
    await sendInstagramReply(
      senderId,
      `Welcome to Signature Detailing! Our booking system is currently updating. Please call us directly for inquiries.`
    );
    return;
  }

  try {
    // 1. Check existing session for this Instagram user
    const { data: session } = await supabase
      .from('instagram_sessions')
      .select('*')
      .eq('sender_id', senderId)
      .single();
    const session = await getInstagramSession(senderId);

    // Reset command
    if (normalizedText === 'reset' || normalizedText === 'start' || normalizedText === 'menu') {
      await supabase.from('instagram_sessions').delete().eq('sender_id', senderId);
      await deleteInstagramSession(senderId);
      await sendInstagramReply(senderId, WELCOME_TEXT);
      return;
    }

    // State 1: Awaiting Service Selection (or brand new conversation)
    if (!session || session.step === 'awaiting_service') {
      const matchedService = SERVICE_MAP[normalizedText];

      if (matchedService) {
        // Save selected service and advance state
        await supabase
          .from('instagram_sessions')
          .upsert({
            sender_id: senderId,
            step: 'awaiting_contact',
            selected_service: matchedService,
            updated_at: new Date().toISOString(),
          });
        await setInstagramSession(senderId, {
          step: 'awaiting_contact',
          selected_service: matchedService,
        });

        const reply =
          `Great choice! You selected: ${matchedService} 🚗\n\n` +
          `To prepare your customized quote and check garage slot availability, please reply with your Name and Phone Number (e.g. Rahul Sharma, +91 98765 43210):`;
        
        await sendInstagramReply(senderId, reply);
      } else {
        // Send menu
        await supabase
          .from('instagram_sessions')
          .upsert({
            sender_id: senderId,
            step: 'awaiting_service',
            updated_at: new Date().toISOString(),
          });
        await setInstagramSession(senderId, {
          step: 'awaiting_service',
        });

        await sendInstagramReply(senderId, WELCOME_TEXT);
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
      await supabase.from('instagram_sessions').delete().eq('sender_id', senderId);
      await deleteInstagramSession(senderId);

      // Send confirmation message to customer
      const confirmationMsg =
        `Thank you ${name}! 🏎️\n\n` +
        `Our detailing specialists have received your inquiry for ${selectedService}.\n` +
        `We will reach out to you on ${phone} shortly with quotation details and garage slot timings!`;

      await sendInstagramReply(senderId, confirmationMsg);
    }
  } catch (err) {
    console.error('[Instagram Bot Session Error]', err);
    await sendInstagramReply(
      senderId,
      `Thank you for contacting Signature Detailing! We have noted your request and our team will get back to you shortly.`
    );
  }
}

