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

        // Prevent default touch behavior to avoid signature clearing
        this.preventDefaultTouchBehavior();
    }

    preventDefaultTouchBehavior() {
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
        }, { passive: false });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
        }, { passive: false });

        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
        }, { passive: false });
    }

    resizeCanvas() {
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        const context = this.canvas.getContext('2d');
        
        const width = this.canvas.offsetWidth;
        const height = this.canvas.offsetHeight;
        
        this.canvas.width = width * ratio;
        this.canvas.height = height * ratio;
        context.scale(ratio, ratio);
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