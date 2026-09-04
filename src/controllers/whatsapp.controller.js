import { supabase, isConfigured } from '../config/supabase.js';
import { config } from '../config/env.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const SERVICE_MAP = {
  '1': 'PPF',
  'ppf': 'PPF',
  'paint protection': 'PPF',
  'paint protection film': 'PPF',
  '🛡️ ppf': 'PPF',
  '2': 'Ceramic Coating',
  'ceramic': 'Ceramic Coating',
  'ceramic coating': 'Ceramic Coating',
  '✨ ceramic coating': 'Ceramic Coating',
  '✨ ceramic': 'Ceramic Coating',
  '3': 'Paint Correction',
  'paint correction': 'Paint Correction',
  'polishing': 'Paint Correction',
  'polish': 'Paint Correction',
  '🚘 paint correction': 'Paint Correction',
  '🚘 correction': 'Paint Correction',
  '4': 'Interior Detailing',
  'interior': 'Interior Detailing',
  'interior detailing': 'Interior Detailing',
  'interior detail': 'Interior Detailing',
  '🧼 interior detailing': 'Interior Detailing',
  '🧼 interior detail': 'Interior Detailing',
  '5': 'Full Detail Package',
  'full detail': 'Full Detail Package',
  'full detailing': 'Full Detail Package',
  'full detailing package': 'Full Detail Package',
  '🏎️ full detail': 'Full Detail Package',
  '🏎️ full detailing': 'Full Detail Package',
  '🏎️ full detailing package': 'Full Detail Package',
};

export const WEBSITE_URL = 'https://weekly-steps-579379.framer.app/';

export function parseCustomerName(input, fallbackName = 'Customer') {
  if (!input || typeof input !== 'string') return fallbackName;
  const clean = input.trim();
  const withoutDigits = clean
    .replace(/(\+?[0-9][0-9\s-]{8,14}[0-9])/g, '')
    .replace(/\+?[0-9\s-]{4,}/g, '')
    .replace(/[0-9]/g, '')
    .replace(/[,:/\-()_!]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (withoutDigits.length >= 2 && /[a-zA-Z\u0900-\u097F]/.test(withoutDigits)) {
    return withoutDigits;
  }
  return fallbackName;
}

// Meta WhatsApp Cloud API Interactive Templates (Max 3 buttons per bubble, <= 20 chars per button title)
export const WHATSAPP_SERVICES_LIST = {
  button: 'View Packages 🚗',
  sections: [
    {
      title: 'Exterior Protection',
      rows: [
        { id: '1', title: '🛡️ PPF', description: 'Self-healing paint protection film' },
        { id: '2', title: '✨ Ceramic Coating', description: '9H/10H deep gloss nano armor' },
        { id: '3', title: '🚘 Paint Correction', description: 'Swirl, haze & scratch removal' },
      ],
    },
    {
      title: 'Interior & Full Detail',
      rows: [
        { id: '4', title: '🧼 Interior Detailing', description: 'Deep cabin steam clean & hygiene' },
        { id: '5', title: '🏎️ Full Detail', description: 'Complete bumper-to-bumper transformation' },
      ],
    },
  ],
};

export const WHATSAPP_SERVICE_BUTTONS_P1 = [
  { id: '1', title: '🛡️ PPF' },
  { id: '2', title: '✨ Ceramic Coating' },
  { id: '3', title: '🚘 Paint Correction' },
];

export const WHATSAPP_SERVICE_BUTTONS_P2 = [
  { id: '4', title: '🧼 Interior Detail' },
  { id: '5', title: '🏎️ Full Detail' },
];

export const WHATSAPP_REENGAGE_BUTTONS = [
  { id: 'REENGAGE_YES', title: '✅ Yes' },
  { id: 'REENGAGE_NO', title: '❌ No' },
];

export const WHATSAPP_MORE_HELP_BUTTONS_P1 = [
  { id: 'MORE_LOCATION', title: '📍 Studio Location' },
  { id: 'MORE_PRICING', title: '💰 Pricing Packages' },
  { id: 'MORE_CALLBACK', title: '📞 Request Callback' },
];

export const WHATSAPP_MORE_HELP_BUTTONS_P2 = [
  { id: 'MORE_WEBSITE', title: '🌐 Visit Website' },
  { id: 'MORE_NOTHING', title: '❌ Nothing Else' },
];

export const WELCOME_MESSAGE = 
`Welcome to Signature Detailing 🚗✨

Which service are you interested in?

1. 🛡️ PPF (Paint Protection Film)
2. ✨ Ceramic Coating
3. 🚘 Paint Correction
4. 🧼 Interior Detailing
5. 🏎️ Full Detail Package

Tap 'View Packages' below or reply with 1, 2, 3, 4, or 5:`;

/**
 * Sends outbound WhatsApp message via Meta Cloud API
 * Supports plain text, interactive buttons (max 3, <=20 chars), and interactive list messages
 */
export async function sendMetaWhatsAppMessage(to, text, phoneNumberIdOrOptions = null, maybeOptions = {}) {
  let phoneNumberId = null;
  let options = {};

  if (phoneNumberIdOrOptions && typeof phoneNumberIdOrOptions === 'object') {
    options = phoneNumberIdOrOptions;
    phoneNumberId = options.phoneNumberId || null;
  } else {
    phoneNumberId = phoneNumberIdOrOptions;
    options = maybeOptions || {};
  }

  const token = config.whatsapp.token;
  const targetPhoneId = phoneNumberId || config.whatsapp.phoneNumberId;
  const cleanTo = String(to || '').replace(/[^0-9]/g, '');

  let payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: cleanTo,
  };

  // Build Interactive Payload if options specify buttons, list, or direct interactive
  if (options.interactive) {
    payload.type = 'interactive';
    payload.interactive = options.interactive;
  } else if (Array.isArray(options.buttons) && options.buttons.length > 0) {
    payload.type = 'interactive';
    payload.interactive = {
      type: 'button',
      body: { text: String(text || '').slice(0, 1024) },
      action: {
        buttons: options.buttons.slice(0, 3).map((btn, idx) => ({
          type: 'reply',
          reply: {
            id: String(btn.id || btn.payload || idx + 1).slice(0, 256),
            title: String(btn.title || btn.text || '').slice(0, 20),
          },
        })),
      },
    };
    if (options.header) {
      payload.interactive.header = { type: 'text', text: String(options.header).slice(0, 60) };
    }
    if (options.footer) {
      payload.interactive.footer = { text: String(options.footer).slice(0, 60) };
    }
  } else if (options.list) {
    payload.type = 'interactive';
    payload.interactive = {
      type: 'list',
      body: { text: String(text || '').slice(0, 1024) },
      action: {
        button: String(options.list.button || 'View Options').slice(0, 20),
        sections: options.list.sections || [],
      },
    };
    if (options.header) {
      payload.interactive.header = { type: 'text', text: String(options.header).slice(0, 60) };
    }
    if (options.footer) {
      payload.interactive.footer = { text: String(options.footer).slice(0, 60) };
    }
  } else {
    payload.type = 'text';
    payload.text = { body: String(text || '') };
  }

  if (!token || !targetPhoneId) {
    console.log(`[Meta WhatsApp (Simulated)] -> ${cleanTo} [Type: ${payload.type}]:\n${text}`);
    return { simulated: true, type: payload.type, payload };
  }

  try {
    const url = `https://graph.facebook.com/v19.0/${targetPhoneId}/messages`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('[Meta WhatsApp API Error]', data);
      throw new Error(data.error?.message || 'Meta WhatsApp API error');
    } else {
      console.log(`[Meta WhatsApp Message Sent] to ${cleanTo} (${payload.type})`);
      return data;
    }
  } catch (err) {
    console.error('[Meta WhatsApp Network Error]', err.message);
    throw err;
  }
}

