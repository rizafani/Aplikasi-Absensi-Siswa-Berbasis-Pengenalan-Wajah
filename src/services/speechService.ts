class SpeechService {
  private isEnabled = true;
  private audioCtx: AudioContext | null = null;
  private indonesianVoice: SpeechSynthesisVoice | null = null;
  private isVoiceInitialized = false;
  private currentAudio: HTMLAudioElement | null = null;
  private pendingTimeout: any = null;
  private lastSpokenText = '';
  private lastSpokenTime = 0;

  constructor() {
    this.initVoice();
  }

  private initVoice() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const selectBestVoice = () => {
      try {
        const voices = window.speechSynthesis.getVoices();
        if (!voices || voices.length === 0) return;

        // Filter Indonesian voices (or Malay fallback)
        const idVoices = voices.filter((v) => {
          const lang = (v.lang || '').replace('_', '-').toLowerCase();
          return lang.startsWith('id') || lang.includes('-id');
        });

        if (idVoices.length > 0) {
          // 1st Priority: Natural / Neural / High-Definition voices
          const naturalVoice = idVoices.find((v) => {
            const name = (v.name || '').toLowerCase();
            return (
              name.includes('natural') ||
              name.includes('online') ||
              name.includes('gadis') ||
              name.includes('ardi') ||
              name.includes('damayanti') ||
              name.includes('google') ||
              name.includes('neural')
            );
          });

          // 2nd Priority: Online network voices
          const onlineVoice = idVoices.find((v) => v.localService === false);

          this.indonesianVoice = naturalVoice || onlineVoice || idVoices[0];
        } else {
          // Fallback to Malay voice if no Indonesian voice is installed on OS
          const msVoice = voices.find((v) => {
            const lang = (v.lang || '').toLowerCase();
            return lang.startsWith('ms');
          });
          this.indonesianVoice = msVoice || null;
        }

        this.isVoiceInitialized = true;
      } catch (err) {
        console.warn('Voice initialization notice:', err);
      }
    };

    selectBestVoice();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = selectBestVoice;
    }
  }

  // Stop any currently playing audio stream or speech synthesis immediately
  stop() {
    if (this.pendingTimeout) {
      clearTimeout(this.pendingTimeout);
      this.pendingTimeout = null;
    }

    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
        this.currentAudio.onerror = null;
        this.currentAudio.onended = null;
      } catch {}
      this.currentAudio = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
  }

  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    if (!enabled) {
      this.stop();
    }
  }

  getAudioContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtx();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  // Soft, warm marimba chime bell for success
  playSuccessTone() {
    if (!this.isEnabled) return;
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;

      // Gentle master gain & warm lowpass filter to remove harsh frequencies
      const masterGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2600, now);

      masterGain.connect(ctx.destination);
      filter.connect(masterGain);

      // Play warm two-note harmonic chime (E5: 659.25Hz -> B5: 987.77Hz)
      const notes = [
        { freq: 659.25, time: now },
        { freq: 987.77, time: now + 0.12 },
      ];

      notes.forEach(({ freq, time }) => {
        // Fundamental sine wave
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(freq, time);

        // Soft 2nd harmonic for organic chime richness
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(freq * 2, time);

        // Envelope: soft 15ms attack and gentle exponential decay
        gain1.gain.setValueAtTime(0.001, time);
        gain1.gain.linearRampToValueAtTime(0.18, time + 0.015);
        gain1.gain.exponentialRampToValueAtTime(0.001, time + 0.55);

        gain2.gain.setValueAtTime(0.001, time);
        gain2.gain.linearRampToValueAtTime(0.04, time + 0.015);
        gain2.gain.exponentialRampToValueAtTime(0.001, time + 0.35);

        osc1.connect(gain1);
        gain1.connect(filter);
        osc2.connect(gain2);
        gain2.connect(filter);

        osc1.start(time);
        osc1.stop(time + 0.6);
        osc2.start(time);
        osc2.stop(time + 0.4);
      });
    } catch {
      // Audio context might be restricted before user interaction
    }
  }

  // Gentle, polite notification tone for already attended / notices
  playWarningTone() {
    if (!this.isEnabled) return;
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;

      const masterGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2000, now);

      masterGain.connect(ctx.destination);
      filter.connect(masterGain);

      const notes = [
        { freq: 523.25, time: now }, // C5
        { freq: 440.0, time: now + 0.14 }, // A4
      ];

      notes.forEach(({ freq, time }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(0.001, time);
        gain.gain.linearRampToValueAtTime(0.14, time + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.45);

        osc.connect(gain);
        gain.connect(filter);

        osc.start(time);
        osc.stop(time + 0.5);
      });
    } catch {
      // ignore
    }
  }

  // Helper to extract warm greeting and friendly student first name
  private getGreetingInfo(fullName?: string): { greeting: string; friendlyName: string } {
    const hour = new Date().getHours();
    let greeting = 'Selamat pagi';
    if (hour >= 11 && hour < 15) {
      greeting = 'Selamat siang';
    } else if (hour >= 15 && hour < 18) {
      greeting = 'Selamat sore';
    } else if (hour >= 18 || hour < 4) {
      greeting = 'Selamat malam';
    }

    if (!fullName) {
      return { greeting, friendlyName: '' };
    }

    // Clean up brackets or class notations e.g. "Ahmad Fauzan (XI-1)"
    const clean = fullName.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();
    const parts = clean.split(/\s+/).filter(Boolean);

    // Get natural calling name: if first word is an honorific/prefix like "M.", "Muhammad", "Siti", take first 2 words
    let friendlyName = parts[0] || clean;
    if (
      ['m.', 'mhd', 'mohd', 'muh', 'muhammad', 'siti', 'ni', 'i', 'raden'].includes(
        friendlyName.toLowerCase()
      ) &&
      parts.length > 1
    ) {
      friendlyName = `${parts[0]} ${parts[1]}`;
    }

    return { greeting, friendlyName };
  }

  // Speak using authentic, natural human voice audio stream (Indonesian human studio voice)
  // Falls back gracefully to SpeechSynthesis if offline
  speak(text: string, delayMs = 0) {
    if (!this.isEnabled) return;
    if (typeof window === 'undefined') return;

    const cleanText = (text || '').trim();
    if (!cleanText) return;

    // Deduplication guard: ignore exact duplicate announcement within 3.5 seconds
    const now = Date.now();
    if (this.lastSpokenText === cleanText && now - this.lastSpokenTime < 3500) {
      return;
    }
    this.lastSpokenText = cleanText;
    this.lastSpokenTime = now;

    // Clear any previous scheduled announcement
    if (this.pendingTimeout) {
      clearTimeout(this.pendingTimeout);
      this.pendingTimeout = null;
    }

    const executeSpeak = () => {
      this.pendingTimeout = null;
      try {
        // Stop any currently playing audio stream or speech synthesis to avoid overlaps
        this.stop();

        // 1. Primary: Authentic human studio voice stream via local /api/tts proxy
        const proxyUrl = `/api/tts?ie=UTF-8&client=tw-ob&tl=id&q=${encodeURIComponent(cleanText)}`;
        const directUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=id&q=${encodeURIComponent(
          cleanText
        )}`;

        const audio = new Audio();
        audio.loop = false;
        audio.autoplay = false;
        audio.volume = 1.0;
        this.currentAudio = audio;

        let handled = false;
        let triedDirect = false;

        const fallbackToSynth = () => {
          if (handled) return;
          handled = true;
          if (this.currentAudio === audio) {
            this.currentAudio = null;
          }
          this.speakFallbackSynth(cleanText);
        };

        const tryDirectFallback = () => {
          if (handled) return;
          if (!triedDirect) {
            triedDirect = true;
            audio.src = directUrl;
            const p = audio.play();
            if (p !== undefined) {
              p.catch(() => {
                fallbackToSynth();
              });
            }
          } else {
            fallbackToSynth();
          }
        };

        audio.onended = () => {
          handled = true;
          if (this.currentAudio === audio) {
            this.currentAudio = null;
          }
        };

        audio.onerror = () => {
          tryDirectFallback();
        };

        audio.src = proxyUrl;
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.warn('Proxy human audio playback notice, trying direct fallback:', err);
            tryDirectFallback();
          });
        }
      } catch (err) {
        console.warn('Voice playback notice:', err);
        this.speakFallbackSynth(cleanText);
      }
    };

    if (delayMs > 0) {
      this.pendingTimeout = setTimeout(executeSpeak, delayMs);
    } else {
      executeSpeak();
    }
  }

  // Fallback to Web Speech Synthesis if audio stream cannot load
  private speakFallbackSynth(text: string) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();

      // Refresh voice selection dynamically in case voices were loaded asynchronously
      const voices = window.speechSynthesis.getVoices();
      let bestVoice = this.indonesianVoice;
      if (voices && voices.length > 0) {
        const idVoices = voices.filter((v) => {
          const lang = (v.lang || '').replace('_', '-').toLowerCase();
          return lang.startsWith('id') || lang.includes('-id');
        });
        if (idVoices.length > 0) {
          const natural = idVoices.find((v) => {
            const name = (v.name || '').toLowerCase();
            return (
              name.includes('natural') ||
              name.includes('online') ||
              name.includes('gadis') ||
              name.includes('ardi') ||
              name.includes('damayanti') ||
              name.includes('google')
            );
          });
          bestVoice = natural || idVoices[0];
          this.indonesianVoice = bestVoice;
        }
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'id-ID';
      utterance.rate = 0.96;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      if (bestVoice) {
        utterance.voice = bestVoice;
      }
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Fallback synth error:', e);
    }
  }

  // Warm, natural, human greeting on attendance success
  speakSuccess(studentName?: string) {
    this.playSuccessTone();

    const { greeting, friendlyName } = this.getGreetingInfo(studentName);
    const message = friendlyName
      ? `${greeting} ${friendlyName}, presensi kamu berhasil dicatat. Selamat belajar!`
      : `${greeting}, presensi kamu berhasil dicatat. Selamat belajar!`;

    // 280ms delay for soft marimba chime to ring cleanly before the voice speaks
    this.speak(message, 280);
  }

  // Warm, polite reminder if already attended today
  speakAlreadyAttended(studentName?: string) {
    this.playWarningTone();

    const { friendlyName } = this.getGreetingInfo(studentName);
    const message = friendlyName
      ? `Halo ${friendlyName}, kamu sudah tercatat hadir hari ini. Terima kasih!`
      : 'Halo, kamu sudah tercatat hadir hari ini. Terima kasih!';

    this.speak(message, 280);
  }

  speakUnrecognized() {
    this.playWarningTone();
    this.speak('Wajah belum terdeteksi dengan jelas. Silakan hadapkan wajah ke kamera ya.', 200);
  }
}

export const speechService = new SpeechService();
