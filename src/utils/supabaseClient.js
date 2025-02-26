import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Variables de entorno de Supabase no configuradas');
}

// Corregir la configuración del cliente Supabase
export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: false
    }
    // Eliminar la configuración global de headers que está causando problemas
});

// Función helper para subir PDFs con mejor manejo de errores
export async function uploadPDF(fileName, pdfBlob) {
    try {
        console.log('Subiendo archivo a Supabase...', fileName);
        
        // Verificar que el blob sea válido
        if (!pdfBlob || !(pdfBlob instanceof Blob)) {
            throw new Error('El archivo PDF no es válido');
        }
        
        // Verificar tamaño del archivo (límite de 5MB para ejemplo)
        if (pdfBlob.size > 5 * 1024 * 1024) {
            throw new Error('El archivo PDF excede el tamaño máximo permitido (5MB)');
        }
        
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
