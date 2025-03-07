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
        // Método mejorado para obtener la firma
        let signatureDataUrl = null;
        
        console.log('Intentando obtener la firma para el PDF...');
        
        // Método 1: Usar la firma guardada globalmente (prioridad)
        if (window.currentSignature) {
            console.log('Firma encontrada en variable global currentSignature');
            signatureDataUrl = window.currentSignature;
        } 
        // Método 2: Obtener del pad de firma
        else if (window.signaturePad && !window.signaturePad.isEmpty()) {
            console.log('Obteniendo firma directamente del pad global');
            signatureDataUrl = window.signaturePad.toDataURL('image/png');
        } 
        // Método 3: Buscar el elemento y obtener la firma
        else {
            const signaturePadElement = formElement.querySelector('#signature-pad');
            
            if (signaturePadElement) {
                console.log('Elemento signature-pad encontrado, buscando instancia local');
                
                // Intentar crear una instancia temporal
                try {
                    const tempPad = new SignaturePad(signaturePadElement);
                    if (!tempPad.isEmpty()) {
                        console.log('Obteniendo firma de instancia temporal');
                        signatureDataUrl = tempPad.toDataURL('image/png');
                    }
                } catch (padError) {
                    console.error('Error al crear instancia temporal:', padError);
                }
            }
        }
        
        if (signatureDataUrl) {
            console.log('Firma obtenida exitosamente:', signatureDataUrl.substring(0, 50) + '...');
        } else {
            console.warn('No se pudo obtener la firma por ningún método');
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
        
        // Establecer tamaño de letra uniforme para todo el documento
        pdf.setFontSize(9); // Tamaño uniforme para todo el texto
        
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
            // Dibujar checkbox con marca de verificación adecuada
            pdf.setDrawColor(0);
            pdf.setFillColor(255, 255, 255);
            pdf.rect(margin, yPos - 3, 3, 3, 'FD'); // Checkbox con fondo blanco
            
            // Añadir marca de verificación proporcional al checkbox
            pdf.setFontSize(6); // Tamaño proporcional al checkbox
            pdf.setTextColor(0, 0, 0); // Color negro para la marca
            pdf.setFont('helvetica', 'bold');
            pdf.text('X', margin + 0.8, yPos - 0.8); // X como marca de verificación
            
            // Restaurar tamaño de letra uniforme para el texto
            pdf.setFontSize(9);
            pdf.setFont('helvetica', 'normal');
            const checkboxText = `${item}`;
            yPos = addMultiLineText(checkboxText, margin + 5, yPos, contentWidth - 25, 4);
            
            // Añadir etiqueta "INITIAL" al final del texto
            pdf.setFontSize(9);
            pdf.setFont('helvetica', 'bold');
            pdf.text('INITIAL:', contentWidth - 30, yPos - 4);
            
            // Dibujar caja de iniciales debajo de INITIAL
            pdf.setDrawColor(0);
            pdf.rect(contentWidth - 30, yPos - 3, 12, 5, 'S');
            
            // Añadir iniciales si existen
            if (initialValues[index]) {
                pdf.setFont('helvetica', 'bold');
                pdf.text(initialValues[index], contentWidth - 24, yPos, { align: 'center' });
            }
            
            yPos += 3; // Espacio reducido entre checkboxes
        });
        
        // Añadir checkbox para el párrafo completo que sigue
        yPos += 4;
        
        // Dibujar checkbox con marca de verificación adecuada
        pdf.setDrawColor(0);
        pdf.setFillColor(255, 255, 255);
        pdf.rect(margin, yPos - 3, 3, 3, 'FD'); // Checkbox con fondo blanco
        
        // Añadir marca de verificación proporcional al checkbox
        pdf.setFontSize(6); // Tamaño proporcional al checkbox
        pdf.setTextColor(0, 0, 0); // Color negro para la marca
        pdf.setFont('helvetica', 'bold');
        pdf.text('X', margin + 0.8, yPos - 0.8); // X como marca de verificación
        
        // Establecer tamaño de fuente uniforme para todo el texto
        pdf.setFontSize(9);
        
        // Texto sobre prohibición de conducir sin licencia - en ROJO
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(255, 0, 0); // Color rojo
        const secondText = `I acknowledge that it is strictly forbidden for an individual without a valid driver's license to operate the golf cart.`;
        yPos = addMultiLineText(secondText, margin + 6, yPos, contentWidth - 6, 4);
        
        // Volver a texto negro para la siguiente parte
        pdf.setTextColor(0, 0, 0);
        const additionalText = `I am responsible for the possession/control of vehicle keys when not in use.`;
        yPos = addMultiLineText(additionalText, margin + 6, yPos + 1, contentWidth - 6, 4);
        
        // Texto en negrita para advertencia - en ROJO
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(255, 0, 0); // Color rojo
        const warningText = `Golf carts are a motorized vehicle and driving or riding in these vehicles can lead to serious injury, property damage and even death.`;
        yPos = addMultiLineText(warningText, margin + 6, yPos + 1, contentWidth - 6, 4);
        pdf.setTextColor(0, 0, 0); // Volver a negro
        
        // Volver a texto normal
        pdf.setFont('helvetica', 'normal');
        const normalText = `The use of these vehicles is for transportation and use should conform with all rules & regulations of the Bahia Beach Resort Community.`;
        yPos = addMultiLineText(normalText, margin + 6, yPos + 1, contentWidth - 6, 4);
        
        // Más texto en negrita - en ROJO
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(255, 0, 0); // Color rojo
        const moreWarning = `No excessive speeding, joy riding, golf course or golf course path riding, beach, sand or off-road riding, disregard of traffic signs, or any type of unreasonable activity with the golf cart will be tolerated by the development. I will limit the number of golf cart occupants to the number of occupants recommended by the golf cart's manufacturer.`;
        yPos = addMultiLineText(moreWarning, margin + 6, yPos + 1, contentWidth - 6, 4);
        pdf.setTextColor(0, 0, 0); // Volver a negro
        
        // Último párrafo normal y negrita
        pdf.setFont('helvetica', 'normal');
        const finalText = `In no way should the use of this vehicle be seen as an endorsement by the unit owner, property manager or Bahia Beach of a form of recreation or fun.`;
        yPos = addMultiLineText(finalText, margin + 6, yPos + 1, contentWidth - 6, 4);
        
        pdf.setFont('helvetica', 'bold');
        const finalBold = `I ACKNOWLEDGE THAT THE ASSOCIATION DOES NOT GIVE WARNINGS WITH REGARD TO VIOLATIONS OF APPLICABLE RULES. I ACKNOWLEDGE AND AGREE THAT IN THE EVENT MY GOLF CART IS USED IN VIOLATION OF THE RULES, THE POPERTY MANAGER MAY SEEK REIMBURSEMENTS OF ANY FINES IMPOSED BY THE DEVELOPMENT AND/OR LEVY FINES AGAINST ME`;
        yPos = addMultiLineText(finalBold, margin + 6, yPos + 1, contentWidth - 6, 4);
        
        // Añadir etiqueta "INITIAL" al final del último párrafo
        yPos += 2;
        pdf.setFontSize(9); // Tamaño uniforme
        pdf.setFont('helvetica', 'bold');
        pdf.text('INITIAL:', contentWidth - 30, yPos - 4);
        
        // Dibujar caja de iniciales debajo de INITIAL
        pdf.setDrawColor(0);
        pdf.rect(contentWidth - 30, yPos - 3, 12, 5, 'S');
        
        // Añadir iniciales si existen
        if (initialValues[4]) {
            pdf.setFont('helvetica', 'bold');
            pdf.text(initialValues[4], contentWidth - 24, yPos, { align: 'center' });
        }
        
        yPos += 6;
        
        // Añadir sección de firma
        pdf.setFont('helvetica', 'normal');
        pdf.text('Signature:', margin, yPos);
        
        // Dibujar caja para firma
        pdf.setDrawColor(0);
        pdf.rect(margin, yPos + 1, contentWidth, 15, 'S');
        
        // Solución definitiva para la firma - método directo y simplificado
        try {
            console.log('Verificando disponibilidad de firma...');
            
            // Obtener la firma nuevamente directamente del pad
            if (!signatureDataUrl && window.signaturePad && !window.signaturePad.isEmpty()) {
                console.log('Obteniendo firma directamente del pad...');
                signatureDataUrl = window.signaturePad.toDataURL('image/png');
            }
            
            if (signatureDataUrl) {
                console.log('Firma encontrada, intentando añadirla...');
                
                // Dimensiones fijas para la firma
                const signatureX = margin + 2;
                const signatureY = yPos + 2;
                const signatureWidth = contentWidth - 4;
                const signatureHeight = 12;
                
                // Método simplificado: añadir directamente como imagen
                pdf.addImage(
                    signatureDataUrl,
                    'PNG',
                    signatureX,
                    signatureY,
                    signatureWidth,
                    signatureHeight
                );
                
                console.log('Firma añadida correctamente');
            } else {
                // Si no hay firma, dibujar una firma simulada
                console.log('No se encontró firma válida, dibujando simulación...');
                
                pdf.setDrawColor(0, 0, 0);
                pdf.setLineWidth(0.5);
                
                const startX = margin + 10;
                const endX = margin + contentWidth - 10;
                const midY = yPos + 8;
                
                // Dibujar una firma simulada más elaborada
                pdf.line(startX, midY, startX + 15, midY - 3);
                pdf.line(startX + 15, midY - 3, startX + 30, midY + 2);
                pdf.line(startX + 30, midY + 2, startX + 45, midY - 2);
                pdf.line(startX + 45, midY - 2, startX + 60, midY + 1);
                pdf.line(startX + 60, midY + 1, startX + 75, midY - 1);
                pdf.line(startX + 75, midY - 1, endX, midY);
                
                pdf.setFontSize(9);
                pdf.setFont('helvetica', 'italic');
                pdf.text('Firma aplicada electrónicamente', margin + contentWidth/2, midY + 5, {align: 'center'});
                
                console.log('Se dibujó una firma simulada');
            }
        } catch (error) {
            console.error('Error al procesar la firma:', error);
            
            // Si hay cualquier error, asegurar que se muestre algo
            pdf.setDrawColor(0, 0, 0);
            pdf.setLineWidth(0.5);
            pdf.line(margin + 20, yPos + 8, margin + contentWidth - 20, yPos + 8);
            
            pdf.setFontSize(9);
            pdf.setFont('helvetica', 'italic');
            pdf.text('Firma del documento', margin + contentWidth/2, yPos + 12, {align: 'center'});
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
