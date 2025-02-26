import { RESEND_API_KEY } from '../config/env';

export async function sendEmail(formData, pdfLink) {
    try {
        console.log('Iniciando envío de email...');
        const response = await fetch('/api/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: 'Golf Cart Waiver <onboarding@resend.dev>',
                to: formData.get('Email') || 'conradovilla@hotmail.com',
                subject: 'Golf Cart Waiver Form Submission',
                html: `
                    <h1>Thank you for completing the waiver</h1>
                    <p>Hola ${formData.get('Guest Name')},</p>
                    <p>Your waiver has been processed successfully.</p>
                    <p>Details of the form:</p>
                    <ul>
                        <li>ID: ${formData.get('Form Id')}</li>
                        <li>DATE: ${formData.get('Signature Date')}</li>
                        <li>LICENSE: ${formData.get('License')}</li>
                        <li>STATE: ${formData.get('Issuing State')}</li>
                    </ul>
                    ${pdfLink ? `<p>You can download the pdf here: <a href="${pdfLink}">Descargar PDF</a></p>` : ''}
                `
            })
        });

        

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Error de Resend: ${errorData.message || response.statusText}`);
        }

        const data = await response.json();
        console.log('Email sent successfully:', data);
        return { success: true, data };
    } catch (error) {
        console.error('Detailed error sending email:', error);
        return { success: false, error: error.message };
    }
}