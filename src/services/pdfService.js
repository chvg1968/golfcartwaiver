import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { supabase } from '../utils/supabaseClient';

export async function generatePDF(formElement) {
    try {
        console.log('Iniciando generación de PDF...');
        
        // Esperar a que las fuentes se carguen
        await document.fonts.ready;
        
        // Crear una copia del formulario para manipular
        const formClone = formElement.cloneNode(true);
        document.body.appendChild(formClone);
        formClone.style.width = '800px';
        formClone.style.position = 'absolute';
        formClone.style.left = '-9999px';
        formClone.style.top = '0';
        
        // Configuración de html2canvas
        const canvas = await html2canvas(formClone, {
            scale: 2,
            useCORS: true,
            logging: true,
            width: 800,
            height: formClone.scrollHeight,
            windowWidth: 800,
            windowHeight: formClone.scrollHeight
        });

        // Eliminar el clon después de capturar
        document.body.removeChild(formClone);

        // Crear el PDF
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            unit: 'mm',
            format: 'a4',
            orientation: 'portrait'
        });

        // Calcular dimensiones
        const imgWidth = 210; // A4 width in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        // Agregar la imagen al PDF
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

        // Generar el blob del PDF
        const pdfBlob = pdf.output('blob');

        // Guardar localmente
        pdf.save('waiver.pdf');

        try {
            // Subir a Supabase
            const fileName = `waiver_${Date.now()}.pdf`;
            const { data, error } = await supabase.storage
                .from('pdfs')
                .upload(fileName, pdfBlob);

            if (error) {
                console.error('Error al subir a Supabase:', error);
                throw error;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('pdfs')
                .getPublicUrl(data.path);

            console.log('PDF subido exitosamente. URL:', publicUrl);
            return publicUrl;

        } catch (uploadError) {
            console.error('Error al subir el PDF:', uploadError);
            throw new Error('Error al subir el PDF a Supabase: ' + uploadError.message);
        }

    } catch (error) {
        console.error('Error en generación de PDF:', error);
        throw new Error('Error al generar el PDF: ' + error.message);
    }
}