import { createClient } from '@supabase/supabase-js';

// SECURITY: Get environment variables - NO FALLBACKS for security
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate required environment variables
if (!supabaseUrl) {
  throw new Error('VITE_SUPABASE_URL environment variable is required');
}

if (!supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_ANON_KEY environment variable is required');
}

// Validate URL format
try {
  new URL(supabaseUrl);
} catch (error) {
  throw new Error('VITE_SUPABASE_URL must be a valid URL');
}

// Create and export the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
});

// Only log in development
if (import.meta.env.DEV) {
  console.log('Supabase client initialized successfully');
}
