import SignaturePad from 'signature_pad';

export class SignatureComponent {
    constructor(canvas) {
        this.canvas = canvas;
        this.signaturePad = new SignaturePad(canvas, {
            backgroundColor: 'rgb(255, 255, 255)',
            penColor: 'rgb(0, 0, 0)',
            minWidth: 0.5,
            maxWidth: 2.5,
            throttle: 16,
            velocityFilterWeight: 0.7
        });
        
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        // Enhanced touch handling
        this.setupTouchHandling();
    }

    setupTouchHandling() {
        // Prevent default touch behaviors that might interfere with signature drawing
        const preventDefaultTouch = (e) => {
            if (e.target === this.canvas) {
                e.preventDefault();
            }
        };

        // Add touch event listeners with more specific handling
        this.canvas.addEventListener('touchstart', preventDefaultTouch, { passive: false });
        this.canvas.addEventListener('touchmove', preventDefaultTouch, { passive: false });
        this.canvas.addEventListener('touchend', preventDefaultTouch, { passive: false });

        // Ensure signature is not cleared on touch outside
        document.addEventListener('touchstart', (e) => {
            if (e.target !== this.canvas && !this.canvas.contains(e.target)) {
                e.stopPropagation();
            }
        }, { passive: true });
    }

    resizeCanvas() {
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        const context = this.canvas.getContext('2d');
        
        const width = this.canvas.offsetWidth;
        const height = this.canvas.offsetHeight;
        
        this.canvas.width = width * ratio;
        this.canvas.height = height * ratio;
        context.scale(ratio, ratio);

        // Redraw signature after resizing to prevent clearing
        if (!this.signaturePad.isEmpty()) {
            const signatureData = this.signaturePad.toData();
            this.signaturePad.fromData(signatureData);
        }
    }

    clear() {
        this.signaturePad.clear();
    }

    isEmpty() {
        return this.signaturePad.isEmpty();
    }

    toDataURL() {
        return this.signaturePad.toDataURL();
    }
}