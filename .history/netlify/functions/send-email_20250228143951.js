// const { Resend } = require('resend');

// exports.handler = async function(event, context) {
//   // Enhanced logging for debugging
//   console.log('Full event object:', JSON.stringify(event, null, 2));
//   console.log('Context object:', JSON.stringify(context, null, 2));
  
//   // Log environment variables for debugging
//   console.log('RESEND_API_KEY present:', !!process.env.RESEND_API_KEY);
//   console.log('TEST_EMAIL:', process.env.TEST_EMAIL);

//   // Check for HTTP method
//   if (event.httpMethod !== 'POST') {
//     return { 
//       statusCode: 405, 
//       body: JSON.stringify({ success: false, error: 'Método no permitido' })
//     };
//   }

//   try {
//     // Enhanced error handling for JSON parsing
//     let parsedBody;
//     try {
//       parsedBody = JSON.parse(event.body);
//     } catch (parseError) {
//       console.error('JSON Parsing Error:', parseError);
//       console.error('Raw event body:', event.body);
//       return {
//         statusCode: 400,
//         body: JSON.stringify({
//           success: false,
//           error: 'Invalid JSON in request body',
//           details: parseError.message
//         })
//       };
//     }

//     const { formData, pdfLink } = parsedBody;
    
//     // Comprehensive logging of form data
//     console.log('Parsed formData:', JSON.stringify(formData, null, 2));
//     console.log('PDF Link:', pdfLink);

//     // Validate required fields
//     const requiredFields = ['guestName', 'license', 'issuingState', 'address', 'signatureDate', 'formId'];
//     const missingFields = requiredFields.filter(field => !formData[field]);
    
//     if (missingFields.length > 0) {
//       console.error('Missing required fields:', missingFields);
//       return {
//         statusCode: 400,
//         body: JSON.stringify({
//           success: false,
//           error: 'Missing required fields',
//           missingFields: missingFields
//         })
//       };
//     }

//     // Use environment variables with fallback
//     const TEST_EMAIL = process.env.TEST_EMAIL || 'conradovilla@gmail.com';
    
//     // Prepare email HTML with new format
//     const emailHtml = `
// <!DOCTYPE html>
// <html lang="en">
// <head>
//     <meta charset="UTF-8">
//     <style>
//         body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
//         h1 { color: #333; }
//         .waiver-details { background-color: #f4f4f4; padding: 15px; border-radius: 5px; }
//         .waiver-details p { margin: 10px 0; }
//         footer { margin-top: 20px; font-size: 0.8em; color: #666; }
//     </style>
// </head>
// <body>
//     <h1>Golf Cart Liability Waiver</h1>
    
//     <div class="waiver-details">
//         <h2>Waiver Details</h2>
//         <p><strong>Guest Name:</strong> ${formData.guestName}</p>
//         <p><strong>License:</strong> ${formData.license}</p>
//         <p><strong>Issuing State:</strong> ${formData.issuingState}</p>
//         <p><strong>Address:</strong> ${formData.address}</p>
//         <p><strong>Signature Date:</strong> ${formData.signatureDate}</p>
//         <p><strong>Form ID:</strong> ${formData.formId}</p>
//         <p><strong>Waiver PDF:</strong> <a href="${pdfLink}">Download Signed Waiver</a></p>
//     </div>

//     <footer>
//         <p>Sent: ${new Date().toLocaleString('en-US', { 
//             timeZone: 'America/New_York',
//             year: 'numeric',
//             month: '2-digit',
//             day: '2-digit',
//             hour: '2-digit',
//             minute: '2-digit',
//             second: '2-digit',
//             hour12: true
//         })}</p>
//     </footer>
// </body>
// </html>
//     `;

//     // Prepare text version
//     const emailText = `Golf Cart Liability Waiver

// Waiver Details:
// - Guest Name: ${formData.guestName}
// - License: ${formData.license}
// - Issuing State: ${formData.issuingState}
// - Address: ${formData.address}
// - Signature Date: ${formData.signatureDate}
// - Form ID: ${formData.formId}
// - Waiver PDF: ${pdfLink}

// Sent: ${new Date().toLocaleString('en-US', { 
//     timeZone: 'America/New_York',
//     year: 'numeric',
//     month: '2-digit',
//     day: '2-digit',
//     hour: '2-digit',
//     minute: '2-digit',
//     second: '2-digit',
//     hour12: true
// })}`;

//     // Prepare email payload
//     const emailPayload = {
//       from: `Luxe Properties Golf Cart Waiver from ${formData.guestName} <onboarding@resend.dev>`, 
//       to: TEST_EMAIL,
//       subject: 'Golf Cart Liability Waiver',
//       html: emailHtml,
//       text: emailText
//     };

//     // Validate Resend API Key
//     if (!process.env.RESEND_API_KEY) {
//       console.error('RESEND_API_KEY is not set');
//       return {
//         statusCode: 500,
//         body: JSON.stringify({
//           success: false,
//           error: 'Resend API Key is not configured'
//         })
//       };
//     }

//     // Initialize Resend with error handling
//     let resend;
//     try {
//       resend = new Resend(process.env.RESEND_API_KEY);
//     } catch (initError) {
//       console.error('Resend Initialization Error:', initError);
//       return {
//         statusCode: 500,
//         body: JSON.stringify({
//           success: false,
//           error: 'Failed to initialize Resend',
//           details: initError.message
//         })
//       };
//     }

//     // Send email with comprehensive error handling
//     try {
//       const { data: emailData, error } = await resend.emails.send(emailPayload);
      
//       if (error) {
//         console.error('Resend API Error:', JSON.stringify(error, null, 2));
//         return {
//           statusCode: 500,
//           body: JSON.stringify({
//             success: false,
//             error: 'Failed to send email',
//             details: error
//           })
//         };
//       }

//       console.log('Email sent successfully:', JSON.stringify(emailData, null, 2));
      
//       return {
//         statusCode: 200,
//         body: JSON.stringify({
//           success: true,
//           message: 'Email sent successfully',
//           data: emailData
//         })
//       };

//     } catch (sendError) {
//       console.error('Email Sending Error:', sendError);
//       return {
//         statusCode: 500,
//         body: JSON.stringify({
//           success: false,
//           error: 'Unexpected error sending email',
//           details: sendError.message
//         })
//       };
//     }

//   } catch (generalError) {
//     console.error('Unhandled Error:', generalError);
//     return {
//       statusCode: 500,
//       body: JSON.stringify({
//         success: false,
//         error: 'Unexpected server error',
//         details: generalError.message
//       })
//     };
//   }
// };
