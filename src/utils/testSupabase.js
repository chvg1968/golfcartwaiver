import { supabase } from './supabaseClient';

// Simple function to test Supabase connection
export async function testSupabaseConnection() {
  console.log('Testing Supabase connection...');
  
  try {
    // Test storage
    console.log('Testing storage access...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('Storage test failed:', bucketsError);
      return { success: false, error: bucketsError };
    } else {
      console.log('Storage test successful. Buckets:', buckets);
      
      // Check if 'pdfs' bucket exists
      const pdfsBucket = buckets.find(bucket => bucket.name === 'pdfs');
      if (!pdfsBucket) {
        console.error('The "pdfs" bucket does not exist!');
        return { success: false, error: 'pdfs bucket not found' };
      }
      
      console.log('Found "pdfs" bucket:', pdfsBucket);
      return { success: true, buckets };
    }
  } catch (error) {
    console.error('Supabase test failed with exception:', error);
    return { success: false, error };
  }
}

// Run the test
testSupabaseConnection().then(result => {
  console.log('Supabase connection test result:', result);
});
