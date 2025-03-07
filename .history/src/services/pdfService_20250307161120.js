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
// Reemplaza la función generatePDF completa con esta versión:

export async function generatePDF(formElement) {
    try {
        await document.fonts.ready;

        // Capturar la firma antes de clonar
        const originalSignature = formElement.querySelector('#signature-pad');
        const signatureDataUrl = originalSignature ? originalSignature.toDataURL() : null;

        // Crear una copia del formulario para manipular
        const formClone = formElement.cloneNode(true);
        
        // Eliminar elementos innecesarios o redundantes para el PDF
        const elementsToRemove = formClone.querySelectorAll('button, .hide-in-pdf, [type="submit"], [type="button"]');
        elementsToRemove.forEach(el => el.parentNode && el.parentNode.removeChild(el));
        
        // Optimizar imágenes en el clon con especial atención al logo
        const images = formClone.querySelectorAll('img');
        images.forEach(img => {
            // Tratamiento especial para el logo (asumiendo que es la primera imagen o tiene una clase/id específico)
            if (img.src && (img.src.includes('logo') || img.alt && img.alt.includes('LUXE') || img === images[0])) {
                // Preservar proporciones del logo con tamaño adecuado
                img.style.maxWidth = '110px';
                img.style.width = '110px'; // Ancho fijo adecuado
                img.style.height = 'auto';
                img.style.objectFit = 'contain';
                img.style.display = 'block';
                img.style.margin = '0 auto 10px auto'; // Centrar logo con margen inferior adecuado
                img.style.imageRendering = 'high-quality';
                
                // Crear un contenedor para el logo si no existe y asegurar que esté centrado
                const parent = img.parentNode;
                if (parent && !parent.classList.contains('logo-container')) {
                    const logoContainer = document.createElement('div');
                    logoContainer.className = 'logo-container';
                    logoContainer.style.textAlign = 'center';
                    logoContainer.style.width = '100%';
                    logoContainer.style.margin = '5px auto 10px auto'; // Margen adecuado
                    logoContainer.style.display = 'flex';
                    logoContainer.style.justifyContent = 'center';
                    logoContainer.style.alignItems = 'center';
                    parent.insertBefore(logoContainer, img);
                    logoContainer.appendChild(img);
                }
            } 
            // Otras imágenes que no son la firma
            else if (!img.closest('.signature-container')) {
                img.style.maxWidth = '150px';
                img.style.height = 'auto';
                img.style.maxHeight = '60px';
                img.style.objectFit = 'contain';
                img.style.imageRendering = 'crisp-edges';
            }
        });
        
        // Restaurar la firma en el clon con altura muy reducida
        const clonedSignaturePad = formClone.querySelector('#signature-pad');
        if (clonedSignaturePad && signatureDataUrl) {
            // Reemplazar el canvas con una imagen para mejor rendimiento
            const signatureImg = document.createElement('img');
            signatureImg.src = signatureDataUrl;
            signatureImg.style.width = '100%';
            signatureImg.style.height = '60px'; // Reducir aún más la altura de la firma
            signatureImg.style.objectFit = 'contain'; // Mantener proporción
            signatureImg.style.border = '1px solid #000';
            clonedSignaturePad.parentNode.replaceChild(signatureImg, clonedSignaturePad);
            
            // Ajustar también el contenedor de la firma si existe
            const signatureContainer = signatureImg.closest('.signature-container');
            if (signatureContainer) {
                signatureContainer.style.height = 'auto';
                signatureContainer.style.maxHeight = '70px'; // Limitar altura máxima aún más
                signatureContainer.style.marginBottom = '5px';
                signatureContainer.style.marginTop = '5px';
            }
        }

        // Crear contenedor temporal para renderizar (optimizado para carta con márgenes balanceados)
        const tempContainer = document.createElement('div');
        Object.assign(tempContainer.style, {
            position: 'absolute',
            left: '-9999px',
            top: '0',
            width: '215.9mm', // Ancho completo tamaño carta (8.5 pulgadas)
            maxHeight: '279.4mm', // Alto exacto tamaño carta (11 pulgadas)
            background: 'white',
            padding: '10mm 15mm', // Márgenes laterales más amplios para mejor legibilidad
            fontSize: '11px', // Tamaño de fuente más grande para mejor legibilidad
            lineHeight: '1.4', // Interlineado más amplio
            fontFamily: 'Arial, sans-serif',
            boxSizing: 'border-box', // Incluir padding en el cálculo del tamaño
            overflow: 'hidden', // Asegurar que no haya desbordamiento
            maxWidth: '215.9mm', // Usar ancho completo
            margin: '0 auto' // Centrado
        });
        
        // PRESERVAR ESTRUCTURA ORIGINAL - Mínimas modificaciones de estilo
        const allElements = formClone.querySelectorAll('*');
        allElements.forEach(el => {
            if (el.style) {
                // Ajustes mínimos para mantener estructura
                el.style.maxWidth = '100%';
                
                // Centrar elementos de título y encabezados
                if (el.tagName && el.tagName.match(/^H[1-6]$/)) {
                    el.style.textAlign = 'center';
                    el.style.fontWeight = 'bold';
                    el.style.marginTop = '5px';
                    el.style.marginBottom = '5px';
                }
                
                // Preservar estructura de checkboxes y sus labels
                if (el.tagName === 'INPUT' && el.type === 'checkbox') {
                    el.style.margin = '3px';
                    el.style.verticalAlign = 'middle';
                    el.style.display = 'inline-block';
                    el.style.float = 'none';
                    
                    // Buscar el label asociado y preservar su estructura
                    const parentLabel = el.closest('label');
                    if (parentLabel) {
                        parentLabel.style.display = 'flex';
                        parentLabel.style.alignItems = 'flex-start';
                        parentLabel.style.marginBottom = '5px';
                        parentLabel.style.marginTop = '5px';
                    }
                }
                
                // Preservar estructura de campos de texto
                if (el.tagName === 'INPUT' && (el.type === 'text' || !el.type)) {
                    el.style.display = 'block';
                    el.style.width = '100%';
                    el.style.boxSizing = 'border-box';
                    el.style.marginBottom = '5px';
                    el.style.marginTop = '5px';
                    el.style.border = '1px solid #666';
                }
            }
        });
        
        // Buscar el contenedor principal del formulario y usar ancho completo
        const mainContainer = formClone.querySelector('form') || formClone.querySelector('div');
        if (mainContainer) {
            mainContainer.style.width = '100%';
            mainContainer.style.maxWidth = '100%';
        }
        
        // Ajustar específicamente los checkboxes para mantener alineación
        const checkboxes = formClone.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.style.margin = '3px 5px 3px 0';
            checkbox.style.verticalAlign = 'top';
            checkbox.style.float = 'left';
            checkbox.style.position = 'relative';
            checkbox.style.top = '2px';
            
            // Ajustar el contenedor del checkbox si existe
            const checkboxContainer = checkbox.parentElement;
            if (checkboxContainer) {
                checkboxContainer.style.display = 'flex';
                checkboxContainer.style.alignItems = 'flex-start';
                checkboxContainer.style.marginBottom = '8px';
            }
        });
        
        // Ajustar específicamente los campos del Guest para asegurar que se muestren
        const guestFields = formClone.querySelectorAll('input[name="Guest Name"], input[name="License"], input[name="Issuing State"], input[name="Address"]');
        guestFields.forEach(field => {
            field.style.display = 'block';
            field.style.width = '100%';
            field.style.boxSizing = 'border-box';
            field.style.border = '1px solid #333';
            field.style.padding = '5px';
            field.style.marginBottom = '8px';
            field.style.marginTop = '5px';
            field.style.backgroundColor = '#f9f9f9';
            
            // Asegurar que la etiqueta asociada sea visible
            const parentLabel = field.closest('label') || field.previousElementSibling;
            if (parentLabel && parentLabel.tagName === 'LABEL') {
                parentLabel.style.display = 'block';
                parentLabel.style.marginBottom = '3px';
                parentLabel.style.fontWeight = 'bold';
            }
        });
        
        tempContainer.appendChild(formClone);
        document.body.appendChild(tempContainer);
        
        // Ajustar el tamaño de la firma y evitar traslape con etiquetas
        const signatureImg = formClone.querySelector('.signature-container img');
        if (signatureImg) {
            signatureImg.style.height = '60px';
            signatureImg.style.width = 'auto';
            signatureImg.style.maxWidth = '100%';
            signatureImg.style.display = 'block';
            
            const container = signatureImg.closest('.signature-container');
            if (container) {
                container.style.maxHeight = '70px';
                container.style.marginTop = '10px';
                container.style.marginBottom = '10px';
                container.style.clear = 'both';
                container.style.border = '1px solid #ccc';
                container.style.padding = '5px';
            }
        }
        
        // Configuración optimizada para html2canvas
        const html2canvasOptions = {
            scale: 2, // Balance entre calidad y rendimiento
            useCORS: true,
            logging: false,
            backgroundColor: 'white',
            willReadFrequently: true,
            imageTimeout: 0,
            removeContainer: true,
            allowTaint: true,
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
        
        // Dimensiones exactas de carta con márgenes más amplios para mejor legibilidad
        const pageWidth = pdf.internal.pageSize.getWidth() - 40; // Márgenes laterales más amplios (20mm por lado)
        const pageHeight = pdf.internal.pageSize.getHeight() - 30; // Márgenes verticales más amplios (15mm por lado)
        
        // Intentar ajustar todo a una sola página
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        
        // Determinar si necesitamos escalar para ajustar a una página
        const ratio = canvasWidth / canvasHeight;
        const pdfWidth = pageWidth;
        let pdfHeight = pdfWidth / ratio;
        
        // Forzar a una sola página siempre
        let scale = 1;
        
        if (pdfHeight > pageHeight) {
            // Si el contenido es más alto que la página, escalamos para ajustar
            scale = pageHeight / pdfHeight;
            pdfHeight = pageHeight;
            console.log('Escalando contenido para ajustar a una página:', scale);
        }
        
        // Añadir imagen al PDF con márgenes mínimos
        const imgData = canvas.toDataURL('image/jpeg', 0.9); // Mayor calidad
        
        // Posicionar en la página con márgenes más amplios
        const xPos = 20; // 20mm de margen izquierdo
        const yPos = 15; // 15mm de margen superior
        
        // Usar compressionLevel para reducir el tamaño del PDF
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
