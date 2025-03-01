export async function sendEmail(formData, pdfLink) {
    try {
        // Convertir entrada a objeto plano
        const formDataObject = formData instanceof FormData 
            ? Object.fromEntries(formData.entries()) 
            : formData;

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
            const response = await fetch('https://golfcartwaiver-server.onrender.com/api/send-waiver-email', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(emailPayload)
            });
            
            console.log('Respuesta del servidor - Status completo:', {
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries(response.headers.entries())
            });
            
            const result = await response.json();
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
                message: error.message,
                stack: error.stack
            });
            throw error;
        }

    } catch (error) {
        console.error('Error general enviando email:', {
            message: error.message,
            stack: error.stack
        });
        throw error;
    }
}
