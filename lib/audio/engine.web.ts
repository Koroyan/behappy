/**
 * Sound Lab playback on the web: the same generated PCM as on phones, played
 * as looping Web Audio buffers (true stereo: the left and right channels of
 * the buffer go to the left and right ear). Gains ramp smoothly; nothing is
 * downloaded, so it works offline once the app is loaded.
 */
import { mixGains, renderAsync, SoundSpec, specKey } from './synth';

export interface Layer {
  id: string;
  spec: SoundSpec;
  volume: number;
}

export type EngineState = 'stopped' | 'loading' | 'playing' | 'paused';

export async function soundFile(_spec: SoundSpec): Promise<string> {
  return '';
}
export async function clearSoundCache() {}
/** The web renders quickly when Play is pressed: nothing to prepare. */
export async function prepareSounds(_specs: SoundSpec[]) {}

const buffers = new Map<string, AudioBuffer>();

class WebEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private nodes = new Map<string, { layer: Layer; source: AudioBufferSourceNode; gain: GainNode }>();
  private master = 0.5;
  state: EngineState = 'stopped';
  private listeners = new Set<(s: EngineState) => void>();

  onState(fn: (s: EngineState) => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }
  private set(s: EngineState) {
    this.state = s;
    this.listeners.forEach((fn) => fn(s));
  }

  private context(): AudioContext {
    if (!this.ctx) {
      const Ctx = (globalThis as any).AudioContext || (globalThis as any).webkitAudioContext;
      this.ctx = new Ctx() as AudioContext;
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0;
      this.masterGain.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  private async buffer(spec: SoundSpec): Promise<AudioBuffer> {
    const key = specKey(spec);
    const cached = buffers.get(key);
    if (cached) return cached;
    const ctx = this.context();
    const pcm = await renderAsync(spec);
    const buf = ctx.createBuffer(2, pcm.left.length, pcm.sampleRate);
    buf.copyToChannel(pcm.left as Float32Array<ArrayBuffer>, 0);
    buf.copyToChannel(pcm.right as Float32Array<ArrayBuffer>, 1);
    buffers.set(key, buf);
    return buf;
  }

  private apply(rampMs = 120) {
    if (!this.ctx) return;
    const entries = [...this.nodes.values()];
    const gains = mixGains(
      entries.map((e) => e.layer.volume),
      1
    );
    const now = this.ctx.currentTime;
    entries.forEach((e, i) => {
      e.gain.gain.cancelScheduledValues(now);
      e.gain.gain.setTargetAtTime(gains[i], now, rampMs / 3000);
    });
  }

  async setLayers(layers: Layer[], _title?: string) {
    const ctx = this.context();
    const keep = new Set(layers.map((l) => l.id));
    for (const [id, n] of this.nodes) {
      if (keep.has(id)) continue;
      try {
        n.source.stop();
      } catch {
        // not started
      }
      n.source.disconnect();
      n.gain.disconnect();
      this.nodes.delete(id);
    }
    for (const layer of layers) {
      const existing = this.nodes.get(layer.id);
      if (existing && specKey(existing.layer.spec) === specKey(layer.spec)) {
        existing.layer = layer;
        continue;
      }
      if (existing) {
        try {
          existing.source.stop();
        } catch {
          // ignore
        }
        existing.source.disconnect();
        existing.gain.disconnect();
      }
      const source = ctx.createBufferSource();
      source.buffer = await this.buffer(layer.spec);
      source.loop = true;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      source.connect(gain).connect(this.masterGain!);
      source.start();
      this.nodes.set(layer.id, { layer, source, gain });
    }
    this.apply();
  }

  setVolume(id: string, volume: number) {
    const n = this.nodes.get(id);
    if (n) n.layer = { ...n.layer, volume };
    this.apply();
  }

  setMaster(v: number) {
    this.master = v;
    if (this.state === 'playing') this.fadeTo(1, 150);
  }

  private masterTarget(level: number) {
    return mixGains([1], this.master)[0] * level;
  }

  async play(fadeMs = 1500) {
    const ctx = this.context();
    if (ctx.state === 'suspended') await ctx.resume();
    this.set('playing');
    await this.fadeTo(1, fadeMs);
  }

  async pause() {
    await this.fadeTo(0, 400);
    await this.ctx?.suspend();
    this.set('paused');
  }

  async stop(fadeMs = 1500) {
    if (this.state === 'playing') await this.fadeTo(0, fadeMs);
    await this.setLayers([]);
    await this.ctx?.suspend();
    this.set('stopped');
  }

  fadeTo(level: number, ms: number): Promise<void> {
    if (!this.ctx || !this.masterGain) return Promise.resolve();
    const now = this.ctx.currentTime;
    const g = this.masterGain.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(this.masterTarget(level), now + Math.max(0.01, ms / 1000));
    return new Promise((r) => setTimeout(r, ms));
  }
}

export const soundEngine = new WebEngine();
