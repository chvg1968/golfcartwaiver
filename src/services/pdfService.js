import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { supabase, uploadPDF } from '../utils/supabaseClient';

// Función para generar PDF sin descargar inmediatamente
export async function createPDF(formData) {
    try {
        // Convertir datos de FormData a objeto si es necesario
        const data = formData instanceof FormData 
            ? Object.fromEntries(formData.entries())
            : formData;

        // Crear documento PDF
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        // Configurar estilos de fuente
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');

        // Añadir título
        doc.setFontSize(16);
        doc.text('Golf Cart Liability Waiver', 105, 20, { align: 'center' });

        // Añadir detalles del formulario
        doc.setFontSize(12);
        const startY = 40;
        const lineHeight = 10;

        const fields = [
            { label: 'Nombre', value: data['Guest Name'] || 'No especificado' },
            { label: 'Licencia', value: data['License'] || 'No especificado' },
            { label: 'Estado que Emite', value: data['Issuing State'] || 'No especificado' },
            { label: 'Dirección', value: data['Address'] || 'No especificada' },
            { label: 'Fecha de Firma', value: data['Signature Date'] || new Date().toLocaleDateString() }
        ];

        fields.forEach((field, index) => {
            doc.text(`${field.label}: ${field.value}`, 20, startY + index * lineHeight);
        });

        // Generar un nombre de archivo único
        const fileName = `waiver_${Date.now()}.pdf`;

        // Convertir PDF a Blob
        const pdfBlob = doc.output('blob');

        // Crear URL temporal para el PDF
        const pdfUrl = URL.createObjectURL(pdfBlob);

        // Devolver la URL del PDF sin descargar
        return pdfUrl;

    } catch (error) {
        console.error('Error al generar PDF:', error);
        throw error;
    }
}

// Función de generación de PDF compatible con el código anterior
export async function generatePDF(formElement) {
    try {
        await document.fonts.ready;

        // Capturar la firma antes de clonar
        const originalSignature = formElement.querySelector('#signature-pad');
        const signatureDataUrl = originalSignature ? originalSignature.toDataURL() : null;

        // Crear una copia del formulario para manipular
        const formClone = formElement.cloneNode(true);
        
        // Optimizar imágenes en el clon
        const images = formClone.querySelectorAll('img');
        images.forEach(img => {
            // Reducir calidad de las imágenes si no son la firma
            if (!img.closest('.signature-container')) {
                img.style.maxWidth = '300px'; // Limitar tamaño máximo
                img.style.imageRendering = 'crisp-edges';
            }
        });
        
        // Restaurar la firma en el clon
        const clonedSignaturePad = formClone.querySelector('#signature-pad');
        if (clonedSignaturePad && signatureDataUrl) {
            // Reemplazar el canvas con una imagen para mejor rendimiento
            const signatureImg = document.createElement('img');
            signatureImg.src = signatureDataUrl;
            signatureImg.style.width = '100%';
            signatureImg.style.height = 'auto';
            signatureImg.style.border = '1px solid #000';
            clonedSignaturePad.parentNode.replaceChild(signatureImg, clonedSignaturePad);
        }

        // Crear contenedor temporal para renderizar
        const tempContainer = document.createElement('div');
        Object.assign(tempContainer.style, {
            position: 'absolute',
            left: '-9999px',
            top: '0',
            width: '216mm', // Ancho estándar Letter
            background: 'white',
            padding: '10mm', // Márgenes reducidos
            fontSize: '11px', // Tamaño de fuente ligeramente reducido
            lineHeight: '1.5', // Interlineado para mejor legibilidad
            fontFamily: 'Arial, sans-serif' // Fuente más legible
        });
        
        tempContainer.appendChild(formClone);
        document.body.appendChild(tempContainer);

        // Configuración altamente optimizada para html2canvas
        const html2canvasOptions = {
            scale: 1.5, // Ligeramente aumentado para mejor nitidez
            useCORS: true,
            logging: false,
            backgroundColor: 'white',
            willReadFrequently: true,
            imageTimeout: 0,
            removeContainer: true,
            allowTaint: true,
            foreignObjectRendering: false,
            // Mejora de renderizado de texto
            textRendering: 'optimizeLegibility',
            fontRendering: 'optimizeLegibility'
        };

        // Renderizar a canvas con configuración optimizada
        const canvas = await html2canvas(tempContainer, html2canvasOptions);
        
        // Crear PDF optimizado para Letter
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'letter',
            compress: true
        });
        
        const pageWidth = pdf.internal.pageSize.getWidth() - 20; // Márgenes laterales
        const pageHeight = pdf.internal.pageSize.getHeight() - 20; // Márgenes verticales
        
        // Calcular dimensiones para mantener la proporción
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const ratio = canvasWidth / canvasHeight;
        const pdfWidth = pageWidth;
        const pdfHeight = pdfWidth / ratio;
        
        // Si el contenido es demasiado largo, dividirlo en múltiples páginas
        const pageCount = Math.ceil(pdfHeight / pageHeight);
        
        for (let i = 0; i < pageCount; i++) {
            if (i > 0) pdf.addPage();
            
            // Calcular qué parte del canvas mostrar en esta página
            const sourceY = Math.floor((i * canvasHeight) / pageCount);
            const sourceHeight = Math.floor(canvasHeight / pageCount);
            
            // Crear un canvas temporal para la sección
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvasWidth;
            tempCanvas.height = sourceHeight;
            const tempCtx = tempCanvas.getContext('2d');
            
            // Dibujar solo la sección relevante
            tempCtx.drawImage(
                canvas, 
                0, sourceY, canvasWidth, sourceHeight,
                0, 0, canvasWidth, sourceHeight
            );
            
            // Convertir a JPEG con calidad optimizada
            const sectionImgData = tempCanvas.toDataURL('image/jpeg', 0.7);
            
            // Añadir al PDF con márgenes
            pdf.addImage(sectionImgData, 'JPEG', 10, 10, pageWidth, pageHeight, null, 'FAST');
            
            // Añadir número de página con estilo
            pdf.setFontSize(9);
            pdf.setTextColor(100);
            pdf.text(`Page ${i + 1} of ${pageCount}`, pageWidth / 2 + 10, pageHeight + 10, { 
                align: 'center' 
            });
        }
        
        // Limpiar
        document.body.removeChild(tempContainer);

        // Generar un nombre de archivo único
        const fileName = `waiver_${Date.now()}.pdf`;

        // Comprimir el PDF antes de guardarlo
        const compressedPdf = pdf.output('blob', {
            compress: true,
            compressPdf: true
        });

        // Subir a Supabase usando la función helper
        try {
            const publicUrl = await uploadPDF(fileName, compressedPdf);
            
            if (publicUrl) {
                return publicUrl;
            } else {
                console.error('No se pudo subir el PDF a Supabase');
                return null;
            }
        } catch (uploadError) {
            console.error('Error inesperado al subir PDF:', uploadError);
            return null;
        }

    } catch (error) {
        console.error('Error en generación de PDF:', error);
        throw error;
    }
}

// Función para descargar PDF (opcional, si se necesita)
export function downloadPDF(pdfUrl, fileName = 'waiver.pdf') {
    try {
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        console.error('Error al descargar PDF:', error);
    }
}
