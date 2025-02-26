import { supabase } from './supabaseClient';

// Función para probar la conexión a Supabase
export async function testSupabaseConnection() {
  console.log('Probando conexión a Supabase...');
  console.log('URL:', import.meta.env.VITE_SUPABASE_URL);
  console.log('Key exists:', !!import.meta.env.VITE_SUPABASE_KEY);
  
  try {
    // Probar acceso al storage
    console.log('Probando acceso al storage...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('Prueba de storage fallida:', bucketsError);
      return { success: false, error: bucketsError };
    } else {
      console.log('Prueba de storage exitosa. Buckets:', buckets);
      
      // Verificar si existe el bucket 'pdfs'
      const pdfsBucket = buckets.find(bucket => bucket.name === 'pdfs');
      if (!pdfsBucket) {
        console.error('El bucket "pdfs" no existe!');
        return { success: false, error: 'bucket pdfs no encontrado' };
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
      
      // Probar subir un archivo pequeño de prueba
      const testBlob = new Blob(['Test file content'], { type: 'text/plain' });
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('pdfs')
        .upload('public/test-file.txt', testBlob, {
          contentType: 'text/plain',
          upsert: true
        });
        
      if (uploadError) {
        console.error('Error al subir archivo de prueba:', uploadError);
        return { success: false, error: uploadError };
      }
      
      console.log('Archivo de prueba subido exitosamente:', uploadData);
      return { success: true, buckets, files };
    }
  } catch (error) {
    console.error('Prueba de Supabase fallida con excepción:', error);
    return { success: false, error };
  }
}

// Ejecutar la prueba
testSupabaseConnection().then(result => {
  console.log('Resultado de prueba de conexión a Supabase:', result);
});
