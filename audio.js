class AudioController {
    constructor() {
        this.audioCtx = null;
        this.volume = 0.9;
        this.compressor = null;
    }

    init() {
        if (!this.audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioCtx = new AudioContext();
            // Dynamic compressor: makes loud sounds even louder without clipping
            this.compressor = this.audioCtx.createDynamicsCompressor();
            this.compressor.threshold.value = -20;
            this.compressor.knee.value = 10;
            this.compressor.ratio.value = 4;
            this.compressor.attack.value = 0;
            this.compressor.release.value = 0.1;
            this.compressor.connect(this.audioCtx.destination);
        }
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
    }

    setVolume(v) {
        this.volume = Math.max(0.01, Math.min(1, v));
    }

    _playTone(frequency, type, duration, gain) {
        if (!this.audioCtx) return;
        const osc = this.audioCtx.createOscillator();
        const gainNode = this.audioCtx.createGain();
        osc.type = type;
        osc.frequency.value = frequency;
        osc.connect(gainNode);
        gainNode.connect(this.compressor || this.audioCtx.destination);
        osc.start();
        const vol = Math.min(gain * this.volume, 1.5); // allow slight overdrive
        gainNode.gain.setValueAtTime(vol, this.audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + duration);
        osc.stop(this.audioCtx.currentTime + duration);
    }

    // Countdown beep (5-4-3-2-1): short, sharp, loud double-layer
    playShortBeep() {
        this._playTone(880, 'sawtooth', 0.22, 2.0);   // bright top layer
        this._playTone(440, 'square',   0.22, 1.5);   // fat bottom layer
    }

    // VIA! / Fine lap: punchy "GO!" sound (two tones in sequence)
    playHighBeep() {
        this._playTone(1200, 'square',   0.6, 2.0);
        // slight delay for the second tone
        setTimeout(() => this._playTone(1600, 'sawtooth', 0.4, 1.8), 120);
    }
}

const audioController = new AudioController();
