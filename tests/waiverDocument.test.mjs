import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildWaiverDocument } from '../src/services/waiverDocument.js';

const guest = {
  'Signature Date': '2026-10-16',
  'Guest Name': 'QA Test Guest',
  License: 'FL-123-456',
  'Issuing State': 'Florida',
  Address: '123 Test Street',
};
const form = { ...guest };
for (let i = 1; i <= 12; i++) {
  form[`Initial ${i}`] = `A${i}`;
  form[`Acceptance ${i}`] = i % 2 === 1;
}

test('submitted waiver draws every initial, acceptance and guest value as page content', () => {
  const pdf = buildWaiverDocument(form, null, null);
  const output = pdf.output();
  // Widgets are invisible in Airtable previews and many viewers; values must be page text.
  assert.equal((output.match(/\/Subtype \/Widget/g) || []).length, 0);
  assert.doesNotMatch(output, /\/AcroForm/);
  for (let i = 1; i <= 12; i++) assert.ok(output.includes(`(A${i}) Tj`));
  for (const value of Object.values(guest)) assert.ok(output.includes(`(${value}) Tj`));
});

test('blank Reader template contains editable fields and unchecked acceptances', () => {
  const pdf = buildWaiverDocument(null, null, null);
  const fields = pdf.internal.acroformPlugin.acroFormDictionaryRoot.Fields;
  assert.equal(fields.length, 30);
  for (const f of fields) {
    assert.equal(f.readOnly, false);
    if (f.FT === '/Btn') {
      assert.equal(f.value, 'Off');
      assert.equal(f.appearanceState, 'Off');
    }
  }
});

test('adding a signature image keeps every value visible without form widgets', () => {
  // Use a local image solely as a fixture; no synthetic guest signature is submitted.
  const fixture = 'data:image/png;base64,' + readFileSync(new URL('../assets/logo.png', import.meta.url)).toString('base64');
  const output = buildWaiverDocument(form, fixture, null).output();
  assert.match(output, /\/Subtype \/Image/);
  assert.equal((output.match(/\/Subtype \/Widget/g) || []).length, 0);
  for (let i = 1; i <= 12; i++) assert.ok(output.includes(`(A${i}) Tj`));
  for (const value of Object.values(guest)) assert.ok(output.includes(`(${value}) Tj`));
});

test('blank template form dictionaries are plain PDF objects that Chrome can read', () => {
  const pdf = buildWaiverDocument(null, null, null);
  const root = pdf.internal.acroformPlugin.acroFormDictionaryRoot;
  const output = pdf.output();
  assert.equal((output.match(/\/FT \/Btn/g) || []).length, 12);
  assert.equal((output.match(/\/FT \/Tx/g) || []).length, 17);
  assert.match(output, /\/DA \(\/F1 10 Tf 0 g\)/);
  assert.match(output, /\/DR 2 0 R/);
  // Chrome rejects field dictionaries serialized as streams.
  for (const object of [root, ...root.Fields]) {
    const start = output.indexOf(`\n${object.objId} 0 obj\n`);
    assert.notEqual(start, -1);
    const end = output.indexOf('\nendobj', start);
    assert.notEqual(end, -1);
    const serialized = output.slice(start, end);
    assert.doesNotMatch(serialized, /\nstream\b/);
    assert.doesNotMatch(serialized, /\/Filter\b|\/Length\b/);
  }
});