/**
 * Logs a message into the whatsapp_messages table for CRM Live Inbox
 */
export async function logWhatsAppMessage(phone, customerName, direction, sender, messageText) {
  if (!isConfigured) return;
  try {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    await supabase.from('whatsapp_messages').insert([
      {
        phone: cleanPhone,
        customer_name: customerName || 'Customer',
        direction,
        sender,
        message_text: messageText,
      },
    ]);
  } catch (err) {
    console.warn('[WhatsApp Message Log Warning]', err.message);
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

  const entry = req.body.entry?.[0];
  const change = entry?.changes?.[0];
  const field = change?.field;
  const value = change?.value;

  // -------------------------------------------------------------
  // Option 2 (Coexistence): Detect outbound reply from WhatsApp Business Mobile App
  // When staff replies from their phone, Meta sends 'smb_message_echoes'
  // -------------------------------------------------------------
  const isSmbEcho = field === 'smb_message_echoes' || Boolean(value?.smb_message_echoes);
  if (isSmbEcho) {
    const echoMsg = value?.smb_message_echoes?.[0] || value?.messages?.[0];
    const customerPhone = (echoMsg?.to || echoMsg?.recipient_id || '').replace(/[^0-9]/g, '');
    const outboundBody = echoMsg?.text?.body?.trim() || '';

    if (customerPhone && outboundBody) {
      console.log(`[WhatsApp Coexistence Echo] Staff replied via Phone App to ${customerPhone}: "${outboundBody}"`);
      
      // 1. Mirror staff reply in CRM Live Inbox
      await logWhatsAppMessage(
        customerPhone,
        'Customer',
        'outbound',
        'agent',
        outboundBody
      );

      // 2. Automatically pause the bot (Human Mode) because staff is speaking directly with client
      await supabase
        .from('whatsapp_sessions')
        .upsert({
          phone: customerPhone,
          step: 'human_takeover',
          updated_at: new Date().toISOString(),
        });

      return res.status(200).json({ status: 'coexistence_echo_handled', human_takeover: true });
    }
  }

  // Check if outbound echo arrives inside standard messages array where sender == business phone
  if (value?.messages?.[0] && value?.metadata?.display_phone_number) {
    const msg = value.messages[0];
    const bizPhone = value.metadata.display_phone_number.replace(/[^0-9]/g, '');
    const senderPhone = (msg.from || '').replace(/[^0-9]/g, '');
    
    if (senderPhone && bizPhone && senderPhone === bizPhone && msg.to) {
      const customerPhone = msg.to.replace(/[^0-9]/g, '');
      const outboundBody = msg.text?.body?.trim() || '';
      if (outboundBody) {
        console.log(`[WhatsApp Coexistence Echo] Staff replied via Phone App to ${customerPhone}: "${outboundBody}"`);
        await logWhatsAppMessage(customerPhone, 'Customer', 'outbound', 'agent', outboundBody);
        await supabase
          .from('whatsapp_sessions')
          .upsert({
            phone: customerPhone,
            step: 'human_takeover',
            updated_at: new Date().toISOString(),
          });
        return res.status(200).json({ status: 'coexistence_echo_handled', human_takeover: true });
      }
    }
  }

  // -------------------------------------------------------------
  // Inbound Customer Inquiries (Meta Cloud API, ChatSyncs, Twilio)
  // -------------------------------------------------------------
  let buttonTitle = '';

  if (value?.messages?.[0]) {
    // Meta Cloud API & Coexistence Webhook Format
    isMeta = true;
    const message = value.messages[0];
    fromNumber = message.from;
    phoneNumberId = value.metadata?.phone_number_id || config.whatsapp.phoneNumberId;
    profileName = value.contacts?.[0]?.profile?.name || '';

    // Parse Interactive Button / List replies or text
    if (message.interactive?.type === 'button_reply') {
      incomingText = message.interactive.button_reply.id || '';
      buttonTitle = message.interactive.button_reply.title || '';
    } else if (message.interactive?.type === 'list_reply') {
      incomingText = message.interactive.list_reply.id || '';
      buttonTitle = message.interactive.list_reply.title || '';
    } else if (message.button?.payload) {
      incomingText = message.button.payload;
      buttonTitle = message.button.text || '';
    } else {
      incomingText = message.text?.body?.trim() || '';
    }
  } else if (req.body.data && (req.body.data.from || req.body.data.phone)) {
    // ChatSyncs / Third-party webhook forwarder format
    isMeta = true;
    fromNumber = (req.body.data.from || req.body.data.phone).replace(/[^0-9]/g, '');
    incomingText = (req.body.data.interactive_id || req.body.data.button_reply?.id || req.body.data.text || req.body.data.body || req.body.data.message || '').trim();
    buttonTitle = (req.body.data.interactive_title || req.body.data.button_reply?.title || '').trim();
    profileName = req.body.data.name || req.body.data.sender_name || '';
    phoneNumberId = config.whatsapp.phoneNumberId;
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

  const cleanPhone = fromNumber.replace(/[^0-9]/g, '');
  const displayText = buttonTitle || incomingText;

  // Log inbound customer message to Live Inbox
  await logWhatsAppMessage(
    cleanPhone,
    profileName || 'WhatsApp Customer',
    'inbound',
    'customer',
    displayText
  );

  // Fetch current session for this sender phone
  let { data: session } = await supabase
    .from('whatsapp_sessions')
    .select('*')
    .eq('phone', cleanPhone)
    .single();

  // If session not found in active sessions, check if they have a previous completed lead
  if (!session) {
    const { data: previousLead } = await supabase
      .from('leads')
      .select('*')
      .eq('phone', `+${cleanPhone}`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (previousLead) {
      session = {
        phone: cleanPhone,
        step: 'completed',
        customer_name: previousLead.name,
        selected_service: previousLead.service,
      };
    }
  }

  const cleanInput = (incomingText || '').toLowerCase().trim();

  // Check 1: Human Takeover Mode - Silences the automated bot completely unless user taps a button or command
  if (session && session.step === 'human_takeover') {
    const isInteractiveButtonOrCommand =
      Boolean(SERVICE_MAP[cleanInput]) ||
      Boolean(buttonTitle && SERVICE_MAP[buttonTitle.toLowerCase().trim()]) ||
      cleanInput.startsWith('more_') ||
      cleanInput.startsWith('reengage_') ||
      cleanInput === 'menu' ||
      cleanInput === 'start' ||
      cleanInput === 'reset' ||
      cleanInput === 'services' ||
      cleanInput === 'website' ||
      cleanInput === 'location';

    if (isInteractiveButtonOrCommand) {
      console.log(`[WhatsApp Bot Resuming] Customer ${cleanPhone} interacted with button/command "${incomingText}" during human takeover. Reactivating bot.`);
    } else {
      console.log(`[WhatsApp Bot Silenced] Human takeover active for ${cleanPhone}. Skipping automated bot reply.`);
      return res.status(200).json({ status: 'human_takeover_active', message: 'Bot paused for this conversation' });
    }
  }

  // Check 2: Customer asks for a human agent
  const humanKeywords = ['human', 'agent', 'person', 'support', 'owner', 'talk to human', 'talk to person', 'real person', 'speak with someone', 'call me', 'talk to agent'];
  if (humanKeywords.includes(cleanInput)) {
    await supabase
      .from('whatsapp_sessions')
      .upsert({
        phone: cleanPhone,
        step: 'human_takeover',
        customer_name: session?.customer_name || profileName || null,
        updated_at: new Date().toISOString(),
      });

    const handoffText = "I've alerted our detailing team! An agent will take over this chat shortly to assist you directly. ✨";
    await logWhatsAppMessage(cleanPhone, profileName || session?.customer_name || 'WhatsApp Customer', 'outbound', 'bot', handoffText);

    if (isMeta) {
      await sendMetaWhatsAppMessage(cleanPhone, handoffText, phoneNumberId);
      return res.status(200).json({ status: 'EVENT_RECEIVED', reply: handoffText });
    }
    return res.status(200).json({ status: 'success', reply: handoffText });
  }

  // Reset / Start / Menu command
  if (cleanInput === 'reset' || cleanInput === 'start' || cleanInput === 'menu' || cleanInput === 'services') {
    await supabase
      .from('whatsapp_sessions')
      .upsert({
        phone: cleanPhone,
        step: 'awaiting_service',
        selected_service: null,
        customer_name: session?.customer_name || (profileName && profileName !== 'WhatsApp Customer' ? profileName : null),
        updated_at: new Date().toISOString(),
      });

    const welcomeMsg = WELCOME_MESSAGE;
    await logWhatsAppMessage(cleanPhone, profileName || session?.customer_name || 'WhatsApp Customer', 'outbound', 'bot', welcomeMsg);

    if (isMeta) {
      await sendMetaWhatsAppMessage(cleanPhone, welcomeMsg, phoneNumberId, {
        list: WHATSAPP_SERVICES_LIST,
        footer: 'Creation Detailing Studio',
      });
      return res.status(200).json({ status: 'EVENT_RECEIVED', reply: welcomeMsg });
    }
    if (req.body.From) {
      res.setHeader('Content-Type', 'text/xml');
      return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${welcomeMsg}</Message></Response>`);
    }
    return res.status(200).json({ status: 'success', reply: welcomeMsg });
  }

  // Website inquiry
  if (
    cleanInput === 'website' ||
    cleanInput === 'site' ||
    cleanInput === 'web' ||
    cleanInput.includes('website') ||
    cleanInput.includes('landing page') ||
    cleanInput.includes('about us') ||
    cleanInput.includes('portfolio') ||
    cleanInput === 'more_website'
  ) {
    const websiteMsg =
      `Explore Creation Auto Detailing online 🚗✨\n\n` +
      `Visit our official website to view our vehicle transformations, detailing packages, customer reviews, and studio gallery:\n` +
      `🌐 ${WEBSITE_URL}\n\n` +
      `Can we help you with anything else?`;

    const websiteButtons = [
      { id: 'MORE_LOCATION', title: '📍 Studio Location' },
      { id: 'MORE_NOTHING', title: '❌ Nothing Else' },
    ];

    await logWhatsAppMessage(cleanPhone, profileName || session?.customer_name || 'WhatsApp Customer', 'outbound', 'bot', websiteMsg);

    if (isMeta) {
      await sendMetaWhatsAppMessage(cleanPhone, websiteMsg, phoneNumberId, { buttons: websiteButtons });
      return res.status(200).json({ status: 'EVENT_RECEIVED', reply: websiteMsg });
    }
    if (req.body.From) {
      res.setHeader('Content-Type', 'text/xml');
      return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${websiteMsg}</Message></Response>`);
    }
    return res.status(200).json({ status: 'success', reply: websiteMsg });
  }

  // Location inquiry
  if (cleanInput === 'location' || cleanInput.includes('location') || cleanInput.includes('where') || cleanInput.includes('address') || cleanInput === 'more_location') {
    const locationMsg =
      `📍 Creation Auto Detailing Studio\n\n` +
      `🏢 Address: Studio 4, Detailing Bay Road, Automobile Hub, India\n` +
      `⏰ Hours: Mon-Sat 9:30 AM - 8:00 PM\n` +
      `📞 Phone: +91 98765 43210\n` +
      `🌐 Website: ${WEBSITE_URL}\n\n` +
      `Can we help you with anything else?`;

    const locationButtons = [
      { id: 'MORE_PRICING', title: '💰 Pricing Packages' },
      { id: 'MORE_CALLBACK', title: '📞 Request Callback' },
      { id: 'MORE_NOTHING', title: '❌ Nothing Else' },
    ];

    await logWhatsAppMessage(cleanPhone, profileName || session?.customer_name || 'WhatsApp Customer', 'outbound', 'bot', locationMsg);

    if (isMeta) {
      await sendMetaWhatsAppMessage(cleanPhone, locationMsg, phoneNumberId, { buttons: locationButtons });
      return res.status(200).json({ status: 'EVENT_RECEIVED', reply: locationMsg });
    }
    if (req.body.From) {
      res.setHeader('Content-Type', 'text/xml');
      return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${locationMsg}</Message></Response>`);
    }
    return res.status(200).json({ status: 'success', reply: locationMsg });
  }

  // Pricing inquiry
  if (cleanInput === 'pricing' || cleanInput.includes('pricing') || cleanInput.includes('price') || cleanInput.includes('package') || cleanInput.includes('cost') || cleanInput === 'more_pricing') {
    const pricingMsg =
      `💰 Creation Detailing Packages Overview:\n\n` +
      `• PPF: Starting ₹45,000 (Self-healing TPU)\n` +
      `• Ceramic Coating: Starting ₹18,000 (9H/10H)\n` +
      `• Paint Correction: Starting ₹8,500\n` +
      `• Interior Detailing: Starting ₹4,500\n` +
      `• Full Detailing Package: Starting ₹28,000\n\n` +
      `Our specialist will provide the exact quotation for your vehicle!\n\n` +
      `Can we help you with anything else?`;

    const pricingButtons = [
      { id: 'MORE_CALLBACK', title: '📞 Request Callback' },
      { id: 'MORE_WEBSITE', title: '🌐 Visit Website' },
      { id: 'MORE_NOTHING', title: '❌ Nothing Else' },
    ];

    await logWhatsAppMessage(cleanPhone, profileName || session?.customer_name || 'WhatsApp Customer', 'outbound', 'bot', pricingMsg);

    if (isMeta) {
      await sendMetaWhatsAppMessage(cleanPhone, pricingMsg, phoneNumberId, { buttons: pricingButtons });
      return res.status(200).json({ status: 'EVENT_RECEIVED', reply: pricingMsg });
    }
    if (req.body.From) {
      res.setHeader('Content-Type', 'text/xml');
      return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${pricingMsg}</Message></Response>`);
    }
    return res.status(200).json({ status: 'success', reply: pricingMsg });
  }

  // Callback inquiry
  if (cleanInput === 'callback' || cleanInput.includes('callback') || cleanInput.includes('call me') || cleanInput === 'more_callback') {
    const callbackMsg =
      `📞 Priority Callback Requested!\n\n` +
      `We have notified our detailing manager to call you as soon as possible on +${cleanPhone}. 👍\n\n` +
      `Can we help you with anything else?`;

    const callbackButtons = [
      { id: 'MORE_WEBSITE', title: '🌐 Visit Website' },
      { id: 'MORE_NOTHING', title: '❌ Nothing Else' },
    ];

    await logWhatsAppMessage(cleanPhone, profileName || session?.customer_name || 'WhatsApp Customer', 'outbound', 'bot', callbackMsg);

    if (isMeta) {
      await sendMetaWhatsAppMessage(cleanPhone, callbackMsg, phoneNumberId, { buttons: callbackButtons });
      return res.status(200).json({ status: 'EVENT_RECEIVED', reply: callbackMsg });
    }
    if (req.body.From) {
      res.setHeader('Content-Type', 'text/xml');
      return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${callbackMsg}</Message></Response>`);
    }
    return res.status(200).json({ status: 'success', reply: callbackMsg });
  }

  // Nothing else / Done / Finished
  if (
    cleanInput === 'more_nothing' ||
    cleanInput === 'nothing' ||
    cleanInput === 'done' ||
    cleanInput === 'bye' ||
    cleanInput.includes("that's all") ||
    cleanInput.includes('thats all')
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

    await supabase
      .from('whatsapp_sessions')
      .upsert({
        phone: cleanPhone,
        step: 'human_takeover',
        customer_name: session?.customer_name || null,
        selected_service: session?.selected_service || null,
        updated_at: new Date().toISOString(),
      });

    await logWhatsAppMessage(cleanPhone, profileName || session?.customer_name || 'WhatsApp Customer', 'outbound', 'bot', nothingElseMsg);

    if (isMeta) {
      await sendMetaWhatsAppMessage(cleanPhone, nothingElseMsg, phoneNumberId);
      return res.status(200).json({ status: 'EVENT_RECEIVED', reply: nothingElseMsg });
    }
    if (req.body.From) {
      res.setHeader('Content-Type', 'text/xml');
      return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${nothingElseMsg}</Message></Response>`);
    }
    return res.status(200).json({ status: 'success', reply: nothingElseMsg });
  }

  // =========================================================================
  // GLOBAL BUTTON HANDLERS
  // =========================================================================

  // A. Service Selection (1-5, or service title)
  const matchedService = SERVICE_MAP[cleanInput] || (buttonTitle ? SERVICE_MAP[buttonTitle.toLowerCase().trim()] : null);
  if (matchedService) {
    // If user is returning / completed customer, add interest directly without asking name/phone!
    const hasContactOnFile =
      Boolean(session?.customer_name) &&
      !session.customer_name.startsWith('WhatsApp Customer') &&
      session.step !== 'awaiting_service' &&
      session.step !== 'awaiting_name';

    if (hasContactOnFile) {
      try {
        const { data: existingLead } = await supabase
          .from('leads')
          .select('*')
          .eq('phone', `+${cleanPhone}`)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingLead) {
          const combinedService = existingLead.service.includes(matchedService)
            ? existingLead.service
            : `${existingLead.service}, ${matchedService}`;
          await supabase
            .from('leads')
            .update({ service: combinedService, updated_at: new Date().toISOString() })
            .eq('id', existingLead.id);
        } else {
          await supabase.from('leads').insert([
            {
              name: session.customer_name,
              phone: `+${cleanPhone}`,
              service: matchedService,
              source: 'whatsapp',
              status: 'new',
            },
          ]);
        }
      } catch (err) {
        console.warn('[WhatsApp Add Service Warning]', err.message);
      }

      await supabase
        .from('whatsapp_sessions')
        .upsert({
          phone: cleanPhone,
          step: 'completed',
          customer_name: session.customer_name,
          selected_service: matchedService,
          updated_at: new Date().toISOString(),
        });

      const yesReply =
        `Great choice! 👍\n\n` +
        `We've added your interest in ${matchedService}.\n\n` +
        `Our team will contact you shortly.`;

      const confirmButtons = [
        { id: 'MORE_WEBSITE', title: '🌐 Visit Website' },
        { id: 'MORE_LOCATION', title: '📍 Studio Location' },
      ];

      await logWhatsAppMessage(cleanPhone, session.customer_name, 'outbound', 'bot', yesReply);

      if (isMeta) {
        await sendMetaWhatsAppMessage(cleanPhone, yesReply, phoneNumberId, { buttons: confirmButtons });
        return res.status(200).json({ status: 'EVENT_RECEIVED', reply: yesReply });
      }
      if (req.body.From) {
        res.setHeader('Content-Type', 'text/xml');
        return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${yesReply}</Message></Response>`);
      }
      return res.status(200).json({ status: 'success', reply: yesReply });
    }

    // If session is in awaiting_name, customer tapped another service instead of typing name
    if (session && session.step === 'awaiting_name') {
      await supabase
        .from('whatsapp_sessions')
        .update({
          selected_service: matchedService,
          updated_at: new Date().toISOString(),
        })
        .eq('phone', cleanPhone);

      const updateReply = `Updated! You selected: ${matchedService} ✨\n\nMay I know your full name so our team can address you properly?`;
      await logWhatsAppMessage(cleanPhone, profileName || 'WhatsApp Customer', 'outbound', 'bot', updateReply);

      if (isMeta) {
        await sendMetaWhatsAppMessage(cleanPhone, updateReply, phoneNumberId);
        return res.status(200).json({ status: 'EVENT_RECEIVED', reply: updateReply });
      }
      if (req.body.From) {
        res.setHeader('Content-Type', 'text/xml');
        return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${updateReply}</Message></Response>`);
      }
      return res.status(200).json({ status: 'success', reply: updateReply });
    }

    // New customer or awaiting_service: Advance to awaiting_name
    await supabase
      .from('whatsapp_sessions')
      .upsert({
        phone: cleanPhone,
        step: 'awaiting_name',
        selected_service: matchedService,
        customer_name: session?.customer_name || null,
        updated_at: new Date().toISOString(),
      });

    const reply = `Great choice! ${matchedService} is one of our specialty services. ✨\n\nMay I know your full name so our team can address you properly?`;
    await logWhatsAppMessage(cleanPhone, profileName || 'WhatsApp Customer', 'outbound', 'bot', reply);

    if (isMeta) {
      await sendMetaWhatsAppMessage(cleanPhone, reply, phoneNumberId);
      return res.status(200).json({ status: 'EVENT_RECEIVED', reply });
    }
    if (req.body.From) {
      res.setHeader('Content-Type', 'text/xml');
      return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${reply}</Message></Response>`);
    }
    return res.status(200).json({ status: 'success', reply });
  }

  // B. Re-engagement Buttons (YES / NO)
  if (cleanInput === 'reengage_yes') {
    await supabase
      .from('whatsapp_sessions')
      .upsert({
        phone: cleanPhone,
        step: 'awaiting_additional_service',
        customer_name: session?.customer_name || null,
        selected_service: session?.selected_service || null,
        updated_at: new Date().toISOString(),
      });

    const servicesPrompt = `Great! Which additional service would you like to explore? Tap 'View Packages' below:`;
    await logWhatsAppMessage(cleanPhone, session?.customer_name || profileName || 'WhatsApp Customer', 'outbound', 'bot', servicesPrompt);

    if (isMeta) {
      await sendMetaWhatsAppMessage(cleanPhone, servicesPrompt, phoneNumberId, {
        list: WHATSAPP_SERVICES_LIST,
        footer: 'Creation Detailing Studio',
      });
      return res.status(200).json({ status: 'EVENT_RECEIVED', reply: servicesPrompt });
    }
    if (req.body.From) {
      res.setHeader('Content-Type', 'text/xml');
      return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${servicesPrompt}</Message></Response>`);
    }
    return res.status(200).json({ status: 'success', reply: servicesPrompt });
  }

  if (cleanInput === 'reengage_no') {
    await supabase
      .from('whatsapp_sessions')
      .upsert({
        phone: cleanPhone,
        step: 'awaiting_more_help',
        customer_name: session?.customer_name || null,
        selected_service: session?.selected_service || null,
        updated_at: new Date().toISOString(),
      });

    const previousService = session?.selected_service || 'Detailing Service';
    const noPathMsg1 =
      `No problem at all, ${session?.customer_name || 'friend'}! 👍\n\n` +
      `We already have your inquiry for ${previousService} on file.\n\n` +
      `Can we help you with anything else?`;

    await logWhatsAppMessage(cleanPhone, session?.customer_name || profileName || 'WhatsApp Customer', 'outbound', 'bot', noPathMsg1);

    if (isMeta) {
      await sendMetaWhatsAppMessage(cleanPhone, noPathMsg1, phoneNumberId, { buttons: WHATSAPP_MORE_HELP_BUTTONS_P1 });
      const noPathMsg2 = `Or explore our studio website / finish 👇`;
      await sendMetaWhatsAppMessage(cleanPhone, noPathMsg2, phoneNumberId, { buttons: WHATSAPP_MORE_HELP_BUTTONS_P2 });
      await logWhatsAppMessage(cleanPhone, session?.customer_name || profileName || 'WhatsApp Customer', 'outbound', 'bot', noPathMsg2);
      return res.status(200).json({ status: 'EVENT_RECEIVED', reply: noPathMsg1 });
    }
    if (req.body.From) {
      res.setHeader('Content-Type', 'text/xml');
      return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${noPathMsg1}</Message></Response>`);
    }
    return res.status(200).json({ status: 'success', reply: noPathMsg1 });
  }

  // =========================================================================
  // STATE-SPECIFIC CONVERSATIONAL HANDLERS
  // =========================================================================

  // State: Completed - Returning customer messages again
  if (session && session.step === 'completed') {
    const isAck = /^(ok|okay|thank\s*you|thanks|thx|sure|perfect|cool|got\s*it|great|k|alright|thumbs\s*up|👍|🙏|😊|❤️)$/i.test(cleanInput);
    if (isAck) {
      const ackMsg = `You're welcome, ${session.customer_name || 'there'}! We look forward to working on your vehicle at Signature Detailing. 🚗✨`;
      await logWhatsAppMessage(cleanPhone, session.customer_name || 'WhatsApp Customer', 'outbound', 'bot', ackMsg);

      if (isMeta) {
        await sendMetaWhatsAppMessage(cleanPhone, ackMsg, phoneNumberId);
        return res.status(200).json({ status: 'EVENT_RECEIVED', reply: ackMsg });
      }
      if (req.body.From) {
        res.setHeader('Content-Type', 'text/xml');
        return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${ackMsg}</Message></Response>`);
      }
      return res.status(200).json({ status: 'success', reply: ackMsg });
    }

    // Returning customer: Ask if they'd like to explore another service
    await supabase
      .from('whatsapp_sessions')
      .upsert({
        phone: cleanPhone,
        step: 'awaiting_reengagement_decision',
        customer_name: session.customer_name,
        selected_service: session.selected_service,
        updated_at: new Date().toISOString(),
      });

    const reengageMsg =
      `Welcome back, ${session.customer_name || 'friend'}! 🚗✨\n\n` +
      `Would you like to explore another detailing service?`;

    await logWhatsAppMessage(cleanPhone, session.customer_name || 'WhatsApp Customer', 'outbound', 'bot', reengageMsg);

    if (isMeta) {
      await sendMetaWhatsAppMessage(cleanPhone, reengageMsg, phoneNumberId, { buttons: WHATSAPP_REENGAGE_BUTTONS });
      return res.status(200).json({ status: 'EVENT_RECEIVED', reply: reengageMsg });
    }
    if (req.body.From) {
      res.setHeader('Content-Type', 'text/xml');
      return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${reengageMsg}</Message></Response>`);
    }
    return res.status(200).json({ status: 'success', reply: reengageMsg });
  }

  // State: Awaiting Decision on Exploring Another Service (YES / NO text replies)
  if (session && session.step === 'awaiting_reengagement_decision') {
    const isYes = cleanInput === 'yes' || cleanInput === 'y' || cleanInput === 'sure' || cleanInput === 'yeah' || cleanInput.includes('yes');
    if (isYes) {
      await supabase
        .from('whatsapp_sessions')
        .upsert({
          phone: cleanPhone,
          step: 'awaiting_additional_service',
          customer_name: session.customer_name,
          selected_service: session.selected_service,
          updated_at: new Date().toISOString(),
        });

      const servicesPrompt = `Great! Which additional service would you like to explore? Tap 'View Packages' below:`;
      await logWhatsAppMessage(cleanPhone, session.customer_name || 'WhatsApp Customer', 'outbound', 'bot', servicesPrompt);

      if (isMeta) {
        await sendMetaWhatsAppMessage(cleanPhone, servicesPrompt, phoneNumberId, {
          list: WHATSAPP_SERVICES_LIST,
          footer: 'Creation Detailing Studio',
        });
        return res.status(200).json({ status: 'EVENT_RECEIVED', reply: servicesPrompt });
      }
      if (req.body.From) {
        res.setHeader('Content-Type', 'text/xml');
        return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${servicesPrompt}</Message></Response>`);
      }
      return res.status(200).json({ status: 'success', reply: servicesPrompt });
    }

    const isNo = cleanInput === 'no' || cleanInput === 'n' || cleanInput === 'nope' || cleanInput.includes('no');
    if (isNo) {
      await supabase
        .from('whatsapp_sessions')
        .upsert({
          phone: cleanPhone,
          step: 'awaiting_more_help',
          customer_name: session.customer_name,
          selected_service: session.selected_service,
          updated_at: new Date().toISOString(),
        });

      const previousService = session.selected_service || 'Detailing Service';
      const noPathMsg1 =
        `No problem at all, ${session.customer_name || 'friend'}! 👍\n\n` +
        `We already have your inquiry for ${previousService} on file.\n\n` +
        `Can we help you with anything else?`;

      await logWhatsAppMessage(cleanPhone, session.customer_name || 'WhatsApp Customer', 'outbound', 'bot', noPathMsg1);

      if (isMeta) {
        await sendMetaWhatsAppMessage(cleanPhone, noPathMsg1, phoneNumberId, { buttons: WHATSAPP_MORE_HELP_BUTTONS_P1 });
        const noPathMsg2 = `Or explore our studio website / finish 👇`;
        await sendMetaWhatsAppMessage(cleanPhone, noPathMsg2, phoneNumberId, { buttons: WHATSAPP_MORE_HELP_BUTTONS_P2 });
        await logWhatsAppMessage(cleanPhone, session.customer_name || 'WhatsApp Customer', 'outbound', 'bot', noPathMsg2);
        return res.status(200).json({ status: 'EVENT_RECEIVED', reply: noPathMsg1 });
      }
      if (req.body.From) {
        res.setHeader('Content-Type', 'text/xml');
        return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${noPathMsg1}</Message></Response>`);
      }
      return res.status(200).json({ status: 'success', reply: noPathMsg1 });
    }

    // Clarification prompt
    const clarifyMsg = `Would you like to explore another detailing service, ${session.customer_name || 'friend'}? Tap an option below:`;
    await logWhatsAppMessage(cleanPhone, session.customer_name || 'WhatsApp Customer', 'outbound', 'bot', clarifyMsg);

    if (isMeta) {
      await sendMetaWhatsAppMessage(cleanPhone, clarifyMsg, phoneNumberId, { buttons: WHATSAPP_REENGAGE_BUTTONS });
      return res.status(200).json({ status: 'EVENT_RECEIVED', reply: clarifyMsg });
    }
    if (req.body.From) {
      res.setHeader('Content-Type', 'text/xml');
      return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${clarifyMsg}</Message></Response>`);
    }
    return res.status(200).json({ status: 'success', reply: clarifyMsg });
  }

  // State: Awaiting Additional Service Selection (Free text fallback)
  if (session && session.step === 'awaiting_additional_service') {
    const prompt = `Which detailing service would you like to explore, ${session.customer_name || 'friend'}? Tap 'View Packages' below:`;
    await logWhatsAppMessage(cleanPhone, session.customer_name || 'WhatsApp Customer', 'outbound', 'bot', prompt);

    if (isMeta) {
      await sendMetaWhatsAppMessage(cleanPhone, prompt, phoneNumberId, {
        list: WHATSAPP_SERVICES_LIST,
        footer: 'Creation Detailing Studio',
      });
      return res.status(200).json({ status: 'EVENT_RECEIVED', reply: prompt });
    }
    if (req.body.From) {
      res.setHeader('Content-Type', 'text/xml');
      return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${prompt}</Message></Response>`);
    }
    return res.status(200).json({ status: 'success', reply: prompt });
  }

  // State: Awaiting Name (Collect name & create CRM lead)
  if (session && session.step === 'awaiting_name') {
    const defaultFallback = (profileName && profileName !== 'WhatsApp Customer') ? profileName : 'Customer';
    const customerName = parseCustomerName(incomingText, defaultFallback);
    const chosenService = session.selected_service || 'Ceramic Coating';

    // Insert lead into Supabase leads table
    const { error: leadError } = await supabase.from('leads').insert([
      {
        name: customerName,
        phone: `+${cleanPhone}`,
        service: chosenService,
        source: 'whatsapp',
        status: 'new',
      },
    ]);

    if (leadError) {
      console.error('[WhatsApp Lead Error]', leadError);
    } else {
      console.log(`[WhatsApp Lead Created] ${customerName} (${cleanPhone}) for ${chosenService}`);
    }

    // Transition session to completed with customer profile
    await supabase
      .from('whatsapp_sessions')
      .upsert({
        phone: cleanPhone,
        step: 'completed',
        customer_name: customerName,
        selected_service: chosenService,
        updated_at: new Date().toISOString(),
      });

    const confirmMsg =
      `Thank you, ${customerName}! 🎉\n\n` +
      `We have received your request for *${chosenService}*. Our detailing specialist will reach out to you shortly on this number.\n\n` +
      `Explore our studio transformations & website:\n` +
      `🌐 ${WEBSITE_URL}`;

    const confirmButtons = [
      { id: 'MORE_WEBSITE', title: '🌐 Visit Website' },
      { id: 'MORE_LOCATION', title: '📍 Studio Location' },
    ];

    await logWhatsAppMessage(cleanPhone, customerName, 'outbound', 'bot', confirmMsg);

    if (isMeta) {
      await sendMetaWhatsAppMessage(cleanPhone, confirmMsg, phoneNumberId, { buttons: confirmButtons });
      return res.status(200).json({ status: 'EVENT_RECEIVED', reply: confirmMsg });
    }
    if (req.body.From) {
      res.setHeader('Content-Type', 'text/xml');
      return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${confirmMsg}</Message></Response>`);
    }
    return res.status(200).json({ status: 'success', reply: confirmMsg });
  }

  // State: Initial Welcome / Brand New Customer
  await supabase
    .from('whatsapp_sessions')
    .upsert({
      phone: cleanPhone,
      step: 'awaiting_service',
      selected_service: null,
      customer_name: profileName && profileName !== 'WhatsApp Customer' ? profileName : null,
      updated_at: new Date().toISOString(),
    });

  const welcomeMsg = WELCOME_MESSAGE;
  await logWhatsAppMessage(cleanPhone, profileName || 'WhatsApp Customer', 'outbound', 'bot', welcomeMsg);

  if (isMeta) {
    await sendMetaWhatsAppMessage(cleanPhone, welcomeMsg, phoneNumberId, {
      list: WHATSAPP_SERVICES_LIST,
      footer: 'Creation Detailing Studio',
    });
    return res.status(200).json({ status: 'EVENT_RECEIVED', reply: welcomeMsg });
  }
  if (req.body.From) {
    res.setHeader('Content-Type', 'text/xml');
    return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${welcomeMsg}</Message></Response>`);
  }
  return res.status(200).json({ status: 'success', reply: welcomeMsg });
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
