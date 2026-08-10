import { z } from 'zod';

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

function unicodeLength(value: string): number {
  return Array.from(value).length;
}

function boundedText(max: number, minimum = 0) {
  return z
    .string()
    .refine((value) => unicodeLength(value) >= minimum && unicodeLength(value) <= max);
}

const messageSchema = z
  .object({
    role: z.enum(['user', 'assistant']),
    content: boundedText(CHAT_LIMITS.messageContent, 1),
  })
  .strict();

const contextSchema = z
  .object({
    id: boundedText(CHAT_LIMITS.contextId, 1),
    title: boundedText(CHAT_LIMITS.contextTitle, 1),
    url: boundedText(CHAT_LIMITS.contextUrl, 1).regex(/^\/(?!\/)[^\s]*$/),
    category: boundedText(CHAT_LIMITS.contextCategory, 1),
    excerpt: boundedText(CHAT_LIMITS.contextExcerpt, 1),
  })
  .strict();

const currentPageSchema = z
  .object({
    title: boundedText(CHAT_LIMITS.currentPageTitle, 1),
    url: boundedText(CHAT_LIMITS.currentPageUrl, 1).regex(/^\/(?!\/)[^\s]*$/),
    description: boundedText(CHAT_LIMITS.currentPageDescription).optional(),
    category: boundedText(CHAT_LIMITS.currentPageCategory).optional(),
    tags: z
      .array(boundedText(CHAT_LIMITS.currentPageTag))
      .max(CHAT_LIMITS.currentPageTags)
      .optional(),
    content: boundedText(CHAT_LIMITS.currentPageContent).optional(),
    activeHeading: boundedText(CHAT_LIMITS.currentPageActiveHeading).optional(),
    readingProgress: z.number().min(0).max(100).optional(),
  })
  .strict();

const selectionSchema = z
  .object({
    text: boundedText(CHAT_LIMITS.selectionText, 1),
    headingId: boundedText(CHAT_LIMITS.selectionHeadingId).optional(),
    headingText: boundedText(CHAT_LIMITS.selectionHeadingText).optional(),
    surroundingText: boundedText(CHAT_LIMITS.selectionSurroundingText).optional(),
    articleSlug: boundedText(CHAT_LIMITS.selectionArticleSlug).optional(),
    annotationNote: boundedText(CHAT_LIMITS.annotationNote).optional(),
  })
  .strict();

const cloudOptionsSchema = z
  .object({
    persistConversation: z.boolean().optional(),
    conversationId: z.uuid().optional(),
    privateLearningContext: z.boolean().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.conversationId && value.persistConversation !== true) {
      context.addIssue({
        code: 'custom',
        path: ['conversationId'],
        message: 'Continuing a conversation requires persistence opt-in',
      });
    }
  });

export const aiChatRequestSchema = z
  .object({
    mode: z.enum(['fast', 'deep']).default('fast'),
    messages: z.array(messageSchema).min(1).max(CHAT_LIMITS.messages),
    context: z.array(contextSchema).max(CHAT_LIMITS.contextSources).default([]),
    structuredFacts: boundedText(CHAT_LIMITS.structuredFacts).optional(),
    currentPage: currentPageSchema.optional(),
    selection: selectionSchema.optional(),
    cloud: cloudOptionsSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    const messageCharacters = value.messages.reduce(
      (total, message) => total + unicodeLength(message.content),
      0,
    );
    if (messageCharacters > CHAT_LIMITS.totalMessageContent) {
      context.addIssue({ code: 'custom', path: ['messages'], message: 'Conversation is too long' });
    }
    if (value.messages.at(-1)?.role !== 'user') {
      context.addIssue({
        code: 'custom',
        path: ['messages'],
        message: 'Last message must be from the user',
      });
    }
  });

export type ChatRequestPayload = z.infer<typeof aiChatRequestSchema>;
export type ChatMode = ChatRequestPayload['mode'];
export type ChatMessageInput = ChatRequestPayload['messages'][number];
export type ChatContextSource = ChatRequestPayload['context'][number];
export type CurrentPageContext = NonNullable<ChatRequestPayload['currentPage']>;
export type SelectionContext = NonNullable<ChatRequestPayload['selection']>;
