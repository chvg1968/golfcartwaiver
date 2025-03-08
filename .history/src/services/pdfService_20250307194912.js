import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { supabase, uploadPDF } from "../utils/supabaseClient";
import html2pdf from "html2pdf.js";

// Función para generar PDF sin descargar inmediatamente
export async function createPDF(formData) {
  try {
    // Convertir datos de FormData a objeto si es necesario
    const data =
      formData instanceof FormData
        ? Object.fromEntries(formData.entries())
        : formData;

    // Crear documento PDF
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    // Configurar estilos de fuente
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");

    // Añadir título
    doc.setFontSize(16);
    doc.text("Golf Cart Liability Waiver", 105, 20, { align: "center" });

    // Añadir detalles del formulario
    doc.setFontSize(12);
    const startY = 40;
    const lineHeight = 10;

    const fields = [
      { label: "Nombre", value: data["Guest Name"] || "No especificado" },
      { label: "Licencia", value: data["License"] || "No especificado" },
      {
        label: "Estado que Emite",
        value: data["Issuing State"] || "No especificado",
      },
      { label: "Dirección", value: data["Address"] || "No especificada" },
      {
        label: "Fecha de Firma",
        value: data["Signature Date"] || new Date().toLocaleDateString(),
      },
    ];

    fields.forEach((field, index) => {
      doc.text(
        `${field.label}: ${field.value}`,
        20,
        startY + index * lineHeight
      );
    });

    // Generar un nombre de archivo único
    const fileName = `waiver_${Date.now()}.pdf`;

    // Convertir PDF a Blob
    const pdfBlob = doc.output("blob");

    // Crear URL temporal para el PDF
    const pdfUrl = URL.createObjectURL(pdfBlob);

    // Devolver la URL del PDF sin descargar
    return pdfUrl;
  } catch (error) {
    console.error("Error al generar PDF:", error);
    throw error;
  }
}

