import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { captureWaiverData, submissionFormData } from '../src/services/waiverData.js';
import { generatePDF, pdfChecksum, downloadPDF } from '../src/services/pdfService.js';
const require = createRequire(import.meta.url);
const { createHandler } = require('../netlify/functions/upload-pdf.js');
const signatureImage = 'data:image/png;base64,' + readFileSync(new URL('../assets/logo.png', import.meta.url)).toString('base64');

function fixture() {
  const inputs = {
    'Signature Date': { value: '2026-10-16' }, 'Guest Name': { value: 'QA Test Guest' },
    License: { value: '00123456' }, 'Issuing State': { value: 'Florida' },
    Address: { value: '123 Original Street' },
  };
  for (let i = 1; i <= 12; i++) {
    inputs[`Initial ${i}`] = { value: `A${i}` };
    inputs[`Acceptance ${i}`] = { checked: true };
  }
  const form = { querySelector(selector) { return inputs[selector.match(/name="([^"]+)"/)?.[1]]; } };
  const pad = { isEmpty: () => false, toDataURL: () => signatureImage };
  return { inputs, form, pad };
}

function storage() {
  const objects = new Map();
  const uploads = [];
  let sequence = 0;
  const handler = createHandler({
    env: { SUPABASE_URL: 'https://test.invalid', SUPABASE_SERVICE_ROLE_KEY: 'test-only' },
    createId: () => `server-${++sequence}`,
    createClientFn: () => ({ storage: { from: () => ({
      async upload(path, bytes, options) {
        uploads.push({ path, options });
        assert.equal(options.upsert, false);
        assert.equal(options.cacheControl, '0');
        assert.ok(!objects.has(path));
        objects.set(path, Buffer.from(bytes));
        return { error: null };
      },
      getPublicUrl: path => ({ data: { publicUrl: `https://test.invalid/${path}` } }),
    }) } }),
  });
  return { handler, uploads, objects };
}

function connect(mock, handler, override = value => value) {
  mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, '/api/upload-pdf');
    const result = await handler({ httpMethod: 'POST', body: options.body });
    return { ok: result.statusCode === 200, json: async () => override(JSON.parse(result.body)) };
  });
}

test('snapshot retains all 29 values and signature after the live form is cleared', () => {
  const { form, inputs, pad } = fixture();
  const snapshot = captureWaiverData(form, pad);
  for (const field of Object.values(inputs)) { field.value = ''; field.checked = false; }
  assert.equal(Object.keys(snapshot.values).length, 29);
  assert.equal(snapshot.values['Guest Name'], 'QA Test Guest');
  assert.equal(snapshot.values.License, '00123456');
  assert.equal(snapshot.values['Initial 12'], 'A12');
  assert.equal(snapshot.values['Acceptance 12'], true);
  assert.equal(snapshot.signature, signatureImage);
  assert.throws(() => { snapshot.values.Address = ''; }, TypeError);
  const data = submissionFormData(snapshot);
  assert.equal(data.get('Form Id'), snapshot.id);
  assert.equal(data.get('License'), '00123456');
  assert.equal(data.get('Initial 12'), 'A12');
  assert.equal(data.get('Acceptance 12'), 'on');
});

test('file name is Guest Name-Luxe-Signature Date', () => {
  const { form, pad } = fixture();
  const a = captureWaiverData(form, pad);
  const b = captureWaiverData(form, pad);
  assert.equal(a.fileName, 'QA_Test_Guest-Luxe-2026-10-16.pdf');
  assert.notEqual(a.id, b.id);
});

test('incomplete or unsigned submissions fail before creating or uploading a PDF', () => {
  const { form, inputs, pad } = fixture();
  assert.throws(() => captureWaiverData(form, { isEmpty: () => true }), /signature/);
  inputs['Initial 5'].value = '';
  assert.throws(() => captureWaiverData(form, pad), /term 5/);
  inputs['Initial 5'].value = 'AB';
  inputs['Acceptance 5'].checked = false;
  assert.throws(() => captureWaiverData(form, pad), /term 5/);
});

