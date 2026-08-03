/**
 * Selection Toolbar with Copy & Read Aloud
 *
 * Provides a floating toolbar when the user selects text in the main content area.
 * Supports copy-to-clipboard and browser-native speech synthesis with automatic
 * Chinese / English language detection.
 *
 * Designed to integrate into the existing `enhancePage()` lifecycle in BaseLayout.
 */

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const SPEECH_RATE = 0.96;
const SPEECH_PITCH = 1;
const SPEECH_VOLUME = 1;
const TOOLBAR_GAP = 10; // px between selection rect and toolbar
const VIEWPORT_PAD = 8; // px minimum distance from viewport edge

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

type SpeechLanguage = 'zh-CN' | 'en-US';

interface SelectionState {
  text: string;
  rect: DOMRect;
}

/* ------------------------------------------------------------------ */
/*  Language detection                                                */
/* ------------------------------------------------------------------ */

const CJK_RE = /[㐀-鿿豈-﫿]/g;
const LATIN_RE = /[a-zA-Z]/g;

function countRegex(text: string, re: RegExp): number {
  const matches = text.match(re);
  return matches ? matches.length : 0;
}

function detectSpeechLanguage(text: string): SpeechLanguage {
  const cjk = countRegex(text, CJK_RE);
  const latin = countRegex(text, LATIN_RE);
  return cjk >= latin ? 'zh-CN' : 'en-US';
}

/* ------------------------------------------------------------------ */
/*  Voice selection                                                   */
/* ------------------------------------------------------------------ */

function getVoices(): SpeechSynthesisVoice[] {
  return speechSynthesis.getVoices();
}

function getBestVoice(lang: SpeechLanguage): SpeechSynthesisVoice | null {
  const voices = getVoices();
  if (voices.length === 0) return null;

  const exact = voices.find((v) => v.lang === lang);
  if (exact) return exact;

  const prefix = lang.split('-')[0];
  const prefixed = voices.find((v) => v.lang.startsWith(prefix));
  if (prefixed) return prefixed;

  return voices.find((v) => v.default) ?? voices[0] ?? null;
}

/* ------------------------------------------------------------------ */
/*  Mixed-text segmentation                                           */
/* ------------------------------------------------------------------ */

const SEGMENT_BREAK_RE = /(?<=[.!?。！？\n,，;；:：])|(?=[.!?。！？\n])/g;

function splitMixedText(text: string): Array<{ text: string; lang: SpeechLanguage }> {
  const parts = text.split(SEGMENT_BREAK_RE).filter(Boolean);
  const segments: Array<{ text: string; lang: SpeechLanguage }> = [];

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    segments.push({ text: trimmed, lang: detectSpeechLanguage(trimmed) });
  }

  return segments.length > 0 ? segments : [{ text, lang: detectSpeechLanguage(text) }];
}

/* ------------------------------------------------------------------ */
/*  Speech manager (scoped per init call)                             */
/* ------------------------------------------------------------------ */

type SpeechStateCallback = (state: 'start' | 'end' | 'error') => void;

function createSpeechManager() {
  let cancelled = false;

  function speak(text: string, onState: SpeechStateCallback): void {
    cancel();
    cancelled = false;

    const segments = splitMixedText(text);
    const lastIdx = segments.length - 1;

    for (let i = 0; i < segments.length; i++) {
      const { text: segText, lang } = segments[i];
      const utterance = new SpeechSynthesisUtterance(segText);
      utterance.lang = lang;
      utterance.rate = SPEECH_RATE;
      utterance.pitch = SPEECH_PITCH;
      utterance.volume = SPEECH_VOLUME;

      const voice = getBestVoice(lang);
      if (voice) utterance.voice = voice;

      if (i === 0) {
        utterance.onstart = () => {
          if (!cancelled) onState('start');
        };
      }

      if (i === lastIdx) {
        utterance.onend = () => {
          if (!cancelled) onState('end');
        };
        utterance.onerror = (event) => {
          if (!cancelled && event.error !== 'canceled' && event.error !== 'interrupted') {
            onState('error');
          } else if (!cancelled) {
            onState('end');
          }
        };
      }

      speechSynthesis.speak(utterance);
    }
  }

  function cancel(): void {
    cancelled = true;
    speechSynthesis.cancel();
  }

  function isSpeaking(): boolean {
    return speechSynthesis.speaking || speechSynthesis.pending;
  }

  return { speak, cancel, isSpeaking };
}

