import { createClient } from '@supabase/supabase-js';

// Usa las variables de entorno correctas
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

// Información de depuración
console.log('Configuración de Supabase:', { 
    urlExists: !!supabaseUrl, 
    keyExists: !!supabaseKey,
    url: supabaseUrl // Muestra la URL para verificar que sea correcta
});

if (!supabaseUrl || !supabaseKey) {
    console.error('Variables de entorno de Supabase no configuradas');
    throw new Error('Variables de entorno de Supabase no configuradas');
}

// Crea el cliente de Supabase
export const supabase = createClient(supabaseUrl, supabaseKey);

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
        
        // Usar la carpeta "public" dentro del bucket "pdfs"
        const filePath = `public/${fileName}`;
        console.log(`Intentando subir archivo a Supabase bucket "pdfs" en la ruta: ${filePath}`);
        
        // Subir el archivo con los headers correctos
        const { data, error } = await supabase.storage
            .from('pdfs')
            .upload(filePath, pdfBlob, {
                contentType: 'application/pdf',
                cacheControl: '3600',
                upsert: true
            });

        if (error) {
            console.error('Error de subida:', error);
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
        console.error('Error en uploadPDF:', error);
        throw error;
    }
}

// Función para probar el acceso al bucket
export async function testBucketAccess() {
    try {
        console.log('Probando acceso al bucket...');
        const { data, error } = await supabase.storage.listBuckets();
        
        if (error) {
            console.error('Error al listar buckets:', error);
            return false;
        }
        
        console.log('Buckets disponibles:', data);
        
        // Verificar si existe el bucket 'pdfs'
        const pdfsBucket = data.find(bucket => bucket.name === 'pdfs');
        if (!pdfsBucket) {
            console.error('El bucket "pdfs" no existe!');
            return false;
        }
        
        console.log('Bucket "pdfs" encontrado:', pdfsBucket);
        
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
        return false;
    }
}
