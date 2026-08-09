export interface DailyLearningTime {
  readSeconds: number;
  listenSeconds: number;
}

export interface ArticleProgress {
  articleSlug: string;
  title: string;
  category: string;
  readSeconds: number;
  listenSeconds: number;
  maxProgress: number;
  lastProgress: number;
  lastHeadingId?: string;
  lastScrollY: number;
  firstReadAt: string;
  lastReadAt: string;
  completedAt?: string;
  annotationCount: number;
  daily: Record<string, DailyLearningTime>;
}

export interface Annotation {
  id: string;
  articleSlug: string;
  articleTitle: string;
  selectedText: string;
  note: string;
  headingId?: string;
  headingText?: string;
  prefix: string;
  exact: string;
  suffix: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  serverVersion?: number;
}

export interface LocalFavorite {
  articleSlug: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  serverVersion?: number;
}

export interface CloudArticleProgress {
  articleSlug: string;
  title: string;
  category: string;
  readSeconds: number;
  listenSeconds: number;
  maxProgress: number;
  lastProgress: number;
  lastHeadingId?: string;
  lastScrollY: number;
  firstReadAt: string;
  lastReadAt: string;
  completedAt?: string;
}

export interface QueuedSyncOperation {
  operationId: string;
  deviceId: string;
  entityType: 'progress' | 'annotation' | 'favorite';
  entityId: string;
  operation: 'upsert' | 'delete';
  payload: unknown;
  createdAt: string;
  attempts: number;
  nextAttemptAt?: string;
}

export interface SyncMeta {
  key: string;
  value: unknown;
  updatedAt: string;
}

export interface LocalSyncSnapshot {
  progress: CloudArticleProgress[];
  annotations: Annotation[];
  favorites: LocalFavorite[];
  cursor: string;
}

export interface AudioScript {
  cacheKey: string;
  articleSlug: string;
  articleTitle: string;
  fingerprint: string;
  promptVersion: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}

export interface LearningSetting {
  key: string;
  value: unknown;
  updatedAt: string;
}

export interface LearningData {
  articleProgress: ArticleProgress[];
  annotations: Annotation[];
  settings: LearningSetting[];
}

export interface LearningBackup extends LearningData {
  format: 'lfw-learning-backup';
  version: 1;
  exportedAt: string;
  audioScripts?: AudioScript[];
}

export interface SelectionContext {
  text: string;
  headingId?: string;
  headingText?: string;
  surroundingText?: string;
  articleSlug?: string;
  annotationNote?: string;
}
