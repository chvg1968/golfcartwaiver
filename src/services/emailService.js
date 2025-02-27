export async function sendEmail(formData, pdfLink) {
    try {
        // Preparar datos para enviar a la función serverless
        const emailPayload = {
            formData: {
                guestName: formData.get('Guest Name') || 'No proporcionado',
                license: formData.get('License') || 'No proporcionado',
                issuingState: formData.get('Issuing State') || 'No proporcionado',
                address: formData.get('Address') || 'No proporcionado',
                formId: formData.get('Form Id') || Date.now().toString()
            },
            pdfLink: pdfLink
        };

        const response = await fetch('/.netlify/functions/send-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(emailPayload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Error al enviar email: ${response.status} - ${errorData.error}`);
        }

        const data = await response.json();
        return { success: true, data };

    } catch (error) {
        console.error('Error enviando email:', error);
        throw error;
    }
}
