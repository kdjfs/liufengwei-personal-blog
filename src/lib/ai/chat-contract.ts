/**
 * Single Source of Truth for Chat API Contract.
 *
 * Both client (sendMessage) and server (parseChatRequest) MUST use these schemas.
 * Never hand-write a duplicate interface on the client side.
 */

import { z } from 'zod';

/* ------------------------------------------------------------------ */
/*  Shared Limits                                                     */
/* ------------------------------------------------------------------ */

export const AI_LIMITS = {
  message: 4000,
  selection: 3000,
  surrounding: 2000,
  headingId: 240,
  headingText: 500,
  articleSlug: 180,
  annotationNote: 10_000,
  pageContent: 8000,
  pageTitle: 180,
  pageUrl: 300,
  pageDescription: 300,
  pageCategory: 60,
  pageTag: 40,
  pageTags: 8,
  pageActiveHeading: 300,
  contextId: 160,
  contextTitle: 160,
  contextUrl: 300,
  contextCategory: 60,
  contextExcerpt: 1800,
  maxMessageChars: 16_000,
  maxMessages: 12,
  maxContext: 4,
  structuredFacts: 6000,
} as const;

/* ------------------------------------------------------------------ */
/*  Zod Schemas                                                       */
/* ------------------------------------------------------------------ */

export const messageSchema = z
  .object({
    role: z.enum(['user', 'assistant']),
    content: z.string().trim().min(1).max(AI_LIMITS.message),
  })
  .strict();

export const contextSchema = z
  .object({
    id: z.string().min(1).max(AI_LIMITS.contextId),
    title: z.string().min(1).max(AI_LIMITS.contextTitle),
    url: z
      .string()
      .regex(/^\/(?!\/)[^\s]*$/)
      .max(AI_LIMITS.contextUrl),
    category: z.string().min(1).max(AI_LIMITS.contextCategory),
    excerpt: z.string().trim().min(1).max(AI_LIMITS.contextExcerpt),
  })
  .strict();

export const currentPageSchema = z
  .object({
    title: z.string().min(1).max(AI_LIMITS.pageTitle),
    url: z
      .string()
      .regex(/^\/(?!\/)[^\s]*$/)
      .max(AI_LIMITS.pageUrl),
    description: z.string().max(AI_LIMITS.pageDescription).optional(),
    category: z.string().max(AI_LIMITS.pageCategory).optional(),
    tags: z.array(z.string().max(AI_LIMITS.pageTag)).max(AI_LIMITS.pageTags).optional(),
    content: z.string().max(AI_LIMITS.pageContent).optional(),
    activeHeading: z.string().max(AI_LIMITS.pageActiveHeading).optional(),
    readingProgress: z.number().min(0).max(100).optional(),
  })
  .strict();

export const selectionSchema = z
  .object({
    text: z.string().trim().min(1).max(AI_LIMITS.selection),
    headingId: z.string().max(AI_LIMITS.headingId).optional(),
    headingText: z.string().max(AI_LIMITS.headingText).optional(),
    surroundingText: z.string().max(AI_LIMITS.surrounding).optional(),
    articleSlug: z.string().max(AI_LIMITS.articleSlug).optional(),
    annotationNote: z.string().max(AI_LIMITS.annotationNote).optional(),
  })
  .strict();

export const chatRequestSchema = z
  .object({
    mode: z.enum(['fast', 'deep']).default('fast'),
    messages: z.array(messageSchema).min(1).max(AI_LIMITS.maxMessages),
    context: z.array(contextSchema).max(AI_LIMITS.maxContext).default([]),
    structuredFacts: z.string().trim().max(AI_LIMITS.structuredFacts).optional(),
    currentPage: currentPageSchema.optional(),
    selection: selectionSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    const messageChars = value.messages.reduce(
      (total, message) => total + message.content.length,
      0,
    );
    if (messageChars > AI_LIMITS.maxMessageChars) {
      context.addIssue({
        code: 'custom',
        message: 'Conversation is too long',
        path: ['messages'],
      });
    }
    if (value.messages.at(-1)?.role !== 'user') {
      context.addIssue({
        code: 'custom',
        message: 'Last message must be from the user',
        path: ['messages'],
      });
    }
  });

/* ------------------------------------------------------------------ */
/*  Inferred Types (use these everywhere)                             */
/* ------------------------------------------------------------------ */

export type ChatRequestPayload = z.infer<typeof chatRequestSchema>;
export type ChatMessageInput = z.infer<typeof messageSchema>;
export type ChatContextSource = z.infer<typeof contextSchema>;
export type CurrentPageContext = z.infer<typeof currentPageSchema>;
export type SelectionContext = z.infer<typeof selectionSchema>;

/* ------------------------------------------------------------------ */
/*  Unicode-safe truncate helpers                                     */
/* ------------------------------------------------------------------ */

