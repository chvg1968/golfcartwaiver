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

export async function generatePDF(formElement) {
    try {
        // Obtener la firma
        const signaturePadElement = formElement.querySelector('#signature-pad');
        let signatureDataUrl = null;
        
        if (signaturePadElement && window.signaturePad && !window.signaturePad.isEmpty()) {
            signatureDataUrl = window.signaturePad.toDataURL('image/png');
        }
        
        // Recopilar datos del formulario
        const formData = new FormData(formElement);
        const data = Object.fromEntries(formData.entries());
        
        // Crear documento PDF
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'letter',
            compress: true
        });
        
        // Configuración de página
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 15; // margen en mm
        const contentWidth = pageWidth - (margin * 2);
        
        // Posición vertical actual (para ir avanzando)
        let yPos = margin;
        
        // Cargar logo
        const logoImg = formElement.querySelector('.logo');
        if (logoImg) {
            try {
                // Crear imagen temporal para obtener dimensiones
                const img = new Image();
                img.src = logoImg.src;
                
                // Esperar a que la imagen cargue
                await new Promise((resolve) => {
                    img.onload = resolve;
                    img.onerror = resolve; // Resolver incluso si hay error
                });
                
                // Calcular dimensiones manteniendo proporción
                const imgWidth = 30; // ancho fijo en mm (reducido para ahorrar espacio)
                const imgHeight = (img.height / img.width) * imgWidth;
                
                // Centrar logo
                const logoX = (pageWidth - imgWidth) / 2;
                
                // Añadir logo
                pdf.addImage(img.src, 'PNG', logoX, yPos, imgWidth, imgHeight);
                
                // Actualizar posición vertical
                yPos += imgHeight + 5;
            } catch (error) {
                console.error('Error al cargar el logo:', error);
                // Continuar sin logo
            }
        }
        
        // Añadir título
        pdf.setFontSize(14); // Reducido de 16 para ahorrar espacio
        pdf.setFont('helvetica', 'bold');
        pdf.text('★ GOLF CART LIABILITY WAIVER ★', pageWidth / 2, yPos, { align: 'center' });
        yPos += 8; // Reducido de 10 para ahorrar espacio
        
        // Función para añadir texto con múltiples líneas y retornar la nueva posición Y
        function addMultiLineText(text, x, y, maxWidth, lineHeight = 4.5) {
            const lines = pdf.splitTextToSize(text, maxWidth);
            pdf.text(lines, x, y);
            return y + (lines.length * lineHeight);
        }
        
        // Texto principal - Tamaño reducido para ahorrar espacio
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        
        const mainText = `In exchange for the privilege to operate the golf cart assigned to my Luxe Properties PR LLC rental at Bahia Beach Resort community, I hereby accept responsibility for my own negligence and the negligence of any operator of my assigned golf cart. I hereby agree to operate the golf cart in a safe manner, and adhere to all rules set forth by Bahia Beach Resort Community, and to ensure that anyone operating the golf cart with my consent does the same. I acknowledge that I am liable for all medical and legal claims that may arise from the use of the golf cart.`;
        
        // Añadir texto principal
        yPos = addMultiLineText(mainText, margin, yPos, contentWidth, 4);
        
        // Texto en negrita
        pdf.setFont('helvetica', 'bold');
        const boldText = `I voluntarily agree to accept the risks of using a golf cart and on behalf of myself, my personal representatives and my heirs hereby voluntarily release the Owner and Property manager of the Unit at Bahia Beach Resort Community, and its directors, officers, employees, and agents from any and all claims, actions, causes of actions, suits, judgments and demands for bodily injury, property damage, loss of life and/or loss of services, in law or equity, that may in any way or manner arise out of use of the golf cart.`;
        
        yPos = addMultiLineText(boldText, margin, yPos + 1, contentWidth, 4);
        yPos += 3; // Reducido para ahorrar espacio
        
        // Volver a fuente normal
        pdf.setFont('helvetica', 'normal');
        
        // Añadir checkboxes con iniciales
        const checkboxItems = [
            "I am at least 18 years of age and attached hereto is a copy of my valid driver's license. I assume all responsibility for anyone operating this golf cart at the Development.",
            "I acknowledge that anyone I permit to operate the golf cart shall be at least 16 years of age and be in possession of a valid driver's license.",
            "I acknowledge that there is a charge of $100 for lost car keys.",
            "I acknowledge and agree that upon arrival to the property I shall inspect the golf cart(s) and sign the Golf Cart Damage Inspection Checklist. Additionally, I agree that if I don't complete and execute such document by the day of check in at 11:59 P.M. it shall be understood that I waive such inspection right and accept the golf cart(s) as described in such document by Luxe Properties PR LLC. I accept I'm responsible to pay for any other damages caused during my rental period"
        ];
        
        // Obtener iniciales
        const initialInputs = formElement.querySelectorAll('input.initial');
        const initialValues = Array.from(initialInputs).map(input => input.value || '');
        
        // Añadir cada checkbox con su texto e inicial - Optimizado para ahorrar espacio
        checkboxItems.forEach((item, index) => {
            // Dibujar checkbox con marca de verificación visible
            pdf.setDrawColor(0);
            pdf.setFillColor(255, 255, 255);
            pdf.rect(margin, yPos - 3, 3, 3, 'FD'); // Checkbox con fondo blanco
            pdf.setFont('helvetica', 'bold');
            pdf.text('✓', margin + 0.5, yPos - 0.5); // Añadir marca de verificación
            
            // Añadir texto del checkbox
            pdf.setFont('helvetica', 'normal');
            const checkboxText = `${item}`;
            yPos = addMultiLineText(checkboxText, margin + 5, yPos, contentWidth - 25, 4);
            
            // Añadir etiqueta "INITIAL" y caja de iniciales más cerca del texto
            pdf.setFont('helvetica', 'bold');
            pdf.text('INITIAL:', contentWidth - 30, yPos - 4);
            
            // Dibujar caja de iniciales justo después de la etiqueta
            pdf.setDrawColor(0);
            pdf.rect(contentWidth - 15, yPos - 7, 12, 5, 'S');
            
            // Añadir iniciales si existen
            if (initialValues[index]) {
                pdf.setFont('helvetica', 'bold');
                pdf.text(initialValues[index], contentWidth - 9, yPos - 4, { align: 'center' });
            }
            
            yPos += 3; // Espacio reducido entre checkboxes
        });
        
        // Añadir segundo texto
        pdf.setFont('helvetica', 'normal');
        yPos += 1;
        
        // Texto sobre prohibición de conducir sin licencia - en ROJO
        pdf.setTextColor(255, 0, 0); // Color rojo
        const secondText = `I acknowledge that it is strictly forbidden for an individual without a valid driver's license to operate the golf cart.`;
        yPos = addMultiLineText(secondText, margin, yPos, contentWidth, 4);
        
        // Volver a texto negro para la siguiente parte
        pdf.setTextColor(0, 0, 0);
        const additionalText = `I am responsible for the possession/control of vehicle keys when not in use.`;
        yPos = addMultiLineText(additionalText, margin, yPos + 1, contentWidth, 4);
        
        // Texto en negrita para advertencia - en ROJO
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(255, 0, 0); // Color rojo
        const warningText = `Golf carts are a motorized vehicle and driving or riding in these vehicles can lead to serious injury, property damage and even death.`;
        yPos = addMultiLineText(warningText, margin, yPos + 1, contentWidth, 4);
        pdf.setTextColor(0, 0, 0); // Volver a negro
        
        // Volver a texto normal
        pdf.setFont('helvetica', 'normal');
        const normalText = `The use of these vehicles is for transportation and use should conform with all rules & regulations of the Bahia Beach Resort Community.`;
        yPos = addMultiLineText(normalText, margin, yPos + 1, contentWidth, 4);
        
        // Más texto en negrita - en ROJO
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(255, 0, 0); // Color rojo
        const moreWarning = `No excessive speeding, joy riding, golf course or golf course path riding, beach, sand or off-road riding, disregard of traffic signs, or any type of unreasonable activity with the golf cart will be tolerated by the development. I will limit the number of golf cart occupants to the number of occupants recommended by the golf cart's manufacturer.`;
        yPos = addMultiLineText(moreWarning, margin, yPos + 1, contentWidth, 4);
        pdf.setTextColor(0, 0, 0); // Volver a negro
        
        // Último párrafo normal y negrita
        pdf.setFont('helvetica', 'normal');
        const finalText = `In no way should the use of this vehicle be seen as an endorsement by the unit owner, property manager or Bahia Beach of a form of recreation or fun.`;
        yPos = addMultiLineText(finalText, margin, yPos + 1, contentWidth, 4);
        
        pdf.setFont('helvetica', 'bold');
        const finalBold = `I ACKNOWLEDGE THAT THE ASSOCIATION DOES NOT GIVE WARNINGS WITH REGARD TO VIOLATIONS OF APPLICABLE RULES. I ACKNOWLEDGE AND AGREE THAT IN THE EVENT MY GOLF CART IS USED IN VIOLATION OF THE RULES, THE POPERTY MANAGER MAY SEEK REIMBURSEMENTS OF ANY FINES IMPOSED BY THE DEVELOPMENT AND/OR LEVY FINES AGAINST ME`;
        yPos = addMultiLineText(finalBold, margin, yPos + 1, contentWidth, 4);
        
        // Añadir etiqueta "INITIAL" y caja de iniciales para el último párrafo
        yPos += 2;
        pdf.setFont('helvetica', 'bold');
        pdf.text('INITIAL:', contentWidth - 30, yPos - 2);
        
        pdf.setDrawColor(0);
        pdf.rect(contentWidth - 15, yPos - 5, 12, 5, 'S');
        
        // Añadir iniciales si existen
        if (initialValues[4]) {
            pdf.setFont('helvetica', 'bold');
            pdf.text(initialValues[4], contentWidth - 9, yPos - 2, { align: 'center' });
        }
        
        yPos += 6;
        
        // Añadir sección de firma
        pdf.setFont('helvetica', 'normal');
        pdf.text('Signature:', margin, yPos);
        
        // Dibujar caja para firma
        pdf.setDrawColor(0);
        pdf.rect(margin, yPos + 1, contentWidth, 15, 'S');
        
        // Añadir firma si existe - enfoque simplificado y directo
        if (signatureDataUrl) {
            try {
                // Convertir la firma a una imagen para asegurar que se cargue correctamente
                const img = new Image();
                img.src = signatureDataUrl;
                
                // Esperar a que la imagen cargue completamente
                await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = reject;
                    // Si la imagen ya está cargada, resolver inmediatamente
                    if (img.complete) resolve();
                    // Timeout para evitar bloqueos
                    setTimeout(resolve, 1000);
                });
                
                // Usar el formato JPEG para mayor compatibilidad
                const signatureX = margin + 2;
                const signatureY = yPos + 2;
                const signatureWidth = contentWidth - 4;
                const signatureHeight = 12;
                
                // Añadir la imagen con formato JPEG en lugar de PNG
                pdf.addImage(
                    img, 
                    'JPEG', 
                    signatureX, 
                    signatureY, 
                    signatureWidth, 
                    signatureHeight
                );
                
                console.log('Firma añadida correctamente con formato JPEG');
            } catch (error) {
                console.error('Error al añadir firma:', error);
                // Intento alternativo si falla el método principal
                try {
                    pdf.setFontSize(10);
                    pdf.setFont('helvetica', 'italic');
                    pdf.text('Firma digital aplicada', margin + contentWidth/2, yPos + 8, {align: 'center'});
                } catch (e) {
                    console.error('Error al añadir texto de firma alternativo:', e);
                }
            }
        } else {
            console.log('No hay firma para añadir');
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'italic');
            pdf.text('Sin firma', margin + contentWidth/2, yPos + 8, {align: 'center'});
        }
        
        yPos += 18;
        
        // Añadir información del invitado
        const guestInfo = [
            { label: 'Signature Date:', value: data['Signature Date'] || new Date().toISOString().split('T')[0] },
            { label: 'Guest Name:', value: data['Guest Name'] || '' },
            { label: 'License:', value: data['License'] || '' },
            { label: 'Issuing State:', value: data['Issuing State'] || '' },
            { label: 'Address:', value: data['Address'] || '' }
        ];
        
        guestInfo.forEach((info, index) => {
            pdf.setFont('helvetica', 'bold');
            pdf.text(info.label, margin, yPos + (index * 5));
            pdf.setFont('helvetica', 'normal');
            pdf.text(info.value, margin + 30, yPos + (index * 5));
        });
        
        // Generar nombre de archivo
        const fileName = `waiver_${Date.now()}.pdf`;
        
        // Generar blob del PDF
        const pdfBlob = pdf.output('blob');
        
        // Subir a Supabase
        try {
            const publicUrl = await uploadPDF(fileName, pdfBlob);
            return publicUrl || null;
        } catch (uploadError) {
            console.error('Error al subir PDF:', uploadError);
            // Como alternativa, ofrecer descarga local en caso de error de subida
            downloadPDF(URL.createObjectURL(pdfBlob), fileName);
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
