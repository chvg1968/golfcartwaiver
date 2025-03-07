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
        
        // Crear HTML específico para PDF
        const pdfHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Golf Cart Liability Waiver</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    font-size: 12px;
                    line-height: 1.3;
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
                    margin-bottom: 15px;
                }
                .logo {
                    max-width: 120px;
                    height: auto;
                    margin: 0 auto 10px;
                    display: block;
                }
                h1 {
                    font-size: 16px;
                    font-weight: bold;
                    margin: 10px 0;
                    text-align: center;
                }
                .main-text {
                    margin-bottom: 15px;
                    text-align: justify;
                }
                .checkbox-item {
                    margin-bottom: 10px;
                    page-break-inside: avoid;
                }
                .checkbox-text {
                    display: inline-block;
                    margin-left: 5px;
                    vertical-align: top;
                    width: 90%;
                }
                .initial-box {
                    border: 1px solid #000;
                    padding: 5px;
                    display: inline-block;
                    min-width: 30px;
                    text-align: center;
                    margin-left: 10px;
                }
                .signature-section {
                    margin-top: 20px;
                    page-break-inside: avoid;
                }
                .signature-container {
                    border: 1px solid #000;
                    height: 60px;
                    margin-bottom: 10px;
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
                    margin-top: 15px;
                }
                .info-row {
                    margin-bottom: 8px;
                }
                .info-label {
                    font-weight: bold;
                    display: inline-block;
                    width: 120px;
                }
                .info-value {
                    display: inline-block;
                }
                .warning-text {
                    font-weight: bold;
                }
                .second-text {
                    margin: 15px 0;
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
        
        // Configuración para html2canvas
        const html2canvasOptions = {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: 'white',
            allowTaint: true
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
