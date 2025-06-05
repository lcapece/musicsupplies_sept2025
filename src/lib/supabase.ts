import { createClient } from '@supabase/supabase-js';

// Get environment variables with fallbacks to prevent white screen
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ekklokrukxmqlahtonnc.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNzMxOTQsImV4cCI6MjA1NTY0OTE5NH0.LFyaAQyBb2l6rxdUAXpDQVZnR4gHDNrVZH0YudbjP3k';

// Create and export the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Log connection status to help with debugging
console.log('Supabase client initialized with URL:', supabaseUrl ? 'Valid URL' : 'Missing URL');