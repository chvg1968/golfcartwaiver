/**
 * Servicio para enviar datos a Airtable
 */

export async function sendToAirtable(formData, pdfLink) {
    try {
        // Asegurarnos de que los datos coincidan con los tipos de Airtable
        const airtableData = {
            fields: {
                'Form Id': formData.get('Form Id')?.toString() || '',
                'Signature Date': formData.get('Signature Date') || new Date().toISOString().split('T')[0],
                'Guest Name': formData.get('Guest Name')?.toString() || '',
                'License': formData.get('License') ? Number(formData.get('License')) : '', // Enviar como número
                'Issuing State': formData.get('Issuing State')?.toString() || '',
                'Address': formData.get('Address')?.toString() || '',
                'PDF Link': pdfLink
            }
        };

        // Corregir el acceso a la variable de entorno
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

        return responseData;

    } catch (error) {
        console.error('Error enviando datos a Airtable:', error);
        throw error;
    }
}
