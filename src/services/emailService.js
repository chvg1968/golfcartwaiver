/**
 * Servicio para enviar correos electrónicos usando Resend
 */

export async function sendEmail(formData, pdfLink) {
    console.log('Iniciando envío de email...');
    
    try {
        // Verificar si el pdfLink es un blob URL y manejarlo adecuadamente
        if (pdfLink && pdfLink.startsWith('blob:')) {
            console.log('Detectado blob URL, se enviará como referencia');
            // Opcionalmente, podrías convertir el blob a base64 y adjuntarlo
            // Por ahora, solo notificamos que es un enlace local
            pdfLink = 'PDF generado localmente (no disponible para visualización remota)';
        }
        
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
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(emailPayload)
        });
        
        const responseData = await response.json();
        
        if (!response.ok) {
            console.error('Error en respuesta del servidor:', responseData);
            return {
                success: false,
                error: responseData.error || 'Error desconocido del servidor'
            };
        }
        
        console.log('Email enviado exitosamente:', responseData);
        return {
            success: true,
            data: responseData.data
        };
        
    } catch (error) {
        console.error('Detailed error sending email:', error);
        return {
            success: false,
            error: `Error al enviar email: ${error.message || error}`
        };
    }
}
