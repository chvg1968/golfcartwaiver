import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { supabase, uploadPDF } from '../utils/supabaseClient';

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
            width: '210mm', // Ancho estándar A4
            background: 'white',
            padding: '5mm', // Márgenes más generosos
            fontSize: '11px', // Tamaño de fuente ligeramente reducido
            lineHeight: '1.6', // Interlineado para mejor legibilidad
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
        
        // Crear PDF optimizado
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
            compress: true
        });
        
        const pageWidth = pdf.internal.pageSize.getWidth() - 40; // Márgenes más amplios
        const pageHeight = pdf.internal.pageSize.getHeight() - 40; // Márgenes más amplios
        
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
            pdf.addImage(sectionImgData, 'JPEG', 20, 20, pageWidth, pageHeight, null, 'FAST');
            
            // Añadir número de página con estilo
            pdf.setFontSize(10);
            pdf.setTextColor(100);
            pdf.text(`Page ${i + 1} of ${pageCount}`, pageWidth / 2 + 20, pageHeight + 20, { 
                align: 'center' 
            });
        }
        
        // Limpiar
        document.body.removeChild(tempContainer);

        // Guardar localmente y subir a Supabase
        const fileName = `waiver_${Date.now()}.pdf`;

        // Comprimir el PDF antes de guardarlo
        const compressedPdf = pdf.output('blob', {
            compress: true,
            compressPdf: true
        });

        // Descarga local
        pdf.save(fileName);

        // Subir a Supabase usando la función helper mejorada
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

// Ejemplo de uso
async function handlePDFUpload(pdfBlob) {
    try {
        const fileName = `waiver_${Date.now()}.pdf`;
        const publicUrl = await uploadPDF(fileName, pdfBlob);
        return publicUrl;
    } catch (error) {
        console.error('Error en la subida del PDF:', error);
        throw error;
    }
}
