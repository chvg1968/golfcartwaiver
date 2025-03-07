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
        
        // Eliminar elementos innecesarios
        const elementsToRemove = formClone.querySelectorAll('button, .hide-in-pdf, [type="submit"], [type="button"]');
        elementsToRemove.forEach(el => el.parentNode && el.parentNode.removeChild(el));
        
        // Crear contenedor temporal para renderizar
        const tempContainer = document.createElement('div');
        Object.assign(tempContainer.style, {
            position: 'absolute',
            left: '-9999px',
            top: '0',
            width: '215.9mm', // Ancho carta (8.5 pulgadas)
            height: '279.4mm', // Alto carta (11 pulgadas)
            background: 'white',
            padding: '15mm', // Márgenes uniformes
            fontSize: '12px',
            lineHeight: '1.3',
            fontFamily: 'Arial, sans-serif',
            boxSizing: 'border-box',
            overflow: 'hidden'
        });
        
        // Optimizar el logo
        const logo = formClone.querySelector('img[src*="logo"], img[alt*="LUXE"]');
        if (logo) {
            logo.style.maxWidth = '120px';
            logo.style.height = 'auto';
            logo.style.display = 'block';
            logo.style.margin = '0 auto 15px auto';
            
            // Crear contenedor para el logo
            const logoContainer = document.createElement('div');
            logoContainer.style.textAlign = 'center';
            logoContainer.style.width = '100%';
            logoContainer.style.marginBottom = '10px';
            logo.parentNode.insertBefore(logoContainer, logo);
            logoContainer.appendChild(logo);
        }
        
        // Restaurar la firma
        const clonedSignaturePad = formClone.querySelector('#signature-pad');
        if (clonedSignaturePad && signatureDataUrl) {
            const signatureImg = document.createElement('img');
            signatureImg.src = signatureDataUrl;
            signatureImg.style.width = '100%';
            signatureImg.style.maxHeight = '60px';
            signatureImg.style.border = '1px solid #000';
            clonedSignaturePad.parentNode.replaceChild(signatureImg, clonedSignaturePad);
        }
        
        // Preservar estructura original
        const mainContainer = formClone.querySelector('form') || formClone;
        mainContainer.style.width = '100%';
        mainContainer.style.maxWidth = '100%';
        mainContainer.style.margin = '0';
        mainContainer.style.padding = '0';
        
        // Ajustar checkboxes y sus labels
        const checkboxes = formClone.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.style.margin = '3px 5px 3px 0';
            checkbox.style.verticalAlign = 'middle';
            checkbox.style.display = 'inline';
            checkbox.style.float = 'left';
            checkbox.style.width = 'auto';
            
            // Ajustar el label asociado
            const label = checkbox.parentElement;
            if (label && label.tagName === 'LABEL') {
                label.style.display = 'block';
                label.style.clear = 'both';
                label.style.marginBottom = '10px';
                label.style.overflow = 'hidden';
            }
        });
        
        // Ajustar campos de texto
        const textInputs = formClone.querySelectorAll('input[type="text"], input:not([type])');
        textInputs.forEach(input => {
            input.style.display = 'block';
            input.style.width = '100%';
            input.style.boxSizing = 'border-box';
            input.style.marginBottom = '5px';
            input.style.padding = '3px';
            input.style.border = '1px solid #666';
        });
        
        // Ajustar campos del Guest
        const guestFields = formClone.querySelectorAll('input[name="Guest Name"], input[name="License"], input[name="Issuing State"], input[name="Address"]');
        guestFields.forEach(field => {
            field.style.display = 'block';
            field.style.width = '100%';
            field.style.border = '1px solid #333';
            field.style.padding = '5px';
            field.style.marginBottom = '8px';
            field.style.backgroundColor = '#f9f9f9';
        });
        
        // Ajustar párrafos para evitar formato columnas
        const paragraphs = formClone.querySelectorAll('p');
        paragraphs.forEach(p => {
            p.style.columnCount = '1';
            p.style.columns = 'auto';
            p.style.display = 'block';
            p.style.width = '100%';
            p.style.textAlign = 'left';
            p.style.margin = '5px 0';
            p.style.clear = 'both';
        });
        
        // Asegurar que los textos largos no se dividan en columnas
        const textContainers = formClone.querySelectorAll('div, span, label');
        textContainers.forEach(container => {
            container.style.columnCount = '1';
            container.style.columns = 'auto';
            container.style.width = '100%';
            container.style.boxSizing = 'border-box';
        });
        
        // Ajustar encabezados
        const headings = formClone.querySelectorAll('h1, h2, h3, h4, h5, h6');
        headings.forEach(heading => {
            heading.style.textAlign = 'center';
            heading.style.margin = '10px 0';
            heading.style.clear = 'both';
        });
        
        tempContainer.appendChild(formClone);
        document.body.appendChild(tempContainer);
        
        // Configuración para html2canvas
        const html2canvasOptions = {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: 'white',
            allowTaint: true,
            width: tempContainer.offsetWidth,
            height: tempContainer.offsetHeight
        };
        
        // Renderizar a canvas
        const canvas = await html2canvas(tempContainer, html2canvasOptions);
        
        // Crear PDF
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'letter',
            compress: true
        });
        
        // Dimensiones de la página
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        
        // Calcular proporciones
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const ratio = canvasWidth / canvasHeight;
        
        // Calcular dimensiones para ajustar a una página
        const pdfWidth = pageWidth - 20; // 10mm de margen a cada lado
        let pdfHeight = pdfWidth / ratio;
        
        // Asegurar que cabe en una página
        if (pdfHeight > pageHeight - 20) {
            pdfHeight = pageHeight - 20; // 10mm de margen arriba y abajo
        }
        
        // Añadir imagen al PDF
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        pdf.addImage(imgData, 'JPEG', 10, 10, pdfWidth, pdfHeight);
        
        // Limpiar
        document.body.removeChild(tempContainer);
        
        // Generar nombre de archivo
        const fileName = `waiver_${Date.now()}.pdf`;
        
        // Comprimir el PDF
        const compressedPdf = pdf.output('blob', {
            compress: true
        });
        
        // Subir a Supabase
        try {
            const publicUrl = await uploadPDF(fileName, compressedPdf);
            return publicUrl || null;
        } catch (uploadError) {
            console.error('Error al subir PDF:', uploadError);
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
