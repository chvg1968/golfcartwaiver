const { Resend } = require('resend');

exports.handler = async function(event, context) {
  // Enhanced logging for debugging
  console.log('Full event object:', JSON.stringify(event, null, 2));
  console.log('Context object:', JSON.stringify(context, null, 2));
  
  // Log environment variables for debugging
  console.log('RESEND_API_KEY present:', !!process.env.RESEND_API_KEY);
  console.log('TEST_EMAIL:', process.env.TEST_EMAIL);

  // Check for HTTP method
  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      body: JSON.stringify({ success: false, error: 'Método no permitido' })
    };
  }

  try {
    // Enhanced error handling for JSON parsing
    let parsedBody;
    try {
      parsedBody = JSON.parse(event.body);
    } catch (parseError) {
      console.error('JSON Parsing Error:', parseError);
      console.error('Raw event body:', event.body);
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: 'Invalid JSON in request body',
          details: parseError.message
        })
      };
    }

    const { formData, pdfLink } = parsedBody;
    
    // Comprehensive logging of form data
    console.log('Parsed formData:', JSON.stringify(formData, null, 2));
    console.log('PDF Link:', pdfLink);

    // Validate required fields
    const requiredFields = ['guestName', 'license', 'issuingState', 'address', 'signatureDate', 'formId'];
    const missingFields = requiredFields.filter(field => !formData[field]);
    
    if (missingFields.length > 0) {
      console.error('Missing required fields:', missingFields);
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: 'Missing required fields',
          missingFields: missingFields
        })
      };
    }

    // Use environment variables with fallback
    const TEST_EMAIL = process.env.TEST_EMAIL || 'conradovilla@gmail.com';
    
    // Prepare email HTML with new format
    const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #333;">Golf Cart Liability Waiver</h1>
            
            <p>A new waiver form has been submitted.</p>

            <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; margin-top: 20px;">
                <p><strong>Guest Name:</strong> ${formData.guestName}</p>
                <p><strong>Form ID:</strong> ${formData.formId}</p>
                <p>You can download the signed waiver here: <a href="${pdfLink}">Download PDF</a></p>
            </div>

            <p style="margin-top: 20px; font-size: 0.8em; color: #666;">
                Note: This is a test email sent to verified address.
            </p>

            <footer style="margin-top: 20px; font-size: 0.8em; color: #666;">
                <p>Date: ${new Date().toLocaleString('es-ES', { timeZone: 'America/New_York', 
                    year: 'numeric', 
                    month: '2-digit', 
                    day: '2-digit', 
                    hour: '2-digit', 
                    minute: '2-digit', 
                    second: '2-digit' 
                })}</p>
            </footer>
        </div>
    `;

    // Update text version to match HTML format
    const emailPayload = {
      from: `Luxe Properties Golf Cart Waiver from ${formData.guestName} <onboarding@resend.dev>`, 
      to: TEST_EMAIL,
      subject: 'Golf Cart Liability Waiver',
      html: emailHtml,
      text: `Golf Cart Liability Waiver

A new waiver form has been submitted.

Guest Name: ${formData.guestName}

Form ID: ${formData.formId}

You can download the signed waiver here: ${pdfLink}

Note: This is a test email sent to verified address.

Date: ${new Date().toLocaleString('es-ES', { 
        timeZone: 'America/New_York', 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      })}`
    };

    // Validate Resend API Key
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not set');
      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          error: 'Resend API Key is not configured'
        })
      };
    }

    // Initialize Resend with error handling
    let resend;
    try {
      resend = new Resend(process.env.RESEND_API_KEY);
    } catch (initError) {
      console.error('Resend Initialization Error:', initError);
      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          error: 'Failed to initialize Resend',
          details: initError.message
        })
      };
    }

    // Send email with comprehensive error handling
    try {
      const { data: emailData, error } = await resend.emails.send(emailPayload);
      
      if (error) {
        console.error('Resend API Error:', JSON.stringify(error, null, 2));
        return {
          statusCode: 500,
          body: JSON.stringify({
            success: false,
            error: 'Failed to send email',
            details: error
          })
        };
      }

      console.log('Email sent successfully:', JSON.stringify(emailData, null, 2));
      
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: 'Email sent successfully',
          data: emailData
        })
      };

    } catch (sendError) {
      console.error('Email Sending Error:', sendError);
      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          error: 'Unexpected error sending email',
          details: sendError.message
        })
      };
    }

  } catch (generalError) {
    console.error('Unhandled Error:', generalError);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Unexpected server error',
        details: generalError.message
      })
    };
  }
};
