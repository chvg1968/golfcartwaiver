import { buildWaiverDocument } from './waiverDocument.js';

export async function pdfChecksum(blob) {
  const hash = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function uploadPDFViaServer(fileName, blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 32768) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
  }
  const sha256 = await pdfChecksum(blob);
  const response = await fetch('/api/upload-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName, pdfBase64: btoa(binary), contentType: 'application/pdf', sha256 }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Unable to store the signed PDF. Please retry.');
  if (!result.publicUrl || result.sha256 !== sha256) {
    throw new Error('The stored PDF could not be verified. Your entries have been preserved.');
  }
  return result.publicUrl;
}

export async function generatePDF(submission, logo) {
  if (!submission.signature || !submission.values || !submission.id) {
    throw new Error('A complete submission is required to generate the signed PDF.');
  }
  if (logo) await logo.decode();
  const pdf = buildWaiverDocument(submission.values, submission.signature, logo);
  pdf.setProperties({ subject: `Signed equipment agreement ${submission.id}` });
  const blob = pdf.output('blob');
  const publicUrl = await uploadPDFViaServer(submission.fileName, blob);
  // Download these exact bytes instead of re-fetching a potentially cached URL.
  return { blob, fileName: submission.fileName, publicUrl };
}

export function downloadPDF(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
