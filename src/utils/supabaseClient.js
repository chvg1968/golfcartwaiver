import { createClient } from '@supabase/supabase-js';

// Create a single supabase client for interacting with your database
export const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY, // Make sure this is the anon/public key, not the service_role key
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            storageKey: 'supabase-auth', // Explicitly set storage key
        },
        global: {
            fetch: (...args) => fetch(...args),
        },
    }
);

// Función helper para subir PDFs con mejor manejo de errores y autenticación
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
            console.log('Usuario no autenticado, intentando subir como anónimo...');
            
            // Para subidas anónimas, podemos intentar autenticar con un usuario anónimo
            // Solo si está habilitado en tu proyecto de Supabase
            try {
                const { error: signInError } = await supabase.auth.signInAnonymously();
                if (signInError) {
                    console.error('Error al autenticar anónimamente:', signInError);
                } else {
                    console.log('Autenticación anónima exitosa');
                }
            } catch (authError) {
                console.error('Error en autenticación anónima:', authError);
            }
        } else {
            console.log('Usuario autenticado:', session.user.email);
        }
        
        // Subir archivo
        console.log('Subiendo archivo a Supabase...');
        const { data, error } = await supabase.storage
            .from('pdfs')
            .upload(`public/${fileName}`, pdfBlob, {  // Añadido prefijo 'public/'
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
            .getPublicUrl(`public/${fileName}`);  // Usar el mismo path con prefijo
            
        console.log('URL pública generada:', publicUrlData);
        return publicUrlData.publicUrl;

    } catch (error) {
        console.error('Error en uploadPDF:', error);
        return null;
    }
}





