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

        const API_URL = window.location.hostname === 'localhost' 
            ? '/proxy/send-waiver-email'  // Para desarrollo local
  : 'https://golfcartwaiver-server.netlify.app/api/send-waiver-email'; 

        try {
            const response = await fetch(API_URL, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
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
