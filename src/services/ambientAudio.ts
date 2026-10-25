import type { AmbientSoundType } from '../../shared/types.js';

class AmbientSoundEngine {
  private ctx: AudioContext | null = null;
  private currentType: AmbientSoundType | null = null;
  private gainNode: GainNode | null = null;
  private isRunning = false;
  private volume = 0.6;
  private activeNodes: { stop?: () => void; disconnect?: () => void }[] = [];
  private intervals: any[] = [];
  private externalAudio: HTMLAudioElement | null = null;

  private initContext() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public async unlock(): Promise<boolean> {
    this.initContext();
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
      return this.ctx.state === 'running';
    }
    return true;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.1);
    }
    if (this.externalAudio) {
      this.externalAudio.volume = this.volume;
    }
  }

  public stop() {
    this.isRunning = false;
    this.currentType = null;

    // Clear recurring noise intervals
    this.intervals.forEach((id) => clearInterval(id));
    this.intervals = [];

    // Stop and disconnect Web Audio nodes
    this.activeNodes.forEach((node) => {
      try {
        if (node.stop) node.stop();
        if (node.disconnect) node.disconnect();
      } catch (e) {
        // Ignored
      }
    });
    this.activeNodes = [];

    if (this.externalAudio) {
      this.externalAudio.pause();
      this.externalAudio.src = '';
      this.externalAudio = null;
    }
  }

  public startSound(type: AmbientSoundType, volume = 0.6, audioUrl?: string) {
    if (this.currentType === type && this.isRunning) {
      this.setVolume(volume);
      return;
    }

    this.stop();
    this.initContext();
    this.currentType = type;
    this.volume = volume;
    this.isRunning = true;

    // If external stream URL provided
    if (audioUrl && audioUrl.startsWith('http')) {
      try {
        this.externalAudio = new Audio(audioUrl);
        this.externalAudio.loop = true;
        this.externalAudio.volume = this.volume;
        this.externalAudio.play().catch((err) => {
          console.warn('External ambient audio play failed, falling back to synthesis:', err);
          this.synthesizeSound(type);
        });
        return;
      } catch (e) {
        // fallback
      }
    }

    this.synthesizeSound(type);
  }

  private synthesizeSound(type: AmbientSoundType) {
    if (!this.ctx) return;
    const ctx = this.ctx;

    // Master ambient gain
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(this.volume, ctx.currentTime);
    masterGain.connect(ctx.destination);
    this.gainNode = masterGain;
    this.activeNodes.push(masterGain);

    switch (type) {
      case 'rain':
        this.buildRain(ctx, masterGain, false);
        break;
      case 'thunder':
        this.buildRain(ctx, masterGain, true);
        break;
      case 'forest':
        this.buildForest(ctx, masterGain);
        break;
      case 'wind':
        this.buildWind(ctx, masterGain);
        break;
      case 'cafe':
        this.buildCafe(ctx, masterGain);
        break;
      case 'fireplace':
        this.buildFireplace(ctx, masterGain);
        break;
      case 'waves':
        this.buildWaves(ctx, masterGain);
        break;
      case 'night':
        this.buildNight(ctx, masterGain);
        break;
      case 'stream':
        this.buildStream(ctx, masterGain);
        break;
      default:
        this.buildRain(ctx, masterGain, false);
    }
  }

  // --- Rain generator ---
  private buildRain(ctx: AudioContext, destination: GainNode, withThunder = false) {
    const bufferSize = 2 * ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, ctx.currentTime);

    const rainGain = ctx.createGain();
    rainGain.gain.setValueAtTime(0.45, ctx.currentTime);

    whiteNoise.connect(filter);
    filter.connect(rainGain);
    rainGain.connect(destination);
    whiteNoise.start();

    this.activeNodes.push(whiteNoise, filter, rainGain);

    if (withThunder) {
      const triggerThunder = () => {
        if (!this.isRunning) return;
        const rumbleOsc = ctx.createOscillator();
        rumbleOsc.type = 'sawtooth';
        rumbleOsc.frequency.setValueAtTime(45, ctx.currentTime);
        rumbleOsc.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 3.0);

        const rumbleFilter = ctx.createBiquadFilter();
        rumbleFilter.type = 'lowpass';
        rumbleFilter.frequency.setValueAtTime(90, ctx.currentTime);

        const rumbleGain = ctx.createGain();
        rumbleGain.gain.setValueAtTime(0.01, ctx.currentTime);
        rumbleGain.gain.linearRampToValueAtTime(0.55, ctx.currentTime + 0.4);
        rumbleGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 3.8);

        rumbleOsc.connect(rumbleFilter);
        rumbleFilter.connect(rumbleGain);
        rumbleGain.connect(destination);

        rumbleOsc.start();
        rumbleOsc.stop(ctx.currentTime + 4.0);
      };

      const thunderInterval = setInterval(() => {
        if (Math.random() < 0.6) {
          triggerThunder();
        }
      }, 9000);
      this.intervals.push(thunderInterval);
    }
  }

  // --- Forest & Bird Songs ---
  private buildForest(ctx: AudioContext, destination: GainNode) {
    // Gentle foliage breeze
    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.08;
    }
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    const breezeFilter = ctx.createBiquadFilter();
    breezeFilter.type = 'bandpass';
    breezeFilter.frequency.setValueAtTime(480, ctx.currentTime);
    breezeFilter.Q.setValueAtTime(2, ctx.currentTime);

    const breezeGain = ctx.createGain();
    breezeGain.gain.setValueAtTime(0.3, ctx.currentTime);

    noiseSource.connect(breezeFilter);
    breezeFilter.connect(breezeGain);
    breezeGain.connect(destination);
    noiseSource.start();

    this.activeNodes.push(noiseSource, breezeFilter, breezeGain);

    // Chirping songbirds
    const chirpBird = () => {
      if (!this.isRunning || !this.ctx) return;
      const baseFreq = 2200 + Math.random() * 1200;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq + 600, now + 0.08);
      osc.frequency.exponentialRampToValueAtTime(baseFreq - 300, now + 0.16);
      osc.frequency.exponentialRampToValueAtTime(baseFreq + 400, now + 0.24);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc.connect(gain);
      gain.connect(destination);
      osc.start(now);
      osc.stop(now + 0.3);
    };

    const birdInterval = setInterval(() => {
      if (Math.random() < 0.7) {
        chirpBird();
        setTimeout(chirpBird, 180);
        if (Math.random() < 0.4) setTimeout(chirpBird, 360);
      }
    }, 2800);
    this.intervals.push(birdInterval);
  }

  // --- Wind / Countryside ---
  private buildWind(ctx: AudioContext, destination: GainNode) {
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.15;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(260, ctx.currentTime);
    filter.Q.setValueAtTime(4.0, ctx.currentTime);

    // LFO for breathing wind gust
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.18, ctx.currentTime);

    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(140, ctx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.4, ctx.currentTime);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(destination);

    noise.start();
    lfo.start();

    this.activeNodes.push(noise, filter, lfo, lfoGain, gain);
  }

  // --- Cozy Cafe ---
  private buildCafe(ctx: AudioContext, destination: GainNode) {
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(650, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.35, ctx.currentTime);

    noise.connect(lowpass);
    lowpass.connect(gain);
    gain.connect(destination);
    noise.start();

    this.activeNodes.push(noise, lowpass, gain);

    // Ceramic cup gentle clinking
    const clinkCup = () => {
      if (!this.isRunning || !this.ctx) return;
      const osc = ctx.createOscillator();
      const cupGain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1600 + Math.random() * 400, ctx.currentTime);

      const now = ctx.currentTime;
      cupGain.gain.setValueAtTime(0.04, now);
      cupGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);

      osc.connect(cupGain);
      cupGain.connect(destination);
      osc.start(now);
      osc.stop(now + 0.16);
    };

    const cafeInterval = setInterval(() => {
      if (Math.random() < 0.45) clinkCup();
    }, 3500);
    this.intervals.push(cafeInterval);
  }

  // --- Fireplace & Campfire ---
  private buildFireplace(ctx: AudioContext, destination: GainNode) {
    // Low rumble of flame
    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.2;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(180, ctx.currentTime);

    const fireGain = ctx.createGain();
    fireGain.gain.setValueAtTime(0.3, ctx.currentTime);

    noise.connect(lowpass);
    lowpass.connect(fireGain);
    fireGain.connect(destination);
    noise.start();

    this.activeNodes.push(noise, lowpass, fireGain);

    // Wood crackle pops
    const cracklePop = () => {
      if (!this.isRunning || !this.ctx) return;
      const osc = ctx.createOscillator();
      const popGain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800 + Math.random() * 1400, ctx.currentTime);

      const now = ctx.currentTime;
      popGain.gain.setValueAtTime(0.09, now);
      popGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

      osc.connect(popGain);
      popGain.connect(destination);
      osc.start(now);
      osc.stop(now + 0.05);
    };

    const crackleInterval = setInterval(() => {
      cracklePop();
      if (Math.random() < 0.5) setTimeout(cracklePop, 80);
      if (Math.random() < 0.3) setTimeout(cracklePop, 190);
    }, 450);
    this.intervals.push(crackleInterval);
  }

  // --- Ocean Waves ---
  private buildWaves(ctx: AudioContext, destination: GainNode) {
    const bufferSize = ctx.sampleRate * 3;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.25;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, ctx.currentTime);

    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.12, ctx.currentTime); // ~8 sec ocean swell

    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(240, ctx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.45, ctx.currentTime);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(destination);

    noise.start();
    lfo.start();

    this.activeNodes.push(noise, filter, lfo, lfoGain, gain);
  }

  // --- Night Crickets ---
  private buildNight(ctx: AudioContext, destination: GainNode) {
    const chirpCricket = () => {
      if (!this.isRunning || !this.ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(4600 + Math.random() * 200, ctx.currentTime);

      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.04, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(destination);
      osc.start(now);
      osc.stop(now + 0.09);
    };

    const nightInterval = setInterval(() => {
      chirpCricket();
      setTimeout(chirpCricket, 90);
      setTimeout(chirpCricket, 180);
    }, 1400);
    this.intervals.push(nightInterval);
  }

  // --- Water Stream ---
  private buildStream(ctx: AudioContext, destination: GainNode) {
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.2;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, ctx.currentTime);
    filter.Q.setValueAtTime(3, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.35, ctx.currentTime);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    noise.start();

    this.activeNodes.push(noise, filter, gain);
  }
}

export const ambientSound = new AmbientSoundEngine();
