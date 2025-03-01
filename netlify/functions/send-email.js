const { Resend } = require('resend');

exports.handler = async (event, context) => {
    // Solo procesar solicitudes POST
    if (event.httpMethod !== 'POST') {
        return { 
            statusCode: 405, 
            body: JSON.stringify({ message: 'Method Not Allowed' }) 
        };
    }

    // Parsear el cuerpo de la solicitud
    let payload;
    try {
        payload = JSON.parse(event.body);
    } catch (error) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Invalid JSON payload', error: error.message })
        };
    }

    // Inicializar Resend con la API key
    const resend = new Resend(process.env.RESEND_API_KEY);

    try {
        // Enviar email
        const result = await resend.emails.send({
            from: `Golf Cart Waiver from ${payload.formData.guestName} <onboarding@resend.dev>`,
            to: process.env.TEST_EMAIL,
            subject: 'Golf Cart Liability Waiver',
            html: `
<!DOCTYPE html>
<html lang="en">
<body>
    <h1>Golf Cart Liability Waiver</h1>
    <div>
        <h2>Waiver Details</h2>
        <p><strong>Guest Name:</strong> ${payload.formData.guestName}</p>
        <p><strong>License:</strong> ${payload.formData.license}</p>
        <p><strong>Issuing State:</strong> ${payload.formData.issuingState}</p>
        <p><strong>Address:</strong> ${payload.formData.address}</p>
        <p><strong>Signature Date:</strong> ${payload.formData.signatureDate}</p>
        <p><strong>Form ID:</strong> ${payload.formData.formId}</p>
        <p><strong>Waiver PDF:</strong> <a href="${payload.pdfLink}">Download Signed Waiver</a></p>
    </div>
</body>
</html>
            `,
            text: `Golf Cart Liability Waiver

Waiver Details:
- Guest Name: ${payload.formData.guestName}
- License: ${payload.formData.license}
- Issuing State: ${payload.formData.issuingState}
- Address: ${payload.formData.address}
- Signature Date: ${payload.formData.signatureDate}
- Form ID: ${payload.formData.formId}
- Waiver PDF: ${payload.pdfLink}
            `
        });

        // Manejar respuesta de Resend
        if (result.error) {
            return {
                statusCode: 500,
                body: JSON.stringify({ 
                    message: 'Error sending email', 
                    error: result.error 
                })
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ 
                message: 'Email sent successfully', 
                data: result 
            })
        };

    } catch (error) {
        console.error('Email sending error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                message: 'Failed to send email', 
                error: error.message 
            })
        };
    }
};
