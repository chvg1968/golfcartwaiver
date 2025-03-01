import { Resend } from 'resend';

// Configuración de Resend para Netlify con manejo de errores
let resend = null;
const TEST_EMAIL = import.meta.env.VITE_TEST_EMAIL;

try {
    const resendApiKey = import.meta.env.RESEND_API_KEY || import.meta.env.VITE_RESEND_API_KEY;
    
    if (!resendApiKey) {
        console.warn('Resend API Key no configurada. Los emails no se podrán enviar.');
    } else {
        resend = new Resend(resendApiKey);
    }
} catch (error) {
    console.error('Error al inicializar Resend:', error);
}

export function generateEmailHTML(formData, pdfLink) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
        h1 { color: #333; }
        .waiver-details { background-color: #f4f4f4; padding: 15px; border-radius: 5px; }
        .waiver-details p { margin: 10px 0; }
        footer { margin-top: 20px; font-size: 0.8em; color: #666; }
    </style>
</head>
<body>
    <h1>Golf Cart Liability Waiver</h1>
    
    <div class="waiver-details">
        <h2>Waiver Details</h2>
        <p><strong>Guest Name:</strong> ${formData.guestName}</p>
        <p><strong>License:</strong> ${formData.license}</p>
        <p><strong>Issuing State:</strong> ${formData.issuingState}</p>
        <p><strong>Address:</strong> ${formData.address}</p>
        <p><strong>Signature Date:</strong> ${formData.signatureDate}</p>
        <p><strong>Form ID:</strong> ${formData.formId}</p>
        <p><strong>Waiver PDF:</strong> <a href="${pdfLink}">Download Signed Waiver</a></p>
    </div>

    <footer>
        <p>Sent: ${new Date().toLocaleString('en-US', { 
            timeZone: 'America/New_York',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        })}</p>
    </footer>
</body>
</html>
  `;
}

export function generateEmailText(formData, pdfLink) {
  return `Golf Cart Liability Waiver

Waiver Details:
- Guest Name: ${formData.guestName}
- License: ${formData.license}
- Issuing State: ${formData.issuingState}
- Address: ${formData.address}
- Signature Date: ${formData.signatureDate}
- Form ID: ${formData.formId}
- Waiver PDF: ${pdfLink}

Sent: ${new Date().toLocaleString('en-US', { 
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
})}`;
}

export async function sendEmail(formData, pdfLink) {
    // Función de registro de errores centralizada
    const logError = (context, error) => {
        console.error(`[Email Service - ${context}]`, {
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : 'No stack trace',
            formData: formData ? Object.keys(formData) : 'No form data',
            pdfLink: pdfLink || 'No PDF link'
        });
    };

    // Función para guardar payload en localStorage
    const savePayloadToLocalStorage = (payload) => {
        try {
            const pendingEmails = JSON.parse(localStorage.getItem('pendingEmails') || '[]');
            pendingEmails.push({
                ...payload,
                timestamp: new Date().toISOString()
            });
            localStorage.setItem('pendingEmails', JSON.stringify(pendingEmails));
        } catch (error) {
            logError('Local Storage Error', error);
        }
    };

    // Función para reintentar envíos pendientes
    const retryPendingEmails = async () => {
        try {
            const pendingEmails = JSON.parse(localStorage.getItem('pendingEmails') || '[]');
            const successfullyProcessed = [];

            for (const emailPayload of pendingEmails) {
                try {
                    const result = await sendEmailWithResend(emailPayload);
                    if (result.success) {
                        successfullyProcessed.push(emailPayload);
                    }
                } catch (error) {
                    logError('Retry Email Error', error);
                }
            }

            // Eliminar emails enviados exitosamente
            const remainingEmails = pendingEmails.filter(
                email => !successfullyProcessed.includes(email)
            );
            localStorage.setItem('pendingEmails', JSON.stringify(remainingEmails));
        } catch (error) {
            logError('Retry Process Error', error);
        }
    };

    // Función para enviar email con Resend
    const sendEmailWithResend = async (emailPayload) => {
        // Verificar si Resend está inicializado
        if (!resend) {
            console.warn('Resend no está inicializado. No se puede enviar email.');
            return {
                success: false,
                error: 'Resend API Key no configurada'
            };
        }

        // Validar que TEST_EMAIL esté configurado
        if (!TEST_EMAIL) {
            console.warn('TEST_EMAIL no está configurado. No se puede enviar email.');
            return {
                success: false,
                error: 'TEST_EMAIL no configurado'
            };
        }

        try {
            const { formData, pdfLink } = emailPayload;
            
            const result = await resend.emails.send({
                from: `Golf Cart Waiver from ${formData.guestName} <onboarding@resend.dev>`,
                to: TEST_EMAIL,
                subject: 'Golf Cart Liability Waiver',
                html: generateEmailHTML(formData, pdfLink),
                text: generateEmailText(formData, pdfLink)
            });

            if (result.error) {
                logError('Resend Email Error', result.error);
                return {
                    success: false,
                    error: result.error
                };
            }

            return {
                success: true,
                message: 'Email enviado exitosamente',
                data: result
            };
        } catch (error) {
            logError('Resend Send Error', error);
            return {
                success: false,
                error: error.message
            };
        }
    };

    try {
        // Validación inicial de datos
        if (!formData || Object.keys(formData).length === 0) {
            logError('Input Validation', 'Datos del formulario vacíos');
            return {
                success: false,
                error: 'Datos del formulario incompletos'
            };
        }

        if (!pdfLink) {
            logError('Input Validation', 'Enlace de PDF no proporcionado');
            return {
                success: false,
                error: 'Enlace de PDF no encontrado'
            };
        }

        // Convertir entrada a objeto plano
        const formDataObject = formData instanceof FormData
            ? Object.fromEntries(formData.entries())
            : formData;

        // Preparar payload
        const emailPayload = {
            formData: formDataObject,
            pdfLink: pdfLink
        };

        console.log('Payload para envío de email:', JSON.stringify(emailPayload, null, 2));

        // Intentar enviar email
        const sendResult = await sendEmailWithResend(emailPayload);

        // Si falla, guardar en localStorage para reintento
        if (!sendResult.success) {
            savePayloadToLocalStorage(emailPayload);
            
            // Intentar reenviar emails pendientes
            await retryPendingEmails();
        }

        return sendResult;

    } catch (generalError) {
        // Capturar cualquier error no manejado
        logError('Unhandled Error', generalError);

        return {
            success: false,
            error: 'Error inesperado',
            details: generalError.message
        };
    }
}

// Función para reintentar emails pendientes al cargar la página
export const initEmailRetry = () => {
    try {
        const pendingEmails = JSON.parse(localStorage.getItem('pendingEmails') || '[]');
        if (pendingEmails.length > 0) {
            console.log(`Hay ${pendingEmails.length} emails pendientes de envío`);
            retryPendingEmails();
        }
    } catch (error) {
        console.error('Error al iniciar reintento de emails', error);
    }
};