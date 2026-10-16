import agreement from '../content/waiver.json' with { type: 'json' };

export const guestFields = ['Signature Date', 'Guest Name', 'License', 'Issuing State', 'Address'];
export const termCount = agreement.filter(item => item.kind === 'term').length;

// Read everything synchronously, before fonts, image decoding or network requests.
// The renderer and every integration receive this same immutable submission.
export function captureWaiverData(form, signaturePad) {
  if (!signaturePad || signaturePad.isEmpty()) throw new Error('Please provide your signature.');
  const values = {};
  for (const name of guestFields) {
    values[name] = form.querySelector(`[name="${name}"]`)?.value.trim() || '';
    if (!values[name]) throw new Error(`Please complete ${name}.`);
  }
  for (let i = 1; i <= termCount; i++) {
    values[`Acceptance ${i}`] = form.querySelector(`[name="Acceptance ${i}"]`)?.checked === true;
    values[`Initial ${i}`] = form.querySelector(`[name="Initial ${i}"]`)?.value.trim() || '';
    if (!values[`Acceptance ${i}`] || !values[`Initial ${i}`]) {
      throw new Error(`Please accept and initial term ${i}.`);
    }
  }
  const id = `LUXE-${crypto.randomUUID()}`;
  const guestName = values['Guest Name'].normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 80) || 'Guest';
  return Object.freeze({
    id,
    values: Object.freeze(values),
    signature: signaturePad.toDataURL('image/png'),
    fileName: `${guestName}_${id}_${values['Signature Date']}.pdf`,
  });
}

export function submissionFormData(submission) {
  const data = new FormData();
  data.set('Form Id', submission.id);
  for (const [name, value] of Object.entries(submission.values)) {
    data.set(name, typeof value === 'boolean' ? (value ? 'on' : '') : value);
  }
  return data;
}
