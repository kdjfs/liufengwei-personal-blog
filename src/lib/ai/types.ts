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

export interface ChatMessageInput {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatContextSource {
  id: string;
  title: string;
  url: string;
  category: string;
  excerpt: string;
}

export interface CurrentPageContext {
  title: string;
  url: string;
  description?: string;
  category?: string;
  tags?: string[];
  content?: string;
  activeHeading?: string;
  readingProgress?: number;
}

export interface SelectionContext {
  text: string;
  headingId?: string;
  headingText?: string;
  surroundingText?: string;
  articleSlug?: string;
  annotationNote?: string;
}

export interface ChatRequestPayload {
  mode: ChatMode;
  messages: ChatMessageInput[];
  context: ChatContextSource[];
  structuredFacts?: string;
  currentPage?: CurrentPageContext;
  selection?: SelectionContext;
}