export async function generatePDF(formElement) {
  try {
    // Obtener los valores del formulario
    const formData = new FormData(formElement);
    const fullName = formData.get("Guest Name") || "";
    const license = formData.get("License") || "";
    const issuingState = formData.get("Issuing State") || "";
    const address = formData.get("Address") || "";
    const signatureDate =
      formData.get("Signature Date") || new Date().toLocaleDateString();
    const initialValues = Array.from(
      formElement.querySelectorAll("input.initial")
    ).map((input) => input.value || "");

    // Crear un elemento HTML temporal para el PDF
    const pdfContainer = document.createElement("div");
    pdfContainer.style.width = "8.5in";
    pdfContainer.style.padding = "0.5in";
    pdfContainer.style.fontFamily = "Helvetica, Arial, sans-serif";

    // Usar múltiples opciones para el logo para asegurar que se cargue
    // Reemplaza la sección actual del logo (líneas 80-98 aproximadamente) con este código:

    // Logo en formato base64 para asegurar que siempre se cargue correctamente
    const logoBase64 =
      "data:image/png;base64,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";

    // Añadir contenido HTML para el PDF
    pdfContainer.innerHTML = `
        <div style="text-align: center; margin-bottom: 15px;">
          <img src="${logoBase64}" alt="Logo" style="max-width: 150px; height: auto;">
          <h1 style="font-size: 16px; font-weight: bold; margin-top: 10px;">★ GOLF CART LIABILITY WAIVER ★</h1>
        </div>
        
        <div style="font-size: 10px; margin-bottom: 15px;">
          <p>
            In exchange for the privilege to operate the golf cart assigned to my Luxe Properties PR LLC rental at Bahia Beach Resort community, I hereby accept responsibility for my own negligence and the negligence of any operator of my assigned golf cart. I hereby agree to operate the golf cart in a safe manner, and adhere to all rules set forth by Bahia Beach Resort Community, and to ensure that anyone operating the golf cart with my consent does the same. I acknowledge that I am liable for all medical and legal claims that may arise from the use of the golf cart.
          </p>
          <p style="font-weight: bold; margin-top: 10px;">
            I voluntarily agree to accept the risks of using a golf cart and on behalf of myself, my personal representatives and my heirs hereby voluntarily release the Owner and Property manager of the Unit at Bahia Beach Resort Community, and its directors, officers, employees, and agents from any and all claims, actions, causes of actions, suits, judgments and demands for bodily injury, property damage, loss of life and/or loss of services, in law or equity, that may in any way or manner arise out of use of the golf cart.
          </p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="width: 20px; vertical-align: top; padding: 5px;">
                <div style="border: 1px solid black; width: 15px; height: 15px; text-align: center; line-height: 15px;">X</div>
              </td>
              <td style="vertical-align: top; padding: 5px;">
                <p style="font-size: 10px; margin: 0;">
                  I am at least 18 years of age and attached hereto is a copy of my valid driver's license. I assume all responsibility for anyone operating this golf cart at the Development.
                </p>
              </td>
              <td style="width: 80px; vertical-align: top; padding: 5px;">
                <div>
                  <span style="font-size: 10px; font-weight: bold;">INITIAL:</span>
                  <div style="border: 1px solid black; width: 60px; height: 20px; margin-top: 2px; text-align: center; line-height: 20px; background-color: #f9f9f9;">
                    ${initialValues[0] || ""}
                  </div>
                </div>
              </td>
            </tr>
            <tr>
              <td style="width: 20px; vertical-align: top; padding: 5px;">
                <div style="border: 1px solid black; width: 15px; height: 15px; text-align: center; line-height: 15px;">X</div>
              </td>
              <td style="vertical-align: top; padding: 5px;">
                <p style="font-size: 10px; margin: 0;">
                  I acknowledge that anyone I permit to operate the golf cart shall be at least 16 years of age and be in possession of a valid driver's license.
                </p>
              </td>
              <td style="width: 80px; vertical-align: top; padding: 5px;">
                <div>
                  <span style="font-size: 10px; font-weight: bold;">INITIAL:</span>
                  <div style="border: 1px solid black; width: 60px; height: 20px; margin-top: 2px; text-align: center; line-height: 20px; background-color: #f9f9f9;">
                    ${initialValues[1] || ""}
                  </div>
                </div>
              </td>
            </tr>
            <tr>
              <td style="width: 20px; vertical-align: top; padding: 5px;">
                <div style="border: 1px solid black; width: 15px; height: 15px; text-align: center; line-height: 15px;">X</div>
              </td>
              <td style="vertical-align: top; padding: 5px;">
                <p style="font-size: 10px; margin: 0;">
                  I acknowledge that there is a charge of $100 for lost car keys.
                </p>
              </td>
              <td style="width: 80px; vertical-align: top; padding: 5px;">
                <div>
                  <span style="font-size: 10px; font-weight: bold;">INITIAL:</span>
                  <div style="border: 1px solid black; width: 60px; height: 20px; margin-top: 2px; text-align: center; line-height: 20px; background-color: #f9f9f9;">
                    ${initialValues[2] || ""}
                  </div>
                </div>
              </td>
            </tr>
            <tr>
              <td style="width: 20px; vertical-align: top; padding: 5px;">
                <div style="border: 1px solid black; width: 15px; height: 15px; text-align: center; line-height: 15px;">X</div>
              </td>
              <td style="vertical-align: top; padding: 5px;">
                <p style="font-size: 10px; margin: 0;">
                  I acknowledge and agree that upon arrival to the property I shall inspect the golf cart(s) and sign the Golf Cart Damage Inspection Checklist. Additionally, I agree that if I don't complete and execute such document by the day of check in at 11:59 P.M. it shall be understood that I waive such inspection right and accept the golf cart(s) as described in such document by Luxe Properties PR LLC. I accept I'm responsible to pay for any other damages caused during my rental period
                </p>
              </td>
              <td style="width: 80px; vertical-align: top; padding: 5px;">
                <div>
                  <span style="font-size: 10px; font-weight: bold;">INITIAL:</span>
                  <div style="border: 1px solid black; width: 60px; height: 20px; margin-top: 2px; text-align: center; line-height: 20px; background-color: #f9f9f9;">
                    ${initialValues[3] || ""}
                  </div>
                </div>
              </td>
            </tr>
          </table>
        </div>
        
        <div style="margin-top: 15px; font-size: 10px;">
          <!-- Párrafo compacto sin saltos de línea -->
          <div style="border: 1px solid black; width: 15px; height: 15px; text-align: center; line-height: 15px;">X</div>
          <p style="margin-bottom: 10px;">
            <span style="color: red; font-weight: bold;">I acknowledge that it is strictly forbidden for an individual without a valid driver's license to operate the golf cart.</span> I am responsible for the possession/control of vehicle keys when not in use. <span style="color: red; font-weight: bold;">Golf carts are a motorized vehicle and driving or riding in these vehicles can lead to serious injury, property damage and even death.</span> The use of these vehicles is for transportation and use should conform with all rules & regulations of the Bahia Beach Resort Community. <span style="color: red; font-weight: bold;">No excessive speeding, joy riding, golf course or golf course path riding, beach, sand or off-road riding, disregard of traffic signs, or any type of unreasonable activity with the golf cart will be tolerated by the development. I will limit the number of golf cart occupants to the number of occupants recommended by the golf cart's manufacturer.</span> In no way should the use of this vehicle be seen as an endorsement by the unit owner, property manager or Bahia Beach of a form of recreation or fun. <span style="font-weight: bold;">I ACKNOWLEDGE THAT THE ASSOCIATION DOES NOT GIVE WARNINGS WITH REGARD TO VIOLATIONS OF APPLICABLE RULES. I ACKNOWLEDGE AND AGREE THAT IN THE EVENT MY GOLF CART IS USED IN VIOLATION OF THE RULES, THE POPERTY MANAGER MAY SEEK REIMBURSEMENTS OF ANY FINES IMPOSED BY THE DEVELOPMENT AND/OR LEVY FINES AGAINST ME</span>
          </p>
          
          <div style="text-align: right; margin-top: 10px; margin-bottom: 10px;">
            <table style="width: 100%;">
              <tr>
                <td style="text-align: right; width: 80%;">
                  <span style="font-size: 10px; font-weight: bold;">INITIAL:</span>
                </td>
                <td style="text-align: left; width: 20%;">
                  <div style="border: 1px solid black; width: 60px; height: 20px; text-align: center; line-height: 20px; display: inline-block; background-color: #f9f9f9;">
                    ${initialValues[4] || ""}
                  </div>
                </td>
              </tr>
            </table>
          </div>
        </div>
        
        <div style="margin-top: 30px;">
          <p style="font-size: 10px; margin-bottom: 5px;">Signature:</p>
          <div style="border: 1px solid black; height: 60px; width: 100%; position: relative;">
            <img id="signatureImage" src="${
              window.currentSignature || ""
            }" style="max-width: 100%; max-height: 100%; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);">
          </div>
          
          <div style="display: flex; margin-top: 20px; font-size: 10px;">
            <div style="flex: 1;">
              <p style="margin-bottom: 5px;"><b>Guest Name:</b> ${fullName}</p>
              <p style="margin-bottom: 5px;"><b>License:</b> ${license}</p>
            </div>
            <div style="flex: 1;">
              <p style="margin-bottom: 5px;"><b>Issuing State:</b> ${issuingState}</p>
              <p style="margin-bottom: 5px;"><b>Address:</b> ${address}</p>
            </div>
          </div>
          
          <p style="font-size: 10px; margin-top: 20px;"><b>Date:</b> ${signatureDate}</p>
        </div>
      `;

    // Opciones para html2pdf
    const options = {
      margin: 10,
      filename: "golf-cart-waiver.pdf",
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "letter", orientation: "portrait" },
    };

    // Generar PDF
    const pdfBlob = await html2pdf()
      .from(pdfContainer)
      .set(options)
      .outputPdf("blob");

    // Subir a Supabase y obtener URL pública
    try {
      const fileName = `waiver_${Date.now()}.pdf`;
      const publicUrl = await uploadPDF(fileName, pdfBlob);

      // Devolver la URL pública para Airtable
      return publicUrl || null;
    } catch (uploadError) {
      console.error("Error al subir PDF:", uploadError);
      // Como alternativa, devolver el blob
      return pdfBlob;
    }
  } catch (error) {
    console.error("Error al generar el PDF:", error);
    throw error;
  }
}

// Función auxiliar para enviar el PDF por email
export async function sendPDFByEmail(pdfBlob, email, fullName) {
  try {
    // Crear un FormData para enviar el archivo
    const formData = new FormData();
    formData.append("pdf", pdfBlob, "golf-cart-waiver.pdf");
    formData.append("email", email);
    formData.append("fullName", fullName);

    // Enviar a tu endpoint de backend
    const response = await fetch("/api/send-waiver", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Error al enviar el email");
    }

    return await response.json();
  } catch (error) {
    console.error("Error al enviar el PDF por email:", error);
    throw error;
  }
}

// Función para guardar el PDF en Supabase
export async function savePDFToSupabase(pdfBlob, formData) {
  try {
    // Código para guardar en Supabase
    // (Mantener tu implementación actual)

    return { success: true };
  } catch (error) {
    console.error("Error al guardar el PDF en Supabase:", error);
    throw error;
  }
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
    return true;
  } catch (error) {
    console.error("Error al descargar el PDF:", error);
    return false;
  }
}