/* ------------------------------------------------------------------ */
/*  Toolbar DOM creation                                              */
/* ------------------------------------------------------------------ */

const COPY_ICON_SVG = `
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>`;

const SPEAK_ICON_SVG = `
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
  </svg>`;

const STOP_ICON_SVG = `
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="4" y="4" width="16" height="16" rx="2" ry="2"/>
  </svg>`;

function createToolbar(): HTMLElement {
  const toolbar = document.createElement('div');
  toolbar.className = 'selection-toolbar';
  toolbar.setAttribute('role', 'toolbar');
  toolbar.setAttribute('aria-label', '文本操作');
  toolbar.setAttribute('aria-hidden', 'true');
  toolbar.hidden = true;

  toolbar.innerHTML = `
    <button type="button" class="sel-tb-btn" data-action="copy" aria-label="复制选中文字">
      <span class="sel-tb-icon">${COPY_ICON_SVG}</span>
      <span class="sel-tb-label">复制</span>
    </button>
    <span class="sel-tb-divider" aria-hidden="true"></span>
    <button type="button" class="sel-tb-btn" data-action="speak" aria-label="朗读选中文字" aria-pressed="false">
      <span class="sel-tb-icon">${SPEAK_ICON_SVG}</span>
      <span class="sel-tb-label">朗读</span>
    </button>`;

  return toolbar;
}

/* ------------------------------------------------------------------ */
/*  Toolbar positioning                                               */
/* ------------------------------------------------------------------ */

function positionToolbar(toolbar: HTMLElement, rect: DOMRect): void {
  toolbar.classList.remove('sel-tb-visible', 'sel-tb-below');

  const tbW = toolbar.offsetWidth;
  const tbH = toolbar.offsetHeight;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Center horizontally over selection, clamped to viewport
  let left = rect.left + rect.width / 2 - tbW / 2;
  left = Math.max(VIEWPORT_PAD, Math.min(left, vw - tbW - VIEWPORT_PAD));

  // Prefer above selection
  let top = rect.top - tbH - TOOLBAR_GAP;
  let showBelow = false;

  if (top < VIEWPORT_PAD) {
    top = rect.bottom + TOOLBAR_GAP;
    showBelow = true;
  }

  if (top + tbH > vh - VIEWPORT_PAD) {
    top = vh - tbH - VIEWPORT_PAD;
  }

  toolbar.style.left = `${left}px`;
  toolbar.style.top = `${top}px`;

  if (showBelow) {
    toolbar.classList.add('sel-tb-below');
  }
}

/* ------------------------------------------------------------------ */
/*  Toolbar visibility                                                */
/* ------------------------------------------------------------------ */

function showToolbar(toolbar: HTMLElement): void {
  toolbar.hidden = false;
  toolbar.setAttribute('aria-hidden', 'false');
  // Force reflow so the browser registers the initial state before adding the transition class
  void toolbar.offsetWidth;
  toolbar.classList.add('sel-tb-visible');
}

function hideToolbar(toolbar: HTMLElement): void {
  toolbar.classList.remove('sel-tb-visible');
  toolbar.setAttribute('aria-hidden', 'true');

  const onEnd = () => {
    if (!toolbar.classList.contains('sel-tb-visible')) {
      toolbar.hidden = true;
    }
  };
  toolbar.addEventListener('transitionend', onEnd, { once: true });
  // Safety timeout in case transition doesn't fire
  setTimeout(onEnd, 220);
}

/* ------------------------------------------------------------------ */
/*  Selection validation                                              */
/* ------------------------------------------------------------------ */

const EXCLUDED_SELECTORS = [
  'input',
  'textarea',
  'select',
  '[contenteditable]',
  '[role="textbox"]',
  '[role="searchbox"]',
  '.selection-toolbar',
].join(', ');

function shouldIgnoreSelection(): boolean {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed) return true;

  const node = sel.anchorNode;
  if (!node) return true;

  const element = node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as Element);
  if (element?.closest(EXCLUDED_SELECTORS)) return true;

  return false;
}

