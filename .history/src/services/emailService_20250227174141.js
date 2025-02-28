export async function sendEmail(formData, pdfLink) {
    try {
        // Convertir FormData a un objeto plano para asegurar todos los campos
        const formDataObject = Object.fromEntries(formData.entries());

        // Preparar datos para enviar a la función serverless
        const emailPayload = {
            formData: {
                guestName: formDataObject['Guest Name'] || 'No proporcionado',
                license: formDataObject['License'] || 'No proporcionado',
                issuingState: formDataObject['Issuing State'] || 'No proporcionado',
                address: formDataObject['Address'] || 'No proporcionado',
                formId: formDataObject['Form Id'] || Date.now().toString()
            },
            pdfLink: pdfLink
        };

        try {
            const response = await fetch('/.netlify/functions/send-email', {
              method: 'POST',
              body: JSON.stringify({ formData, pdfLink })
            });
            const result = await response.json();
            console.log('Respuesta completa del servidor:', result);
          } catch (error) {
            console.error('Error al enviar el formulario:', error);
          }
          
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Error al enviar email: ${response.status} - ${errorData.error}`);
        }

        const data = await response.json();
        return { success: true, data };

    } catch (error) {
        console.error('Error enviando email:', error);
        throw error;
    }
}
