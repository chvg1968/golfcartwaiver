import { createClient } from '@supabase/supabase-js';

// Use the correct environment variable names that match your .env file
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseEmail = import.meta.env.VITE_SUPABASE_EMAIL;
const supabasePassword = import.meta.env.VITE_SUPABASE_PASSWORD;

console.log('Supabase configuration:', { 
    urlExists: !!supabaseUrl, 
    keyExists: !!supabaseKey,
    emailExists: !!supabaseEmail,
    passwordExists: !!supabasePassword
});

if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase environment variables not set:', { 
        url: !!supabaseUrl, 
        key: !!supabaseKey 
    });
    throw new Error('Variables de entorno de Supabase no configuradas');
}

// Create the Supabase client with minimal configuration
export const supabase = createClient(supabaseUrl, supabaseKey);

// Test the connection
supabase.auth.getSession().then(({ data, error }) => {
    if (error) {
        console.error('Supabase connection test failed:', error);
    } else {
        console.log('Supabase connection successful:', data ? 'Session exists' : 'No active session');
    }
});

// Authenticate with Supabase if credentials are available
let authInitialized = false;
async function initializeAuth() {
    if (authInitialized) return;
    
    if (supabaseEmail && supabasePassword) {
        try {
            console.log('Attempting to authenticate with Supabase...');
            const { data, error } = await supabase.auth.signInWithPassword({
                email: supabaseEmail,
                password: supabasePassword,
            });
            
            if (error) {
                console.error('Error authenticating with Supabase:', error);
            } else {
                console.log('Successfully authenticated with Supabase:', data);
                authInitialized = true;
            }
        } catch (err) {
            console.error('Exception during Supabase authentication:', err);
        }
    } else {
        console.log('No Supabase credentials available for authentication');
    }
}

// Función helper para subir PDFs con mejor manejo de errores
export async function uploadPDF(fileName, pdfBlob) {
    try {
        console.log('Subiendo archivo a Supabase...', fileName);
        
        // Ensure we're authenticated before uploading
        await initializeAuth();
        
        // Verificar que el blob sea válido
        if (!pdfBlob || !(pdfBlob instanceof Blob)) {
            throw new Error('El archivo PDF no es válido');
        }
        
        // Verificar tamaño del archivo (límite de 5MB para ejemplo)
        if (pdfBlob.size > 5 * 1024 * 1024) {
            throw new Error('El archivo PDF excede el tamaño máximo permitido (5MB)');
        }
        
        console.log('Attempting to upload file to Supabase bucket "pdfs"...');
        
        // Subir el archivo con los headers correctos
        const { data, error } = await supabase.storage
            .from('pdfs')
            .upload(fileName, pdfBlob, {
                contentType: 'application/pdf',
                cacheControl: '3600',
                upsert: true
            });

        if (error) {
            console.error('Error de subida:', error);
            throw new Error(`Error al subir el archivo: ${error.message}`);
        }

        console.log('File uploaded successfully:', data);

        // Obtener la URL pública
        const { data: publicUrlData } = supabase.storage
            .from('pdfs')
            .getPublicUrl(fileName);
            
        console.log('URL pública generada:', publicUrlData);
        return publicUrlData.publicUrl;

    } catch (error) {
        console.error('Error en uploadPDF:', error);
        throw error;
    }
}

// Add a test function to check bucket access
export async function testBucketAccess() {
    try {
        console.log('Testing bucket access...');
        const { data, error } = await supabase.storage.listBuckets();
        
        if (error) {
            console.error('Error listing buckets:', error);
            return false;
        }
        
        console.log('Available buckets:', data);
        
        // Check if 'pdfs' bucket exists
        const pdfsBucket = data.find(bucket => bucket.name === 'pdfs');
        if (!pdfsBucket) {
            console.error('The "pdfs" bucket does not exist!');
            return false;
        }
        
        console.log('Found "pdfs" bucket:', pdfsBucket);
        return true;
    } catch (error) {
        console.error('Exception testing bucket access:', error);
        return false;
    }
}
