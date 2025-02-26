/**
 * Servicio para enviar correos electrónicos usando Resend
 */

export async function sendEmail(formData, pdfLink) {
    console.log('Iniciando envío de email...');
    
    try {
        // Verificar que tengamos los datos necesarios
        const guestName = formData.get('Guest Name') || 'Cliente';
        const guestEmail = formData.get('Email') || null;
        
        if (!guestEmail) {
            console.warn('No se proporcionó email del cliente, enviando solo a administrador');
        }
        
        // Preparar datos para la API
        const emailData = {
            from: 'Golf Cart Waiver <noreply@yourdomain.com>',
            to: ['admin@yourdomain.com'], // Email del administrador siempre
            subject: `Nuevo formulario de waiver - ${guestName}`,
            html: `
                <h1>Nuevo formulario de waiver</h1>
                <p>Se ha recibido un nuevo formulario de waiver con los siguientes datos:</p>
                <ul>
                    <li><strong>Nombre:</strong> ${formData.get('Guest Name') || 'No proporcionado'}</li>
                    <li><strong>Licencia:</strong> ${formData.get('License') || 'No proporcionada'}</li>
                    <li><strong>Estado emisor:</strong> ${formData.get('Issuing State') || 'No proporcionado'}</li>
                    <li><strong>Dirección:</strong> ${formData.get('Address') || 'No proporcionada'}</li>
                    <li><strong>Fecha de firma:</strong> ${formData.get('Signature Date') || 'No proporcionada'}</li>
                </ul>
                <p>Puede acceder al PDF del formulario <a href="${pdfLink}">aquí</a>.</p>
            `,
            attachments: []
        };
        
        // Si tenemos email del cliente, añadirlo como CC
        if (guestEmail) {
            emailData.cc = [guestEmail];
        }
        
        // Usar Netlify Function para enviar el email (para no exponer la API key en el frontend)
        const response = await fetch('/api/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(emailData),
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Error de Resend: ${errorData.message || 'Error desconocido'}`);
        }
        
        const result = await response.json();
        console.log('Email enviado exitosamente:', result);
        
        return { success: true, data: result };
    } catch (error) {
        console.error('Detailed error sending email:', error);
        return { success: false, error: error.message };
    }
}
