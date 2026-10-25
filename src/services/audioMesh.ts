import { wsClient } from './websocket';

export interface AudioMeshCallbacks {
  onSpeakingChange: (isSpeaking: boolean, volume: number) => void;
  onRemoteTrack: (userId: string, stream: MediaStream) => void;
  onPeerLeave: (userId: string) => void;
  onError: (err: string) => void;
}

export class AudioMeshService {
  private localStream: MediaStream | null = null;
  private processedStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private noiseGateGain: GainNode | null = null;
  private isNoiseReductionEnabled: boolean = true;
  private noiseThreshold: number = 0.015; // Noise gate floor
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private remoteAudioElements: Map<string, HTMLAudioElement> = new Map();
  private callbacks: AudioMeshCallbacks | null = null;
  private isMuted: boolean = false;
  private isDeafened: boolean = false;
  private myUserId: string = '';
  private animationFrameId: number | null = null;
  private wasSpeaking: boolean = false;
  private isTestingMic: boolean = false;
  private testAudioElement: HTMLAudioElement | null = null;

  public async initialize(myUserId: string, callbacks: AudioMeshCallbacks): Promise<boolean> {
    this.myUserId = myUserId;
    this.callbacks = callbacks;

    try {
      // 1. Request microphone with native browser noise suppression & echo cancellation
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 48000
        },
        video: false
      });

      // 2. Build Web Audio API Noise Reduction DSP Pipeline
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx();

      const source = this.audioContext.createMediaStreamSource(this.localStream);

      // High-pass filter at 85Hz: Cuts low frequency HVAC hum, desk thumps, rumble
      const highpass = this.audioContext.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.value = 85;

      // Peaking filter around 4200Hz to soften hiss
      const notchFilter = this.audioContext.createBiquadFilter();
      notchFilter.type = 'peaking';
      notchFilter.frequency.value = 4200;
      notchFilter.gain.value = -3;
      notchFilter.Q.value = 1.5;

      // Dynamics Compressor: Prevents clipping, levels voice volume
      const compressor = this.audioContext.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-24, this.audioContext.currentTime);
      compressor.knee.setValueAtTime(30, this.audioContext.currentTime);
      compressor.ratio.setValueAtTime(12, this.audioContext.currentTime);
      compressor.attack.setValueAtTime(0.003, this.audioContext.currentTime);
      compressor.release.setValueAtTime(0.25, this.audioContext.currentTime);

      // Noise Gate Gain Node: Attenuates sound below speech threshold
      this.noiseGateGain = this.audioContext.createGain();
      this.noiseGateGain.gain.setValueAtTime(1.0, this.audioContext.currentTime);

      // Analyser Node for Volume Metering and Speaking Detection
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.3;

      // Connect pipeline
      source.connect(highpass);
      highpass.connect(notchFilter);
      notchFilter.connect(compressor);
      compressor.connect(this.noiseGateGain);
      this.noiseGateGain.connect(this.analyser);

      // Stream destination for WebRTC peers
      const destination = this.audioContext.createMediaStreamDestination();
      this.noiseGateGain.connect(destination);
      this.processedStream = destination.stream;

      // Start volume monitor loop
      this.startAudioAnalysis();
      return true;
    } catch (err: any) {
      console.warn('Microphone access unavailable or denied:', err);
      if (this.callbacks) {
        this.callbacks.onError(err.message || 'Não foi possível acessar o microfone.');
      }
      return false;
    }
  }

  private startAudioAnalysis() {
    if (!this.analyser) return;

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    const checkAudioLevel = () => {
      if (!this.analyser || !this.audioContext) return;

      this.analyser.getByteTimeDomainData(dataArray);

      // Calculate Root Mean Square (RMS)
      let sumSquares = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const norm = (dataArray[i] - 128) / 128;
        sumSquares += norm * norm;
      }
      const rms = Math.sqrt(sumSquares / dataArray.length);

      // Noise gate attenuation if noise reduction enabled
      if (this.noiseGateGain && this.audioContext && this.isNoiseReductionEnabled) {
        if (rms < this.noiseThreshold) {
          // Attenuate background noise gently
          this.noiseGateGain.gain.setTargetAtTime(0.05, this.audioContext.currentTime, 0.05);
        } else {
          // Open gate smoothly
          this.noiseGateGain.gain.setTargetAtTime(1.0, this.audioContext.currentTime, 0.02);
        }
      }

      // Check speaking status
      const isCurrentlySpeaking = !this.isMuted && rms > (this.noiseThreshold * 1.5);
      if (isCurrentlySpeaking !== this.wasSpeaking) {
        this.wasSpeaking = isCurrentlySpeaking;
        if (this.callbacks) {
          this.callbacks.onSpeakingChange(isCurrentlySpeaking, rms);
        }
        wsClient.send({
          type: 'voice_state',
          isMuted: this.isMuted,
          isDeafened: this.isDeafened,
          isSpeaking: isCurrentlySpeaking
        });
      }

      this.animationFrameId = requestAnimationFrame(checkAudioLevel);
    };

    checkAudioLevel();
  }

  // Connect to a new peer in the room
  public async connectToPeer(remoteUserId: string, shouldCreateOffer: boolean) {
    if (this.peerConnections.has(remoteUserId)) return;

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' }
      ]
    });

    this.peerConnections.set(remoteUserId, pc);

    // Add local processed audio track
    const streamToSend = this.processedStream || this.localStream;
    if (streamToSend) {
      streamToSend.getAudioTracks().forEach((track) => {
        pc.addTrack(track, streamToSend);
      });
    }

    // Handle remote audio stream
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (remoteStream) {
        let audioEl = this.remoteAudioElements.get(remoteUserId);
        if (!audioEl) {
          audioEl = new Audio();
          audioEl.autoplay = true;
          this.remoteAudioElements.set(remoteUserId, audioEl);
        }
        audioEl.srcObject = remoteStream;
        audioEl.muted = this.isDeafened;
        audioEl.play().catch(e => console.warn('Auto-play blocked for remote peer audio:', e));

        if (this.callbacks) {
          this.callbacks.onRemoteTrack(remoteUserId, remoteStream);
        }
      }
    };

    // Relay ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        wsClient.send({
          type: 'webrtc_signal',
          targetUserId: remoteUserId,
          signal: { type: 'ice_candidate', candidate: event.candidate }
        });
      }
    };

    // If initiator, create and send offer
    if (shouldCreateOffer) {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        wsClient.send({
          type: 'webrtc_signal',
          targetUserId: remoteUserId,
          signal: { type: 'offer', sdp: pc.localDescription }
        });
      } catch (err) {
        console.error('Failed to create offer for peer', remoteUserId, err);
      }
    }
  }

  // Handle incoming WebRTC signaling message
  public async handleSignal(senderUserId: string, signal: any) {
    let pc = this.peerConnections.get(senderUserId);

    if (!pc) {
      await this.connectToPeer(senderUserId, false);
      pc = this.peerConnections.get(senderUserId);
    }

    if (!pc) return;

    try {
      if (signal.type === 'offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        wsClient.send({
          type: 'webrtc_signal',
          targetUserId: senderUserId,
          signal: { type: 'answer', sdp: pc.localDescription }
        });
      } else if (signal.type === 'answer') {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
      } else if (signal.type === 'ice_candidate' && signal.candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
      }
    } catch (err) {
      console.error('Error handling WebRTC signal from', senderUserId, err);
    }
  }

  public removePeer(userId: string) {
    const pc = this.peerConnections.get(userId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(userId);
    }

    const audioEl = this.remoteAudioElements.get(userId);
    if (audioEl) {
      audioEl.pause();
      audioEl.srcObject = null;
      this.remoteAudioElements.delete(userId);
    }

    if (this.callbacks) {
      this.callbacks.onPeerLeave(userId);
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !this.isMuted;
      });
    }
    wsClient.send({
      type: 'voice_state',
      isMuted: this.isMuted,
      isDeafened: this.isDeafened,
      isSpeaking: false
    });
    return this.isMuted;
  }

  public toggleDeafen(): boolean {
    this.isDeafened = !this.isDeafened;
    this.remoteAudioElements.forEach(el => {
      el.muted = this.isDeafened;
    });
    wsClient.send({
      type: 'voice_state',
      isMuted: this.isMuted,
      isDeafened: this.isDeafened,
      isSpeaking: false
    });
    return this.isDeafened;
  }

  public setNoiseReduction(enabled: boolean) {
    this.isNoiseReductionEnabled = enabled;
    if (!enabled && this.noiseGateGain && this.audioContext) {
      this.noiseGateGain.gain.setValueAtTime(1.0, this.audioContext.currentTime);
    }
  }

  public setNoiseThreshold(val: number) {
    this.noiseThreshold = val;
  }

  public toggleMicTest(): boolean {
    this.isTestingMic = !this.isTestingMic;
    if (this.isTestingMic) {
      if (!this.testAudioElement) {
        this.testAudioElement = new Audio();
      }
      this.testAudioElement.srcObject = this.processedStream || this.localStream;
      this.testAudioElement.play().catch(e => console.warn('Mic test play warning:', e));
    } else {
      if (this.testAudioElement) {
        this.testAudioElement.pause();
        this.testAudioElement.srcObject = null;
      }
    }
    return this.isTestingMic;
  }

  public getStates() {
    return {
      isMuted: this.isMuted,
      isDeafened: this.isDeafened,
      isNoiseReductionEnabled: this.isNoiseReductionEnabled,
      noiseThreshold: this.noiseThreshold,
      hasMic: !!this.localStream,
      isTestingMic: this.isTestingMic
    };
  }

  public cleanup() {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop());
    }
    this.peerConnections.forEach(pc => pc.close());
    this.peerConnections.clear();
    this.remoteAudioElements.forEach(el => {
      el.pause();
      el.srcObject = null;
    });
    this.remoteAudioElements.clear();
    if (this.testAudioElement) {
      this.testAudioElement.pause();
      this.testAudioElement.srcObject = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }
}

export const audioMesh = new AudioMeshService();
