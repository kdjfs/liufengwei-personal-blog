export const CHAT_LIMITS = {
  messages: 12,
  messageContent: 4_000,
  totalMessageContent: 16_000,
  contextSources: 4,
  contextId: 160,
  contextTitle: 160,
  contextUrl: 300,
  contextCategory: 60,
  contextExcerpt: 1_800,
  structuredFacts: 6_000,
  currentPageTitle: 180,
  currentPageUrl: 300,
  currentPageDescription: 300,
  currentPageCategory: 60,
  currentPageTags: 8,
  currentPageTag: 40,
  currentPageContent: 8_000,
  currentPageActiveHeading: 300,
  selectionText: 3_000,
  selectionHeadingId: 240,
  selectionHeadingText: 500,
  selectionSurroundingText: 2_000,
  selectionArticleSlug: 160,
  annotationNote: 10_000,
} as const;

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

export function unicodeLength(value: string): number {
  return Array.from(value).length;
}

export function truncateUnicode(value: string, maxCharacters: number): string {
  if (unicodeLength(value) <= maxCharacters) return value;
  return Array.from(value).slice(0, maxCharacters).join('');
}

function fitOptional(value: string | undefined, limit: number): string | undefined {
  if (value === undefined) return undefined;
  return truncateUnicode(value, limit);
}

export function fitSelectionContext(selection: SelectionContext): SelectionContext {
  return {
    text: truncateUnicode(selection.text, CHAT_LIMITS.selectionText),
    headingId: fitOptional(selection.headingId, CHAT_LIMITS.selectionHeadingId),
    headingText: fitOptional(selection.headingText, CHAT_LIMITS.selectionHeadingText),
    surroundingText: fitOptional(selection.surroundingText, CHAT_LIMITS.selectionSurroundingText),
    articleSlug: fitOptional(selection.articleSlug, CHAT_LIMITS.selectionArticleSlug),
    annotationNote: fitOptional(selection.annotationNote, CHAT_LIMITS.annotationNote),
  };
}

function fitMessages(messages: ChatMessageInput[]): ChatMessageInput[] {
  const bounded = messages.slice(-CHAT_LIMITS.messages).map((message) => ({
    role: message.role,
    content: truncateUnicode(message.content, CHAT_LIMITS.messageContent),
  }));
  let lastUserIndex = -1;
  for (let index = bounded.length - 1; index >= 0; index -= 1) {
    if (bounded[index]?.role === 'user') {
      lastUserIndex = index;
      break;
    }
  }
  if (lastUserIndex < 0) return [];

  const result: ChatMessageInput[] = [];
  let remaining = CHAT_LIMITS.totalMessageContent;
  for (let index = lastUserIndex; index >= 0 && remaining > 0; index -= 1) {
    const message = bounded[index];
    if (!message) continue;
    const content = truncateUnicode(message.content, remaining);
    if (!content) continue;
    result.unshift({ ...message, content });
    remaining -= unicodeLength(content);
  }
  return result;
}

export function fitChatRequest(payload: ChatRequestPayload): ChatRequestPayload {
  return {
    mode: payload.mode,
    messages: fitMessages(payload.messages),
    context: payload.context.slice(0, CHAT_LIMITS.contextSources).map((source) => ({
      id: truncateUnicode(source.id, CHAT_LIMITS.contextId),
      title: truncateUnicode(source.title, CHAT_LIMITS.contextTitle),
      url: truncateUnicode(source.url, CHAT_LIMITS.contextUrl),
      category: truncateUnicode(source.category, CHAT_LIMITS.contextCategory),
      excerpt: truncateUnicode(source.excerpt, CHAT_LIMITS.contextExcerpt),
    })),
    structuredFacts: fitOptional(payload.structuredFacts, CHAT_LIMITS.structuredFacts),
    currentPage: payload.currentPage
      ? {
          title: truncateUnicode(payload.currentPage.title, CHAT_LIMITS.currentPageTitle),
          url: truncateUnicode(payload.currentPage.url, CHAT_LIMITS.currentPageUrl),
          description: fitOptional(
            payload.currentPage.description,
            CHAT_LIMITS.currentPageDescription,
          ),
          category: fitOptional(payload.currentPage.category, CHAT_LIMITS.currentPageCategory),
          tags: payload.currentPage.tags
            ?.slice(0, CHAT_LIMITS.currentPageTags)
            .map((tag) => truncateUnicode(tag, CHAT_LIMITS.currentPageTag)),
          content: fitOptional(payload.currentPage.content, CHAT_LIMITS.currentPageContent),
          activeHeading: fitOptional(
            payload.currentPage.activeHeading,
            CHAT_LIMITS.currentPageActiveHeading,
          ),
          readingProgress: payload.currentPage.readingProgress,
        }
      : undefined,
    selection: payload.selection ? fitSelectionContext(payload.selection) : undefined,
  };
}
