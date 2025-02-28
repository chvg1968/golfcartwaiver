const { Resend } = require('resend');

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      body: JSON.stringify({ success: false, error: 'Método no permitido' })
    };
  }

  try {
    const { formData, pdfLink } = JSON.parse(event.body);
    
    if (!formData || !pdfLink) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: 'Faltan datos requeridos'
        })
      };
    }

    // Log de depuración de datos del formulario
    console.log('Datos del formulario recibidos:', JSON.stringify(formData, null, 2));
    console.log('Enlace PDF:', pdfLink);

    const TEST_EMAIL = process.env.TEST_EMAIL || 'conradovilla@gmail.com';
    const guestName = formData.guestName || "Unknown Guest";

    const emailHtml = `
      <h1>Golf Cart Liability Waiver</h1>
      <p>A new waiver form has been submitted.</p>
      
      <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px;">
        <h2>Detalles del Formulario</h2>
        ${Object.entries(formData).map(([key, value]) => `
          <p>
            <strong>${key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}:</strong> 
            ${value || "N/A"}
          </p>
        `).join('')}
      </div>
      
      <h3>Additional Information</h3>
      <p><strong>Form ID:</strong> ${formData.formId || 'No disponible'}</p>
      <p><strong>PDF Link:</strong> <a href="${pdfLink}">Download PDF</a></p>
      
      <hr />
      <p><small>Note: This is a test email sent to verified address.</small></p>
      <p>Date: ${new Date().toLocaleString('es-ES', { timeZone: 'America/New_York' })}</p>
    `;

    const emailPayload = {
      from: 'Golf Cart Waiver <onboarding@resend.dev>',
      to: TEST_EMAIL,
      subject: `Golf Cart Liability Waiver - ${guestName}`,
      html: emailHtml
    };

    // Reutilizar lógica de emails.js
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data: emailData, error } = await resend.emails.send(emailPayload);
    
    if (error) {
      console.error('Resend API error:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          error: 'Failed to send email',
          details: error
        })
      };
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Email sent successfully',
        data: emailData
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
