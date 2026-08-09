import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { aiChatRequestSchema, type ChatRequestPayload } from '@lfw/contracts/ai';
import { fromNodeHeaders } from 'better-auth/node';
import type { FastifyInstance } from 'fastify';
import type { ServerConfig } from '../config.ts';
import {
  AiCoordinationUnavailableError,
  type AiCoordinator,
  type AiLease,
  type AiRateLimitResult,
} from './coordinator.ts';
import { type AiProvider, AiProviderError } from './provider.ts';
import {
  type AiRepository,
  ConversationAccessError,
  type PrivateLearningContext,
} from './repository.ts';

const STREAM_TIMEOUT_MS = 55_000;

export interface AiRouteOptions {
  coordinator: AiCoordinator;
  provider: AiProvider;
  repository: AiRepository;
  getUserId: (headers: Headers) => Promise<string | null>;
  streamTimeoutMs?: number;
}

function errorBody(requestId: string, code: string, message: string) {
  return { error: { code, message, requestId } };
}

function opaqueIdentifier(userId: string | null, address: string): string {
  return createHash('sha256')
    .update(userId ? `user:${userId}` : `anonymous:${address}`)
    .digest('hex')
    .slice(0, 32);
}

function relevantArticleSlugs(input: ChatRequestPayload): string[] {
  const candidates = [
    input.selection?.articleSlug,
    ...input.context.map((source) => source.id),
    input.currentPage?.url.split('/').filter(Boolean).at(-1),
  ];
  return [...new Set(candidates.filter((value): value is string => Boolean(value)))]
    .filter((value) => /^[a-z0-9][a-z0-9_-]{0,159}$/i.test(value))
    .slice(0, 3);
}

class AnthropicTextCollector {
  private buffer = '';
  private content = '';

  push(chunk: string): void {
    this.buffer += chunk;
    const events = this.buffer.split(/\r?\n\r?\n/);
    this.buffer = events.pop() ?? '';
    for (const event of events) {
      for (const line of event.split(/\r?\n/)) {
        if (!line.startsWith('data:')) continue;
        try {
          const value = JSON.parse(line.slice(5).trim()) as {
            delta?: { type?: unknown; text?: unknown };
          };
          if (value.delta?.type === 'text_delta' && typeof value.delta.text === 'string') {
            this.content = Array.from(this.content + value.delta.text)
              .slice(0, 20_000)
              .join('');
          }
        } catch {
          // Provider heartbeats and non-JSON SSE events carry no assistant text.
        }
      }
    }
  }

  result(): string {
    return this.content;
  }
}

function proxyStream(
  body: ReadableStream<Uint8Array>,
  onFinished: (assistantContent: string, completed: boolean) => Promise<void>,
): ReadableStream<Uint8Array> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const collector = new AnthropicTextCollector();
  let finished = false;
  async function finish(completed: boolean) {
    if (finished) return;
    finished = true;
    collector.push(`${decoder.decode()}\n\n`);
    await onFinished(collector.result(), completed);
  }
  return new ReadableStream({
    async pull(controller) {
      try {
        const result = await reader.read();
        if (result.done) {
          await finish(true);
          controller.close();
          return;
        }
        collector.push(decoder.decode(result.value, { stream: true }));
        controller.enqueue(result.value);
      } catch (error) {
        await finish(false);
        controller.error(error);
      }
    },
    async cancel(reason) {
      try {
        await reader.cancel(reason);
      } finally {
        await finish(false);
      }
    },
  });
}

