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
