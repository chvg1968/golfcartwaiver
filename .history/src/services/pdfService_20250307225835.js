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
                img.style.maxWidth = '200px'; // Reducir tamaño máximo del logo
                img.style.height = 'auto'; // Mantener proporción del logo
                img.style.objectFit = 'contain'; // Mantener proporción
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
            padding: '8mm', // Márgenes más reducidos
            fontSize: '14px', // Tamaño de fuente más pequeño
            lineHeight: '1.2', // Interlineado más compacto
            fontFamily: 'Arial, sans-serif' // Fuente más legible
        });
        
        tempContainer.appendChild(formClone);
        document.body.appendChild(tempContainer);

        // Configuración altamente optimizada para html2canvas
        const html2canvasOptions = {
            scale: 1.2, // Reducido para evitar contenido excesivo
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
        
        // Ajustar el contenido para que quepa en una sola página
        // Calcular factor de escala para asegurar que todo quepa en una página
        let scaleFactor = 1;
        if (pdfHeight > pageHeight) {
            scaleFactor = pageHeight / pdfHeight;
        }
        
        // Ajustar dimensiones para una sola página
        const adjustedWidth = pdfWidth * scaleFactor;
        const adjustedHeight = pdfHeight * scaleFactor;
        
        // Convertir a JPEG con calidad optimizada
        const imgData = canvas.toDataURL('image/jpeg', 0.8);
        
        // Añadir al PDF con márgenes, centrado si es necesario
        const xOffset = (pageWidth - adjustedWidth) / 2 + 10;
        pdf.addImage(imgData, 'JPEG', xOffset, 10, adjustedWidth, adjustedHeight, null, 'FAST');
        
        // No añadimos número de página ya que ahora solo hay una
        
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
