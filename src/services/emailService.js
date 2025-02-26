/**
 * Servicio para enviar correos electrónicos usando Resend
 */

export async function sendEmail(formData, pdfLink) {
    console.log('Iniciando envío de email...');
    
    try {
        // Preparar datos para enviar a la función serverless
        const emailPayload = {
            formData: {
                guestName: formData.get('Guest Name') || 'No proporcionado',
                license: formData.get('License') || 'No proporcionado',
                issuingState: formData.get('Issuing State') || 'No proporcionado',
                address: formData.get('Address') || 'No proporcionado',
                formId: formData.get('Form Id') || Date.now().toString()
            },
            pdfLink: pdfLink
        };
        
        console.log('Enviando datos al servidor:', emailPayload);
        
        // Usar la función serverless para enviar el email
        const response = await fetch('/.netlify/functions/send-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(emailPayload),
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            console.error('Error en respuesta del servidor:', result);
            throw new Error(`Error al enviar email: ${result.error || 'Error desconocido'}`);
        }
        
        console.log('Email enviado exitosamente:', result);
        
        return { success: true, data: result };
    } catch (error) {
        console.error('Detailed error sending email:', error);
        return { success: false, error: error.message };
    }
}
