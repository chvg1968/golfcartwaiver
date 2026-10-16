import { uploadPDF } from "../utils/supabaseClient";
import { buildWaiverDocument } from "./waiverDocument";

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
  const publicUrl = await uploadPDF(generateFileName(guestName), pdf.output('blob'));
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
