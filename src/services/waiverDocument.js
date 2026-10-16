import { jsPDF, AcroFormTextField } from 'jspdf';
import agreement from '../content/waiver.json' with { type: 'json' };

// Word run formatting is shared by the displayed agreement and PDF source.
export function buildWaiverDocument(form, signature, logo) {
  const pdf = new jsPDF({ unit: 'mm', format: 'letter', compress: true });
  const margin = 18;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const width = pageWidth - margin * 2;
  const bottom = pdf.internal.pageSize.getHeight() - 20;
  let y = margin;
  const clean = text => text.replace(/[\u2018\u2019]/g, "'").replace(/[\u2013\u2014]/g, '-');
  const font = run => pdf.setFont('helvetica', run.bold ? (run.italic ? 'bolditalic' : 'bold') : (run.italic ? 'italic' : 'normal'));
  function room(height) {
    if (y + height > bottom) { pdf.addPage(); y = margin; }
  }
  function plain(text, size = 10, bold = false, center = false) {
    pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    pdf.setFontSize(size);
    pdf.setTextColor('#333333');
    for (const line of pdf.splitTextToSize(clean(text), width)) {
      pdf.text(line, center ? pageWidth / 2 : margin, y, center ? { align: 'center' } : {});
      y += size * 0.3528 * 1.35;
    }
    y += 3;
  }
  function rich(item, reserve = 0) {
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
    room(lines.length * step + 3 + reserve);
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
  }
  function field(name, x, top, w, h, value = '', signatureField = false) {
    pdf.setDrawColor('#BBBBBB');
    pdf.setLineWidth(0.2);
    pdf.rect(x, top, w, h);
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
  let initial = 0;
  for (const item of agreement) {
    rich(item, item.kind === 'term' ? 12 : item.kind === 'heading' ? 25 : 0);
    if (item.kind === 'term') {
      initial++;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor('#333333');
      const labelY = y + 5;
      pdf.text('INITIAL', margin, labelY);
      const starX = margin + pdf.getTextWidth('INITIAL ');
      pdf.setTextColor('#FF0000');
      pdf.text('*', starX, labelY);
      const input = form?.querySelector(`[name="Initial ${initial}"]`);
      field(`Initial ${initial}`, starX + pdf.getTextWidth('*') + 3, y, 16, 8, input?.value || '');
      y += 12;
    }
  }
  room(105);
  plain('SIGNATURE & GUEST INFORMATION', 11, true);
  plain('Signature: *', 9);
  if (signature) {
    pdf.setDrawColor('#BBBBBB');
    pdf.rect(margin, y, width, 25);
    pdf.addImage(signature, 'PNG', margin + 1, y + 1, width - 2, 23);
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
    field(name, x, top + 2.5, colWidth, 9, form?.querySelector(`[name="${name}"]`)?.value || '');
  });
  for (let page = 1; page <= pdf.getNumberOfPages(); page++) {
    pdf.setPage(page);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor('#333333');
    pdf.text(`Luxe Properties PR LLC | Page ${page} of ${pdf.getNumberOfPages()}`, margin, bottom + 10);
  }
  return pdf;
}
