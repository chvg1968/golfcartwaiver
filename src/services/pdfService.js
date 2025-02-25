import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { supabase } from '../utils/supabaseClient';

export async function generatePDF(formElement) {
    try {
        console.log('Iniciando generación de PDF...');
        await document.fonts.ready;

        // Capturar la firma antes de clonar
        const originalSignature = formElement.querySelector('#signature-pad');
        const signatureDataUrl = originalSignature ? originalSignature.toDataURL() : null;

        // Dividir el contenido en secciones
        const contentHeight = 1000; // Alto máximo por página en píxeles
        const sections = [];
        let currentSection = document.createElement('div');
        let currentHeight = 0;

        Array.from(formElement.children).forEach(child => {
            const clone = child.cloneNode(true);
            
            // Si es el contenedor de firma, restaurar la firma
            if (clone.querySelector('#signature-pad')) {
                const clonedCanvas = clone.querySelector('#signature-pad');
                if (signatureDataUrl) {
                    const img = new Image();
                    img.src = signatureDataUrl;
                    img.onload = () => {
                        const ctx = clonedCanvas.getContext('2d');
                        ctx.drawImage(img, 0, 0);
                    };
                }
            }

            if (currentHeight + child.offsetHeight > contentHeight) {
                sections.push(currentSection);
                currentSection = document.createElement('div');
                currentHeight = 0;
            }
            currentHeight += child.offsetHeight;
            currentSection.appendChild(clone);
        });
        sections.push(currentSection);

        // Create PDF
        const pdf = new jsPDF();
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        for (let i = 0; i < sections.length; i++) {
            const section = sections[i];
            
            // Contenedor temporal
            const tempContainer = document.createElement('div');
            Object.assign(tempContainer.style, {
                position: 'absolute',
                left: '-9999px',
                top: '0',
                width: '210mm',
                background: 'white',
                padding: '10mm 10mm' // Márgenes
            });
            
            tempContainer.appendChild(section);
            document.body.appendChild(tempContainer);

            // Modificar la configuración de html2canvas
            const canvas = await html2canvas(tempContainer, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: 'white',
                willReadFrequently: true, // Add this to address the Canvas2D warning
                onclone: (clonedDoc) => {
                    const signaturePad = clonedDoc.querySelector('#signature-pad');
                    if (signaturePad && signatureDataUrl) {
                        const img = new Image();
                        img.src = signatureDataUrl;
                        const ctx = signaturePad.getContext('2d');
                        ctx.drawImage(img, 0, 0);
                    }
                }
            });

            // Add page if not the first one
            if (i > 0) {
                pdf.addPage();
            }

            // Add the canvas to the PDF
            const imgData = canvas.toDataURL('image/png');
            pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight);
            
            // Add page number
            pdf.text(`Página ${i + 1} de ${sections.length}`, pageWidth / 2, pageHeight - 10, { 
                align: 'center' 
            });

            document.body.removeChild(tempContainer);
        }

        // Guardar localmente y subir a Supabase
        const fileName = `waiver_${Date.now()}.pdf`;
        
        // Descarga local
        pdf.save(fileName);

        // Check if Supabase is available before trying to use it
        if (!supabase) {
            console.warn('Supabase client not available. PDF will be saved locally only.');
            return null;
        }

        // Subir a Supabase
        try {
            const pdfBlob = pdf.output('blob');
            console.log('PDF blob created, size:', pdfBlob.size / 1024, 'KB');
            
            // Log Supabase client state
            console.log('Supabase client available:', !!supabase);
            
            if (!supabase) {
                console.warn('Supabase client not available. PDF will be saved locally only.');
                return null;
            }
            
            // Simplified approach - try to upload directly
            console.log('Uploading PDF to Supabase storage bucket "pdfs"...');
            
            // Create FormData for the upload
            const formData = new FormData();
            formData.append('file', pdfBlob, fileName);
            
            // Manual fetch request to debug the issue
            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/pdfs/${fileName}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_KEY}`
                },
                body: formData
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                console.error('Manual upload failed:', errorData);
                throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('PDF uploaded successfully, response:', data);
            
            // Get the public URL
            const publicUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/pdfs/${fileName}`;
            
            console.log('PDF generated and uploaded. Size:', pdfBlob.size / 1024, 'KB');
            console.log('Public URL:', publicUrl);
            return publicUrl;
        } catch (storageError) {
            console.error('Error al subir a Supabase:', storageError);
            return null;
        }
    } catch (error) {
        console.error('Error en generación de PDF:', error);
        throw error;
    }
}
