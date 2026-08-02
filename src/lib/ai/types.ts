export type KnowledgeItemType = 'article' | 'profile' | 'project' | 'timeline';

export interface KnowledgeItem {
  id: string;
  type: KnowledgeItemType;
  title: string;
  slug: string;
  url: string;
  description: string;
  category: string;
  tags: string[];
  excerpt: string;
}

export interface KnowledgeIndex {
  version: 1;
  items: KnowledgeItem[];
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
}

export interface ChatRequestPayload {
  mode: ChatMode;
  messages: ChatMessageInput[];
  context: ChatContextSource[];
  currentPage?: CurrentPageContext;
}
