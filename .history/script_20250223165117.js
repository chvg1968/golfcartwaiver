import SignaturePad from 'signature_pad';

document.addEventListener('DOMContentLoaded', function() {
    // Configuración del lienzo para la firma
    const canvas = document.getElementById('signature-pad');
    const signaturePad = new SignaturePad(canvas);

    // Función para limpiar la firma
    function clearSignature() {
        signaturePad.clear();
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
            fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fields: {
                        'Form Id': formData.get('form_id'), // Asegúrate de que este campo esté presente en el formulario
                        'Guest Name': formData.get('Guest Name'),
                        'Guest Email': formData.get('Guest Email'),
                        'Guest Phone': formData.get('Guest Phone'),
                        'Signature Date': formData.get('Signature Date'),
                        'Signature Check': formData.get('Signature Check'), // Asegúrate de que este campo esté presente en el formulario
                        'Signature': formData.get('Signature')
                    }
                })
            })
            .then(response => response.json())
            .then(data => {
                const pdfLink = data.pdf_link; // Suponiendo que la respuesta incluya el enlace del PDF
                sendEmail(pdfLink);
                console.log(data);
                alert('Form submitted successfully!');
                this.reset();
                // Completar la integración de Resend para enviar el formulario
                const resendUrl = 'https://api.resend.com/v1/send';
                const resendFormData = {
                    to: formData.get('guest_email'),
                    subject: 'Formulario de waiver',
                    body: `Se ha enviado el formulario de waiver. Puede descargar el PDF en el siguiente enlace: ${pdfLink}`,
                };
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
            .catch(error => console.error('Error:', error));
        } else {
            alert('Please fill in all required fields.');
        }
    });

    // Función para enviar el PDF por correo utilizando Resend
    function sendEmail(pdfLink) {
        const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY;
        const emailData = {
            to: 'example@gmail.com', // Correo genérico
            subject: 'Confirmación de Waiver',
            body: 'Gracias por completar el waiver.'
        };

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