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
const form = {
  querySelector(selector) {
    const name = selector.match(/name="([^"]+)"/)?.[1];
    if (name?.startsWith('Initial ')) return { value: `A${name.split(' ')[1]}` };
    if (name?.startsWith('Acceptance ')) return { checked: Number(name.split(' ')[1]) % 2 === 1 };
    return name in guest ? { value: guest[name] } : null;
  },
};

test('serializes every acceptance state, initial and guest value into named fields', () => {
  const pdf = buildWaiverDocument(form, null, null);
  const root = pdf.internal.acroformPlugin.acroFormDictionaryRoot;
  const fields = new Map(root.Fields.map(f => [f.fieldName, f]));
  assert.equal(fields.size, 30);
  for (let i = 1; i <= 12; i++) {
    assert.equal(fields.get(`Initial ${i}`).value, `A${i}`);
    const checkbox = fields.get(`Acceptance ${i}`);
    const expected = i % 2 === 1 ? 'On' : 'Off';
    assert.equal(checkbox.value, expected);
    assert.equal(checkbox.appearanceState, expected);
  }
  for (const [name, value] of Object.entries(guest)) assert.equal(fields.get(name).value, value);
  assert.equal(fields.get('Signature').FT, '/Sig');
  const output = pdf.output();
  for (const value of Object.values(guest)) assert.ok(output.includes(`/V (${value})`));
  assert.equal((output.match(/\/FT \/Btn/g) || []).length, 12);
  assert.equal((output.match(/\/FT \/Tx/g) || []).length, 17);
  assert.match(output, /\/DA \(\/F1 10 Tf 0 g\)/);
  assert.match(output, /\/DR 2 0 R/);
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

test('adding a signature image retains all form values and checkbox states', () => {
  // Use a local image solely as a fixture; no synthetic guest signature is submitted.
  const fixture = 'data:image/png;base64,' + readFileSync(new URL('../assets/logo.png', import.meta.url)).toString('base64');
  const pdf = buildWaiverDocument(form, fixture, null);
  const fields = new Map(pdf.internal.acroformPlugin.acroFormDictionaryRoot.Fields.map(f => [f.fieldName, f]));
  assert.equal(fields.size, 29);
  assert.equal(fields.has('Signature'), false);
  for (let i = 1; i <= 12; i++) {
    assert.equal(fields.get(`Initial ${i}`).value, `A${i}`);
    assert.equal(fields.get(`Acceptance ${i}`).value, i % 2 ? 'On' : 'Off');
  }
  for (const [name, value] of Object.entries(guest)) assert.equal(fields.get(name).value, value);
  assert.match(pdf.output(), /\/Subtype \/Image/);
});
