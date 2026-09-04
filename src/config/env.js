import dotenv from 'dotenv';

dotenv.config();

/**
 * Validates the presence of required environment variables without crashing the serverless worker.
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
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  supabase: {
    url: process.env.SUPABASE_URL || '',
    key: process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || '',
  },
  whatsapp: {
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || 'signature_crm_verify_token',
    token: process.env.WHATSAPP_TOKEN || process.env.META_WHATSAPP_TOKEN || '',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
  },
  instagram: {
    verifyToken: process.env.INSTAGRAM_VERIFY_TOKEN || 'signature_crm_verify_token',
    pageAccessToken: process.env.INSTAGRAM_PAGE_ACCESS_TOKEN || process.env.META_PAGE_ACCESS_TOKEN || 'IGAAO2AZAXVHNJBZAGFrWHBCTWJHX0VTSE5EZAm5XTDlwMkdLTTQ1STJXUFhaV1dhNEpKLWp2dldmQkxJbjlVb2FkNTdFd3lfdlNUYnFLbV9uX0g2bnVRRGQ1cmhtZA0FUWE5RdEhZAZAE9LSDlwQkdPaW00cWlUTHR3UnJPQnVvTWVnbwZDZD',
  },
  auth: {
    adminUsername: process.env.ADMIN_USERNAME || 'admin',
    adminPassword: process.env.ADMIN_PASSWORD || 'SignatureCRM@2026!',
    sessionSecret: process.env.SESSION_SECRET || 'crm_secret_key_signature_detailing_2026_super_secure',
  },
  cron: {
    secret: process.env.CRON_SECRET || '',
  },
};
