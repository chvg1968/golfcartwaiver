import { generatePDF } from './services/pdfService';
import { sendToAirtable } from './services/airtableService';
import { sendEmail } from './services/emailService';
import { SignatureComponent } from './components/signature';
import { generateUUID, getInitials } from './utils/helpers';

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

            // Deshabilitar botón y mostrar spinner
            const submitButton = document.getElementById('submit-button');
            if (submitButton) {
                submitButton.disabled = true;
            }
            const loadingSpinner = document.getElementById('loading-spinner');
            if (loadingSpinner) {
                loadingSpinner.classList.add('active');
            }

            // Generar y subir PDF con mejor manejo de errores
            const pdfLink = await generatePDF(this).catch(error => {
                console.error('Error en generación de PDF:', error);
                throw new Error(`Error al generar el PDF: ${error.message}`);
            });

            if (!pdfLink) {
                throw new Error('No se pudo obtener el enlace del PDF');
            }

            // Crear objeto de datos del formulario
            const formDataObject = {
                guestName: formData.get('Guest Name'),
                license: formData.get('License'),
                issuingState: formData.get('Issuing State'),
                address: formData.get('Address'),
                signatureDate: formData.get('Signature Date'),
                formId: `CV-${Date.now().toString(36)}`
            };

            console.log('Datos del formulario:', formDataObject);

            // Enviar datos a Airtable
            await sendToAirtable(formData, pdfLink);

            // Enviar correo electrónico
            const emailResult = await sendEmail(formDataObject, pdfLink);
            
            // Mostrar mensaje de éxito y limpiar formulario
            alert('Formulario enviado correctamente' + 
                  (emailResult && emailResult.success === false ? '\n(Nota: El email de confirmación no pudo ser enviado)' : ''));
            
            this.reset();
            signaturePad?.clear();

        } catch (error) {
            console.error('Error detallado al procesar el formulario:', error);
            alert(`Error: ${error.message}`);
        } finally {
            // Restaurar botón y ocultar spinner
            const submitButton = document.getElementById('submit-button');
            if (submitButton) {
                submitButton.disabled = false;
            }
            const loadingSpinner = document.getElementById('loading-spinner');
            if (loadingSpinner) {
                loadingSpinner.classList.remove('active');
            }
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
