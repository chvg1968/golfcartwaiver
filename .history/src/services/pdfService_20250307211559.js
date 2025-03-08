import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { supabase, uploadPDF } from "../utils/supabaseClient";
import html2pdf from "html2pdf.js";

// Logo en formato base64 (incluido directamente en el código)
const logoBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAP8AAAFMCAYAAAAEIWqlAAAKoWlDQ1BJQ0MgUHJvZmlsZQAASImVlwdQk9kWx+/3femFlhABKaE3KaE3"; // Aquí debes pegar el contenido completo del archivo logo_base64.txt precedido por "data:image/png;base64,"

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

// Función para generar el PDF sin depender del logo externo
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
    pdfContainer.style.width = "7in";
    pdfContainer.style.padding = "0.3in";
    pdfContainer.style.margin = "0 auto";
    pdfContainer.style.maxWidth = "90%";
    pdfContainer.style.fontFamily = "Helvetica, Arial, sans-serif";
    pdfContainer.style.fontSize = "9px"; // Reducir el tamaño del texto
    pdfContainer.style.lineHeight = "1.1"; // Reducir el espacio entre líneas
    pdfContainer.style.pageBreakInside = "avoid"; // Evitar cortes de página
  

  
      // Añadir contenido HTML para el PDF - usando un título en lugar de logo para evitar problemas
      pdfContainer.innerHTML = `
          <div style="text-align: center; margin-bottom: 10px; display: flex; flex-direction: column; align-items: center;">
            <img src="${logoBase64}" alt="Logo" style="max-width: 150px; height: auto; margin: 0 auto;">
            <h1 style="font-size: 14px; font-weight: bold; margin-top: 5px; text-align: center;">★ GOLF CART LIABILITY WAIVER ★</h1>
          </div>
          
          <div style="font-size: 9px; margin-bottom: 10px; text-align: justify;">
            <p style="margin-bottom: 5px; line-height: 1.2;">
              In exchange for the privilege to operate the golf cart assigned to my Luxe Properties PR LLC rental at Bahia Beach Resort community, I hereby accept responsibility for my own negligence and the negligence of any operator of my assigned golf cart. I hereby agree to operate the golf cart in a safe manner, and adhere to all rules set forth by Bahia Beach Resort Community, and to ensure that anyone operating the golf cart with my consent does the same. I acknowledge that I am liable for all medical and legal claims that may arise from the use of the golf cart.
            </p>
            <p style="font-weight: bold; margin-top: 5px; line-height: 1.2;">
              I voluntarily agree to accept the risks of using a golf cart and on behalf of myself, my personal representatives and my heirs hereby voluntarily release the Owner and Property manager of the Unit at Bahia Beach Resort Community, and its directors, officers, employees, and agents from any and all claims, actions, causes of actions, suits, judgments and demands for bodily injury, property damage, loss of life and/or loss of services, in law or equity, that may in any way or manner arise out of use of the golf cart.
            </p>
          </div>
          
          <div style="margin-bottom: 10px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="width: 20px; vertical-align: top; padding: 3px;">
                  <div style="border: 1px solid black; width: 15px; height: 15px; text-align: center; line-height: 15px;">✔︎</div>
                </td>
                <td style="vertical-align: top; padding: 3px;">
                  <p style="font-size: 9px; margin: 0;">
                    I am at least 18 years of age and attached hereto is a copy of my valid driver's license. I assume all responsibility for anyone operating this golf cart at the Development.
                  </p>
                </td>
                <td style="width: 80px; vertical-align: top; padding: 3px;">
                  <div>
                    <span style="font-size: 9px; font-weight: bold;">INITIAL:</span>
                    <div style="border: 1px solid black; width: 60px; height: 20px; margin-top: 2px; text-align: center; line-height: 20px; background-color: #f9f9f9; display: flex; align-items: center; justify-content: center;">
                      <span style="font-size: 11px;">${initialValues[0] || ""}</span>
                    </div>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="width: 20px; vertical-align: top; padding: 3px;">
                  <div style="border: 1px solid black; width: 15px; height: 15px; text-align: center; line-height: 15px;">✔︎</div>
                </td>
                <td style="vertical-align: top; padding: 3px;">
                  <p style="font-size: 9px; margin: 0;">
                    I acknowledge that anyone I permit to operate the golf cart shall be at least 16 years of age and be in possession of a valid driver's license.
                  </p>
                </td>
                <td style="width: 80px; vertical-align: top; padding: 3px;">
                  <div>
                    <span style="font-size: 9px; font-weight: bold;">INITIAL:</span>
                    <div style="border: 1px solid black; width: 60px; height: 20px; margin-top: 2px; text-align: center; line-height: 20px; background-color: #f9f9f9; display: flex; align-items: center; justify-content: center;">
                      <span style="font-size: 11px;">${initialValues[1] || ""}</span>
                    </div>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="width: 20px; vertical-align: top; padding: 3px;">
                  <div style="border: 1px solid black; width: 15px; height: 15px; text-align: center; line-height: 15px;">✔︎</div>
                </td>
                <td style="vertical-align: top; padding: 3px;">
                  <p style="font-size: 9px; margin: 0;">
                    I acknowledge that there is a charge of $100 for lost car keys.
                  </p>
                </td>
                <td style="width: 80px; vertical-align: top; padding: 3px;">
                  <div>
                    <span style="font-size: 9px; font-weight: bold;">INITIAL:</span>
                    <div style="border: 1px solid black; width: 60px; height: 20px; margin-top: 2px; text-align: center; line-height: 20px; background-color: #f9f9f9; display: flex; align-items: center; justify-content: center;">
                      <span style="font-size: 11px;">${initialValues[2] || ""}</span>
                    </div>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="width: 20px; vertical-align: top; padding: 3px;">
                  <div style="border: 1px solid black; width: 15px; height: 15px; text-align: center; line-height: 15px;">✔︎</div>
                </td>
                <td style="vertical-align: top; padding: 3px;">
                  <p style="font-size: 9px; margin: 0;">
                    I acknowledge and agree that upon arrival to the property I shall inspect the golf cart(s) and sign the Golf Cart Damage Inspection Checklist. Additionally, I agree that if I don’t complete and execute such document by the day of check in at 11:59 P.M. it shall be understood that I waive such inspection right and accept the golf cart(s) as described in such document by Luxe Properties PR LLC. I accept I’m responsible to pay for any other damages caused during my rental period.
                  </p>
                </td>
                <td style="width: 80px; vertical-align: top; padding: 3px;">
                  <div>
                    <span style="font-size: 9px; font-weight: bold;">INITIAL:</span>
                    <div style="border: 1px solid black; width: 60px; height: 20px; margin-top: 2px; text-align: center; line-height: 20px; background-color: #f9f9f9; display: flex; align-items: center; justify-content: center;">
                      <span style="font-size: 11px;">${initialValues[3] || ""}</span>
                    </div>
                  </div>
                </td>
              </tr>
            </table>
          </div>
          
          <div style="margin-top: 10px; font-size: 9px;">
            <!-- Párrafo compacto sin saltos de línea en formato de tabla -->
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="width: 20px; vertical-align: top; padding: 3px;">
                  <div style="border: 1px solid black; width: 15px; height: 15px; text-align: center; line-height: 15px;">✔︎</div>
                </td>
                <td style="vertical-align: top; padding: 3px;">
                  <p style="font-size: 9px; margin: 0;">
                    <span style="color: red; font-weight: bold;">I acknowledge that it is strictly forbidden for an individual without a valid driver's license to operate the golf cart.</span> I am responsible for the possession/control of vehicle keys when not in use. <span style="color: red; font-weight: bold;">Golf carts are a motorized vehicle and driving or riding in these vehicles can lead to serious injury, property damage and even death.</span> The use of these vehicles is for transportation and use should conform with all rules & regulations of the Bahia Beach Resort Community. <span style="color: red; font-weight: bold;">No excessive speeding, joy riding, golf course or golf course path riding, beach, sand or off-road riding, disregard of traffic signs, or any type of unreasonable activity with the golf cart will be tolerated by the development. I will limit the number of golf cart occupants to the number of occupants recommended by the golf cart's manufacturer.</span> In no way should the use of this vehicle be seen as an endorsement by the unit owner, property manager or Bahia Beach of a form of recreation or fun. <span style="font-weight: bold;">I ACKNOWLEDGE THAT THE ASSOCIATION DOES NOT GIVE WARNINGS WITH REGARD TO VIOLATIONS OF APPLICABLE RULES. I ACKNOWLEDGE AND AGREE THAT IN THE EVENT MY GOLF CART IS USED IN VIOLATION OF THE RULES, THE POPERTY MANAGER MAY SEEK REIMBURSEMENTS OF ANY FINES IMPOSED BY THE DEVELOPMENT AND/OR LEVY FINES AGAINST ME</span>
                  </p>
                </td>
              </tr>
            </table>
            
            <div style="text-align: right; margin-top: 5px; margin-bottom: 5px;">
              <table style="width: 100%;">
                <tr>
                  <td style="text-align: right; width: 80%;">
                    <span style="font-size: 9px; font-weight: bold;">INITIAL:</span>
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
          
          <div style="margin-top: 15px; width: 90%; margin-left: auto; margin-right: auto;">
            <p style="font-size: 9px; margin-bottom: 3px; font-weight: bold;">Signature:</p>
            <div style="border: 1px solid black; height: 60px; width: 100%; position: relative; background-color: #fafafa;">
              <img id="signatureImage" src="${
                window.currentSignature || ""
              }" style="max-width: 95%; max-height: 95%; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);">
            </div>
            
            <div style="display: flex; margin-top: 10px; font-size: 9px; justify-content: space-between;">
              <div style="flex: 1; padding-right: 5px;">
                <p style="margin-bottom: 3px;"><b>Guest Name:</b> ${fullName}</p>
                <p style="margin-bottom: 3px;"><b>License:</b> ${license}</p>
              </div>
              <div style="flex: 1; padding-left: 5px;">
                <p style="margin-bottom: 3px;"><b>Issuing State:</b> ${issuingState}</p>
                <p style="margin-bottom: 3px;"><b>Address:</b> ${address}</p>
              </div>
            </div>
            
            <p style="font-size: 9px; margin-top: 10px; text-align: center;"><b>Date:</b> ${signatureDate}</p>
          </div>
        `;
  
      // Opciones para html2pdf
      const options = {
        margin: [10, 10, 10, 10], // [top, right, bottom, left] - reducidos
        filename: "golf-cart-waiver.pdf",
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { 
          unit: "mm", 
          format: "letter", 
          orientation: "portrait",
          compress: true,
          precision: 2,
          putOnlyUsedFonts: true
        },
        pagebreak: { mode: "avoid-all" } // Evitar saltos de página automáticos
      };
  
      // Generar PDF
      const pdfBlob = await html2pdf()
        .from(pdfContainer)
        .set(options)
        .outputPdf("blob");

      // Subir a Supabase y obtener URL pública
      try {
        const fileName = `waiver_${Date.now()}.pdf`;
        const { data, error } = await uploadPDF(pdfBlob, formData);
        
        if (error) {
          console.error("Error al subir PDF a Supabase:", error);
          throw new Error("Error al subir PDF a Supabase");
        }
        
        // Devolver la URL pública para Airtable
        return data.publicUrl || null;
      } catch (uploadError) {
        console.error("Error al subir PDF:", uploadError);
        // Como alternativa, devolver el blob
        return pdfBlob;
      }
    } catch (error) {
      console.error("Error al generar PDF:", error);
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
