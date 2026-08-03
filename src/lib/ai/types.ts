/** @deprecated Import from `./chat-contract.ts` instead. Re-exports kept for backward compatibility. */
export {
  AI_LIMITS,
  type ChatContextSource,
  type ChatMessageInput,
  type ChatRequestPayload,
  type CurrentPageContext,
  chatRequestSchema,
  contextSchema,
  currentPageSchema,
  formatZodIssues,
  messageSchema,
  normalizeChatPayload,
  normalizeSelectionContext,
  type SelectionContext,
  selectionSchema,
  truncateCodePoints,
  type ValidationIssue,
} from './chat-contract.ts';

export type KnowledgeItemType = 'article' | 'profile' | 'project' | 'timeline';

export interface KnowledgeDocument {
  id: string;
  type: KnowledgeItemType;
  title: string;
  slug: string;
  url: string;
  description: string;
  category: string;
  tags: string[];
  series?: string;
  publishDate?: string;
  updatedDate?: string;
  readingTime?: string;
  excerpt: string;
}

/** Backward-compatible name for sources rendered by the chat UI. */
export type KnowledgeItem = KnowledgeDocument;

export interface KnowledgeChunk {
  id: string;
  articleId: string;
  articleTitle: string;
  articleSlug: string;
  url: string;
  anchor?: string;
  heading?: string;
  headingPath: string[];
  category: string;
  tags: string[];
  order: number;
  text: string;
}

export interface KnowledgeTaxonomy {
  name: string;
  count: number;
  articleIds: string[];
}

export interface KnowledgeIndex {
  version: 2;
  fingerprint: string;
  generatedAt: string;
  stats: {
    articles: number;
    categories: number;
    tags: number;
    series: number;
    chunks: number;
  };
  taxonomies: {
    categories: KnowledgeTaxonomy[];
    tags: KnowledgeTaxonomy[];
    series: KnowledgeTaxonomy[];
  };
  documents: KnowledgeDocument[];
  chunks: KnowledgeChunk[];
}

export type ChatMode = 'fast' | 'deep';
