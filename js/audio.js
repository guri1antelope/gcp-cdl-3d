/**
 * Audio Engine for GCP CDL 3D
 * - Synthesizes retro chip-tune SFX & dynamic BGM via Web Audio API.
 * - Works offline & on mobile without external sound files.
 */

class AudioManager {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.isBgmEnabled = true;
    this.currentBgmType = null;
    this.bgmTimer = null;
    this.bgmGainNode = null;
    this.bgmMasterGain = 0.35;

    if (typeof navigator !== "undefined" && navigator.audioSession) {
      try {
        navigator.audioSession.type = "playback";
      } catch (e) {}
    }
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.bgmGainNode = this.ctx.createGain();
        this.bgmGainNode.gain.setValueAtTime(this.bgmMasterGain, this.ctx.currentTime);
        this.bgmGainNode.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  unlockAudio() {
    this.init();
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.bgmGainNode && this.ctx) {
      this.bgmGainNode.gain.setValueAtTime(this.isMuted ? 0 : this.bgmMasterGain, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  playTone(freq, type, startTime, duration, vol = 0.15) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const safeTime = Math.max(startTime, this.ctx.currentTime + 0.005);
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, safeTime);
    gain.gain.setValueAtTime(vol, safeTime);
    gain.gain.exponentialRampToValueAtTime(0.001, safeTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(safeTime);
    osc.stop(safeTime + duration);
  }

  playTap() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    this.playTone(600, "square", now, 0.04, 0.1);
  }

  playCorrect() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    // 明るいファンファーレ音 (C5 -> E5 -> G5 -> C6)
    this.playTone(523.25, "sine", now, 0.08, 0.18);
    this.playTone(659.25, "sine", now + 0.08, 0.08, 0.18);
    this.playTone(783.99, "sine", now + 0.16, 0.08, 0.18);
    this.playTone(1046.50, "triangle", now + 0.24, 0.22, 0.22);
  }

  playIncorrect() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    this.playTone(260, "sawtooth", now, 0.15, 0.18);
    this.playTone(220, "sawtooth", now + 0.14, 0.25, 0.2);
  }

  playLevelUp() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 987.77, 1046.50, 1318.51];
    notes.forEach((freq, idx) => {
      this.playTone(freq, "triangle", now + idx * 0.09, 0.18, 0.2);
    });
  }

  playFeed() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    this.playTone(440, "sine", now, 0.08, 0.15);
    this.playTone(880, "sine", now + 0.08, 0.12, 0.15);
  }

  playStageClear() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const notes = [523, 659, 783, 1046, 783, 1046];
    notes.forEach((freq, idx) => {
      this.playTone(freq, "triangle", now + idx * 0.12, 0.25, 0.2);
    });
  }
}

window.AudioManager = AudioManager;
