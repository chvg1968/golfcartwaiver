import { buildWaiverDocument } from "./waiverDocument";

// Función para subir PDF a través de Netlify Function (más seguro)
async function uploadPDFViaServer(fileName, pdfBlob) {
    try {
        // Convertir Blob a base64
        const base64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                // Remover el prefijo "data:application/pdf;base64,"
                const base64String = reader.result.split(',')[1];
                resolve(base64String);
            };
            reader.onerror = reject;
            reader.readAsDataURL(pdfBlob);
        });

        console.log('Enviando PDF a Netlify Function...');

        const response = await fetch('/api/upload-pdf', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fileName: fileName,
                pdfBase64: base64,
                contentType: 'application/pdf'
            })
        });

        const result = await response.json();

        if (!response.ok) {
            console.error('Error del servidor:', result);
            throw new Error(result.message || 'Error al subir PDF');
        }

        console.log('PDF subido exitosamente via servidor:', result.publicUrl);
        return result.publicUrl;

    } catch (error) {
        console.error('Error en uploadPDFViaServer:', error);
        throw error;
    }
}


function generateFileName(guestName) {
  // Limpiar el nombre del huésped (remover caracteres especiales y espacios)
  const cleanName = guestName
    ? guestName
        .replace(/[^a-zA-Z0-9]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "")
    : "Guest";

  // Obtener fecha actual en formato legible (YYYY-MM-DD)
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  const dateStr = `${year}-${month}-${day}`;

  return `${cleanName}_${dateStr}.pdf`;
}

export async function generatePDF(formElement) {
  const pad = window.signaturePad;
  if (!pad || pad.isEmpty()) throw new Error('Please provide your signature.');
  const signature = pad.toDataURL('image/png');
  const logo = formElement.querySelector('.logo');
  if (logo) await logo.decode();
  const pdf = buildWaiverDocument(formElement, signature, logo);
  const guestName = formElement.querySelector('input[name="Guest Name"]').value;
  const publicUrl = await uploadPDFViaServer(generateFileName(guestName), pdf.output('blob'));
  if (!publicUrl) throw new Error('Unable to upload the signed agreement. Please try again.');
  return publicUrl;
}

// Función para descargar PDF (opcional, si se necesita)
export function downloadPDF(pdfUrl, fileName = "waiver.pdf") {
  try {
    const link = document.createElement("a");
    link.href = pdfUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error("Error al descargar PDF:", error);
  }
}
