/**
 * Background sounds for a session. Prepex has no audio files, so these are generated in the browser with the Web
 * Audio API (filtered noise): nothing to download, nothing to license, and they work offline. Playback starts from the
 * Start button's tap, which is also what lets the browser allow audio.
 */

export const SOUND_OPTIONS = [
  { id: "off", label: "No sound" },
  { id: "brown", label: "Brown noise" },
  { id: "white", label: "White noise" },
  { id: "rain", label: "Soft rain" },
] as const;
export type SoundId = (typeof SOUND_OPTIONS)[number]["id"];

const STORAGE_KEY = "prepex.focus.sound";

export function isSoundId(value: unknown): value is SoundId {
  return SOUND_OPTIONS.some((o) => o.id === value);
}

export function readStoredSound(): SoundId {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return isSoundId(raw) ? raw : "off";
  } catch {
    return "off";
  }
}

export function storeSound(id: SoundId): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* not persisted: fine */
  }
}

type AudioContextCtor = typeof AudioContext;
function audioContextCtor(): AudioContextCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { AudioContext?: AudioContextCtor; webkitAudioContext?: AudioContextCtor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

function noiseBuffer(ctx: AudioContext, kind: "white" | "brown"): AudioBuffer {
  const seconds = 4;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    if (kind === "white") {
      data[i] = white * 0.5;
    } else {
      last = (last + 0.02 * white) / 1.02; // a leaky integrator: brown noise
      data[i] = last * 3.5;
    }
  }
  return buffer;
}

export class Soundscape {
  private ctx: AudioContext | null = null;
  private source: AudioBufferSourceNode | null = null;
  private gain: GainNode | null = null;
  private dropTimer: ReturnType<typeof setInterval> | null = null;

  /** Starts (or switches to) a sound. Safe to call from a click handler; a no-op when audio is unavailable. */
  start(id: SoundId, volume = 0.35): void {
    this.stop();
    if (id === "off") return;
    const Ctor = audioContextCtor();
    if (!Ctor) return;
    try {
      this.ctx ??= new Ctor();
      const ctx = this.ctx;
      void ctx.resume();

      const gain = ctx.createGain();
      gain.gain.value = volume;
      gain.connect(ctx.destination);

      const source = ctx.createBufferSource();
      source.buffer = noiseBuffer(ctx, id === "brown" ? "brown" : "white");
      source.loop = true;

      if (id === "rain") {
        // Hiss with the lows and the highs taken off, plus the odd louder drop.
        const high = ctx.createBiquadFilter();
        high.type = "highpass";
        high.frequency.value = 600;
        const low = ctx.createBiquadFilter();
        low.type = "lowpass";
        low.frequency.value = 7000;
        source.connect(high);
        high.connect(low);
        low.connect(gain);
        this.dropTimer = setInterval(() => {
          if (!this.gain || !this.ctx) return;
          const now = this.ctx.currentTime;
          this.gain.gain.cancelScheduledValues(now);
          this.gain.gain.setValueAtTime(volume, now);
          this.gain.gain.linearRampToValueAtTime(volume * (1.1 + Math.random() * 0.25), now + 0.03);
          this.gain.gain.linearRampToValueAtTime(volume, now + 0.14);
        }, 350);
      } else {
        source.connect(gain);
      }
      source.start();
      this.source = source;
      this.gain = gain;
    } catch {
      /* audio blocked or unsupported: the timer works without it */
    }
  }

  stop(): void {
    if (this.dropTimer) clearInterval(this.dropTimer);
    this.dropTimer = null;
    try {
      this.source?.stop();
      this.source?.disconnect();
      this.gain?.disconnect();
    } catch {
      /* already stopped */
    }
    this.source = null;
    this.gain = null;
  }

  /** A short two-note chime for the end of a block, a break or the whole session. */
  chime(): void {
    const Ctor = audioContextCtor();
    if (!Ctor) return;
    try {
      this.ctx ??= new Ctor();
      const ctx = this.ctx;
      void ctx.resume();
      [660, 880].forEach((hz, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.frequency.value = hz;
        g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.18);
        g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + i * 0.18 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.18 + 0.5);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.18);
        osc.stop(ctx.currentTime + i * 0.18 + 0.55);
      });
    } catch {
      /* no audio: the on-screen prompt is enough */
    }
  }

  dispose(): void {
    this.stop();
    void this.ctx?.close().catch(() => undefined);
    this.ctx = null;
  }
}
