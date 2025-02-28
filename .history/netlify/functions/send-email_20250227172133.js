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

    const TEST_EMAIL = process.env.TEST_EMAIL || 'conradovilla@gmail.com';
    const guestName = formData.guestName || "Unknown Guest";

    const emailHtml = `
      <h1>Golf Cart Liability Waiver</h1>
      <p>A new waiver form has been submitted.</p>
      <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px;">
        ${Object.keys(formData).map(key => `<p><strong>${key}:</strong> ${formData[key] || "N/A"}</p>`).join('')}
      </div>
      <p>You can download the signed waiver here: <a href="${pdfLink}">Download PDF</a></p>
      <hr />
      <p><small>Note: This is a test email sent to a verified address.</small></p>
      <p>Date: ${new Date().toLocaleString()}</p>
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
