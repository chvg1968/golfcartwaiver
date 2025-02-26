import { createClient } from '@supabase/supabase-js';

// Create a single supabase client for interacting with your database
export const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            storageKey: 'supabase-auth',
        },
        global: {
            fetch: (...args) => fetch(...args),
        },
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
        
        // Verificar si el usuario está autenticado
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
            console.log('Usuario no autenticado, continuando sin autenticación...');
            // No intentamos autenticación anónima ya que está deshabilitada
        } else {
            console.log('Usuario autenticado:', session.user.email);
        }
        
        // Subir archivo
        console.log('Subiendo archivo a Supabase...');
        const { data, error } = await supabase.storage
            .from('pdfs')
            .upload(`public/${fileName}`, pdfBlob, {
                contentType: 'application/pdf',
                cacheControl: '3600',
                upsert: true
            });

        if (error) {
            console.error('Error de subida:', error);
            
            // Si el error es de permisos, intentamos una solución alternativa
            if (error.statusCode === '403' || error.message.includes('security policy')) {
                console.log('Error de permisos en Supabase, generando URL local...');
                return URL.createObjectURL(pdfBlob);
            }
            
            throw error;
        }

        console.log('Archivo subido exitosamente:', data);

        // Obtener URL pública
        const { data: publicUrlData } = supabase.storage
            .from('pdfs')
            .getPublicUrl(`public/${fileName}`);
            
        console.log('URL pública generada:', publicUrlData);
        return publicUrlData.publicUrl;

    } catch (error) {
        console.error('Error en uploadPDF:', error);
        
        // Fallback a URL local en caso de cualquier error
        console.log('Generando URL local como fallback...');
        return URL.createObjectURL(pdfBlob);
    }
}
