export async function sendEmail(formData, pdfLink) {
    // Función de registro de errores centralizada
    const logError = (context, error) => {
        console.error(`[Email Service - ${context}]`, {
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : 'No stack trace',
            formData: formData ? Object.keys(formData) : 'No form data',
            pdfLink: pdfLink || 'No PDF link'
        });
    };

    try {
        // Validación inicial de datos
        if (!formData || Object.keys(formData).length === 0) {
            logError('Input Validation', 'Datos del formulario vacíos');
            return { 
                success: false, 
                error: 'Datos del formulario incompletos' 
            };
        }

        if (!pdfLink) {
            logError('Input Validation', 'Enlace de PDF no proporcionado');
            return { 
                success: false, 
                error: 'Enlace de PDF no encontrado' 
            };
        }

        // Convertir entrada a objeto plano
        const formDataObject = formData instanceof FormData 
            ? Object.fromEntries(formData.entries()) 
            : formData;

        // Preparar payload
        const emailPayload = {
            formData: formDataObject,
            pdfLink: pdfLink
        };

        console.log('Payload para envío de email:', JSON.stringify(emailPayload, null, 2));

        try {
            // Configuración de timeout y control de señal
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 segundos

            const response = await fetch('https://golfcartwaiver-server.onrender.com/api/send-waiver-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(emailPayload),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            // Manejar respuestas no exitosas sin lanzar una excepción
            if (!response.ok) {
                const errorText = await response.text();
                logError('Server Response', `Status ${response.status}: ${errorText}`);
                
                return {
                    success: false,
                    error: `Error en el servidor: ${response.status}`,
                    details: errorText
                };
            }

            // Parsear respuesta JSON
            const result = await response.json();
            console.log('Respuesta de envío de email:', result);

            return {
                success: true,
                message: 'Email enviado exitosamente',
                data: result
            };

        } catch (fetchError) {
            // Manejo específico de errores de red
            logError('Network Error', fetchError);

            // Clasificar tipos de errores
            if (fetchError.name === 'AbortError') {
                return {
                    success: false,
                    error: 'Tiempo de espera agotado',
                    details: 'La solicitud de email excedió el tiempo límite'
                };
            }

            return {
                success: false,
                error: 'Error de red',
                details: fetchError.message
            };
        }

    } catch (generalError) {
        // Capturar cualquier error no manejado
        logError('Unhandled Error', generalError);

        return {
            success: false,
            error: 'Error inesperado',
            details: generalError.message
        };
    }
}