function getValidSelection(): SelectionState | null {
  if (shouldIgnoreSelection()) return null;

  const sel = window.getSelection();
  if (!sel) return null;

  const text = sel.toString().trim();
  if (!text) return null;

  try {
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return null;

    return { text, rect };
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Copy                                                              */
/* ------------------------------------------------------------------ */

async function copySelectedText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      textarea.style.pointerEvents = 'none';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
      return true;
    } catch {
      return false;
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Public API                                                        */
/* ------------------------------------------------------------------ */

export function initSelectionSpeech(signal: AbortSignal): void {
  const speechAvailable =
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    'SpeechSynthesisUtterance' in window;

  const speech = createSpeechManager();
  const toolbar = createToolbar();
  document.body.appendChild(toolbar);

  const copyBtn = toolbar.querySelector<HTMLButtonElement>('[data-action="copy"]');
  const speakBtn = toolbar.querySelector<HTMLButtonElement>('[data-action="speak"]');
  const speakIconEl = speakBtn?.querySelector<HTMLElement>('.sel-tb-icon');
  const speakLabelEl = speakBtn?.querySelector<HTMLElement>('.sel-tb-label');
  const copyLabelEl = copyBtn?.querySelector<HTMLElement>('.sel-tb-label');

  // State
  let selectedText = '';

  const COPY_DEFAULT = '复制';
  const COPY_DONE = '✓ 已复制';
  const SPEAK_DEFAULT = '朗读';
  const SPEAK_STOP = '停止';

  if (!speechAvailable && speakBtn) {
    speakBtn.setAttribute('disabled', '');
    speakBtn.setAttribute('aria-label', '当前浏览器不支持朗读');
    if (speakLabelEl) speakLabelEl.textContent = '不支持';
  }

  /* ---- Event registration ---- */

  const handlePointerUp = () => {
    requestAnimationFrame(() => {
      const sel = getValidSelection();
      if (sel) {
        selectedText = sel.text;
        positionToolbar(toolbar, sel.rect);
        showToolbar(toolbar);
      } else if (!toolbar.contains(document.activeElement)) {
        hideToolbar(toolbar);
      }
    });
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      hideToolbar(toolbar);
      speech.cancel();
    }
  };

  document.addEventListener('pointerup', handlePointerUp, { signal });
  document.addEventListener('keydown', handleKeyDown, { signal });
  window.addEventListener('scroll', () => hideToolbar(toolbar), { signal, passive: true });
  window.addEventListener('resize', () => hideToolbar(toolbar), { signal, passive: true });

  document.addEventListener(
    'pointerdown',
    (e: PointerEvent) => {
      if (!toolbar.contains(e.target as Node)) {
        hideToolbar(toolbar);
      }
    },
    { signal },
  );

  /* ---- Toolbar interaction ---- */

  // Prevent toolbar pointerdown from clearing browser selection
  toolbar.addEventListener('pointerdown', (e) => e.preventDefault());

  // Copy
  copyBtn?.addEventListener('click', async () => {
    if (!selectedText) return;
    const ok = await copySelectedText(selectedText);
    if (ok && copyLabelEl) {
      copyLabelEl.textContent = COPY_DONE;
      copyBtn.classList.add('sel-tb-copied');
      setTimeout(() => {
        if (copyLabelEl) copyLabelEl.textContent = COPY_DEFAULT;
        copyBtn.classList.remove('sel-tb-copied');
      }, 1500);
    }
  });

  // Speak / Stop
  speakBtn?.addEventListener('click', () => {
    if (!speechAvailable || !selectedText) return;

    if (speech.isSpeaking()) {
      speech.cancel();
      return;
    }

    const doSpeak = () => {
      speech.speak(selectedText, (state) => {
        if (state === 'start') {
          speakBtn.setAttribute('aria-pressed', 'true');
          speakBtn.classList.add('sel-tb-speaking');
          if (speakIconEl) speakIconEl.innerHTML = STOP_ICON_SVG;
          if (speakLabelEl) speakLabelEl.textContent = SPEAK_STOP;
        } else {
          speakBtn.setAttribute('aria-pressed', 'false');
          speakBtn.classList.remove('sel-tb-speaking');
          if (speakIconEl) speakIconEl.innerHTML = SPEAK_ICON_SVG;
          if (speakLabelEl) speakLabelEl.textContent = SPEAK_DEFAULT;
        }
      });
    };

    const voices = getVoices();
    if (voices.length === 0) {
      const onVoicesChanged = () => {
        speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
        doSpeak();
      };
      speechSynthesis.addEventListener('voiceschanged', onVoicesChanged);
    } else {
      doSpeak();
    }
  });

  /* ---- Navigation cleanup ---- */

  signal.addEventListener(
    'abort',
    () => {
      speech.cancel();
      toolbar.remove();
    },
    { once: true },
  );
}
