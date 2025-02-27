import { createClient } from '@supabase/supabase-js';

// Usa las variables de entorno correctas
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
// Usar exclusivamente la anon key
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Información de depuración detallada (sin mostrar la clave completa por seguridad)
console.log('Configuración de Supabase:', { 
    urlExists: !!supabaseUrl, 
    keyExists: !!supabaseKey,
    url: supabaseUrl,
    keyLength: supabaseKey ? supabaseKey.length : 0,
    keyFirstChars: supabaseKey ? `${supabaseKey.substring(0, 5)}...` : null
});

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
        } else {
            console.log('Conexión a Supabase Storage exitosa. Buckets:', buckets);
        }
        
        // Verificar sesión de autenticación
        const { data, error } = await supabase.auth.getSession();
        console.log('Estado de sesión Supabase:', { 
            tieneSession: !!data.session,
            error: error ? error.message : null
        });
    } catch (err) {
        console.error('Error al verificar conexión Supabase:', err);
    }
})();

// Función helper para subir PDFs con mejor manejo de errores y reintentos
export async function uploadPDF(fileName, pdfBlob, maxRetries = 3) {
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
        try {
            console.log(`Intento ${retryCount + 1}/${maxRetries} - Subiendo archivo a Supabase...`, fileName);
            
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
            console.log(`Intentando subir archivo a Supabase bucket "pdfs" en la ruta: ${filePath}`);
            
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

            console.log('Archivo subido exitosamente:', data);

            // Obtener la URL pública
            const { data: publicUrlData } = supabase.storage
                .from('pdfs')
                .getPublicUrl(filePath);
                
            console.log('URL pública generada:', publicUrlData);
            
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
        console.log('Probando acceso al bucket...');
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
        
        console.log('Buckets disponibles:', data);
        

        if (!Array.isArray(data)) {
            console.error('Error: La respuesta de Supabase no es un array.');
            return false;
        }
        // Verificar si existe el bucket 'pdfs'
        const pdfsBucket = data.find(bucket => bucket.name === 'pdfs');
        if (!pdfsBucket) {
            console.error('El bucket "pdfs" no existe! Necesitas crear este bucket en el panel de Supabase.');
            return false;
        }
        
        console.log('Bucket "pdfs" encontrado:', pdfsBucket);
        console.log('Bucket es público:', pdfsBucket.public);
        
        // Listar archivos en la carpeta public
        const { data: files, error: filesError } = await supabase.storage
            .from('pdfs')
            .list('public');
            
        if (filesError) {
            console.error('Error al listar archivos en la carpeta public:', filesError);
        } else {
            console.log('Archivos en la carpeta public:', files);
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
