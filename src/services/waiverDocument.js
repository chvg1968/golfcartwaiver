import { jsPDF, AcroFormTextField, AcroFormCheckBox } from 'jspdf';
import agreement from '../content/waiver.json' with { type: 'json' };

// Word run formatting is shared by the displayed agreement and PDF source.
export function buildWaiverDocument(values, signature, logo) {
  // jsPDF 3.0 also compresses empty AcroForm dictionaries into stream objects.
  // Chrome rejects those field objects and hides every value, while leaving the
  // signature (page content) visible. Keep form dictionaries as plain objects.
  const pdf = new jsPDF({ unit: 'mm', format: 'letter', compress: false });
  const margin = 18;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const width = pageWidth - margin * 2;
  const bottom = pdf.internal.pageSize.getHeight() - 20;
  let y = margin;
  // A submitted waiver is flattened: every value is page content, not a form
  // widget, because Airtable previews and many viewers never paint widgets.
  const filled = Boolean(values);
  const clean = text => String(text).replace(/[\u2018\u2019]/g, "'").replace(/[\u2013\u2014]/g, '-');
  const font = run => pdf.setFont('helvetica', run.bold ? (run.italic ? 'bolditalic' : 'bold') : (run.italic ? 'italic' : 'normal'));
  function room(height) {
    if (y + height > bottom) { pdf.addPage(); y = margin; }
  }
  function plain(text, size = 10, bold = false, center = false) {
    pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    pdf.setFontSize(size);
    pdf.setTextColor('#000000');
    for (const line of pdf.splitTextToSize(clean(text), width)) {
      pdf.text(line, center ? pageWidth / 2 : margin, y, center ? { align: 'center' } : {});
      y += size * 0.3528 * 1.35;
    }
    y += 3;
  }
  function wrap(item) {
    const size = item.kind === 'heading' ? 11 : 10;
    const step = size * 0.3528 * 1.35;
    pdf.setFontSize(size);
    const lines = [[]];
    let lineWidth = 0;
    // Keep whitespace across run boundaries, including words split across Word runs.
    for (const run of item.runs) {
      font(run);
      for (const text of clean(run.text).split(/(\s+)/).filter(Boolean)) {
        const token = /^\s+$/.test(text) ? ' ' : text;
        const w = pdf.getTextWidth(token);
        if (lineWidth + w > width && lineWidth > 0) { lines.push([]); lineWidth = 0; }
        if (!lineWidth && token === ' ') continue;
        lines.at(-1).push({ ...run, text: token, width: w });
        lineWidth += w;
      }
    }
    return { lines, size, step };
  }
  function rich(item, { lines, size, step }) {
    const firstBaseline = y;
    for (const [index, line] of lines.entries()) {
      // Justify complete paragraph lines; keep the final line naturally spaced.
      while (line.at(-1)?.text === ' ') line.pop();
      const spaces = line.filter(run => run.text === ' ').length;
      const naturalWidth = line.reduce((sum, run) => sum + run.width, 0);
      const extraSpace = item.kind !== 'heading' && index < lines.length - 1 && spaces
        ? Math.max(0, width - naturalWidth) / spaces : 0;
      let x = margin;
      for (const run of line) {
        const advance = run.width + (run.text === ' ' ? extraSpace : 0);
        font(run);
        pdf.setTextColor('#' + run.color);
        if (run.highlight) {
          pdf.setFillColor('#FFFF00');
          pdf.rect(x, y - size * 0.3528 * 0.84, advance + 0.05, size * 0.3528 * 1.13, 'F');
        }
        pdf.text(run.text, x, y);
        if (run.underline) {
          pdf.setDrawColor('#' + run.color);
          pdf.setLineWidth(0.15);
          pdf.line(x, y + 0.6, x + advance, y + 0.6);
        }
        x += advance;
      }
      y += step;
    }
    y += 3;
    return firstBaseline;
  }
  function field(name, x, top, w, h, value = '', signatureField = false) {
    pdf.setDrawColor('#BBBBBB');
    pdf.setLineWidth(0.2);
    pdf.rect(x, top, w, h);
    if (filled) {
      if (!value) return;
      const initialBox = name.startsWith('Initial ');
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor('#000000');
      let text = clean(value);
      while (text.length > 1 && pdf.getTextWidth(text) > w - 2) text = text.slice(0, -1);
      pdf.text(text, initialBox ? x + w / 2 : x + 1, top + h / 2, { align: initialBox ? 'center' : 'left', baseline: 'middle' });
      return;
    }
    const f = new AcroFormTextField();
    f.fieldName = name;
    f.Rect = [x, top, w, h];
    f.fontSize = 10;
    f.maxFontSize = 10;
    f.required = true;
    if (signatureField) {
      // An unsigned /Sig widget, recognized by Reader's certificate signing UI.
      f.FT = '/Sig';
    } else {
      f.value = value;
      if (name.startsWith('Initial ')) { f.maxLength = 3; f.textAlign = 'center'; }
    }
    pdf.addField(f);
  }
  if (logo) { pdf.addImage(logo, 'PNG', (pageWidth - 30) / 2, y, 30, 37.5); y += 43; }
  plain('GENERAL LIABILITY WAIVER & EQUIPMENT USE AGREEMENT', 14, true, true);
  plain('(Golf Cart, BBQ Grill, Kitchen Appliances & All OnSite Equipment)', 10, true, true);
  // Lay out the agreement before drawing it so pages can be planned as a whole.
  const initialRow = 17; // INITIAL label and box, plus a blank line before the next term.
  const signatureBlock = 105;
  const blocks = agreement.map(item => {
    const wrapped = wrap(item);
    const height = wrapped.lines.length * wrapped.step + 3 + (item.kind === 'term' ? initialRow : 0);
    return { item, wrapped, height };
  });
  // The closing section (from the last heading on) stays with the signature.
  const closing = blocks.findLastIndex(block => block.item.kind === 'heading');
  const closingHeight = blocks.slice(closing).reduce((sum, block) => sum + block.height, 0);
  const forceBreak = closing > 0 && closingHeight + signatureBlock <= bottom - margin ? closing : -1;
  const pages = [{ start: y, blocks: [] }];
  let cursor = y;
  blocks.forEach((block, i) => {
    // A heading must fit together with the block that follows it.
    const need = block.height + (block.item.kind === 'heading' ? blocks[i + 1]?.height || 0 : 0);
    const page = pages.at(-1);
    if (page.blocks.length && (i === forceBreak || cursor + need > bottom)) {
      page.spread = i === forceBreak;
      pages.push({ start: margin, blocks: [] });
      cursor = margin;
    }
    pages.at(-1).blocks.push(block);
    cursor += block.height;
    pages.at(-1).end = cursor;
  });
  let initial = 0;
  pages.forEach((page, pageIndex) => {
    if (pageIndex) { pdf.addPage(); y = margin; }
    // A page cut short for the closing section shares its spare space between
    // its blocks, never separating a heading from the block below it.
    const gaps = page.blocks.filter((block, i) => i && page.blocks[i - 1].item.kind !== 'heading').length;
    const extra = page.spread && gaps ? (bottom - page.end) / gaps : 0;
    page.blocks.forEach(({ item, wrapped }, i) => {
      if (i && page.blocks[i - 1].item.kind !== 'heading') y += extra;
      const baseline = rich(item, wrapped);
      if (item.kind !== 'term') return;
      initial++;
      const box = [margin - 6, baseline - 3.2, 4, 4];
      pdf.setDrawColor('#BBBBBB');
      pdf.setLineWidth(0.2);
      pdf.rect(...box);
      if (filled) {
        if (values[`Acceptance ${initial}`] === true) {
          const [bx, by] = box;
          pdf.setDrawColor('#000000');
          pdf.setLineWidth(0.5);
          pdf.lines([[1, 1.2], [1.8, -2.6]], bx + 0.6, by + 2.1);
        }
      } else {
        const checkbox = new AcroFormCheckBox();
        checkbox.fieldName = `Acceptance ${initial}`;
        checkbox.Rect = box;
        checkbox.value = 'Off';
        checkbox.appearanceState = 'Off';
        checkbox.required = true;
        pdf.addField(checkbox);
      }
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor('#333333');
      const labelY = y + 5;
      pdf.text('INITIAL', margin, labelY);
      const starX = margin + pdf.getTextWidth('INITIAL ');
      pdf.setTextColor('#FF0000');
      pdf.text('*', starX, labelY);
      field(`Initial ${initial}`, starX + pdf.getTextWidth('*') + 3, y, 16, 8, values?.[`Initial ${initial}`] || '');
      y += initialRow;
    });
  });
  room(signatureBlock);
  plain('SIGNATURE & GUEST INFORMATION', 11, true);
  plain('Signature: *', 9);
  if (signature || filled) {
    pdf.setDrawColor('#BBBBBB');
    pdf.rect(margin, y, width, 25);
    if (signature) pdf.addImage(signature, 'PNG', margin + 1, y + 1, width - 2, 23);
  } else {
    field('Signature', margin, y, width, 25, '', true);
  }
  y += 33;
  const colWidth = (width - 7) / 2;
  const start = y;
  ['Signature Date', 'Guest Name', 'License', 'Issuing State', 'Address'].forEach((name, i) => {
    const x = margin + (i % 2) * (colWidth + 7);
    const top = start + Math.floor(i / 2) * 19;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor('#333333');
    pdf.text(`${name} *`, x, top);
    field(name, x, top + 2.5, colWidth, 9, values?.[name] || '');
  });
  // jsPDF generates initial /AP streams but omits the inherited defaults needed
  // when Reader rebuilds text appearances after editing or saving a form.
  if (!filled) {
    const acroForm = pdf.internal.acroformPlugin.acroFormDictionaryRoot;
    acroForm.DA = '/F1 10 Tf 0 g';
    Object.defineProperty(acroForm, 'DR', {
      value: '2 0 R', // The same document resource dictionary used by jsPDF's /AP streams.
      configurable: false,
    });
  }
  for (let page = 1; page <= pdf.getNumberOfPages(); page++) {
    pdf.setPage(page);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor('#333333');
    pdf.text(`Luxe Properties PR LLC | Page ${page} of ${pdf.getNumberOfPages()}`, margin, bottom + 10);
  }
  return pdf;
}
