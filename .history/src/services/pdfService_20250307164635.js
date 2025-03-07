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
        // Obtener la URL de la firma si existe
        const signaturePadElement = formElement.querySelector('#signature-pad');
        let signatureDataUrl = null;
        
        if (signaturePadElement && window.signaturePad && !window.signaturePad.isEmpty()) {
            signatureDataUrl = window.signaturePad.toDataURL('image/png');
        }
        
        // Recopilar datos del formulario
        const formData = new FormData(formElement);
        const formDataObj = Object.fromEntries(formData.entries());
        
        // Obtener la URL del logo
        const logoImg = formElement.querySelector('.logo');
        const logoSrc = logoImg ? logoImg.src : '/assets/logo.png';
        
        // Obtener los valores de los checkboxes y campos de iniciales
        const checkboxes = formElement.querySelectorAll('input[type="checkbox"]');
        const initials = formElement.querySelectorAll('input.initial');
        
        // Recopilar textos de los checkboxes
        const checkboxTexts = [];
        checkboxes.forEach((checkbox, index) => {
            if (checkbox.checked) {
                // Obtener el texto asociado al checkbox
                let text = '';
                if (checkbox.nextSibling && checkbox.nextSibling.nodeType === 3) {
                    // Si el siguiente nodo es un nodo de texto
                    text = checkbox.nextSibling.textContent.trim();
                } else if (checkbox.nextElementSibling) {
                    // Si el siguiente nodo es un elemento
                    text = checkbox.nextElementSibling.textContent.trim();
                } else if (checkbox.parentElement) {
                    // Si no hay nodo siguiente, usar el texto del padre
                    const parentText = checkbox.parentElement.textContent.trim();
                    // Eliminar cualquier texto que no sea parte del label
                    text = parentText.replace(/INITIAL \*/, '').trim();
                }
                
                // Obtener las iniciales asociadas si existen
                const initial = index < initials.length ? initials[index].value : '';
                
                checkboxTexts.push({
                    text: text,
                    initial: initial
                });
            }
        });
        
        // Crear HTML específico para PDF con fuentes más grandes
        const pdfHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Golf Cart Liability Waiver</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    font-size: 16px; /* Aumentado de 12px */
                    line-height: 1.5; /* Aumentado de 1.3 */
                    color: #000;
                    margin: 0;
                    padding: 15mm;
                    box-sizing: border-box;
                }
                .container {
                    max-width: 100%;
                    margin: 0 auto;
                }
                .header {
                    text-align: center;
                    margin-bottom: 20px; /* Aumentado de 15px */
                }
                .logo {
                    max-width: 150px; /* Aumentado de 120px */
                    height: auto;
                    margin: 0 auto 15px; /* Aumentado de 10px */
                    display: block;
                }
                h1 {
                    font-size: 22px; /* Aumentado de 16px */
                    font-weight: bold;
                    margin: 15px 0; /* Aumentado de 10px */
                    text-align: center;
                }
                .main-text {
                    margin-bottom: 20px; /* Aumentado de 15px */
                    text-align: justify;
                }
                .checkbox-item {
                    margin-bottom: 15px; /* Aumentado de 10px */
                    page-break-inside: avoid;
                }
                .checkbox-text {
                    display: inline-block;
                    margin-left: 8px; /* Aumentado de 5px */
                    vertical-align: top;
                    width: 90%;
                }
                .initial-box {
                    border: 1px solid #000;
                    padding: 8px; /* Aumentado de 5px */
                    display: inline-block;
                    min-width: 40px; /* Aumentado de 30px */
                    text-align: center;
                    margin-left: 15px; /* Aumentado de 10px */
                    font-size: 18px; /* Añadido para aumentar tamaño de iniciales */
                }
                .signature-section {
                    margin-top: 30px; /* Aumentado de 20px */
                    page-break-inside: avoid;
                }
                .signature-container {
                    border: 1px solid #000;
                    height: 100px; /* Aumentado de 60px */
                    margin-bottom: 15px; /* Aumentado de 10px */
                    position: relative;
                }
                .signature-image {
                    max-height: 100%;
                    max-width: 100%;
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                }
                .guest-info {
                    margin-top: 20px; /* Aumentado de 15px */
                }
                .info-row {
                    margin-bottom: 12px; /* Aumentado de 8px */
                }
                .info-label {
                    font-weight: bold;
                    display: inline-block;
                    width: 140px; /* Aumentado de 120px */
                    font-size: 18px; /* Añadido para aumentar tamaño */
                }
                .info-value {
                    display: inline-block;
                    font-size: 18px; /* Añadido para aumentar tamaño */
                }
                .warning-text {
                    font-weight: bold;
                }
                .second-text {
                    margin: 20px 0; /* Aumentado de 15px */
                    text-align: justify;
                }
                b {
                    font-weight: bold;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <img class="logo" src="${logoSrc}" alt="Logo de LUXE">
                    <h1>★ GOLF CART LIABILITY WAIVER ★</h1>
                </div>
                
                <div class="main-text">
                    In exchange for the privilege to operate the golf cart assigned to my Luxe Properties PR LLC rental at Bahia Beach Resort community, I hereby accept responsibility for my own negligence and the negligence of any operator of my assigned golf cart. I hereby agree to operate the golf cart in a safe manner, and adhere to all rules set forth by Bahia Beach Resort Community, and to ensure that anyone operating the golf cart with my consent does the same. I acknowledge that I am liable for all medical and legal claims that may arise from the use of the golf cart. <b>I voluntarily agree to accept the risks of using a golf cart and on behalf of myself, my personal representatives and my heirs hereby voluntarily release the Owner and Property manager of the Unit at Bahia Beach Resort Community, and its directors, officers, employees, and agents from any and all claims, actions, causes of actions, suits, judgments and demands for bodily injury, property damage, loss of life and/or loss of services, in law or equity, that may in any way or manner arise out of use of the golf cart.</b>
                </div>
                
                <div class="checkbox-section">
                    <div class="checkbox-item">
                        <span class="checkbox-text">
                            ☑ I am at least 18 years of age and attached hereto is a copy of my valid driver's license. I assume all responsibility for anyone operating this golf cart at the Development.
                        </span>
                        <span class="initial-box">${formDataObj['initial-1'] || ''}</span>
                    </div>
                    
                    <div class="checkbox-item">
                        <span class="checkbox-text">
                            ☑ I acknowledge that anyone I permit to operate the golf cart shall be at least 16 years of age and be in possession of a valid driver's license.
                        </span>
                        <span class="initial-box">${formDataObj['initial-2'] || ''}</span>
                    </div>
                    
                    <div class="checkbox-item">
                        <span class="checkbox-text">
                            ☑ I acknowledge that there is a charge of $100 for lost car keys.
                        </span>
                        <span class="initial-box">${formDataObj['initial-3'] || ''}</span>
                    </div>
                    
                    <div class="checkbox-item">
                        <span class="checkbox-text">
                            ☑ I acknowledge and agree that upon arrival to the property I shall inspect the golf cart(s) and sign the Golf Cart Damage Inspection Checklist. Additionally, I agree that if I don't complete and execute such document by the day of check in at 11:59 P.M. it shall be understood that I waive such inspection right and accept the golf cart(s) as described in such document by Luxe Properties PR LLC. I accept I'm responsible to pay for any other damages caused during my rental period
                        </span>
                        <span class="initial-box">${formDataObj['initial-4'] || ''}</span>
                    </div>
                </div>
                
                <div class="second-text">
                    <span class="checkbox-text">
                        ☑ I acknowledge that it is strictly forbidden for an individual without a valid driver's license to operate the golf cart</span>. I am responsible for the possession/control of vehicle keys when not in use.
                        <span class="warning-text">Golf carts are a motorized vehicle and driving or riding in these vehicles can lead to serious injury, property damage and even death</span>. The use of these vehicles is for transportation and use should conform with all rules & regulations of the Bahia Beach Resort Community. <span class="warning-text">No excessive speeding, joy riding, golf course or golf course path riding, beach, sand or off-road riding, disregard of traffic signs, or any type of unreasonable activity with the golf cart will be tolerated by the development. I will limit the number of golf cart occupants to the number of occupants recommended by the golf cart's manufacturer</span>.
                        In no way should the use of this vehicle be seen as an endorsement by the unit owner, property manager or Bahia Beach of a form of recreation or fun.<b>I ACKNOWLEDGE THAT THE ASSOCIATION DOES NOT GIVE WARNINGS WITH REGARD TO VIOLATIONS OF APPLICABLE RULES. I ACKNOWLEDGE AND AGREE THAT IN THE EVENT MY GOLF CART IS USED IN VIOLATION OF THE RULES, THE POPERTY MANAGER MAY SEEK REIMBURSEMENTS OF ANY FINES IMPOSED BY THE DEVELOPMENT AND/OR LEVY FINES AGAINST ME</b>
                    </span>
                    <span class="initial-box">${formDataObj['initial-5'] || ''}</span>
                </div>
                
                <div class="signature-section">
                    <div class="signature-container">
                        ${signatureDataUrl ? `<img class="signature-image" src="${signatureDataUrl}" alt="Signature">` : ''}
                    </div>
                    
                    <div class="guest-info">
                        <div class="info-row">
                            <span class="info-label">Signature Date:</span>
                            <span class="info-value">${formDataObj['Signature Date'] || new Date().toISOString().split('T')[0]}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Guest Name:</span>
                            <span class="info-value">${formDataObj['Guest Name'] || ''}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">License:</span>
                            <span class="info-value">${formDataObj['License'] || ''}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Issuing State:</span>
                            <span class="info-value">${formDataObj['Issuing State'] || ''}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Address:</span>
                            <span class="info-value">${formDataObj['Address'] || ''}</span>
                        </div>
                    </div>
                </div>
            </div>
        </body>
        </html>
        `;
        
        // Crear contenedor temporal para renderizar
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.style.top = '0';
        tempContainer.style.width = '800px'; // Ancho fijo para mejor control
        document.body.appendChild(tempContainer);
        
        // Establecer el HTML
        tempContainer.innerHTML = pdfHtml;
        
        // Esperar a que las imágenes se carguen
        const images = tempContainer.querySelectorAll('img');
        const imagePromises = Array.from(images).map(img => {
            return new Promise((resolve, reject) => {
                if (img.complete) {
                    resolve();
                } else {
                    img.onload = resolve;
                    img.onerror = resolve; // Resolver incluso si hay error para no bloquear
                }
            });
        });
        
        await Promise.all(imagePromises);
        
        // Configuración para html2canvas con escala mayor
        const html2canvasOptions = {
            scale: 3, // Aumentado de 2 para mayor resolución
            useCORS: true,
            logging: false,
            backgroundColor: 'white',
            allowTaint: true,
            // Asegurar que se capture completo
            windowWidth: 800,
            windowHeight: tempContainer.scrollHeight
        };
        
        // Renderizar a canvas
        const canvas = await html2canvas(tempContainer, html2canvasOptions);
        
        // Crear PDF con mejor calidad
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'letter',
            compress: true
        });
        
        // Dimensiones de la página
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        
        // Calcular proporciones manteniendo legibilidad
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const pdfWidth = pageWidth - 20; // 10mm de margen a cada lado
        
        // Ajustar para mantener proporción pero asegurar que el contenido sea legible
        let pdfHeight = (canvasHeight / canvasWidth) * pdfWidth;
        const maxPages = Math.ceil(pdfHeight / (pageHeight - 20));
        
        // Si el contenido es muy largo, dividir en múltiples páginas
        if (maxPages > 1) {
            const heightPerPage = pageHeight - 20;
            const canvasHeightPerPage = (heightPerPage / pdfHeight) * canvasHeight;
            
            for (let i = 0; i < maxPages; i++) {
                if (i > 0) {
                    pdf.addPage();
                }
                
                const sourceY = i * canvasHeightPerPage;
                const sourceHeight = Math.min(canvasHeightPerPage, canvasHeight - sourceY);
                
                if (sourceHeight <= 0) break;
                
                pdf.addImage(
                    canvas, 
                    'JPEG', 
                    10, 
                    10, 
                    pdfWidth, 
                    (sourceHeight / canvasWidth) * pdfWidth,
                    null,
                    'FAST',
                    0,
                    {
                        sourceX: 0,
                        sourceY: sourceY,
                        sourceWidth: canvasWidth,
                        sourceHeight: sourceHeight
                    }
                );
            }
        } else {
            // Si cabe en una página, añadirlo normalmente con calidad alta
            pdf.addImage(
                canvas, 
                'JPEG', 
                10, 
                10, 
                pdfWidth, 
                pdfHeight,
                null,
                'FAST'
            );
        }
        
        // Limpiar
        document.body.removeChild(tempContainer);
        
        // Generar nombre de archivo
        const fileName = `waiver_${Date.now()}.pdf`;
        
        // Comprimir el PDF manteniendo calidad
        const compressedPdf = pdf.output('blob', {
            compress: true,
            precision: 3 // Mayor precisión para mejor calidad
        });
        
        // Subir a Supabase
        try {
            const publicUrl = await uploadPDF(fileName, compressedPdf);
            return publicUrl || null;
        } catch (uploadError) {
            console.error('Error al subir PDF:', uploadError);
            // Como alternativa, ofrecer descarga local en caso de error de subida
            downloadPDF(URL.createObjectURL(compressedPdf), fileName);
            return null;
        }
    } catch (error) {
        console.error('Error en generación de PDF:', error);
        throw error;
    }
}

// Función auxiliar para manejar la firma
function ensureSignatureIsLoaded(signatureDataUrl) {
    return new Promise((resolve) => {
        if (!signatureDataUrl) {
            resolve(null);
            return;
        }
        
        const img = new Image();
        img.onload = () => resolve(signatureDataUrl);
        img.onerror = () => resolve(null);
        img.src = signatureDataUrl;
    });
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