test('PDF generation survives live-input changes while the logo decodes', async t => {
  const { form, inputs, pad } = fixture();
  const submission = captureWaiverData(form, pad);
  const store = storage();
  connect(t.mock, store.handler);
  const logo = { async decode() {
    for (const input of Object.values(inputs)) { input.value = ''; input.checked = false; }
    // No image is needed in this regression test.
    throw new Error('Image deliberately unavailable');
  } };
  await assert.rejects(generatePDF(submission, logo), /Image deliberately unavailable/);
  const artifact = await generatePDF(submission, null);
  const bytes = Buffer.from(await artifact.blob.arrayBuffer());
  const text = bytes.toString('latin1');
  assert.ok(text.includes('(QA Test Guest) Tj'));
  assert.ok(text.includes('(123 Original Street) Tj'));
  assert.ok(text.includes('(A12) Tj'));
  assert.doesNotMatch(text, /\/Subtype \/Widget/);
  const saved = store.objects.get(artifact.publicUrl.replace('https://test.invalid/', ''));
  assert.deepEqual(bytes, saved);
});

test('two submissions of the same guest retain separate bytes and Airtable links', async t => {
  const { form, inputs, pad } = fixture();
  const store = storage();
  connect(t.mock, store.handler);
  const first = captureWaiverData(form, pad);
  const a = await generatePDF(first, null);
  inputs.Address.value = '456 Updated Street';
  inputs['Initial 1'].value = 'NEW';
  const second = captureWaiverData(form, pad);
  const b = await generatePDF(second, null);
  assert.notEqual(a.publicUrl, b.publicUrl);
  for (const url of [a.publicUrl, b.publicUrl]) assert.match(url, /\/server-\d+\/QA_Test_Guest-Luxe-2026-10-16\.pdf$/);
  assert.equal(store.objects.size, 2);
  const oldText = Buffer.from(await a.blob.arrayBuffer()).toString('latin1');
  const newText = Buffer.from(await b.blob.arrayBuffer()).toString('latin1');
  assert.ok(oldText.includes('(123 Original Street) Tj'));
  assert.ok(newText.includes('(456 Updated Street) Tj'));
  assert.ok(newText.includes('(NEW) Tj'));
  assert.equal(submissionFormData(second).get('Address'), '456 Updated Street');
});

test('server gives older clients a new immutable path even with the same requested filename', async () => {
  const store = storage();
  const pdf = Buffer.from('%PDF-1.3\nTest fixture');
  const event = { httpMethod: 'POST', body: JSON.stringify({ fileName: 'Guest_2026-10-16.pdf', pdfBase64: pdf.toString('base64') }) };
  const a = JSON.parse((await store.handler(event)).body);
  const b = JSON.parse((await store.handler(event)).body);
  assert.notEqual(a.publicUrl, b.publicUrl);
  assert.equal(store.objects.size, 2);
});

test('client refuses success when server checksum differs from the generated PDF', async t => {
  const { form, pad } = fixture();
  const store = storage();
  connect(t.mock, store.handler, response => ({ ...response, sha256: 'wrong' }));
  await assert.rejects(generatePDF(captureWaiverData(form, pad), null), /could not be verified/);
});

test('server rejects corrupt or non-PDF bytes without saving them', async () => {
  const store = storage();
  for (const [bytes, sha256] of [['not a PDF', undefined], ['%PDF-1.3\nfixture', 'wrong']]) {
    const response = await store.handler({ httpMethod: 'POST', body: JSON.stringify({ fileName: 'Guest_2026-10-16.pdf', pdfBase64: Buffer.from(bytes).toString('base64'), sha256 }) });
    assert.equal(response.statusCode, 400);
  }
  assert.equal(store.objects.size, 0);
});

test('download uses the exact generated blob without a public-URL fetch', async t => {
  const blob = new Blob(['%PDF-1.3\nExact local bytes'], { type: 'application/pdf' });
  let downloaded;
  let clicked = false;
  const previousDocument = globalThis.document;
  t.after(() => { if (previousDocument) globalThis.document = previousDocument; else delete globalThis.document; });
  const link = { click() { clicked = true; }, remove() {} };
  globalThis.document = { createElement: () => link, body: { appendChild() {} } };
  t.mock.method(URL, 'createObjectURL', bytes => { downloaded = bytes; return 'blob:local-test'; });
  t.mock.method(globalThis, 'fetch', () => { throw new Error('Cached URL must never be fetched'); });
  t.mock.method(globalThis, 'setTimeout', () => 0);
  downloadPDF(blob, 'Guest.pdf');
  assert.equal(downloaded, blob);
  assert.equal(link.download, 'Guest.pdf');
  assert.equal(link.href, 'blob:local-test');
  assert.equal(clicked, true);
  assert.equal((await pdfChecksum(blob)).length, 64);
});
