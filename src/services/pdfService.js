import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { supabase } from '../utils/supabaseClient';

export async function generatePDF(formElement) {
    try {
        console.log('Iniciando generación de PDF...');
        await document.fonts.ready;

        // Capturar la firma antes de clonar
        const originalSignature = formElement.querySelector('#signature-pad');
        const signatureDataUrl = originalSignature ? originalSignature.toDataURL() : null;

        // Dividir el contenido en secciones
        const contentHeight = 1000; // Alto máximo por página en píxeles
        const sections = [];
        let currentSection = document.createElement('div');
        let currentHeight = 0;

        Array.from(formElement.children).forEach(child => {
            const clone = child.cloneNode(true);
            
            // Si es el contenedor de firma, restaurar la firma
            if (clone.querySelector('#signature-pad')) {
                const clonedCanvas = clone.querySelector('#signature-pad');
                if (signatureDataUrl) {
                    const img = new Image();
                    img.src = signatureDataUrl;
                    img.onload = () => {
                        const ctx = clonedCanvas.getContext('2d');
                        ctx.drawImage(img, 0, 0);
                    };
                }
            }

            if (currentHeight + child.offsetHeight > contentHeight) {
                sections.push(currentSection);
                currentSection = document.createElement('div');
                currentHeight = 0;
            }
            currentHeight += child.offsetHeight;
            currentSection.appendChild(clone);
        });
        sections.push(currentSection);

        // Configurar el PDF
        const pdf = new jsPDF({
            unit: 'mm',
            format: 'a4',
            orientation: 'portrait',
            compress: true
        });

        // Procesar cada sección
        for (let i = 0; i < sections.length; i++) {
            const section = sections[i];
            
            // Contenedor temporal
            const tempContainer = document.createElement('div');
            Object.assign(tempContainer.style, {
                position: 'absolute',
                left: '-9999px',
                top: '0',
                width: '210mm',
                background: 'white',
                padding: '20mm 20mm' // Márgenes
            });
            
            tempContainer.appendChild(section);
            document.body.appendChild(tempContainer);

            // Modificar la configuración de html2canvas
            const canvas = await html2canvas(tempContainer, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: 'white',
                onclone: (clonedDoc) => {
                    const signaturePad = clonedDoc.querySelector('#signature-pad');
                    if (signaturePad && signatureDataUrl) {
                        const img = new Image();
                        img.src = signatureDataUrl;
                        const ctx = signaturePad.getContext('2d');
                        ctx.drawImage(img, 0, 0);
                    }
                }
            });

            // Optimizar y agregar al PDF
            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 20;

            if (i > 0) pdf.addPage();

            // Calcular dimensiones manteniendo proporción
            const imgWidth = pageWidth - (margin * 2);
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            pdf.addImage(imgData, 'JPEG', margin, margin, imgWidth, imgHeight);
            
            // Agregar número de página
            pdf.setFontSize(10);
            pdf.text(`Página ${i + 1} de ${sections.length}`, pageWidth / 2, pageHeight - 10, { 
                align: 'center' 
            });

            document.body.removeChild(tempContainer);
        }

        // Guardar localmente y subir a Supabase
        const fileName = `waiver_${Date.now()}.pdf`;
        
        // Descarga local
        pdf.save(fileName);

        // Subir a Supabase
        const pdfBlob = pdf.output('blob');
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

        console.log('PDF generado y subido. Tamaño:', pdfBlob.size / 1024, 'KB');
        return publicUrl;

    } catch (error) {
        console.error('Error en generación de PDF:', error);
        throw new Error('Error al generar el PDF: ' + error.message);
    }
}