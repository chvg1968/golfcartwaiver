const { Resend } = require('resend');

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      body: JSON.stringify({ success: false, error: 'Método no permitido' })
    };
  }

  try {
    // Log de depuración completo
    console.log('Evento completo recibido:', JSON.stringify(event, null, 2));
    console.log('Cuerpo del evento:', event.body);
    
    const { formData, pdfLink } = JSON.parse(event.body);
    
    // Log detallado de formData
    console.log('Tipo de formData:', typeof formData);
    console.log('Claves en formData:', Object.keys(formData));
    console.log('Contenido completo de formData:', JSON.stringify(formData, null, 2));
    console.log('PDF Link:', pdfLink);

    const TEST_EMAIL = process.env.TEST_EMAIL || 'conradovilla@gmail.com';
    const guestName = formData.guestName || "Unknown Guest";

    const emailHtml = `
        <h1>Golf Cart Liability Waiver</h1>
        <p>A new waiver form has been submitted.</p>
        
        <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px;">
            <h2>Form Details</h2>
            <table style="width: 100%; border-collapse: collapse;">
                ${Object.entries(formData)
                    .filter(([key]) => key !== 'formId') // Excluir formId de la tabla
                    .map(([key, value]) => `
                    <tr style="border-bottom: 1px solid #ddd;">
                        <td style="padding: 10px; font-weight: bold; width: 30%;">
                            ${key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </td>
                        <td style="padding: 10px;">
                            ${value || "N/A"}
                        </td>
                    </tr>
                `).join('')}
            </table>
        </div>
        
        <h3>Additional Information</h3>
        <p><strong>Form ID:</strong> ${formData.formId || 'No disponible'}</p>
        <p><strong>PDF Link:</strong> <a href="${pdfLink}">Download Signed Waiver</a></p>
        
        <hr />
        <p><small>Note: This is a test email sent to verified address.</small></p>
        <p>Date: ${new Date().toLocaleString('es-ES', { timeZone: 'America/New_York' })}</p>
    `;

    const emailPayload = {
      from: 'Golf Cart Waiver <onboarding@resend.dev>',
      to: TEST_EMAIL,
      subject: `Golf Cart Liability Waiver - ${guestName}`,
      html: emailHtml,
      text: ""
    };

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
