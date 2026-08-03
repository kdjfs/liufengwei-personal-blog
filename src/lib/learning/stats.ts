import type { ArticleProgress } from './types.ts';

export interface LearningDaySummary {
  date: string;
  readSeconds: number;
  listenSeconds: number;
}

export interface LearningSummary {
  totalReadSeconds: number;
  totalListenSeconds: number;
  todaySeconds: number;
  articleCount: number;
  completedCount: number;
  annotationCount: number;
  last7Days: LearningDaySummary[];
  byCategory: Array<{ category: string; seconds: number }>;
  recent: ArticleProgress[];
}

export function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function summarizeLearning(
  records: ArticleProgress[],
  annotationCount: number,
  now = new Date(),
): LearningSummary {
  const last7Days: LearningDaySummary[] = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(now);
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - offset);
    const key = localDateKey(date);
    const totals = records.reduce(
      (sum, record) => {
        const item = record.daily[key];
        return {
          readSeconds: sum.readSeconds + (item?.readSeconds ?? 0),
          listenSeconds: sum.listenSeconds + (item?.listenSeconds ?? 0),
        };
      },
      { readSeconds: 0, listenSeconds: 0 },
    );
    last7Days.push({ date: key, ...totals });
  }

  const categories = new Map<string, number>();
  for (const record of records) {
    categories.set(
      record.category,
      (categories.get(record.category) ?? 0) + record.readSeconds + record.listenSeconds,
    );
  }

  const today = last7Days.at(-1);
  return {
    totalReadSeconds: records.reduce((sum, record) => sum + record.readSeconds, 0),
    totalListenSeconds: records.reduce((sum, record) => sum + record.listenSeconds, 0),
    todaySeconds: (today?.readSeconds ?? 0) + (today?.listenSeconds ?? 0),
    articleCount: records.length,
    completedCount: records.filter((record) => Boolean(record.completedAt)).length,
    annotationCount,
    last7Days,
    byCategory: [...categories.entries()]
      .map(([category, seconds]) => ({ category, seconds }))
      .sort(
        (left, right) =>
          right.seconds - left.seconds || left.category.localeCompare(right.category, 'zh-CN'),
      ),
    recent: [...records]
      .sort((left, right) => right.lastReadAt.localeCompare(left.lastReadAt))
      .slice(0, 12),
  };
}

export function formatLearningDuration(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  return `${Math.max(0, minutes)} 分钟`;
}
