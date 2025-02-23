document.addEventListener('DOMContentLoaded', function() {
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

            // Convertir el canvas de firma a imagen y agregar a formData
            const canvas = document.getElementById('signature-pad');
            const signatureData = canvas.toDataURL();
            formData.append('signature', signatureData);

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
                        form_id: formData.get('form_id'),
                        guest_name: formData.get('guest_name'),
                        guest_email: formData.get('guest_email'),
                        guest_phone: formData.get('guest_phone'),
                        signature_date: formData.get('signature_date'),
                        signature: formData.get('signature')
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
        fetch('https://api.resend.com/send', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                to: 'conradovilla@hotmail.com',
                subject: 'Golf Cart Waiver',
                body: 'Attached is the signed waiver.\nLink to PDF: ' + pdfLink
            })
        })
        .then(response => response.json())
        .then(data => console.log('Email sent:', data))
        .catch(error => console.error('Error sending email:', error));
    }
});