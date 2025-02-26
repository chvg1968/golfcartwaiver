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

    // Usar process.env sin el prefijo VITE_
    const resend = new Resend(process.env.RESEND_API_KEY);
    const TEST_EMAIL = 'conradovilla@gmail.com';

    const emailData = {
      from: 'Resend <onboarding@resend.dev>',
      to: TEST_EMAIL,
      subject: 'Golf Cart Liability Waiver - Confirmation',
      html: `
        <h1>Golf Cart Liability Waiver</h1>
        <p>A new waiver form has been submitted.</p>
        <p><strong>Guest Name:</strong> ${formData.guestName}</p>
        <p><strong>Form ID:</strong> ${formData.formId}</p>
        <p>You can download the signed waiver here: <a href="${pdfLink}">Download PDF</a></p>
        <hr>
        <p><small>Note: This is a test email sent to verified address.</small></p>
        <p>Date: ${new Date().toLocaleString()}</p>
      `
    };

    const result = await resend.emails.send(emailData);

    if (result.error) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          error: result.error
        })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        result: {
          id: result.id,
          to: emailData.to,
          note: 'Email enviado en modo de prueba'
        }
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        success: false, 
        error: error.message
      })
    };
  }
};
