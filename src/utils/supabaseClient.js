import { createClient } from '@supabase/supabase-js';

// Obtener variables de entorno
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

// Validar configuración
if (!supabaseUrl || !supabaseKey) {
    throw new Error('Variables de entorno de Supabase no configuradas');
}

// Crear cliente de Supabase con configuración optimizada
export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: false
    },
    storage: {
        maxRetryAttempts: 3,
        retryInterval: 1000
    }
});

// Función helper para subir PDFs
export async function uploadPDF(fileName, pdfBlob) {
    try {
        console.log('Iniciando subida a Supabase...', fileName);
        
        // Verificar si el archivo ya existe
        const { data: existingFile } = await supabase.storage
            .from('pdfs')
            .list('', {
                search: fileName
            });

        if (existingFile?.length > 0) {
            console.log('El archivo ya existe, actualizando...');
        }

        // Subir archivo
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

        // Obtener URL pública
        const { data: { publicUrl } } = supabase.storage
            .from('pdfs')
            .getPublicUrl(fileName);

        console.log('PDF subido exitosamente:', publicUrl);
        return publicUrl;

    } catch (error) {
        console.error('Error en uploadPDF:', error);
        throw error;
    }
}





