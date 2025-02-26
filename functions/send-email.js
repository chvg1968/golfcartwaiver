const { Resend } = require('resend');

exports.handler = async function(event, context) {
  console.log('Función send-email invocada');
  
  // Solo permitir método POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Método no permitido' };
  }

  try {
    // Verificar que la API key esté configurada
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY no está configurada en las variables de entorno');
      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          error: 'Configuración de API incompleta'
        })
      };
    }

    const { formData, pdfLink } = JSON.parse(event.body);
    console.log('Datos recibidos:', { formData, pdfLinkExists: !!pdfLink });
    
    if (!formData) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: 'Faltan datos del formulario'
        })
      };
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const DESTINATION_EMAIL = 'conradovilla@hotmail.com';

    const emailData = {
      from: 'Golf Cart Waiver <noreply@resend.dev>',
      to: DESTINATION_EMAIL,
      subject: 'Golf Cart Liability Waiver - Confirmation',
      html: `
        <h1>Golf Cart Liability Waiver</h1>
        <p>A new waiver form has been submitted.</p>
        <p><strong>Guest Name:</strong> ${formData.guestName || 'No proporcionado'}</p>
        <p><strong>License:</strong> ${formData.license || 'No proporcionado'}</p>
        <p><strong>Issuing State:</strong> ${formData.issuingState || 'No proporcionado'}</p>
        <p><strong>Address:</strong> ${formData.address || 'No proporcionado'}</p>
        <p><strong>Form ID:</strong> ${formData.formId || 'No generado'}</p>
        ${pdfLink ? `<p>You can download the signed waiver here: <a href="${pdfLink}">Download PDF</a></p>` : ''}
        <hr>
        <p>Date: ${new Date().toLocaleString()}</p>
      `
    };

    console.log('Enviando email a:', DESTINATION_EMAIL);
    const result = await resend.emails.send(emailData);

    if (result.error) {
      console.error('Error al enviar email con Resend:', result.error);
      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          error: `Error de Resend: ${result.error.message}`
        })
      };
    }

    console.log('Email enviado exitosamente:', result);
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        result: {
          id: result.id,
          to: emailData.to,
          message: 'Email enviado exitosamente'
        }
      })
    };

  } catch (error) {
    console.error('Error en la función send-email:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        success: false, 
        error: `Error del servidor: ${error.message}`
      })
    };
  }
};
