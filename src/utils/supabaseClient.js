import { createClient } from '@supabase/supabase-js';

// Create a single supabase client for interacting with your database
export const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_KEY,
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
        },
        global: {
            fetch: (...args) => fetch(...args),
            headers: { 'X-Client-Info': 'supabase-js/2.x' },
        },
        realtime: {
            timeout: 30000,
            retryInterval: 1000
        }
    }
);

// Función helper para subir PDFs con mejor manejo de errores
export async function uploadPDF(fileName, pdfBlob) {
    try {
        console.log('Iniciando subida a Supabase...', fileName);
        console.log('Tamaño del archivo:', pdfBlob.size / 1024, 'KB');
        
        // Verificar que el cliente de Supabase esté disponible
        if (!supabase) {
            throw new Error('Cliente de Supabase no inicializado');
        }
        
        // Subir archivo directamente sin verificar existencia previa de buckets
        console.log('Subiendo archivo a Supabase...');
        const { data, error } = await supabase.storage
            .from('pdfs')
            .upload(fileName, pdfBlob, {
                contentType: 'application/pdf',
                cacheControl: '3600',
                upsert: true
            });

        if (error) {
            console.error('Error de subida:', error);
            throw error;
        }

        console.log('Archivo subido exitosamente:', data);

        // Obtener URL pública
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





