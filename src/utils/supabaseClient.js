import { createClient } from '@supabase/supabase-js';

// Obtener variables de entorno
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

// Validar configuración
if (!supabaseUrl || !supabaseKey) {
    console.error('Variables de entorno de Supabase no configuradas correctamente');
    console.log('URL:', supabaseUrl ? 'Configurada' : 'No configurada');
    console.log('KEY:', supabaseKey ? 'Configurada (longitud: ' + supabaseKey.length + ')' : 'No configurada');
}

// Crear cliente de Supabase con configuración optimizada
export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: true,  // Cambiado a true para mantener la sesión
        autoRefreshToken: true,
        detectSessionInUrl: false
    },
    global: {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`
        },
    },
    storage: {
        maxRetryAttempts: 3,
        retryInterval: 1000
    }
});

// Función helper para subir PDFs con mejor manejo de errores
export async function uploadPDF(fileName, pdfBlob) {
    try {
        console.log('Iniciando subida a Supabase...', fileName);
        console.log('Tamaño del archivo:', pdfBlob.size / 1024, 'KB');
        
        // Verificar que el cliente de Supabase esté disponible
        if (!supabase) {
            throw new Error('Cliente de Supabase no inicializado');
        }
        
        // Verificar que el bucket 'pdfs' exista
        const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
        
        if (bucketsError) {
            console.error('Error al listar buckets:', bucketsError);
            throw bucketsError;
        }
        
        const pdfsBucketExists = buckets.some(bucket => bucket.name === 'pdfs');
        
        if (!pdfsBucketExists) {
            console.log('El bucket "pdfs" no existe, intentando crearlo...');
            const { error: createError } = await supabase.storage.createBucket('pdfs', {
                public: true
            });
            
            if (createError) {
                console.error('Error al crear bucket:', createError);
                throw createError;
            }
            
            console.log('Bucket "pdfs" creado exitosamente');
        }

        // Subir archivo directamente sin verificar existencia previa
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
        const { data: urlData } = supabase.storage
            .from('pdfs')
            .getPublicUrl(fileName);

        const publicUrl = urlData.publicUrl;
        console.log('PDF subido exitosamente:', publicUrl);
        return publicUrl;

    } catch (error) {
        console.error('Error en uploadPDF:', error);
        throw error;
    }
}