export function registerAiRoutes(
  app: FastifyInstance,
  options: AiRouteOptions,
  config: ServerConfig,
): void {
  app.post('/api/v1/ai/chat', async (request, reply) => {
    if (
      request.headers.origin !== config.webOrigin ||
      request.headers['sec-fetch-site'] === 'cross-site'
    ) {
      return reply
        .status(403)
        .send(errorBody(request.id, 'ORIGIN_FORBIDDEN', 'Request origin is not allowed'));
    }

    const parsed = aiChatRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send(errorBody(request.id, 'VALIDATION_ERROR', 'Request fields are invalid'));
    }
    const input = parsed.data;
    const userId =
      request.headers.cookie || input.cloud
        ? await options.getUserId(fromNodeHeaders(request.headers))
        : null;
    if (input.cloud && !userId) {
      return reply
        .status(401)
        .send(errorBody(request.id, 'UNAUTHORIZED', 'Cloud AI options require authentication'));
    }

    const identifier = opaqueIdentifier(userId, request.ip);
    let rate: AiRateLimitResult;
    try {
      rate = await options.coordinator.checkRateLimit(identifier);
    } catch (error) {
      if (!(error instanceof AiCoordinationUnavailableError)) throw error;
      return reply
        .status(503)
        .header('Retry-After', '5')
        .send(errorBody(request.id, 'AI_COORDINATION_UNAVAILABLE', 'AI 服务暂时不可用'));
    }
    reply.header('X-RateLimit-Limit', String(rate.limit));
    reply.header('X-RateLimit-Remaining', String(rate.remaining));
    if (!rate.allowed) {
      return reply
        .status(429)
        .header('Retry-After', String(rate.retryAfterSeconds))
        .send(errorBody(request.id, 'RATE_LIMITED', '请求过于频繁，请稍后再试'));
    }

    let privateContext: PrivateLearningContext | null = null;
    if (userId && input.cloud?.privateLearningContext === true) {
      privateContext = await options.repository.readPrivateContext(
        userId,
        relevantArticleSlugs(input),
      );
    }

    let lease: AiLease | null;
    try {
      lease = await options.coordinator.acquireLease(identifier);
    } catch (error) {
      if (!(error instanceof AiCoordinationUnavailableError)) throw error;
      return reply
        .status(503)
        .header('Retry-After', '5')
        .send(errorBody(request.id, 'AI_COORDINATION_UNAVAILABLE', 'AI 服务暂时不可用'));
    }
    if (!lease) {
      return reply
        .status(503)
        .header('Retry-After', '5')
        .send(errorBody(request.id, 'AI_BUSY', 'AI 服务繁忙，请稍后再试'));
    }

    const controller = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, options.streamTimeoutMs ?? STREAM_TIMEOUT_MS);
    const abort = () => controller.abort();
    request.raw.once('aborted', abort);
    let conversationId: string | undefined;
    let upstream: Response | undefined;
    try {
      upstream = await options.provider.openStream(input, privateContext, controller.signal);
      if (userId && input.cloud?.persistConversation === true) {
        const userMessage = input.messages.at(-1)?.content ?? '';
        conversationId = await options.repository.startExchange({
          userId,
          conversationId: input.cloud.conversationId,
          title: userMessage,
          mode: input.mode,
          userContent: userMessage,
          privateLearningContext: input.cloud.privateLearningContext === true,
          sourceMetadata: {
            articleSlugs: relevantArticleSlugs(input),
            sourceIds: input.context.map((source) => source.id),
          },
        });
      }

      const stream = proxyStream(
        upstream.body as ReadableStream<Uint8Array>,
        async (content, completed) => {
          clearTimeout(timeout);
          request.raw.removeListener('aborted', abort);
          await lease.release();
          if (completed && conversationId && content) {
            try {
              await options.repository.finishExchange(conversationId, input.mode, content);
            } catch {
              request.log.error(
                { event: 'ai_conversation_persistence_failed' },
                'AI persistence failed',
              );
            }
          }
        },
      );
      reply
        .header('Content-Type', 'text/event-stream; charset=utf-8')
        .header('Cache-Control', 'no-cache, no-store, must-revalidate')
        .header('X-Accel-Buffering', 'no')
        .header('X-Content-Type-Options', 'nosniff');
      if (conversationId) reply.header('X-LFW-Conversation-Id', conversationId);
      return reply.send(Readable.fromWeb(stream as never));
    } catch (error) {
      clearTimeout(timeout);
      request.raw.removeListener('aborted', abort);
      await lease.release();
      try {
        await upstream?.body?.cancel();
      } catch {
        // The provider stream is already being abandoned.
      }
      if (error instanceof ConversationAccessError) {
        return reply
          .status(404)
          .send(errorBody(request.id, 'CONVERSATION_NOT_FOUND', 'Conversation is unavailable'));
      }
      if (error instanceof AiProviderError) {
        if (error.retryAfter) reply.header('Retry-After', error.retryAfter);
        return reply.status(error.status).send(errorBody(request.id, error.code, error.message));
      }
      if (timedOut) {
        return reply.status(504).send(errorBody(request.id, 'AI_TIMEOUT', 'AI 响应超时，请重试'));
      }
      throw error;
    }
  });
}
