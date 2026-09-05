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

  // Vercel Cron Database Keepalive Secret
  cron: {
    secret: process.env.CRON_SECRET || '',
  },
};
