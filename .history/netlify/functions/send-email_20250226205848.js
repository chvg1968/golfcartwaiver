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

    console.log('Datos recibidos en la función:', { formData, pdfLink });
    console.log('API Key disponible:', !!process.env.RESEND_API_KEY);

    const resend = new Resend(process.env.RESEND_API_KEY);
    
    const TEST_EMAIL = process.env.TEST_EMAIL || 'conradovilla@gmail.com';

    console.log("Form Data:", formData); // Depurar el contenido

    if (!formData || !formData.guestName) {
      console.error("Error: guestName no está definido.");
    return;
    }

const guestName = formData.guestName.trim() || "Unknown Guest";

    const emailData = {
      from: 'Golf Cart Waiver <onboarding@resend.dev>',
      to: TEST_EMAIL,
      subject: `Golf Cart Liability Waiver - ${guestName}`,
      html: `
        <h1>Golf Cart Liability Waiver</h1>
        <p>A new waiver form has been submitted.</p>
        <p><strong>Guest Name:</strong> ${formData.guestName}</p>
        <p><strong>Form ID:</strong> ${formData.formId}</p>
        <p><strong>License:</strong> ${formData.license}</p>
        <p><strong>Issuing State:</strong> ${formData.issuingState}</p>
        <p><strong>Address:</strong> ${formData.address}</p>
        <p>You can download the signed waiver here: <a href="${pdfLink}">Download PDF</a></p>
        <hr>
        <p><small>Note: This is a test email sent to verified address.</small></p>
        <p>Date: ${new Date().toLocaleString()}</p>
      `
    };

    console.log('Intentando enviar email con datos:', emailData);

    const { data, error } = await resend.emails.send(emailData);

    if (error) {
      console.error('Error sending email:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          error: error
        })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        data: data
      })
    };

  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: {
          message: 'Error interno del servidor',
          details: error.message
        }
      })
    };
  }
};
