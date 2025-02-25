import { createClient } from '@supabase/supabase-js';

// Add proper validation and fallbacks for Supabase URL and key
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY || '';

// Debug information
console.log('Supabase initialization:');
console.log('URL defined:', Boolean(supabaseUrl));
console.log('URL value:', supabaseUrl || 'empty');
console.log('Key defined:', Boolean(supabaseKey));

// Validate URL format
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (error) {
    console.error('URL validation error:', error.message, 'for URL:', string);
    return false;
  }
}

// Initialize Supabase client only if valid URL and key are available
let supabase = null;

if (isValidUrl(supabaseUrl) && supabaseKey) {
  try {
    supabase = createClient(
      supabaseUrl,
      supabaseKey,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false
        }
      }
    );
    console.log('Supabase client initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error);
  }
} else {
  console.error('Invalid Supabase configuration:', { 
    urlValid: isValidUrl(supabaseUrl), 
    keyValid: Boolean(supabaseKey),
    url: supabaseUrl || 'empty'
  });
}

export { supabase };
