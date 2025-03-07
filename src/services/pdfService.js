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
        
        // Restaurar la firma en el clon con altura reducida
        const clonedSignaturePad = formClone.querySelector('#signature-pad');
        if (clonedSignaturePad && signatureDataUrl) {
            // Reemplazar el canvas con una imagen para mejor rendimiento
            const signatureImg = document.createElement('img');
            signatureImg.src = signatureDataUrl;
            signatureImg.style.width = '100%';
            signatureImg.style.height = '80px'; // Reducir altura de la firma
            signatureImg.style.objectFit = 'contain'; // Mantener proporción
            signatureImg.style.border = '1px solid #000';
            clonedSignaturePad.parentNode.replaceChild(signatureImg, clonedSignaturePad);
            
            // Ajustar también el contenedor de la firma si existe
            const signatureContainer = signatureImg.closest('.signature-container');
            if (signatureContainer) {
                signatureContainer.style.height = 'auto';
                signatureContainer.style.maxHeight = '100px'; // Limitar altura máxima
            }
        }

        // Crear contenedor temporal para renderizar (optimizado para carta)
        const tempContainer = document.createElement('div');
        Object.assign(tempContainer.style, {
            position: 'absolute',
            left: '-9999px',
            top: '0',
            width: '215.9mm', // Ancho exacto tamaño carta (8.5 pulgadas)
            maxHeight: '279.4mm', // Alto exacto tamaño carta (11 pulgadas)
            background: 'white',
            padding: '12.7mm', // Márgenes de 0.5 pulgadas
            fontSize: '10px', // Tamaño de fuente reducido para ajustar mejor
            lineHeight: '1.3', // Interlineado más compacto
            fontFamily: 'Arial, sans-serif',
            boxSizing: 'border-box' // Incluir padding en el cálculo del tamaño
        });
        
        // Compactar elementos del formulario para ajustar mejor a una página
        const formElements = formClone.querySelectorAll('div, p, h1, h2, h3, input, textarea, label');
        formElements.forEach(el => {
            // Reducir márgenes y padding
            if (el.style) {
                el.style.marginBottom = el.style.marginBottom ? '0.3em' : '';
                el.style.marginTop = el.style.marginTop ? '0.3em' : '';
                el.style.paddingBottom = el.style.paddingBottom ? '0.2em' : '';
                el.style.paddingTop = el.style.paddingTop ? '0.2em' : '';
            }
        });
        
        tempContainer.appendChild(formClone);
        document.body.appendChild(tempContainer);

        // Configuración altamente optimizada para html2canvas (ajustada para carta)
        const html2canvasOptions = {
            scale: 2, // Mayor escala para mejor nitidez
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
            fontRendering: 'optimizeLegibility',
            // Optimizaciones para ajuste de página
            windowWidth: 816, // 8.5 pulgadas a 96 DPI
            windowHeight: 1056, // 11 pulgadas a 96 DPI
            x: 0,
            y: 0,
            width: 816,
            height: 1056,
            scrollX: 0,
            scrollY: 0
        };

        // Renderizar a canvas con configuración optimizada
        const canvas = await html2canvas(tempContainer, html2canvasOptions);
        
        // Crear PDF optimizado para Letter con ajustes precisos
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'letter',
            compress: true,
            hotfixes: ['px_scaling'] // Corregir problemas de escala
        });
        
        // Dimensiones exactas de carta con márgenes
        const pageWidth = pdf.internal.pageSize.getWidth() - 25.4; // 1 pulgada de margen total (0.5 en cada lado)
        const pageHeight = pdf.internal.pageSize.getHeight() - 25.4; // 1 pulgada de margen total (0.5 en cada lado)
        
        // Intentar ajustar todo a una sola página
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        
        // Determinar si necesitamos escalar para ajustar a una página
        const ratio = canvasWidth / canvasHeight;
        const pdfWidth = pageWidth;
        let pdfHeight = pdfWidth / ratio;
        
        // Forzar a una sola página si es posible
        let pageCount = 1;
        let scale = 1;
        
        if (pdfHeight > pageHeight) {
            // Si el contenido es más alto que la página, escalamos para ajustar
            scale = pageHeight / pdfHeight;
            pdfHeight = pageHeight;
            console.log('Escalando contenido para ajustar a una página:', scale);
        }
        
        // Añadir imagen al PDF con márgenes precisos
        const imgData = canvas.toDataURL('image/jpeg', 0.85); // Mayor calidad
        
        // Centrar en la página
        const xPos = (pdf.internal.pageSize.getWidth() - pdfWidth) / 2;
        const yPos = (pdf.internal.pageSize.getHeight() - pdfHeight) / 2;
        
        pdf.addImage(imgData, 'JPEG', xPos, yPos, pdfWidth, pdfHeight, null, 'FAST');
        
        // Añadir metadatos al PDF
        pdf.setProperties({
            title: 'Golf Cart Liability Waiver',
            subject: 'Liability Waiver',
            creator: 'LUXE PROPERTIES',
            author: 'LUXE PROPERTIES'
        });
        
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
