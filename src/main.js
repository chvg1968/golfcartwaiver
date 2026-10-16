import { Spinner } from 'spin.js';
import 'spin.js/spin.css';
import Swal from 'sweetalert2';
import { SignatureComponent } from './components/signature.js';
import { captureWaiverData, submissionFormData } from './services/waiverData.js';
import { sendEmail } from './services/emailService.js';
import { generatePDF, downloadPDF } from './services/pdfService.js';
import { sendToAirtable } from './services/airtableService.js';
import { saveWaiverToSupabase } from './utils/supabaseClient.js';

export function initializeWaiverForm() {
  const form = document.getElementById('waiverForm');
  const canvas = document.getElementById('signature-pad');
  const clear = document.getElementById('clear-signature');
  const spinnerTarget = document.getElementById('loading-spinner');
  const resultPanel = document.getElementById('submission-result');
  const resultMessage = document.getElementById('submission-message');
  const downloadLink = document.getElementById('download-signed-pdf');
  const signature = new SignatureComponent(canvas);
  window.signaturePad = signature.signaturePad;
  const spinner = new Spinner({ color: '#007bff', lines: 12, radius: 20, length: 12, width: 5 });
  let inFlight = false;
  let downloadUrl;

  clear.addEventListener('click', () => signature.clear());
  window.addEventListener('pagehide', () => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (inFlight || !form.reportValidity()) return;
    let controls = [];
    try {
      // Snapshot all data and the signature before the first asynchronous step.
      const submission = captureWaiverData(form, signature);
      const data = submissionFormData(submission);
      const values = submission.values;
      inFlight = true;
      controls = Array.from(form.elements).map(element => [element, element.disabled]);
      for (const [element] of controls) element.disabled = true;
      canvas.style.pointerEvents = 'none';
      spinnerTarget.style.display = 'block';
      spinner.spin(spinnerTarget);

      const artifact = await generatePDF(submission, form.querySelector('.logo'));
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
      downloadUrl = URL.createObjectURL(artifact.blob);
      downloadLink.href = downloadUrl;
      downloadLink.download = artifact.fileName;
      resultPanel.hidden = false;
      resultMessage.textContent = 'Your signed PDF is ready. Completing your submission…';

      await sendToAirtable(data, artifact.publicUrl);
      await saveWaiverToSupabase({
        form_id: submission.id,
        signature_date: values['Signature Date'],
        guest_name: values['Guest Name'],
        license: values.License,
        issuing_state: values['Issuing State'],
        address: values.Address,
        pdf_link: artifact.publicUrl,
      });
      const email = await sendEmail({
        guestName: values['Guest Name'],
        license: values.License,
        issuingState: values['Issuing State'],
        address: values.Address,
        signatureDate: values['Signature Date'],
        formId: submission.id,
      }, artifact.publicUrl);
      if (!email.success) throw new Error(email.error || 'Unable to send the confirmation.');

      resultMessage.textContent = 'Your waiver was submitted. Your entries remain on this page.';
      downloadPDF(artifact.blob, artifact.fileName);
      Swal.fire({
        icon: 'success', title: 'Waiver Submitted',
        text: 'Your signed PDF is ready. Use Download Signed PDF if the download did not start.',
        confirmButtonText: 'OK', confirmButtonColor: '#007bff',
      });
      // Never reset the form or erase its signature as a side effect of generating a PDF.
    } catch (error) {
      if (downloadUrl) resultMessage.textContent = 'Your PDF is available below. Submission could not be completed; your entries are preserved.';
      Swal.fire({
        icon: 'error', title: 'Submission Failed',
        text: `${error.message || 'Please try again.'} Your entries have not been cleared.`,
        confirmButtonText: 'OK', confirmButtonColor: '#dc3545',
      });
    } finally {
      for (const [element, disabled] of controls) element.disabled = disabled;
      canvas.style.pointerEvents = '';
      spinner.stop();
      spinnerTarget.style.display = 'none';
      inFlight = false;
    }
  });
}

document.addEventListener('DOMContentLoaded', initializeWaiverForm);
