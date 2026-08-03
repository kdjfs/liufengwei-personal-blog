import { useCallback, useEffect, useRef, useState } from 'react';
import { streamAIResponse } from '@/components/ai/chat-client';
import { readCurrentPageContext } from '@/components/ai/page-context';
import { getLearningDatabase } from '@/lib/learning/db';
import {
  AI_LISTENING_PROMPT,
  AI_LISTENING_PROMPT_VERSION,
  buildAudioScriptCacheKey,
  fingerprintText,
  normalizeAIListeningScript,
} from '@/lib/speech/ai-script';
import { extractArticleSpeech } from '@/lib/speech/article-speech';
import {
  getSpeechEngine,
  SPEECH_RATES,
  type SpeechEngineState,
  type SpeechRate,
} from '@/lib/speech/speech-engine';
import { segmentSpeechText } from '@/lib/speech/text-normalizer';

interface Props {
  articleSlug: string;
  articleTitle: string;
}

function downloadText(filename: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function ListeningPlayer({ articleSlug, articleTitle }: Props) {
  const engine = getSpeechEngine();
  const [state, setState] = useState<SpeechEngineState>(engine.getState());
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const [message, setMessage] = useState('');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const abortRef = useRef<AbortController | undefined>(undefined);

  const loadOriginal = useCallback(() => {
    const prose = document.querySelector<HTMLElement>('[data-ai-article] .prose');
    if (!prose) return;
    engine.load({
      articleSlug,
      title: articleTitle,
      mode: 'article',
      segments: extractArticleSpeech(prose),
    });
  }, [articleSlug, articleTitle, engine]);

  useEffect(() => {
    void engine.hydrateSettings();
    const unsubscribe = engine.subscribe(setState);
    const readVoices = () => setVoices(engine.getVoices());
    readVoices();
    window.speechSynthesis?.addEventListener('voiceschanged', readVoices);
    const handleOpen = () => {
      if (engine.getState().articleSlug !== articleSlug || engine.getState().mode !== 'article') {
        loadOriginal();
      }
      setVisible(true);
      setOpen(true);
    };
    const handleLeave = () => {
      if (engine.getState().articleSlug === articleSlug) engine.pause();
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('lfw:speech:open', handleOpen);
    window.addEventListener('keydown', handleKey);
    document.addEventListener('astro:before-swap', handleLeave);
    return () => {
      unsubscribe();
      window.speechSynthesis?.removeEventListener('voiceschanged', readVoices);
      window.removeEventListener('lfw:speech:open', handleOpen);
      window.removeEventListener('keydown', handleKey);
      document.removeEventListener('astro:before-swap', handleLeave);
      abortRef.current?.abort();
      handleLeave();
    };
  }, [articleSlug, engine, loadOriginal]);

  useEffect(() => {
    document.documentElement.classList.toggle('listening-panel-open', visible && open);
    return () => document.documentElement.classList.remove('listening-panel-open');
  }, [open, visible]);

  const loadAIScript = async (regenerate = false) => {
    const prose = document.querySelector<HTMLElement>('[data-ai-article] .prose');
    if (!prose) return;
    if (regenerate && !window.confirm('重新生成会再次调用 AI，确定继续吗？')) return;
    const articleText = prose.innerText.replace(/\s+/g, ' ').trim();
    const fingerprint = fingerprintText(articleText);
    const cacheKey = buildAudioScriptCacheKey(
      articleSlug,
      fingerprint,
      AI_LISTENING_PROMPT_VERSION,
    );
    const cached = await getLearningDatabase().get('audioScripts', cacheKey);
    if (cached && !regenerate) {
      engine.load({
        articleSlug,
        title: articleTitle,
        mode: 'ai',
        segments: segmentSpeechText(cached.text).map((text) => ({
          text,
          heading: 'AI 精华听读',
        })),
      });
      setMessage('已从本地缓存读取，不会再次调用 AI。');
      return;
    }

    setLoadingAI(true);
    setMessage('正在生成适合通勤和复习的听读稿……');
    const controller = new AbortController();
    abortRef.current = controller;
    let script = '';
    try {
      await streamAIResponse(
        {
          mode: 'fast',
          messages: [{ role: 'user', content: AI_LISTENING_PROMPT }],
          context: [],
          currentPage: readCurrentPageContext(),
        },
        (delta) => {
          script += delta;
        },
        controller.signal,
      );
      const cleaned = normalizeAIListeningScript(script);
      if (!cleaned) throw new Error('AI 没有返回有效听读稿');
      const now = new Date().toISOString();
      await getLearningDatabase().put('audioScripts', {
        cacheKey,
        articleSlug,
        articleTitle,
        fingerprint,
        promptVersion: AI_LISTENING_PROMPT_VERSION,
        text: cleaned,
        createdAt: cached?.createdAt ?? now,
        updatedAt: now,
      });
      engine.load({
        articleSlug,
        title: articleTitle,
        mode: 'ai',
        segments: segmentSpeechText(cleaned).map((text) => ({
          text,
          heading: 'AI 精华听读',
        })),
      });
      setMessage('听读稿已生成并缓存到当前浏览器。');
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        setMessage(error instanceof Error ? error.message : 'AI 听读稿生成失败，请稍后重试。');
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = undefined;
      setLoadingAI(false);
    }
  };

  const togglePlayback = () => {
    if (state.status === 'playing') engine.pause();
    else if (state.status === 'paused') engine.resume();
    else engine.play();
  };

  const closePlayer = () => {
    engine.stop();
    setVisible(false);
    setOpen(false);
  };

  if (!visible) return null;
  const segment = state.segments[state.currentIndex];
  const aiText = state.mode === 'ai' ? state.segments.map((item) => item.text).join('\n\n') : '';

  if (!open) {
    return (
      <aside className="listening-mini" aria-label="文章朗读迷你播放器">
        <button
          type="button"
          onClick={togglePlayback}
          aria-label={state.status === 'playing' ? '暂停' : '播放'}
        >
          {state.status === 'playing' ? 'Ⅱ' : '▶'}
        </button>
        <button type="button" className="listening-mini-main" onClick={() => setOpen(true)}>
          <strong>{segment?.heading || articleTitle}</strong>
          <span>
            {state.rate}x · {state.progress}%
          </span>
        </button>
        <button type="button" onClick={closePlayer} aria-label="关闭朗读">
          ×
        </button>
      </aside>
    );
  }

  return (
    <aside className="listening-panel" role="dialog" aria-modal="false" aria-label="文章听读">
      <header>
        <div>
          <span>LISTENING</span>
          <h2>{articleTitle}</h2>
        </div>
        <div>
          <button type="button" onClick={() => setOpen(false)} aria-label="收起到迷你播放器">
            —
          </button>
          <button type="button" onClick={closePlayer} aria-label="停止并关闭">
            ×
          </button>
        </div>
      </header>

      <div className="listening-source-tabs" role="tablist" aria-label="听读来源">
        <button
          type="button"
          role="tab"
          aria-selected={state.mode === 'article'}
          onClick={loadOriginal}
        >
          原文朗读
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={state.mode === 'ai'}
          disabled={loadingAI}
          onClick={() => void loadAIScript(false)}
        >
          AI 精华听读
        </button>
      </div>

      <p className="listening-current">
        <span>{segment?.heading || '准备朗读'}</span>
        {segment?.text || '请选择原文朗读或生成 AI 精华听读稿。'}
      </p>
      {message && (
        <p className="listening-message" role="status">
          {message}
        </p>
      )}
      <progress max="100" value={state.progress}>
        {state.progress}%
      </progress>

      <div className="listening-main-controls">
        <button type="button" onClick={() => engine.previous()} aria-label="上一段">
          ⏮
        </button>
        <button
          type="button"
          className="listening-play"
          onClick={togglePlayback}
          disabled={!state.segments.length}
        >
          {state.status === 'playing' ? '暂停' : '播放'}
        </button>
        <button type="button" onClick={() => engine.next()} aria-label="下一段">
          ⏭
        </button>
        <button type="button" onClick={() => engine.stop()}>
          停止
        </button>
      </div>

      <div className="listening-settings">
        <label>
          倍速
          <select
            value={state.rate}
            onChange={(event) => engine.setRate(Number(event.currentTarget.value) as SpeechRate)}
          >
            {SPEECH_RATES.map((rate) => (
              <option key={rate} value={rate}>
                {rate}x
              </option>
            ))}
          </select>
        </label>
        <label>
          声音
          <select
            value={state.voiceURI ?? ''}
            onChange={(event) => engine.setVoice(event.currentTarget.value || undefined)}
          >
            <option value="">自动选择中文声音</option>
            {voices.map((voice) => (
              <option key={voice.voiceURI} value={voice.voiceURI}>
                {voice.name} · {voice.lang}
              </option>
            ))}
          </select>
        </label>
      </div>

      {state.mode === 'ai' && (
        <div className="listening-ai-actions">
          <button type="button" disabled={loadingAI} onClick={() => void loadAIScript(true)}>
            重新生成（会再次调用 AI）
          </button>
          <button
            type="button"
            disabled={!aiText}
            onClick={() => downloadText(`${articleSlug}-listening-script.txt`, aiText)}
          >
            下载听读稿 .txt
          </button>
        </div>
      )}
      <p className="listening-limit">
        使用浏览器系统语音；切到后台或锁屏后能否继续，由设备和浏览器决定。
      </p>
    </aside>
  );
}
