const { Resend } = require('resend');

exports.handler = async function(event, context) {
  // Log de depuración completo al inicio del handler
  console.log('Método HTTP:', event.httpMethod);
  console.log('Evento completo recibido:', JSON.stringify(event, null, 2));
  console.log('Cuerpo del evento:', event.body);
  
  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      body: JSON.stringify({ success: false, error: 'Método no permitido' })
    };
  }

  try {
    const { formData, pdfLink } = JSON.parse(event.body);
    
    // Log detallado de formData
    console.log('Tipo de formData:', typeof formData);
    console.log('Contenido completo de formData:', JSON.stringify(formData, null, 2));
    console.log('Claves de formData:', Object.keys(formData));
    
    // Verificar si todos los campos esperados están presentes
    const expectedFields = ['guestName', 'license', 'issuingState', 'address', 'signatureDate', 'formId'];
    const missingFields = expectedFields.filter(field => !(field in formData));
    
    if (missingFields.length > 0) {
        console.warn('Campos faltantes:', missingFields);
    }

    console.log('PDF Link:', pdfLink);

    const TEST_EMAIL = process.env.TEST_EMAIL || 'conradovilla@gmail.com';
    const guestName = formData.guestName || "Unknown Guest";

    const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #333;">Golf Cart Liability Waiver</h1>
            
            <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px;">
                <h2>Waiver Details</h2>
                <p><strong>Guest Name:</strong> ${formData.guestName}</p>
                <p><strong>License:</strong> ${formData.license}</p>
                <p><strong>Issuing State:</strong> ${formData.issuingState}</p>
                <p><strong>Address:</strong> ${formData.address}</p>
                <p><strong>Signature Date:</strong> ${formData.signatureDate}</p>
                <p><strong>Form ID:</strong> ${formData.formId}</p>
            </div>

            <div style="margin-top: 20px;">
                <p><strong>PDF Link:</strong> <a href="${pdfLink}">Download Signed Waiver</a></p>
            </div>

            <footer style="margin-top: 20px; font-size: 0.8em; color: #666;">
                <p>Sent: ${new Date().toLocaleString('es-ES', { timeZone: 'America/New_York' })}</p>
            </footer>
        </div>
    `;

    console.log('HTML del correo generado:', emailHtml);
    console.log('Contenido de formData:', JSON.stringify(formData, null, 2));

    const emailPayload = {
      from: 'Luxe Properties Golf Cart Waiver <onboarding@resend.dev>', 
      to: TEST_EMAIL,
      subject: 'Puerto Rico -Golf Cart Liability Waiver',
      html: `Guest&id: ${guestName}:${formData.formId}`,
      text: 'Test'
    };

    console.log('HTML del correo:', emailHtml);

    // Reutilizar lógica de emails.js
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data: emailData, error } = await resend.emails.send(emailPayload);
    
    if (error) {
        console.error('Resend API error completo:', JSON.stringify(error, null, 2));
        console.error('Detalles del error:', error.message, error.name);
        
        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                error: 'Fallo al enviar el correo',
                errorDetails: {
                    message: error.message,
                    name: error.name,
                    stack: error.stack
                }
            })
        };
    }

    return {
        statusCode: 200,
        body: JSON.stringify({
            success: true,
            result: emailData
        })
    };

  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: 'Internal Server Error',
        details: error.message
      })
    };
  }
};
