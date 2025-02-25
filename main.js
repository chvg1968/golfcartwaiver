import { supabase } from '@/utils/supabaseClient';
import { generatePDF } from '@/services/pdfService';
import { sendToAirtable } from '@/services/airtableService';
import { sendEmail } from '@/services/emailService';
import { authenticateUser } from '@/services/authService';
import { SignatureComponent } from '@/components/signature';
import { generateUUID, getInitials } from '@/utils/helpers';

document.addEventListener('DOMContentLoaded', function() {
    // Inicializar el pad de firma
    const canvas = document.getElementById('signature-pad');
    let signaturePad;
    
    if (canvas) {
        signaturePad = new SignatureComponent(canvas);
        console.log('Signature pad initialized');
        
        // Configurar el botón de limpiar firma
        const clearButton = document.getElementById('clear-signature');
        if (clearButton) {
            clearButton.addEventListener('click', () => {
                signaturePad.clear();
                console.log('Signature cleared');
            });
        }
    } else {
        console.error('Canvas element not found');
    }

    // Manejar el envío del formulario
    document.getElementById('waiverForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        try {
            // Validar el formulario
            if (!validateForm(this)) {
                return;
            }

            // Preparar datos del formulario
            const formData = new FormData(this);
            const guestName = formData.get('Guest Name');
            const formId = getInitials(guestName) + '-' + generateUUID();
            formData.append('Form Id', formId);

            // Verificar y guardar la firma
            if (signaturePad && signaturePad.isEmpty()) {
                throw new Error('Por favor, proporciona tu firma');
            }

            // Generar y subir PDF con mejor manejo de errores
            console.log('Iniciando generación de PDF...');
            const pdfLink = await generatePDF(this).catch(error => {
                console.error('Error en generación de PDF:', error);
                throw new Error(`Error al generar el PDF: ${error.message}`);
            });

            if (!pdfLink) {
                throw new Error('No se pudo obtener el enlace del PDF');
            }

            console.log('PDF generado exitosamente:', pdfLink);

            // Crear archivo de firma
            const signatureData = signaturePad.toDataURL();
            const signatureBlob = await (await fetch(signatureData)).blob();
            const signatureFile = new File([signatureBlob], 'signature.png', { type: 'image/png' });
            const signatureUrl = URL.createObjectURL(signatureFile);

            // Enviar datos a Airtable
            console.log('Enviando datos a Airtable...');
            await sendToAirtable(formData, pdfLink);

            // Enviar correo electrónico
            console.log('Intentando enviar correo electrónico...');
            const emailResult = await sendEmail(formData, pdfLink);
            
            // Mostrar mensaje de éxito y limpiar formulario
            alert('Formulario enviado correctamente' + 
                  (!emailResult.success ? '\n(Nota: El email de confirmación no pudo ser enviado)' : ''));
            
            this.reset();
            signaturePad?.clear();

        } catch (error) {
            console.error('Error detallado al procesar el formulario:', error);
            alert(`Error: ${error.message}`);
        }
    });
});

function validateForm(form) {
    let isValid = true;
    const requiredFields = form.querySelectorAll('input[required]');
    
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            isValid = false;
            field.classList.add('error');
            console.error(`Campo requerido vacío: ${field.name}`);
        } else {
            field.classList.remove('error');
        }
    });

    if (!isValid) {
        alert('Por favor, completa todos los campos requeridos');
    }

    return isValid;
}