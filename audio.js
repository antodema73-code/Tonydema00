class AudioController {
    constructor() {
        this.audioCtx = null;
        this.volume = 0.9;
    }

    init() {
        if (!this.audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioCtx = new AudioContext();
        }
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
    }

    setVolume(v) {
        this.volume = Math.max(0.01, Math.min(1, v));
    }

    playTone(frequency, type, duration, volumeMultiplier = 1) {
        if (!this.audioCtx) return;
        const oscillator = this.audioCtx.createOscillator();
        const gainNode = this.audioCtx.createGain();
        oscillator.type = type;
        oscillator.frequency.value = frequency;
        oscillator.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);
        oscillator.start();
        const vol = this.volume * volumeMultiplier;
        gainNode.gain.setValueAtTime(vol, this.audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.00001, this.audioCtx.currentTime + duration);
        oscillator.stop(this.audioCtx.currentTime + duration);
    }

    // 5-4-3-2-1 countdown: corto e tagliente
    playShortBeep() {
        this.playTone(800, 'square', 0.12, 1);
    }

    // VIA! / Fine lap: lungo e acuto come crono TdF
    playHighBeep() {
        this.playTone(1300, 'square', 0.75, 1);
    }
}

const audioController = new AudioController();
