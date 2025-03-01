export async function sendEmail(formData, pdfLink) {
    try {
        // Convertir entrada a objeto plano
        const formDataObject = formData instanceof FormData 
            ? Object.fromEntries(formData.entries()) 
            : formData;

        // Log de todos los campos del formulario
        console.log('Todos los campos del formulario:', formDataObject);
        console.log('Enlace PDF:', pdfLink);

        // Preparar datos para enviar a la función serverless
        const emailPayload = {
            formData: formDataObject,
            pdfLink: pdfLink
        };

        console.log('Payload completo para envío:', JSON.stringify(emailPayload, null, 2));

        try {
            const response = await fetch('https://golfcartwaiver-server.onrender.com/api/send-waiver-email', {
              method: 'POST',
              credentials: 'include', // Important for CORS with credentials
              headers: {
                'Content-Type': 'application/json',
                // Add any other necessary headers
                'Accept': 'application/json'
              },
              body: JSON.stringify(emailPayload)
            });
            
            console.log('Respuesta del servidor - Status:', response.status);
            
            const result = await response.json();
            console.log('Respuesta completa del servidor:', result);

            if (!response.ok) {
                console.error('Error en la respuesta del servidor:', result);
                throw new Error(`Error al enviar email: ${response.status} - ${result.error}`);
            }

            return result;
        } catch (error) {
            console.error('Error al enviar el formulario:', error);
            throw error;
        }

    } catch (error) {
        console.error('Error enviando email:', error);
        throw error;
    }
}
