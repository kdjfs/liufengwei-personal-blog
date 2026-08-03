import type { ArticleProgress } from './types.ts';

export const IDLE_TIMEOUT_MS = 60_000;
export const TRACKER_TICK_SECONDS = 5;
export const TRACKER_PERSIST_SECONDS = 15;

interface ReadingActivityState {
  now: number;
  lastActivityAt: number;
  visible: boolean;
  focused: boolean;
}

interface ScrollProgressInput {
  viewportTop: number;
  articleTop: number;
  articleHeight: number;
  viewportHeight: number;
}

interface CreateProgressInput {
  articleSlug: string;
  title: string;
  category: string;
  now?: string;
}

interface LearningTick {
  seconds: number;
  readActive: boolean;
  listenActive: boolean;
  progress: number;
  headingId?: string;
  scrollY: number;
  now?: string;
}

function clampProgress(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(Math.min(100, Math.max(0, value)) * 10) / 10;
}

export function isReadingActive(state: ReadingActivityState): boolean {
  return state.visible && state.focused && state.now - state.lastActivityAt <= IDLE_TIMEOUT_MS;
}

export function getArticleScrollProgress(input: ScrollProgressInput): number {
  const scrollRange = Math.max(1, input.articleHeight - input.viewportHeight);
  return clampProgress(((input.viewportTop - input.articleTop) / scrollRange) * 100);
}

export function createArticleProgress(input: CreateProgressInput): ArticleProgress {
  const now = input.now ?? new Date().toISOString();
  return {
    articleSlug: input.articleSlug,
    title: input.title,
    category: input.category,
    readSeconds: 0,
    listenSeconds: 0,
    maxProgress: 0,
    lastProgress: 0,
    lastScrollY: 0,
    firstReadAt: now,
    lastReadAt: now,
    annotationCount: 0,
    daily: {},
  };
}

export function applyLearningTick(record: ArticleProgress, tick: LearningTick): ArticleProgress {
  const now = tick.now ?? new Date().toISOString();
  const seconds = Math.max(0, Math.round(tick.seconds));
  const readDelta = tick.readActive ? seconds : 0;
  const listenDelta = tick.listenActive ? seconds : 0;
  const date = now.slice(0, 10);
  const currentDaily = record.daily[date] ?? { readSeconds: 0, listenSeconds: 0 };
  const progress = clampProgress(tick.progress);
  const maxProgress = Math.max(record.maxProgress, progress);
  const completedAt = record.completedAt ?? (maxProgress >= 90 ? now : undefined);

  return {
    ...record,
    readSeconds: record.readSeconds + readDelta,
    listenSeconds: record.listenSeconds + listenDelta,
    maxProgress,
    lastProgress: progress,
    lastHeadingId: tick.headingId || record.lastHeadingId,
    lastScrollY: Math.max(0, Math.round(tick.scrollY)),
    lastReadAt: now,
    completedAt,
    daily: {
      ...record.daily,
      [date]: {
        readSeconds: currentDaily.readSeconds + readDelta,
        listenSeconds: currentDaily.listenSeconds + listenDelta,
      },
    },
  };
}

export function markArticleCompleted(
  record: ArticleProgress,
  now = new Date().toISOString(),
): ArticleProgress {
  return {
    ...record,
    maxProgress: Math.max(record.maxProgress, 100),
    completedAt: record.completedAt ?? now,
    lastReadAt: now,
  };
}
