import { createClient } from '@supabase/supabase-js';

// Usa las variables de entorno correctas
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
// Usar exclusivamente la anon key
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Variables de entorno de Supabase no configuradas');
    throw new Error('Variables de entorno de Supabase no configuradas');
}

// Crea el cliente de Supabase con opciones simplificadas
export const supabase = createClient(supabaseUrl, supabaseKey);

// Verificar conexión al inicializar
(async function verificarConexion() {
    try {
        // Primero verificar si podemos listar buckets (operación básica de storage)
        const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
        
        if (bucketsError) {
            console.error('Error al listar buckets:', bucketsError);
            console.warn('Posible problema con la API key o permisos');
        }
        
        // Verificar sesión de autenticación
        const { data, error } = await supabase.auth.getSession();
        if (error) {
            console.error('Error de sesión Supabase:', error.message);
        }
    } catch (err) {
        console.error('Error al verificar conexión Supabase:', err);
    }
})();

// Función para guardar waiver en la tabla waivers de Supabase
export async function saveWaiverToSupabase({
    form_id,
    signature_date,
    guest_name,
    license,
    issuing_state,
    address,
    pdf_link
}) {
    try {
        const { data, error } = await supabase
            .from('waivers')
            .insert([
                {
                    form_id,
                    signature_date,
                    guest_name,
                    license,
                    issuing_state,
                    address,
                    pdf_link
                }
            ]);
        if (error) {
            console.error('Error al guardar waiver en Supabase:', error);
            alert('[Supabase] Error al guardar el waiver: ' + (error.message || JSON.stringify(error)));
            throw error;
        }
        if (!data) {
            console.warn('[Supabase] La respuesta no contiene datos:', data);
        } else {
            console.log('[Supabase] Registro insertado correctamente:', data);
        }
        return data;
    } catch (err) {
        console.error('Excepción al guardar waiver en Supabase:', err);
        throw err;
    }
}

// Función helper para subir PDFs con mejor manejo de errores y reintentos
export async function uploadPDF(fileName, pdfBlob, maxRetries = 3) {
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
        try {
            // Verificar que el blob sea válido
            if (!pdfBlob || !(pdfBlob instanceof Blob)) {
                throw new Error('El archivo PDF no es válido');
            }
            
            // Verificar tamaño del archivo (límite de 5MB para ejemplo)
            if (pdfBlob.size > 5 * 1024 * 1024) {
                throw new Error('El archivo PDF excede el tamaño máximo permitido (5MB)');
            }
            
            // Usar la carpeta "public" dentro del bucket "pdfs"
            const filePath = `public/${fileName}`;
            
            // Intentar verificar si el bucket existe y sus políticas antes de subir
            await testBucketAccess();
            
            // Subir el archivo
            const { data, error } = await supabase.storage
                .from('pdfs')
                .upload(filePath, pdfBlob, {
                    contentType: 'application/pdf',
                    cacheControl: '3600',
                    upsert: true
                });

            if (error) {
                console.error('Error de subida:', error);
                
                // Si es un error de RLS, mostrar información más detallada
                if (error.message.includes('row-level security policy')) {
                    console.error('Error de políticas de seguridad (RLS). Necesitas configurar las políticas del bucket "pdfs" en Supabase.');
                    console.error('Instrucciones para configurar RLS en el README.md');
                }
                
                throw new Error(`Error al subir el archivo: ${error.message}`);
            }

            // Obtener la URL pública
            const { data: publicUrlData } = supabase.storage
                .from('pdfs')
                .getPublicUrl(filePath);
                
            return publicUrlData.publicUrl;

        } catch (error) {
            console.error(`Error en uploadPDF (intento ${retryCount + 1}/${maxRetries}):`, error);
            retryCount++;
            
            if (retryCount >= maxRetries) {
                console.error('Se agotaron los reintentos para subir el PDF');
                throw error;
            }
            
            // Esperar antes de reintentar (backoff exponencial)
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
    }
}

// Función para probar el acceso al bucket
export async function testBucketAccess() {
    try {
        let { data, error } = await supabase.storage.from("pdfs").list();
        
        if (error) {
            console.error('Error al listar buckets:', error);
            console.error('Detalles del error:', {
                message: error.message,
                statusCode: error.statusCode,
                details: error.details
            });
            return false;
        }
         
        // Listar archivos en la carpeta public
        const { data: files, error: filesError } = await supabase.storage
            .from('pdfs')
            .list('public');
            
        if (filesError) {
            console.error('Error al listar archivos en la carpeta public:', filesError);
        }
        
        return true;
    } catch (error) {
        console.error('Excepción al probar acceso al bucket:', error);
        console.error('Detalles de la excepción:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        return false;
    }
}
