import { supabase } from './supabaseClient';

// Simple function to test Supabase connection
export async function testSupabaseConnection() {
  console.log('Testing Supabase connection...');
  
  try {
    // Test auth
    console.log('Testing auth...');
    const { data: authData, error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      console.error('Auth test failed:', authError);
    } else {
      console.log('Auth test successful:', authData ? 'Session exists' : 'No active session');
    }
    
    // Test storage
    console.log('Testing storage...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('Storage test failed:', bucketsError);
    } else {
      console.log('Storage test successful. Buckets:', buckets);
    }
    
    return { success: !authError && !bucketsError };
  } catch (error) {
    console.error('Supabase test failed with exception:', error);
    return { success: false, error };
  }
}