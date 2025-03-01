export async function sendEmail(formData, pdfLink) {
    try {
        // Convertir entrada a objeto plano
        const formDataObject = formData instanceof FormData 
            ? Object.fromEntries(formData.entries()) 
            : formData;

        // Validación de datos de entrada
        if (!formDataObject || !pdfLink) {
            console.error('Datos de entrada incompletos', {
                formData: formDataObject,
                pdfLink: pdfLink
            });
            throw new Error('Datos de entrada incompletos para envío de email');
        }

        // Log de todos los campos del formulario con más detalle
        console.log('Datos del formulario completos:', JSON.stringify(formDataObject, null, 2));
        console.log('Enlace PDF completo:', pdfLink);

        // Preparar datos para enviar a la función serverless
        const emailPayload = {
            formData: formDataObject,
            pdfLink: pdfLink
        };

        console.log('Payload completo para envío:', JSON.stringify(emailPayload, null, 2));

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos de timeout

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

            // Registro detallado de la respuesta
            console.log('Respuesta del servidor - Detalles completos:', {
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries(response.headers.entries())
            });
            
            let result;
            try {
                result = await response.json();
            } catch (parseError) {
                console.error('Error parseando respuesta JSON:', {
                    message: parseError.message,
                    responseText: await response.text()
                });
                throw parseError;
            }

            console.log('Respuesta completa del servidor:', result);

            if (!response.ok) {
                console.error('Error en la respuesta del servidor:', {
                    status: response.status,
                    result: result
                });
                throw new Error(`Error al enviar email: ${response.status} - ${JSON.stringify(result)}`);
            }

            return result;
        } catch (error) {
            console.error('Error detallado al enviar el formulario:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });

            // Manejar específicamente errores de red o timeout
            if (error.name === 'AbortError') {
                throw new Error('La solicitud de envío de email ha excedido el tiempo límite');
            }

            throw error;
        }

    } catch (error) {
        console.error('Error general enviando email:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        throw error;
    }
}
