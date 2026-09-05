import dotenv from 'dotenv';

dotenv.config();

/**
 * Centralized Configuration Hub
 * ALL API keys, access tokens, credentials, phone numbers, business info, and settings are managed here.
 * The client can configure everything via environment variables (.env / Vercel Settings) without touching any code.
 */
export const validateEnv = () => {
  const missing = [];
  if (!process.env.SUPABASE_URL) missing.push('SUPABASE_URL');
  if (!process.env.SUPABASE_KEY && !process.env.SUPABASE_ANON_KEY) {
    missing.push('SUPABASE_KEY or SUPABASE_ANON_KEY');
  }

  if (missing.length > 0) {
    const errorMsg = `[Config Warning] Missing required environment variables: ${missing.join(', ')}. ` +
      `Please set these in your Vercel Project Settings > Environment Variables or .env file.`;
    console.warn(`\x1b[33m%s\x1b[0m`, `⚠️  ${errorMsg}`);
  }
};

export const config = {
  // Server & Environment Settings
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*',

  // Supabase Database Credentials
  supabase: {
    url: process.env.SUPABASE_URL || 'https://fgndnmgfcsceuxeuishf.supabase.co',
    key: process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6...',
  },

  // Business & Branding Details (Client Customizable)
  business: {
    name: process.env.BUSINESS_NAME || 'Signature Detailing',
    studioName: process.env.STUDIO_NAME || 'Creation Auto Detailing Studio',
    websiteUrl: process.env.WEBSITE_URL || 'https://weekly-steps-579379.framer.app/',
    phone: process.env.BUSINESS_PHONE || '+91 98765 43210',
    address: process.env.BUSINESS_ADDRESS || 'Studio 4, Detailing Bay Road, Automobile Hub, India',
    hours: process.env.BUSINESS_HOURS || 'Mon-Sat 9:30 AM - 8:00 PM',
  },

  // Meta WhatsApp Cloud API Settings
  whatsapp: {
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || 'signature_crm_verify_token',
    token: process.env.WHATSAPP_TOKEN || process.env.META_WHATSAPP_TOKEN || 'EAAPcKFDfS8sBSe7H52ZBVoeV6lPSmF4tXcYeJbbb7yWQvlmjOmROQrH7IdToVdEhcZA1DZBe7ptAOHzMyj3ocaZC6Mi04nWpOvZB3iBtQOV8r1ZBLsoUojDp0ggxQNcQftFGtwUFEmlzh81hICFAQInK9vNIFsmQtPWQFZA2VBdAMiGnP7SZCCxrcsgKTVN6DZCVmKQZDZD',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '1344182455438369',
  },

  // Meta Instagram Graph API Settings
  instagram: {
    verifyToken: process.env.INSTAGRAM_VERIFY_TOKEN || 'signature_crm_verify_token',
    pageAccessToken: process.env.INSTAGRAM_PAGE_ACCESS_TOKEN || process.env.META_PAGE_ACCESS_TOKEN || 'IGAAO2AZAXVHNJBZAGFrWHBCTWJHX0VTSE5EZAm5XTDlwMkdLTTQ1STJXUFhaV1dhNEpKLWp2dldmQkxJbjlVb2FkNTdFd3lfdlNUYnFLbV9uX0g2bnVRRGQ1cmhtZA0FUWE5RdEhZAZAE9LSDlwQkdPaW00cWlUTHR3UnJPQnVvTWVnbwZDZD',
  },

  // CRM Dashboard Authentication
  auth: {
    adminUsername: process.env.ADMIN_USERNAME || 'admin',
    adminPassword: process.env.ADMIN_PASSWORD || 'SignatureCRM@2026!',
    sessionSecret: process.env.SESSION_SECRET || 'crm_secret_key_signature_detailing_2026_super_secure',
  },

  // Bot Conversation Flow Customization (Client Editable)
  botFlow: {
    welcomeMessage: process.env.BOT_WELCOME_MESSAGE || `Welcome to Signature Detailing 🚗✨\n\nWhich service are you interested in?\n\n1. 🛡️ PPF (Paint Protection Film)\n2. ✨ Ceramic Coating\n3. 🚘 Paint Correction\n4. 🧼 Interior Detailing\n5. 🏎️ Full Detail Package\n\nTap 'View Packages' below or reply with 1, 2, 3, 4, or 5:`,
    namePrompt: process.env.BOT_NAME_PROMPT || `Great choice! ✨\n\nMay I know your full name so our team can address you properly?`,
    confirmMessage: process.env.BOT_CONFIRM_MESSAGE || `Thank you, {name}! 🎉\n\nWe have received your request for *{service}*. Our detailing specialist will reach out to you shortly on this number.\n\nExplore our studio transformations & website:\n🌐 {website}`,
    humanHandoffText: process.env.BOT_HANDOFF_TEXT || `I've alerted our detailing team! An agent will take over this chat shortly to assist you directly. ✨`,
    triggerKeywords: process.env.BOT_TRIGGER_KEYWORDS || 'hi, hello, menu, services, start, reset',
    packages: [
      { id: '1', title: '🛡️ PPF', description: 'Self-healing paint protection film' },
      { id: '2', title: '✨ Ceramic Coating', description: '9H/10H deep gloss nano armor' },
      { id: '3', title: '🚘 Paint Correction', description: 'Swirl, haze & scratch removal' },
      { id: '4', title: '🧼 Interior Detailing', description: 'Deep cabin steam clean & hygiene' },
      { id: '5', title: '🏎️ Full Detail', description: 'Complete bumper-to-bumper transformation' },
    ],
  },

  // Vercel Cron Database Keepalive Secret
  cron: {
    secret: process.env.CRON_SECRET || '',
  },
};
