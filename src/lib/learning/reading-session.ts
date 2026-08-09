import { getLearningDatabase } from './db.ts';
import {
  applyLearningTick,
  createArticleProgress,
  getArticleScrollProgress,
  isReadingActive,
  markArticleCompleted,
  TRACKER_PERSIST_SECONDS,
  TRACKER_TICK_SECONDS,
} from './reading-tracker.ts';
import type { ArticleProgress } from './types.ts';

export interface ArticleIdentity {
  articleSlug: string;
  title: string;
  category: string;
}

export interface ReadingSession {
  getRecord: () => ArticleProgress;
  resume: () => void;
  markCompleted: () => Promise<void>;
  stop: () => Promise<void>;
}

interface SpeechStateDetail {
  playing?: boolean;
  articleSlug?: string;
}

function calculateProgress(prose: HTMLElement): number {
  const rect = prose.getBoundingClientRect();
  return getArticleScrollProgress({
    viewportTop: window.scrollY,
    articleTop: window.scrollY + rect.top,
    articleHeight: prose.scrollHeight,
    viewportHeight: window.innerHeight,
  });
}

function activeHeadingId(): string | undefined {
  return document.querySelector<HTMLElement>('[data-toc-link].active')?.dataset.tocLink;
}

function notify(record: ArticleProgress): void {
  const article = document.querySelector<HTMLElement>('[data-ai-article]');
  if (article) article.dataset.learningProgress = String(record.lastProgress);
  window.dispatchEvent(new CustomEvent('lfw:learning:progress', { detail: record }));
}

export async function startReadingSession(
  identity: ArticleIdentity,
  onUpdate: (record: ArticleProgress) => void,
): Promise<ReadingSession> {
  const prose = document.querySelector<HTMLElement>('[data-ai-article] .prose');
  if (!prose) throw new Error('当前页面没有可追踪的文章正文');

  const database = getLearningDatabase();
  const existing = await database.get('articleProgress', identity.articleSlug);
  const annotations = await database.getAll('annotations');
  let record: ArticleProgress = existing
    ? {
        ...existing,
        title: identity.title,
        category: identity.category,
        annotationCount: annotations.filter((item) => item.articleSlug === identity.articleSlug)
          .length,
      }
    : createArticleProgress(identity);
  let lastActivityAt = Date.now();
  let listenActive = false;
  let ticksSincePersist = 0;
  let stopped = false;
  let completionPromise: Promise<void> | undefined;
  let persistQueue = Promise.resolve();
  const controller = new AbortController();
  const { signal } = controller;

  const emit = () => {
    onUpdate(record);
    notify(record);
  };
  const persist = (snapshot = record) => {
    const write = persistQueue.then(() => database.put('articleProgress', snapshot));
    persistQueue = write.catch(() => undefined);
    return write;
  };
  const handleActivity = () => {
    lastActivityAt = Date.now();
  };
  const handleSpeechState = (event: Event) => {
    const detail = (event as CustomEvent<SpeechStateDetail>).detail;
    listenActive = Boolean(
      detail?.playing && (!detail.articleSlug || detail.articleSlug === identity.articleSlug),
    );
  };
  const handleAnnotationChange = (event: Event) => {
    const detail = (event as CustomEvent<{ articleSlug?: string; count?: number }>).detail;
    if (detail?.articleSlug !== identity.articleSlug || typeof detail.count !== 'number') return;
    const annotationCount = Math.max(0, Math.round(detail.count));
    void (async () => {
      await completionPromise?.catch(() => undefined);
      record = { ...record, annotationCount };
      emit();
      await persist();
    })();
  };

  for (const type of ['scroll', 'wheel', 'touchmove', 'pointerdown', 'keydown'] as const) {
    window.addEventListener(type, handleActivity, { passive: true, signal });
  }
  window.addEventListener('lfw:speech:state', handleSpeechState, { signal });
  window.addEventListener('lfw:annotations:changed', handleAnnotationChange, { signal });

  const tick = () => {
    if (stopped || completionPromise) return;
    const now = Date.now();
    record = applyLearningTick(record, {
      seconds: TRACKER_TICK_SECONDS,
      readActive: isReadingActive({
        now,
        lastActivityAt,
        visible: document.visibilityState === 'visible',
        focused: document.hasFocus(),
      }),
      listenActive,
      progress: calculateProgress(prose),
      headingId: activeHeadingId(),
      scrollY: window.scrollY,
    });
    ticksSincePersist += 1;
    emit();
    if (ticksSincePersist * TRACKER_TICK_SECONDS >= TRACKER_PERSIST_SECONDS) {
      ticksSincePersist = 0;
      void persist();
    }
  };

  const interval = window.setInterval(tick, TRACKER_TICK_SECONDS * 1000);
  const saveNow = () => void persist();
  window.addEventListener('pagehide', saveNow, { signal });
  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.visibilityState === 'hidden') saveNow();
    },
    { signal },
  );

  emit();
  void persist();

  return {
    getRecord: () => record,
    resume: () => {
      const heading = record.lastHeadingId
        ? document.getElementById(record.lastHeadingId)
        : undefined;
      if (heading) {
        heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      const rect = prose.getBoundingClientRect();
      const articleTop = window.scrollY + rect.top;
      const range = Math.max(1, prose.scrollHeight - window.innerHeight);
      window.scrollTo({
        top: articleTop + range * (record.lastProgress / 100),
        behavior: 'smooth',
      });
    },
    markCompleted: () => {
      if (record.completedAt) return Promise.resolve();
      if (completionPromise) return completionPromise;

      const completedRecord = markArticleCompleted(record);
      const operation = persist(completedRecord).then(() => {
        record = completedRecord;
        emit();
      });
      completionPromise = operation.finally(() => {
        completionPromise = undefined;
      });
      return completionPromise;
    },
    stop: async () => {
      if (stopped) return;
      stopped = true;
      window.clearInterval(interval);
      controller.abort();
      await completionPromise?.catch(() => undefined);
      await persist();
    },
  };
}
