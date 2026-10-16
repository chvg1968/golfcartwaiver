import SignaturePad from 'signature_pad';

export class SignatureComponent {
  constructor(canvas) {
    this.canvas = canvas;
    this.signaturePad = new SignaturePad(canvas, {
      backgroundColor: 'white', penColor: 'black', minWidth: 1, maxWidth: 3,
    });
    this.logicalWidth = 0;
    this.logicalHeight = 0;
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const width = this.canvas.offsetWidth;
    const height = this.canvas.offsetHeight;
    if (!width || !height) return;
    if (this.canvas.width === Math.round(width * ratio) && this.canvas.height === Math.round(height * ratio)) return;
    const points = this.signaturePad.toData();
    const scaleX = this.logicalWidth ? width / this.logicalWidth : 1;
    const scaleY = this.logicalHeight ? height / this.logicalHeight : 1;
    this.canvas.width = Math.round(width * ratio);
    this.canvas.height = Math.round(height * ratio);
    this.canvas.getContext('2d').setTransform(ratio, 0, 0, ratio, 0, 0);
    this.signaturePad.clear();
    if (points.length) this.signaturePad.fromData(points.map(group => ({
      ...group, points: group.points.map(point => ({ ...point, x: point.x * scaleX, y: point.y * scaleY })),
    })));
    this.logicalWidth = width;
    this.logicalHeight = height;
  }

  clear() { this.signaturePad.clear(); }
  isEmpty() { return this.signaturePad.isEmpty(); }
  toDataURL(type) { return this.signaturePad.toDataURL(type); }
}
