import { createClient } from '@supabase/supabase-js';
import { config, validateEnv } from './env.js';

validateEnv();

const supabaseUrl = config.supabase.url;
const supabaseKey = config.supabase.key;

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    '\x1b[33m%s\x1b[0m',
    '⚠️ Supabase client initialized without complete credentials. Database calls will fail until SUPABASE_URL and SUPABASE_KEY are provided.'
  );
}

export const isConfigured = Boolean(
  supabaseUrl &&
  supabaseKey &&
  !supabaseUrl.includes('placeholder')
);

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder-key',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);
