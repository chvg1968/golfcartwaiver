import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { supabase, uploadPDF } from '../utils/supabaseClient';

export async function generatePDF(formElement) {
    try {
        console.log('Iniciando generación de PDF optimizado...');
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
                img.style.imageRendering = 'auto';
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
            padding: '10mm', // Márgenes
            fontSize: '12px' // Reducir tamaño de fuente
        });
        
        tempContainer.appendChild(formClone);
        document.body.appendChild(tempContainer);

        // Configuración altamente optimizada para html2canvas
        const html2canvasOptions = {
            scale: 1.2, // Reducido para disminuir el tamaño
            useCORS: true,
            logging: false,
            backgroundColor: 'white',
            willReadFrequently: true,
            imageTimeout: 0,
            removeContainer: true, // Eliminar contenedor después de renderizar
            letterRendering: true, // Desactivar para mejorar rendimiento
            allowTaint: true, // Permitir imágenes del mismo origen sin restricciones
            foreignObjectRendering: false // Desactivar para compatibilidad
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
        
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        
        // Calcular dimensiones para mantener la proporción
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const ratio = canvasWidth / canvasHeight;
        const pdfWidth = pageWidth;
        const pdfHeight = pdfWidth / ratio;
        
        // Si el contenido es demasiado largo, dividirlo en múltiples páginas
        if (pdfHeight > pageHeight) {
            const pageCount = Math.ceil(pdfHeight / pageHeight);
            console.log(`Contenido dividido en ${pageCount} páginas`);
            
            for (let i = 0; i < pageCount; i++) {
                if (i > 0) pdf.addPage();
                
                // Calcular qué parte del canvas mostrar en esta página
                const sourceY = (i * canvasHeight / pageCount);
                const sourceHeight = canvasHeight / pageCount;
                
                // Convertir a JPEG con baja calidad para reducir tamaño
                const imgData = canvas.toDataURL('image/jpeg', 0.5);
                
                // Crear una imagen temporal para recortar la sección correcta
                const tempImg = new Image();
                tempImg.src = imgData;
                
                // Esperar a que la imagen cargue
                await new Promise(resolve => {
                    tempImg.onload = resolve;
                });
                
                // Crear un canvas temporal para la sección
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = canvasWidth;
                tempCanvas.height = sourceHeight;
                const tempCtx = tempCanvas.getContext('2d');
                
                // Dibujar solo la sección relevante
                tempCtx.drawImage(
                    tempImg, 
                    0, sourceY, canvasWidth, sourceHeight,
                    0, 0, canvasWidth, sourceHeight
                );
                
                // Convertir a JPEG con baja calidad
                const sectionImgData = tempCanvas.toDataURL('image/jpeg', 0.5);
                
                // Añadir al PDF
                pdf.addImage(sectionImgData, 'JPEG', 0, 0, pageWidth, pageHeight, null, 'FAST');
                
                // Añadir número de página
                pdf.setFontSize(8);
                pdf.text(`Página ${i + 1} de ${pageCount}`, pageWidth / 2, pageHeight - 5, { 
                    align: 'center' 
                });
            }
        } else {
            // Si cabe en una página, simplemente añadir la imagen
            const imgData = canvas.toDataURL('image/jpeg', 0.5);
            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, null, 'FAST');
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

        console.log('PDF generado localmente, tamaño:', compressedPdf.size / 1024, 'KB');

        // Subir a Supabase usando la función helper mejorada
        try {
            const fileName = `waiver_${Date.now()}.pdf`;
            const publicUrl = await uploadPDF(fileName, compressedPdf);
            
            if (publicUrl) {
                console.log('PDF subido exitosamente:', publicUrl);
                return publicUrl;
            } else {
                console.log('No se pudo subir el PDF a Supabase');
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
