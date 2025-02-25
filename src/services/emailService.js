import { RESEND_API_KEY } from '@config/env';

export async function sendEmail(formData, pdfLink) {
    try {
        console.log('Iniciando envío de email...');

        const response = await fetch('http://localhost:3000/api/send-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                formData: {
                    guestName: formData.get('Guest Name'),
                    formId: formData.get('Form Id')
                },
                pdfLink
            })
        });

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Error desconocido');
        }

        console.log('Email enviado exitosamente:', result);
        return { success: true, result };

    } catch (error) {
        console.error('Error detallado al enviar email:', error);
        return { success: false, error: error.message };
    }
}