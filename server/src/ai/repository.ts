import { randomUUID } from 'node:crypto';
import type { ChatMode } from '@lfw/contracts/ai';
import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import type { Database } from '../db/client.ts';
import {
  aiConversations,
  aiMessages,
  annotations,
  favorites,
  learningProgressDevices,
} from '../db/schema.ts';

export interface PrivateLearningContext {
  progress: Array<{
    articleSlug: string;
    maxProgress: number;
    readSeconds: number;
    listenSeconds: number;
  }>;
  annotations: Array<{ articleSlug: string; selectedText: string; note: string }>;
  favorites: string[];
}

export interface StartExchangeInput {
  userId: string;
  conversationId?: string;
  title: string;
  mode: ChatMode;
  userContent: string;
  privateLearningContext: boolean;
  sourceMetadata: unknown;
}

export interface AiRepository {
  readPrivateContext(userId: string, articleSlugs: string[]): Promise<PrivateLearningContext>;
  startExchange(input: StartExchangeInput): Promise<string>;
  finishExchange(conversationId: string, mode: ChatMode, assistantContent: string): Promise<void>;
}

export class ConversationAccessError extends Error {
  constructor() {
    super('Conversation is unavailable');
    this.name = 'ConversationAccessError';
  }
}

function truncate(value: string, length: number): string {
  return Array.from(value).slice(0, length).join('');
}

export function createAiRepository(database: Database): AiRepository {
  return {
    async readPrivateContext(userId, articleSlugs) {
      if (articleSlugs.length === 0) return { progress: [], annotations: [], favorites: [] };
      const slugs = articleSlugs.slice(0, 3);
      const [progressRows, annotationRows, favoriteRows] = await Promise.all([
        database
          .select({
            articleSlug: learningProgressDevices.articleSlug,
            maxProgress: sql<number>`max(${learningProgressDevices.maxProgress})`,
            readSeconds: sql<number>`sum(${learningProgressDevices.readSeconds})`,
            listenSeconds: sql<number>`sum(${learningProgressDevices.listenSeconds})`,
          })
          .from(learningProgressDevices)
          .where(
            and(
              eq(learningProgressDevices.userId, userId),
              inArray(learningProgressDevices.articleSlug, slugs),
            ),
          )
          .groupBy(learningProgressDevices.articleSlug)
          .limit(3),
        database
          .select({
            articleSlug: annotations.articleSlug,
            selectedText: annotations.selectedText,
            note: annotations.note,
          })
          .from(annotations)
          .where(
            and(
              eq(annotations.userId, userId),
              inArray(annotations.articleSlug, slugs),
              isNull(annotations.deletedAt),
            ),
          )
          .orderBy(desc(annotations.updatedAt))
          .limit(8),
        database
          .select({ articleSlug: favorites.articleSlug })
          .from(favorites)
          .where(
            and(
              eq(favorites.userId, userId),
              inArray(favorites.articleSlug, slugs),
              isNull(favorites.deletedAt),
            ),
          )
          .limit(3),
      ]);
      return {
        progress: progressRows.map((row) => ({
          articleSlug: row.articleSlug,
          maxProgress: Number(row.maxProgress),
          readSeconds: Number(row.readSeconds),
          listenSeconds: Number(row.listenSeconds),
        })),
        annotations: annotationRows.map((row) => ({
          articleSlug: row.articleSlug,
          selectedText: truncate(row.selectedText, 300),
          note: truncate(row.note, 500),
        })),
        favorites: favoriteRows.map((row) => row.articleSlug),
      };
    },

    async startExchange(input) {
      const conversationId = input.conversationId ?? randomUUID();
      await database.transaction(async (transaction) => {
        if (input.conversationId) {
          const existing = await transaction
            .select({ userId: aiConversations.userId })
            .from(aiConversations)
            .where(eq(aiConversations.id, input.conversationId))
            .limit(1);
          if (existing[0]?.userId !== input.userId) throw new ConversationAccessError();
        } else {
          await transaction.insert(aiConversations).values({
            id: conversationId,
            userId: input.userId,
            title: truncate(input.title, 255),
            privateLearningContext: input.privateLearningContext,
          });
        }
        await transaction.insert(aiMessages).values({
          id: randomUUID(),
          conversationId,
          role: 'user',
          content: input.userContent,
          mode: input.mode,
          sourceMetadata: input.sourceMetadata,
        });
        await transaction
          .update(aiConversations)
          .set({ updatedAt: new Date() })
          .where(
            and(eq(aiConversations.id, conversationId), eq(aiConversations.userId, input.userId)),
          );
      });
      return conversationId;
    },

    async finishExchange(conversationId, mode, assistantContent) {
      await database.transaction(async (transaction) => {
        await transaction.insert(aiMessages).values({
          id: randomUUID(),
          conversationId,
          role: 'assistant',
          content: truncate(assistantContent, 20_000),
          mode,
        });
        await transaction
          .update(aiConversations)
          .set({ updatedAt: new Date() })
          .where(eq(aiConversations.id, conversationId));
      });
    },
  };
}
