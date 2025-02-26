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

        // Configuración optimizada para html2canvas
        const html2canvasOptions = {
            scale: 1.5, // Reducido de 2 a 1.5 para disminuir el tamaño
            useCORS: true,
            logging: false,
            backgroundColor: 'white',
            willReadFrequently: true,
            imageTimeout: 0, // Sin límite de tiempo para cargar imágenes
            // Reducir calidad de las imágenes
            onclone: (clonedDoc) => {
                // Optimizar imágenes en el documento clonado
                const images = clonedDoc.querySelectorAll('img');
                images.forEach(img => {
                    // Reducir calidad de las imágenes si no son la firma
                    if (!img.closest('.signature-container')) {
                        img.style.imageRendering = 'auto';
                    }
                });
                
                // Manejar la firma
                const signaturePad = clonedDoc.querySelector('#signature-pad');
                if (signaturePad && signatureDataUrl) {
                    const img = new Image();
                    img.src = signatureDataUrl;
                    const ctx = signaturePad.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                }
            }
        };

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

            // Renderizar a canvas con configuración optimizada
            const canvas = await html2canvas(tempContainer, html2canvasOptions);

            // Add page if not the first one
            if (i > 0) {
                pdf.addPage();
            }

            // Optimizar la calidad de la imagen al convertir el canvas a imagen
            const imgData = canvas.toDataURL('image/jpeg', 0.7); // Usar JPEG en lugar de PNG y reducir calidad a 70%
            
            // Añadir la imagen al PDF
            pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight, null, 'FAST');
            
            // Add page number
            pdf.setFontSize(8); // Reducir tamaño de fuente para números de página
            pdf.text(`Página ${i + 1} de ${sections.length}`, pageWidth / 2, pageHeight - 5, { 
                align: 'center' 
            });

            document.body.removeChild(tempContainer);
        }

        // Guardar localmente y subir a Supabase
        const fileName = `waiver_${Date.now()}.pdf`;
        
        // Comprimir el PDF antes de guardarlo
        const compressedPdf = pdf.output('blob', {
            compress: true,
            compressPdf: true
        });
        
        // Descarga local
        pdf.save(fileName);

        // Check if Supabase is available before trying to use it
        if (!supabase) {
            console.warn('Supabase client not available. PDF will be saved locally only.');
            return null;
        }

        // Subir a Supabase
        try {
            const pdfBlob = compressedPdf; // Usar la versión comprimida
            console.log('PDF blob created, size:', pdfBlob.size / 1024, 'KB');
            
            // Log Supabase client state
            console.log('Supabase client available:', !!supabase);
            
            if (!supabase) {
                console.warn('Supabase client not available. PDF will be saved locally only.');
                return null;
            }
            
            console.log('Subiendo PDF a Supabase usando el cliente oficial...');
            
            // Verificar si el bucket existe
            const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
            
            if (bucketsError) {
                console.error('Error al listar buckets:', bucketsError);
                throw new Error(`Error al verificar buckets: ${bucketsError.message}`);
            }
            
            console.log('Buckets disponibles:', buckets.map(b => b.name));
            
            // Verificar si el bucket "pdfs" existe, si no, intentar crearlo
            const pdfsBucketExists = buckets.some(b => b.name === 'pdfs');
            
            if (!pdfsBucketExists) {
                console.log('El bucket "pdfs" no existe, intentando crearlo...');
                const { data: newBucket, error: createError } = await supabase.storage.createBucket('pdfs', {
                    public: true,
                    fileSizeLimit: 50000000 // 50MB
                });
                
                if (createError) {
                    console.error('Error al crear bucket:', createError);
                    throw new Error(`No se pudo crear el bucket: ${createError.message}`);
                }
                
                console.log('Bucket "pdfs" creado correctamente');
            }
            
            // Subir el archivo usando el cliente de Supabase
            const { data, error: uploadError } = await supabase.storage
                .from('pdfs')
                .upload(fileName, pdfBlob, {
                    cacheControl: '3600',
                    upsert: true,
                    contentType: 'application/pdf'
                });
            
            if (uploadError) {
                console.error('Error al subir PDF:', uploadError);
                throw new Error(`Error al subir PDF: ${uploadError.message}`);
            }
            
            console.log('PDF subido correctamente:', data);
            
            // Obtener la URL pública
            const { data: publicUrlData } = supabase.storage
                .from('pdfs')
                .getPublicUrl(fileName);
            
            const publicUrl = publicUrlData.publicUrl;
            
            console.log('PDF generado y subido. Tamaño:', pdfBlob.size / 1024, 'KB');
            console.log('URL pública:', publicUrl);
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
