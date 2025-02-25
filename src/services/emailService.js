import { RESEND_API_KEY } from '@config/env';

export async function sendEmail(formData, pdfLink) {
    try {
        console.log('Iniciando envío de email...');

        const emailData = {
            from: 'Luxe Properties <onboarding@resend.dev>',
            to: 'conradovilla@hotmail.com',
            subject: 'Golf Cart Liability Waiver - Confirmation',
            html: `
                <h1>Golf Cart Liability Waiver</h1>
                <p>A new waiver form has been submitted.</p>
                <p>Guest Name: ${formData.get('Guest Name')}</p>
                <p>Form ID: ${formData.get('Form Id')}</p>
                <p>You can download the signed waiver here: <a href="${pdfLink}">Download PDF</a></p>
            `
        };

        const response = await fetch('/api/resend/v1/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(emailData)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
            throw new Error(`Error del servidor: ${errorData.message}`);
        }

        const result = await response.json();
        console.log('Email enviado exitosamente:', result);
        return { success: true, result };

    } catch (error) {
        console.error('Error detallado al enviar email:', error);
        return { success: false, error: error.message };
    }
}