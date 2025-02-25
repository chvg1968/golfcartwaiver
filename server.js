const express = require('express');
const { Resend } = require('resend');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Configurar CORS
app.use(cors({
    origin: 'http://localhost:5173', // URL de tu aplicación Vite
    methods: ['POST'],
    credentials: true
}));

app.use(express.json());

// Verificar API key y configuración
const RESEND_API_KEY = process.env.VITE_RESEND_API_KEY;
const TEST_EMAIL = 'conradovilla@gmail.com'; // Email verificado para pruebas

if (!RESEND_API_KEY) {
    console.error('⚠️ No se encontró la API key de Resend');
    process.exit(1);
}

// Inicializar Resend
const resend = new Resend(RESEND_API_KEY);

// Ruta para enviar emails
app.post('/api/send-email', async (req, res) => {
    try {
        console.log('📧 Recibida solicitud de envío de email');
        const { formData, pdfLink } = req.body;
        
        if (!formData || !pdfLink) {
            console.error('❌ Datos incompletos:', { formData, pdfLink });
            return res.status(400).json({
                success: false,
                error: 'Faltan datos requeridos'
            });
        }

        console.log('📝 Preparando email con datos:', {
            guestName: formData.guestName,
            formId: formData.formId,
            pdfLink
        });

        const emailData = {
            from: 'Resend <onboarding@resend.dev>',
            to: TEST_EMAIL, // Usar el email verificado
            subject: 'Golf Cart Liability Waiver - Confirmation',
            html: `
                <h1>Golf Cart Liability Waiver</h1>
                <p>A new waiver form has been submitted.</p>
                <p><strong>Guest Name:</strong> ${formData.guestName}</p>
                <p><strong>Form ID:</strong> ${formData.formId}</p>
                <p>You can download the signed waiver here: <a href="${pdfLink}">Download PDF</a></p>
                <hr>
                <p><small>Note: This is a test email sent to verified address. In production, this would go to: conradovilla@hotmail.com</small></p>
                <p>Date: ${new Date().toLocaleString()}</p>
            `
        };

        console.log('✉️ Enviando email de prueba a:', TEST_EMAIL);
        const result = await resend.emails.send(emailData);

        if (result.error) {
            console.error('❌ Error de Resend:', result.error);
            return res.status(500).json({
                success: false,
                error: result.error
            });
        }

        console.log('✅ Email enviado exitosamente:', result);
        res.json({
            success: true,
            result: {
                id: result.id,
                to: emailData.to,
                note: 'Email enviado en modo de prueba'
            }
        });

    } catch (error) {
        console.error('❌ Error al enviar email:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            details: error
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    console.log(`📮 Listo para enviar emails de prueba a ${TEST_EMAIL}`);
});