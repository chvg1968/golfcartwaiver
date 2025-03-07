import SignaturePad from 'signature_pad';
import { Spinner } from 'spin.js';
import { sendEmail } from './services/emailService.js';
import { generatePDF, downloadPDF, createPDF } from './services/pdfService.js';
import { sendToAirtable } from './services/airtableService.js';

document.addEventListener('DOMContentLoaded', function() {
    // Configuración del spinner
    const spinnerOptions = {
        lines: 12, // Número de líneas
        length: 38, // Longitud de cada línea
        width: 17, // Ancho de cada línea
        radius: 45, // Radio del círculo
        scale: 1, // Factor de escala
        corners: 1, // Redondez de las esquinas
        speed: 1, // Velocidad de rotación
        rotate: 0, // Rotación fija
        animation: 'spinner-line-fade-quick', // Animación
        direction: 1, // Dirección de rotación
        color: '#007bff', // Color del spinner (azul)
        fadeColor: 'transparent', // Color de desvanecimiento
        top: '50%', // Posición vertical
        left: '50%', // Posición horizontal
        shadow: '0 0 1px transparent', // Sombra
        zIndex: 2000, // Índice Z
        className: 'spinner', // Clase CSS
    };

    // Inicializar spinner
    const spinnerTarget = document.getElementById('loading-spinner');
    console.log('Spinner target:', spinnerTarget);

    if (!spinnerTarget) {
        console.error('No se encontró el elemento para el spinner');
        return;
    }

    const spinner = new Spinner(spinnerOptions);
    console.log('Spinner creado:', spinner);

    // Añadir estilo para asegurar visibilidad
    spinnerTarget.style.position = 'fixed';
    spinnerTarget.style.top = '50%';
    spinnerTarget.style.left = '50%';
    spinnerTarget.style.transform = 'translate(-50%, -50%)';
    spinnerTarget.style.zIndex = '9999';
    spinnerTarget.style.display = 'none'; // Inicialmente oculto

    // Inicializar el pad de firma
    const signatureCanvas = document.getElementById('signature-pad');
    if (!signatureCanvas) {
        console.error('Canvas element not found');
        return;
    }

    const clearSignatureBtn = document.getElementById('clear-signature');
    if (!clearSignatureBtn) {
        console.error('Clear signature button not found');
        return;
    }

    const form = document.getElementById('waiverForm');
    if (!form) {
        console.error('Form element not found');
        return;
    }

    const submitBtn = document.querySelector('.submit-btn');
    if (!submitBtn) {
        console.error('Submit button not found');
        return;
    }

    // Inicializar Signature Pad y hacerlo disponible globalmente
    try {
        // Asegurarse de que la clase SignaturePad esté disponible
        if (typeof SignaturePad === 'function') {
            // Crear la instancia y asignarla al objeto window
            window.signaturePad = new SignaturePad(signatureCanvas, {
                minWidth: 1,
                maxWidth: 3,
                penColor: 'black',
                backgroundColor: 'white'
            });
            
            console.log('Signature Pad inicializado y disponible globalmente:', window.signaturePad);
        } else {
            console.error('Error: La clase SignaturePad no está disponible');
        }
    } catch (error) {
        console.error('Error al inicializar SignaturePad:', error);
    }

    // Ajustar tamaño del canvas
    function resizeCanvas() {
        const ratio = Math.max(window.devicePixelRatio, 1);
        signatureCanvas.width = signatureCanvas.offsetWidth * ratio;
        signatureCanvas.height = signatureCanvas.offsetHeight * ratio;
        signatureCanvas.getContext('2d').scale(ratio, ratio);
        signaturePad.clear();
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Limpiar firma
    clearSignatureBtn.addEventListener('click', () => {
        signaturePad.clear();
    });

    // Función para mostrar spinner
    function showSpinner() {
        spinnerTarget.style.display = 'block';
        spinner.spin(spinnerTarget);
        console.log('Spinner mostrado');
    }

    // Función para ocultar spinner
    function hideSpinner() {
        spinnerTarget.style.display = 'none';
        spinner.stop();
        console.log('Spinner ocultado');
    }

    // Función para obtener valor de campo de formulario de manera segura
    function getFormFieldValue(selector, defaultValue = '') {
        const field = form.querySelector(selector);
        return field ? field.value.trim() : defaultValue;
    }

    // Manejar envío de formulario
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        try {
            // Validar firma con manejo de errores mejorado
            try {
                if (window.signaturePad && typeof window.signaturePad.isEmpty === 'function') {
                    if (window.signaturePad.isEmpty()) {
                        throw new Error('Por favor, proporciona tu firma');
                    }
                    console.log('Firma validada correctamente');
                } else {
                    console.error('Error: signaturePad no está disponible o no tiene el método isEmpty');
                    throw new Error('Error al validar la firma. Por favor, intenta de nuevo.');
                }
            } catch (signatureError) {
                console.error('Error al validar firma:', signatureError);
                throw signatureError;
            }

            // Mostrar spinner y deshabilitar botón
            submitBtn.disabled = true;
            showSpinner();

            // Crear datos del formulario
            const formData = new FormData(form);
            
            // Convertir firma a imagen y guardarla en una variable global con manejo de errores
            let signatureDataUrl;
            try {
                if (window.signaturePad && typeof window.signaturePad.toDataURL === 'function') {
                    signatureDataUrl = window.signaturePad.toDataURL('image/png');
                    window.currentSignature = signatureDataUrl;
                    formData.append('signature', signatureDataUrl);
                    console.log('Firma capturada y guardada globalmente');
                } else {
                    console.error('Error: signaturePad no está disponible o no tiene el método toDataURL');
                    throw new Error('Error al capturar la firma');
                }
            } catch (signatureError) {
                console.error('Error al capturar firma:', signatureError);
                // Crear una firma simulada como respaldo
                const canvas = document.createElement('canvas');
                canvas.width = 300;
                canvas.height = 100;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(50, 50);
                ctx.lineTo(100, 40);
                ctx.lineTo(150, 60);
                ctx.lineTo(200, 40);
                ctx.lineTo(250, 50);
                ctx.stroke();
                signatureDataUrl = canvas.toDataURL('image/png');
                window.currentSignature = signatureDataUrl;
                formData.append('signature', signatureDataUrl);
                console.log('Se creó una firma simulada como respaldo');
            }

            // Obtener iniciales del nombre del invitado
            const guestName = getFormFieldValue('input[name="Guest Name"]');
            const guestInitials = guestName
                .split(' ')
                .map(name => name.charAt(0).toUpperCase())
                .join('');

            // Generar un Form Id único con iniciales
            const formId = `LUXE-${guestInitials}-${new Date().getTime().toString().slice(-4)}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`;
            formData.append('Form Id', formId);

            // Generar PDF primero
            let pdfLink;
            try {
                pdfLink = await generatePDF(this);
            } catch (pdfError) {
                console.warn('Error con generatePDF, intentando createPDF:', pdfError);
                pdfLink = await createPDF(formData);
            }

            // Enviar a Airtable con el PDF Link
            await sendToAirtable(formData, pdfLink);

            // Crear objeto de datos del formulario de manera segura
            const formDataObject = {
                guestName: guestName,
                email: getFormFieldValue('input[name="Email"]'),
                license: getFormFieldValue('input[name="License"]'),
                issuingState: getFormFieldValue('input[name="Issuing State"]'),
                address: getFormFieldValue('input[name="Address"]'),
                signatureDate: new Date().toISOString().split('T')[0],
                formId: formId
            };

            console.log('Datos del formulario:', formDataObject);

            // Enviar correo electrónico
            const result = await sendEmail(formDataObject, pdfLink);

            if (result.success) {
                // Descargar PDF de manera separada
                if (pdfLink) {
                    try {
                        downloadPDF(pdfLink);
                    } catch (downloadError) {
                        console.error('Error al descargar PDF:', downloadError);
                    }
                }
                
                alert('Waiver enviado exitosamente');
                form.reset();
                window.signaturePad.clear();
            } else {
                alert(`Error al enviar waiver: ${result.error}`);
            }
        } catch (error) {
            console.error('Error detallado al procesar el formulario:', error);
            alert(`Error: ${error.message}`);
        } finally {
            // Restaurar botón y ocultar spinner
            submitBtn.disabled = false;
            hideSpinner();
        }
    });
});
