import SignaturePad from 'signature_pad';

document.addEventListener('DOMContentLoaded', function() {
    // Configuración del lienzo para la firma
    const canvas = document.getElementById('signature-pad');
    const signaturePad = new SignaturePad(canvas);

    // Función para limpiar la firma
    function clearSignature() {
        signaturePad.clear();
    }

    // Agregar un evento al botón de limpiar firma
    const clearButton = document.getElementById('clear-signature');
    clearButton.addEventListener('click', function() {
        clearSignature();
    });

    // Función para generar un UUID
    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    // Función para obtener las iniciales
    function getInitials(name) {
        return name.split(' ').map(word => word.charAt(0).toUpperCase()).join('');
    }

    document.getElementById('waiverForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        let isValid = true;
        const inputs = this.querySelectorAll('input[required]');
        
        inputs.forEach(input => {
            if (!input.value) {
                isValid = false;
                input.classList.add('error');
            } else {
                input.classList.remove('error');
            }
        });

        if (!document.getElementById('ageConfirmation').checked) {
            isValid = false;
            document.getElementById('ageConfirmation').classList.add('error');
        }

        if (isValid) {
            const formData = new FormData(this);
            const guestName = formData.get('Guest Name');
            const formId = getInitials(guestName) + '-' + generateUUID();

            // Agregar formId a formData
            formData.append('Form Id', formId);

            // Asegúrate de que el formulario envíe la firma como una imagen
            function saveSignature() {
                const signatureData = canvas.toDataURL();
                formData.append('Signature', signatureData);
            }

            saveSignature();

            const AIRTABLE_API_KEY = import.meta.env.VITE_AIRTABLE_API_KEY;
            const AIRTABLE_BASE_ID = import.meta.env.VITE_AIRTABLE_BASE_ID;
            const AIRTABLE_TABLE_NAME = import.meta.env.VITE_AIRTABLE_TABLE_NAME;
            const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY;

            // Envío a Airtable
            console.log('Enviando a Airtable con los siguientes datos:', {
                'Form Id': formData.get('Form Id'), 
                'Signature Date': formData.get('Signature Date'),
                'Guest Name': formData.get('Guest Name'),
                'License':formData.get('License'),
                'Issuing State':formData.get('Issuing State'),
                'Signature Check': formData.get('Signature Check'), 
                'Signature': formData.get('Signature')
            });

            fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fields: {
                        'Form Id': formData.get('Form Id'), 
                        'Guest Name': formData.get('Guest Name'),
                        'License': formData.get('License'),
                        'Issuing State': formData.get('Issuing State'),
                        'Signature Check': formData.get('Signature Check'), 
                        'Signature': formData.get('Signature')
                    }
                })
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => {
                        console.error('Error en Airtable:', err);
                        throw new Error('Error en Airtable');
                    });
                }
                return response.json();
            })
            .then(data => {
                console.log('Datos enviados a Airtable:', data);
                const pdfLink = 'pdf_link'; // Suponiendo que la respuesta incluya el enlace del PDF
                // Completar la integración de Resend para enviar el formulario
                const resendUrl = 'https://api.resend.com/v1/send';
                const resendFormData = {
                    from: 'onboarding@resend.dev', // Correo del remitente
                    to: 'conradovilla@gmail.com', // Correo del destinatario
                    subject: 'Formulario de waiver',
                    body: `Se ha enviado el formulario de waiver. Puede descargar el PDF en el siguiente enlace: ${pdfLink}`,
                };

                console.log('Enviando correo a Resend con los siguientes datos:', resendFormData);

                fetch(resendUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${RESEND_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(resendFormData)
                })
                .then(response => response.json())
                .then(data => console.log('Email enviado correctamente'))
                .catch(error => console.error('Error al enviar email:', error));
            })
            .catch(error => console.error('Error enviando a Airtable:', error))
            .then(() => {
                console.log('Form submitted successfully!');
                this.reset();
            });
        } else {
            alert('Please fill in all required fields.');
        }
    });

    // Función para enviar el PDF por correo utilizando Resend
    function sendEmail(pdfLink) {
        const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY;
        const emailData = {
            from: 'onboarding@resend.dev', // Correo del remitente
            to: 'conradovilla@hotmail.com', // Correo del destinatario
            subject: 'Confirmación de Waiver',
            body: 'Gracias por completar el waiver.'
        };

        console.log('Enviando correo a Resend con los siguientes datos:', emailData);

        fetch('https://api.resend.com/send', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(emailData)
        })
        .then(response => response.json())
        .then(data => console.log('Email sent:', data))
        .catch(error => console.error('Error sending email:', error));
    }
});