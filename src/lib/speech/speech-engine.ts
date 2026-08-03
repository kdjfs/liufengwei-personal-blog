import { getLearningDatabase } from '../learning/db.ts';
import type { SpeechSegment } from './text-normalizer.ts';

export const SPEECH_RATES = [0.75, 1, 1.25, 1.5, 1.75, 2] as const;
export type SpeechRate = (typeof SPEECH_RATES)[number];
export type SpeechStatus = 'idle' | 'playing' | 'paused' | 'ended';

export interface SpeechSource {
  articleSlug?: string;
  title: string;
  mode: 'article' | 'ai' | 'selection';
  segments: SpeechSegment[];
}

export interface SpeechEngineState extends SpeechSource {
  status: SpeechStatus;
  currentIndex: number;
  rate: SpeechRate;
  voiceURI?: string;
  progress: number;
}

type Listener = (state: SpeechEngineState) => void;

const EMPTY_SOURCE: SpeechSource = { title: '', mode: 'article', segments: [] };

export class SpeechEngine {
  private state: SpeechEngineState = {
    ...EMPTY_SOURCE,
    status: 'idle',
    currentIndex: 0,
    rate: 1,
    progress: 0,
  };
  private listeners = new Set<Listener>();
  private generation = 0;

  getState(): SpeechEngineState {
    return this.state;
  }

  getVoices(): SpeechSynthesisVoice[] {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
    return window.speechSynthesis.getVoices();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  async hydrateSettings(): Promise<void> {
    try {
      const [rate, voice] = await Promise.all([
        getLearningDatabase().get('settings', 'speech-rate'),
        getLearningDatabase().get('settings', 'speech-voice'),
      ]);
      if (SPEECH_RATES.includes(rate?.value as SpeechRate))
        this.state.rate = rate?.value as SpeechRate;
      if (typeof voice?.value === 'string') this.state.voiceURI = voice.value;
      this.emit();
    } catch {
      // Speech still works with defaults when private storage is unavailable.
    }
  }

  load(source: SpeechSource): void {
    this.cancelNative();
    this.state = {
      ...source,
      status: 'idle',
      currentIndex: 0,
      progress: 0,
      rate: this.state.rate,
      voiceURI: this.state.voiceURI,
    };
    this.emit();
  }

  play(index = this.state.currentIndex): void {
    if (!this.state.segments[index] || typeof window === 'undefined' || !window.speechSynthesis)
      return;
    this.cancelNative();
    this.state = {
      ...this.state,
      status: 'playing',
      currentIndex: index,
      progress: this.progress(index),
    };
    const token = this.generation;
    const segment = this.state.segments[index];
    const utterance = new SpeechSynthesisUtterance(segment.text);
    utterance.lang = /[㐀-鿿豈-﫿]/u.test(segment.text) ? 'zh-CN' : 'en-US';
    utterance.rate = this.state.rate;
    const voices = this.getVoices();
    utterance.voice =
      voices.find((voice) => voice.voiceURI === this.state.voiceURI) ??
      voices.find((voice) => voice.lang.toLowerCase().startsWith('zh')) ??
      voices.find((voice) => voice.default) ??
      null;
    utterance.onend = () => {
      if (token !== this.generation || this.state.status !== 'playing') return;
      if (index < this.state.segments.length - 1) this.play(index + 1);
      else {
        this.state = { ...this.state, status: 'ended', progress: 100 };
        this.emit();
      }
    };
    utterance.onerror = (event) => {
      if (token === this.generation && !['canceled', 'interrupted'].includes(event.error)) {
        this.state = { ...this.state, status: 'paused' };
        this.emit();
      }
    };
    window.speechSynthesis.speak(utterance);
    this.emit();
  }

  pause(): void {
    if (this.state.status !== 'playing') return;
    window.speechSynthesis.pause();
    this.state = { ...this.state, status: 'paused' };
    this.emit();
  }

  resume(): void {
    if (this.state.status === 'paused' && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      this.state = { ...this.state, status: 'playing' };
      this.emit();
      return;
    }
    this.play();
  }

  stop(): void {
    this.cancelNative();
    this.state = { ...this.state, status: 'idle' };
    this.emit();
  }

  next(): void {
    this.play(Math.min(this.state.segments.length - 1, this.state.currentIndex + 1));
  }

  previous(): void {
    this.play(Math.max(0, this.state.currentIndex - 1));
  }

  setRate(rate: SpeechRate): void {
    if (!SPEECH_RATES.includes(rate)) return;
    const playing = this.state.status === 'playing';
    this.state = { ...this.state, rate };
    this.persistSetting('speech-rate', rate);
    if (playing) this.play();
    else this.emit();
  }

  setVoice(voiceURI?: string): void {
    const playing = this.state.status === 'playing';
    this.state = { ...this.state, voiceURI };
    this.persistSetting('speech-voice', voiceURI ?? '');
    if (playing) this.play();
    else this.emit();
  }

  playSelection(text: string): void {
    this.load({ title: '选中文字', mode: 'selection', segments: [{ text }] });
    this.play();
  }

  private progress(index: number): number {
    return this.state.segments.length ? Math.round((index / this.state.segments.length) * 100) : 0;
  }

  private cancelNative(): void {
    this.generation += 1;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window)
      window.speechSynthesis.cancel();
  }

  private emit(): void {
    for (const listener of this.listeners) listener(this.state);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('lfw:speech:state', {
          detail: { playing: this.state.status === 'playing', articleSlug: this.state.articleSlug },
        }),
      );
    }
  }

  private persistSetting(key: string, value: unknown): void {
    void getLearningDatabase()
      .put('settings', { key, value, updatedAt: new Date().toISOString() })
      .catch(() => undefined);
  }
}

let engine: SpeechEngine | undefined;

export function getSpeechEngine(): SpeechEngine {
  engine ??= new SpeechEngine();
  return engine;
}