export function truncateCodePoints(value: string, maxChars: number): string {
  return Array.from(value).slice(0, maxChars).join('');
}

export function utf16Len(value: string): number {
  return value.length;
}

/**
 * Sanitize a SelectionContext before sending.
 * Truncates fields to server limits using Unicode-safe code-point counting,
 * and strips undefined/empty-string values to keep payloads clean.
 */
export function normalizeSelectionContext(raw: Partial<SelectionContext>): SelectionContext {
  return {
    text: truncateCodePoints((raw.text ?? '').trim(), AI_LIMITS.selection),
    headingId: raw.headingId
      ? truncateCodePoints(raw.headingId, AI_LIMITS.headingId) || undefined
      : undefined,
    headingText: raw.headingText
      ? truncateCodePoints(raw.headingText, AI_LIMITS.headingText) || undefined
      : undefined,
    surroundingText: raw.surroundingText
      ? truncateCodePoints(raw.surroundingText, AI_LIMITS.surrounding) || undefined
      : undefined,
    articleSlug: raw.articleSlug
      ? truncateCodePoints(raw.articleSlug, AI_LIMITS.articleSlug) || undefined
      : undefined,
    annotationNote: raw.annotationNote
      ? truncateCodePoints(raw.annotationNote, AI_LIMITS.annotationNote) || undefined
      : undefined,
  };
}

/**
 * Sanitize the entire chat payload before sending.
 * Ensures all fields are within server limits.
 */
export function normalizeChatPayload(raw: {
  mode: ChatRequestPayload['mode'];
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  context?: Array<{ id: string; title: string; url: string; category: string; excerpt: string }>;
  structuredFacts?: string;
  currentPage?: Partial<CurrentPageContext>;
  selection?: Partial<SelectionContext>;
}): ChatRequestPayload {
  return {
    mode: raw.mode,
    messages: raw.messages.slice(-AI_LIMITS.maxMessages).map((m) => ({
      role: m.role,
      content: truncateCodePoints(m.content.trim(), AI_LIMITS.message),
    })),
    context: (raw.context ?? [])
      .slice(0, AI_LIMITS.maxContext)
      .map((c) => ({
        id: truncateCodePoints(c.id, AI_LIMITS.contextId),
        title: truncateCodePoints(c.title, AI_LIMITS.contextTitle),
        url: truncateCodePoints(c.url, AI_LIMITS.contextUrl),
        category: truncateCodePoints(c.category, AI_LIMITS.contextCategory),
        excerpt: truncateCodePoints(c.excerpt.trim(), AI_LIMITS.contextExcerpt),
      }))
      .filter((c) => c.id && c.title && c.url && c.category && c.excerpt),
    structuredFacts: raw.structuredFacts
      ? truncateCodePoints(raw.structuredFacts.trim(), AI_LIMITS.structuredFacts) || undefined
      : undefined,
    currentPage: raw.currentPage
      ? {
          title: truncateCodePoints(raw.currentPage.title ?? '', AI_LIMITS.pageTitle),
          url: truncateCodePoints(raw.currentPage.url ?? '', AI_LIMITS.pageUrl),
          description: raw.currentPage.description
            ? truncateCodePoints(raw.currentPage.description, AI_LIMITS.pageDescription) ||
              undefined
            : undefined,
          category: raw.currentPage.category
            ? truncateCodePoints(raw.currentPage.category, AI_LIMITS.pageCategory) || undefined
            : undefined,
          tags: raw.currentPage.tags
            ?.slice(0, AI_LIMITS.pageTags)
            .map((t) => truncateCodePoints(t, AI_LIMITS.pageTag)),
          content: raw.currentPage.content
            ? truncateCodePoints(raw.currentPage.content, AI_LIMITS.pageContent) || undefined
            : undefined,
          activeHeading: raw.currentPage.activeHeading
            ? truncateCodePoints(raw.currentPage.activeHeading, AI_LIMITS.pageActiveHeading) ||
              undefined
            : undefined,
          readingProgress: raw.currentPage.readingProgress,
        }
      : undefined,
    selection: raw.selection ? normalizeSelectionContext(raw.selection) : undefined,
  };
}

/* ------------------------------------------------------------------ */
/*  Validation error formatter                                        */
/* ------------------------------------------------------------------ */

export interface ValidationIssue {
  path: string;
  code: string;
  message: string;
  expected?: string;
}

export function formatZodIssues(error: z.ZodError): ValidationIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.join('.') || '(root)',
    code: issue.code,
    message: issue.message,
    expected:
      issue.code === 'too_big'
        ? `≤ ${(issue as { maximum?: number }).maximum}`
        : issue.code === 'too_small'
          ? `≥ ${(issue as { minimum?: number }).minimum}`
          : undefined,
  }));
}
