import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { supabase } from '../utils/supabaseClient';

export async function generatePDF(formElement) {
    try {
        console.log('Iniciando generación de PDF optimizado...');
        await document.fonts.ready;

        // Clonar el formulario
        const formClone = formElement.cloneNode(true);

        // Manejar específicamente el canvas de la firma
        const originalSignature = formElement.querySelector('#signature-pad');
        const clonedSignature = formClone.querySelector('#signature-pad');
        
        if (originalSignature && clonedSignature) {
            // Copiar el contenido de la firma
            const signatureContext = clonedSignature.getContext('2d');
            signatureContext.drawImage(originalSignature, 0, 0);
        }

        // Configurar el contenedor
        const mainContainer = document.createElement('div');
        Object.assign(mainContainer.style, {
            position: 'absolute',
            left: '-9999px',
            top: '0',
            width: '210mm',
            background: 'white',
            padding: '20px',
            boxSizing: 'border-box'
        });

        mainContainer.appendChild(formClone);
        document.body.appendChild(mainContainer);

        // Capturar el contenido
        const canvas = await html2canvas(mainContainer, {
            scale: 1.5, // Reducido para optimizar
            useCORS: true,
            logging: false,
            width: mainContainer.offsetWidth,
            height: mainContainer.offsetHeight,
            imageTimeout: 0,
            backgroundColor: 'white',
            onclone: (clonedDoc) => {
                // Asegurar que la firma se renderice correctamente
                const signaturePad = clonedDoc.querySelector('#signature-pad');
                if (signaturePad) {
                    signaturePad.style.backgroundColor = 'white';
                }
            }
        });

        document.body.removeChild(mainContainer);

        // Configurar el PDF
        const pdf = new jsPDF({
            unit: 'mm',
            format: 'a4',
            orientation: 'portrait',
            compress: true
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 20; // Aumentado para mejor estética

        // Calcular dimensiones manteniendo proporción
        const imgWidth = pageWidth - (margin * 2);
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        // Dividir en páginas con mejor manejo de márgenes
        let heightLeft = imgHeight;
        let position = margin;
        let page = 1;

        // Optimizar calidad/tamaño de imagen
        const imgData = canvas.toDataURL('image/jpeg', 0.8);

        // Primera página
        pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);

        // Páginas adicionales con márgenes superiores
        while (heightLeft > pageHeight - margin) {
            pdf.addPage();
            position = -(pageHeight * page) + (margin * 2); // Agregar margen superior
            pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
            heightLeft -= (pageHeight - margin * 2);
            page++;

            // Agregar número de página
            pdf.setFontSize(10);
            pdf.text(`Página ${page}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        }

        // Generar y subir el PDF
        const pdfBlob = pdf.output('blob');
        const fileName = `waiver_${Date.now()}.pdf`;

        const { data, error } = await supabase.storage
            .from('pdfs')
            .upload(fileName, pdfBlob, {
                contentType: 'application/pdf',
                cacheControl: '3600'
            });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
            .from('pdfs')
            .getPublicUrl(data.path);

        console.log('PDF optimizado generado y subido. Tamaño:', pdfBlob.size / 1024, 'KB');

        return publicUrl;

    } catch (error) {
        console.error('Error en generación de PDF:', error);
        throw new Error('Error al generar el PDF: ' + error.message);
    }
}