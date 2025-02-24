export async function sendEmail(formData, pdfLink) {
    try {
        console.log('Iniciando envío de correo con Resend...');
        console.log('API Key presente:', !!import.meta.env.VITE_RESEND_API_KEY);

        const emailData = {
            from: 'onboarding@resend.dev',
            to: 'conradovilla@hotmail.com',
            subject: 'Nuevo formulario de waiver recibido',
            html: `
                <html>
                    <body style="font-family: Arial, sans-serif; padding: 20px;">
                        <h1 style="color: #333;">Nuevo formulario de waiver recibido</h1>
                        <p>Se ha recibido un nuevo formulario con los siguientes datos:</p>
                        <ul>
                            <li><strong>ID:</strong> ${formData.get('Form Id')}</li>
                            <li><strong>Nombre:</strong> ${formData.get('Guest Name')}</li>
                            <li><strong>Fecha:</strong> ${new Date().toLocaleDateString()}</li>
                            <li><strong>Licencia:</strong> ${formData.get('License')}</li>
                            <li><strong>Estado:</strong> ${formData.get('Issuing State')}</li>
                        </ul>
                        <p><a href="${pdfLink}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Ver PDF</a></p>
                    </body>
                </html>
            `
        };

        console.log('Datos del correo:', JSON.stringify(emailData, null, 2));

        const response = await fetch('https://api.resend.com/v1/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${import.meta.env.VITE_RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(emailData)
        });

        const responseData = await response.json();
        
        if (!response.ok) {
            console.error('Respuesta de error de Resend:', responseData);
            throw new Error(`Error Resend: ${responseData.error?.message || response.statusText}`);
        }

        console.log('Email enviado exitosamente:', responseData);
        return responseData;

    } catch (error) {
        console.error('Error detallado al enviar email:', error);
        throw error;
    }
}