import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if environment variables are defined
if (!supabaseUrl) {
  throw new Error('supabaseUrl is required. Check your .env file and Netlify environment variables.');
}

if (!supabaseAnonKey) {
  throw new Error('supabaseAnonKey is required. Check your .env file and Netlify environment variables.');
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);