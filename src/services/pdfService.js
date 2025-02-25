import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { supabase } from '../utils/supabaseClient';

export async function generatePDF(formElement) {
    try {
        console.log('Iniciando generación de PDF optimizado...');

        await document.fonts.ready;

        const formClone = formElement.cloneNode(true);

        const mainContainer = document.createElement('div');
        Object.assign(mainContainer.style, {
            position: 'absolute',
            left: '-9999px',
            top: '0',
            width: '210mm',
            minHeight: '297mm',
            background: 'white',
            padding: '20px',
            boxSizing: 'border-box'
        });

        mainContainer.appendChild(formClone);
        document.body.appendChild(mainContainer);

        const canvas = await html2canvas(mainContainer, {
            scale: 2,
            useCORS: true,
            logging: false,
            width: mainContainer.offsetWidth,
            height: mainContainer.offsetHeight,
            imageTimeout: 0,
            backgroundColor: 'white',
        });

        document.body.removeChild(mainContainer);

        const imgData = canvas.toDataURL('image/png', 1.0);

        const pdf = new jsPDF({
            unit: 'mm',
            format: 'a4',
            orientation: 'portrait',
            compress: true
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 10;

        const imgWidth = pageWidth - (margin * 2);
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        let heightLeft = imgHeight;
        let position = margin;
        let page = 1;

        pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);

        while (heightLeft > pageHeight) {
            pdf.addPage();
            position = -(pageHeight * page) + margin;
            pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
            page++;
        }

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

        // Descargar el PDF directamente desde el blob
        const url = window.URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        window.URL.revokeObjectURL(url); // Limpiar la URL creada

        return publicUrl;

    } catch (error) {
        console.error('Error en generación de PDF:', error);
        throw new Error('Error al generar el PDF: ' + error.message);
    }
}