const { Resend } = require('resend');
const { sendEmail } = require('./emails');

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

    const TEST_EMAIL = process.env.TEST_EMAIL || 'conradovilla@gmail.com';
    const guestName = formData.guestName?.trim() || "Unknown Guest";

    const emailHtml = `
      <h1>Golf Cart Liability Waiver</h1>
      <p>A new waiver form has been submitted.</p>
      <p><strong>Guest Name:</strong> ${guestName}</p>
      <p><strong>Form ID:</strong> ${formData.formId || "N/A"}</p>
      <p><strong>License:</strong> ${formData.license || "N/A"}</p>
      <p><strong>Issuing State:</strong> ${formData.issuingState || "N/A"}</p>
      <p><strong>Address:</strong> ${formData.address || "N/A"}</p>
      <p>You can download the signed waiver here: <a href="${pdfLink}">Download PDF</a></p>
      <hr />
      <p><small>Note: This is a test email sent to a verified address.</small></p>
      <p>Date: ${new Date().toLocaleString()}</p>
    `;

    const emailData = {
      from: 'Golf Cart Waiver <onboarding@resend.dev>',
      to: TEST_EMAIL,
      subject: `Golf Cart Liability Waiver - ${guestName}`,
      html: emailHtml
    };

    const { data, error } = await sendEmail(emailData);

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
    console.error('Error en envío de email:', error);
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
