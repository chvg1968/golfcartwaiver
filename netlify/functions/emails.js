// Netlify function to send emails via Resend
const { Resend } = require('resend');

exports.handler = async function(event, context) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method Not Allowed' })
    };
  }

  try {
    // Parse the request body
    const data = JSON.parse(event.body);
    
    // Initialize Resend with API key from environment variable
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    // Validate required fields
    if (!data.to || !data.subject || !data.html) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing required fields' })
      };
    }
    
    // Send the email
    const { data: emailData, error } = await resend.emails.send({
      from: data.from || 'Golf Cart Waiver <onboarding@resend.dev>',
      to: data.to,
      cc: data.cc,
      subject: data.subject,
      html: data.html,
      attachments: data.attachments || []
    });
    
    if (error) {
      console.error('Resend API error:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ message: error.message })
      };
    }
    
    // Return success response
    return {
      statusCode: 200,
      body: JSON.stringify({ id: emailData.id, message: 'Email sent successfully' })
    };
    
  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal Server Error' })
    };
  }
};