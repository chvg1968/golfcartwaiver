/**
 * Servicio para enviar datos a Airtable
 */

export async function sendToAirtable(formData, pdfLink, signatureUrl) {
    try {
        // Asegurarnos de que los datos coincidan con los tipos de Airtable
        const airtableData = {
            fields: {
                'Form Id': formData.get('Form Id')?.toString() || '',
                'Signature Date': formData.get('Signature Date') || new Date().toISOString().split('T')[0],
                'Guest Name': formData.get('Guest Name')?.toString() || '',
                'License': Number, // Enviar como número
                'Issuing State': formData.get('Issuing State')?.toString() || '',
                'Address': formData.get('Address')?.toString() || '',
                'PDF Link': pdfLink,
                // La firma debe ser un array de objetos con URLs
                'Signature': signatureUrl ? [{
                    url: signatureUrl
                }] : []
            }
        };

        console.log('Enviando a Airtable:', JSON.stringify(airtableData, null, 2));

        const response = await fetch(
            `https://api.airtable.com/v0/${import.meta.env.VITE_AIRTABLE_BASE_ID}/${import.meta.env.VITE_AIRTABLE_TABLE_NAME}`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${import.meta.env.VITE_AIRTABLE_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(airtableData)
            }
        );

        const responseData = await response.json();

        if (!response.ok) {
            console.error('Respuesta detallada de Airtable:', responseData);
            throw new Error(`Error Airtable: ${responseData.error?.message || 'Error desconocido'}`);
        }

        console.log('Datos enviados exitosamente a Airtable:', responseData);
        return responseData;

    } catch (error) {
        console.error('Error detallado al enviar a Airtable:', {
            message: error.message,
            originalError: error,
            stack: error.stack
        });
        throw error;
    }
}