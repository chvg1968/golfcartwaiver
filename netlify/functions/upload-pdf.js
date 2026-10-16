const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    // Headers CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Manejar preflight CORS
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers, body: '' };
    }

    // Solo procesar solicitudes POST
    if (event.httpMethod !== 'POST') {
        return { 
            statusCode: 405, 
            headers,
            body: JSON.stringify({ message: 'Method Not Allowed' }) 
        };
    }

    // Obtener variables de entorno del servidor (NO expuestas al cliente)
    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

    // Validar configuración
    if (!SUPABASE_URL) {
        console.error('SUPABASE_URL no configurado');
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: 'SUPABASE_URL no configurado en el servidor' })
        };
    }

    if (!SUPABASE_SERVICE_ROLE_KEY) {
        console.error('SUPABASE_SERVICE_ROLE_KEY no configurado');
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                message: 'SUPABASE_SERVICE_ROLE_KEY no configurado en el servidor',
                hint: 'Agrega SUPABASE_SERVICE_ROLE_KEY en Netlify > Site settings > Environment variables'
            })
        };
    }

    // Crear cliente Supabase con service_role key (bypass RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });

    try {
        // Parsear el cuerpo de la solicitud
        let payload;
        try {
            payload = JSON.parse(event.body);
        } catch (error) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'Invalid JSON payload', error: error.message })
            };
        }

        const { fileName, pdfBase64, contentType = 'application/pdf' } = payload;

        // Validar campos requeridos
        if (!fileName || !pdfBase64) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    message: 'Campos requeridos: fileName, pdfBase64' 
                })
            };
        }

        // Validar formato del nombre de archivo (seguridad)
        const fileNameRegex = /^[A-Za-z0-9_-]+_\d{4}-\d{2}-\d{2}\.pdf$/;
        if (!fileNameRegex.test(fileName)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    message: 'Nombre de archivo inválido. Formato esperado: NombreApellido_YYYY-MM-DD.pdf',
                    received: fileName
                })
            };
        }

        // Convertir base64 a Buffer
        const pdfBuffer = Buffer.from(pdfBase64, 'base64');

        // Validar tamaño (máximo 5MB)
        const maxSize = 5 * 1024 * 1024;
        if (pdfBuffer.length > maxSize) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    message: `El archivo excede el tamaño máximo de 5MB. Tamaño: ${(pdfBuffer.length / 1024 / 1024).toFixed(2)}MB`
                })
            };
        }

        // Ruta del archivo en el bucket
        const filePath = `public/${fileName}`;

        console.log(`Subiendo PDF: ${filePath} (${pdfBuffer.length} bytes)`);

        // Subir a Supabase Storage
        const { data, error } = await supabase.storage
            .from('pdfs')
            .upload(filePath, pdfBuffer, {
                contentType: contentType,
                cacheControl: '3600',
                upsert: true
            });

        if (error) {
            console.error('Error al subir PDF a Supabase:', error);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                    message: 'Error al subir PDF a Supabase',
                    error: error.message
                })
            };
        }

        // Obtener URL pública
        const { data: publicUrlData } = supabase.storage
            .from('pdfs')
            .getPublicUrl(filePath);

        console.log('PDF subido exitosamente:', publicUrlData.publicUrl);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                message: 'PDF subido exitosamente',
                publicUrl: publicUrlData.publicUrl,
                filePath: filePath
            })
        };

    } catch (error) {
        console.error('Error en upload-pdf:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                message: 'Error interno del servidor',
                error: error.message
            })
        };
    }
};
