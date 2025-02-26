const { Resend } = require('resend');

exports.handler = async function(event, context) {
  // Solo permitir método POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Método no permitido' };
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

    const resend = new Resend(process.env.RESEND_API_KEY);
    const DESTINATION_EMAIL = 'conradovilla@hotmail.com'; // Email fijo como destinatario

    const emailData = {
      from: 'Golf Cart Waiver <noreply@resend.dev>', // Correo genérico como remitente
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
        <p>You can download the signed waiver here: <a href="${pdfLink}">Download PDF</a></p>
        <hr>
        <p>Date: ${new Date().toLocaleString()}</p>
      `
    };

    const result = await resend.emails.send(emailData);

    if (result.error) {
      console.error('Error al enviar email:', result.error);
      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          error: result.error
        })
      };
    }

    console.log('Email enviado exitosamente a', DESTINATION_EMAIL);
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
        error: error.message
      })
    };
  }
};
