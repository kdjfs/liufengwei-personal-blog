import { z } from 'zod';
import type { LearningDatabase } from './db.ts';
import type { LearningBackup, LearningData } from './types.ts';

const isoDate = z.iso.datetime({ offset: true });
const dailyTime = z.object({
  readSeconds: z.number().nonnegative(),
  listenSeconds: z.number().nonnegative(),
});
const articleProgress = z.object({
  articleSlug: z.string().min(1).max(160),
  title: z.string().min(1).max(240),
  category: z.string().min(1).max(80),
  readSeconds: z.number().int().nonnegative(),
  listenSeconds: z.number().int().nonnegative(),
  maxProgress: z.number().min(0).max(100),
  lastProgress: z.number().min(0).max(100),
  lastHeadingId: z.string().max(240).optional(),
  lastScrollY: z.number().nonnegative(),
  firstReadAt: isoDate,
  lastReadAt: isoDate,
  completedAt: isoDate.optional(),
  annotationCount: z.number().int().nonnegative(),
  daily: z.record(z.string(), dailyTime),
});
const annotation = z.object({
  id: z.string().min(1).max(160),
  articleSlug: z.string().min(1).max(160),
  articleTitle: z.string().min(1).max(240),
  selectedText: z.string().min(1).max(3_000),
  note: z.string().min(1).max(10_000),
  headingId: z.string().max(240).optional(),
  headingText: z.string().max(500).optional(),
  prefix: z.string().max(240),
  exact: z.string().min(1).max(3_000),
  suffix: z.string().max(240),
  createdAt: isoDate,
  updatedAt: isoDate,
});
const setting = z.object({
  key: z.string().min(1).max(120),
  value: z.unknown(),
  updatedAt: isoDate,
});
const audioScript = z.object({
  cacheKey: z.string().min(1).max(500),
  articleSlug: z.string().min(1).max(160),
  articleTitle: z.string().min(1).max(240),
  fingerprint: z.string().min(1).max(160),
  promptVersion: z.string().min(1).max(80),
  text: z.string().min(1).max(200_000),
  createdAt: isoDate,
  updatedAt: isoDate,
});
const backupSchema = z.object({
  format: z.literal('lfw-learning-backup'),
  version: z.literal(1),
  exportedAt: isoDate,
  articleProgress: z.array(articleProgress).max(20_000),
  annotations: z.array(annotation).max(100_000),
  settings: z.array(setting).max(1_000),
  audioScripts: z.array(audioScript).max(10_000).optional(),
});

export function parseLearningBackup(raw: string): LearningBackup {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error('备份文件不是有效的 JSON');
  }
  const parsed = backupSchema.safeParse(value);
  if (!parsed.success) throw new Error('备份文件格式或字段不符合 LFW Learning V1');
  return parsed.data;
}

function mergeNewest<T, K>(
  current: T[],
  incoming: T[],
  key: (item: T) => K,
  updatedAt: (item: T) => string,
): T[] {
  const result = new Map<K, T>();
  for (const item of [...current, ...incoming]) {
    const id = key(item);
    const previous = result.get(id);
    if (!previous || updatedAt(item) > updatedAt(previous)) result.set(id, item);
  }
  return [...result.values()];
}

export function mergeLearningBackup(current: LearningData, incoming: LearningBackup): LearningData {
  return {
    articleProgress: mergeNewest(
      current.articleProgress,
      incoming.articleProgress,
      (item) => item.articleSlug,
      (item) => item.lastReadAt,
    ),
    annotations: mergeNewest(
      current.annotations,
      incoming.annotations,
      (item) => item.id,
      (item) => item.updatedAt,
    ),
    settings: mergeNewest(
      current.settings,
      incoming.settings,
      (item) => item.key,
      (item) => item.updatedAt,
    ),
  };
}

export async function createLearningBackup(
  database: LearningDatabase,
  includeAudioScripts = false,
): Promise<LearningBackup> {
  const [articleProgressItems, annotationItems, settingItems, audioScriptItems] = await Promise.all(
    [
      database.getAll('articleProgress'),
      database.getAll('annotations'),
      database.getAll('settings'),
      includeAudioScripts ? database.getAll('audioScripts') : Promise.resolve([]),
    ],
  );
  return {
    format: 'lfw-learning-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    articleProgress: articleProgressItems,
    annotations: annotationItems,
    settings: settingItems,
    ...(includeAudioScripts ? { audioScripts: audioScriptItems } : {}),
  };
}

export async function restoreLearningBackup(
  database: LearningDatabase,
  backup: LearningBackup,
): Promise<void> {
  const current: LearningData = {
    articleProgress: await database.getAll('articleProgress'),
    annotations: await database.getAll('annotations'),
    settings: await database.getAll('settings'),
  };
  const merged = mergeLearningBackup(current, backup);
  await Promise.all([
    database.putMany('articleProgress', merged.articleProgress),
    database.putMany('annotations', merged.annotations),
    database.putMany('settings', merged.settings),
    database.putMany('audioScripts', backup.audioScripts ?? []),
  ]);
}
