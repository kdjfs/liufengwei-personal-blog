import type { ArticleProgress } from '../learning/types.ts';

export type KnowledgeLearningStatus = 'not-started' | 'reading' | 'completed';

export interface KnowledgeLearningState {
  status: KnowledgeLearningStatus;
  readSeconds: number;
  maxProgress: number;
  annotationCount: number;
}

export type KnowledgeLearningOverlay = Record<string, KnowledgeLearningState>;

function nonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function stateFromRecord(record?: ArticleProgress): KnowledgeLearningState {
  if (!record) {
    return { status: 'not-started', readSeconds: 0, maxProgress: 0, annotationCount: 0 };
  }
  const readSeconds = nonNegative(record.readSeconds);
  const maxProgress = Math.min(100, nonNegative(record.maxProgress));
  const annotationCount = Math.round(nonNegative(record.annotationCount));
  const status: KnowledgeLearningStatus = record.completedAt
    ? 'completed'
    : readSeconds > 0 || record.listenSeconds > 0 || maxProgress > 0
      ? 'reading'
      : 'not-started';
  return { status, readSeconds, maxProgress, annotationCount };
}

export function buildLearningOverlay(
  articleSlugs: string[],
  records: ArticleProgress[],
): KnowledgeLearningOverlay {
  const recordBySlug = new Map(records.map((record) => [record.articleSlug, record]));
  return [...new Set(articleSlugs)]
    .sort((left, right) => left.localeCompare(right, 'zh-CN'))
    .reduce<KnowledgeLearningOverlay>((overlay, slug) => {
      overlay[slug] = stateFromRecord(recordBySlug.get(slug));
      return overlay;
    }, {});
}

export function summarizeLearningOverlay(overlay: KnowledgeLearningOverlay) {
  const states = Object.values(overlay);
  return {
    completedCount: states.filter((state) => state.status === 'completed').length,
    readingCount: states.filter((state) => state.status === 'reading').length,
  };
}
