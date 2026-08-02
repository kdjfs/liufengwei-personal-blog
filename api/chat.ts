import { createHash, randomUUID as createRandomUUID } from 'node:crypto';
import { ZodError } from 'zod';
import {
  AIConfigurationError,
  assertConfiguredModel,
  buildDeepSeekRequest,
  parseChatRequest,
  resolveApiKey,
  resolveBaseUrl,
} from './_chat-core.ts';
import { InMemoryRateLimiter } from './_rate-limit.ts';

const MAX_BODY_BYTES = 64 * 1024;
const MAX_ACTIVE_STREAMS = 4;
const UPSTREAM_TIMEOUT_MS = 55_000;

const defaultRateLimiter = new InMemoryRateLimiter({
  limit: 12,
  windowMs: 10 * 60 * 1000,
});

let activeStreams = 0;

export interface ChatHandlerDependencies {
  environment: NodeJS.ProcessEnv;
  fetchImpl: typeof globalThis.fetch;
  rateLimiter: InMemoryRateLimiter;
  now: () => number;
  randomUUID: () => string;
  logger: Pick<Console, 'info' | 'error'>;
  upstreamTimeoutMs: number;
}

interface ErrorBody {
  error: {
    code: string;
    message: string;
    requestId: string;
    upstreamStatus?: number;
    upstreamMessage?: string;
  };
}

function errorResponse(
  requestId: string,
  status: number,
  code: string,
  message: string,
  headers?: HeadersInit,
  diagnostics?: { upstreamStatus: number; upstreamMessage?: string },
): Response {
  return Response.json(
    {
      error: {
        code,
        message,
        requestId,
        ...diagnostics,
      },
    } satisfies ErrorBody,
    {
      status,
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'X-LFW-AI-Request-Id': requestId,
        ...headers,
      },
    },
  );
}

function isDevelopment(environment: NodeJS.ProcessEnv): boolean {
  return (
    environment.LFW_AI_LOCAL === '1' ||
    (!environment.VERCEL && environment.NODE_ENV !== 'production')
  );
}

function safeErrorMessage(error: unknown): string {
  const value = error instanceof Error ? error.message : String(error);
  return value
    .replace(/sk-[A-Za-z0-9_-]+/gi, '[REDACTED]')
    .replace(/[\r\n]+/g, ' ')
    .slice(0, 240);
}

async function readSafeUpstreamMessage(response: Response): Promise<string | undefined> {
  try {
    const raw = (await response.text()).slice(0, 8_192);
    const body = JSON.parse(raw) as { error?: { message?: unknown }; message?: unknown };
    const message = body.error?.message ?? body.message;
    return typeof message === 'string' ? safeErrorMessage(message) : undefined;
  } catch {
    return undefined;
  }
}

function mapUpstreamError(status: number): { status: number; code: string; message: string } {
  if (status === 400 || status === 422) {
    return { status: 502, code: 'AI_BAD_REQUEST', message: 'AI 请求格式未被服务接受' };
  }
  if (status === 401 || status === 403) {
    return { status: 503, code: 'AI_AUTH_ERROR', message: 'AI 服务认证配置无效' };
  }
  if (status === 404) {
    return { status: 502, code: 'AI_ENDPOINT_ERROR', message: 'AI 服务地址配置无效' };
  }
  if (status === 429) {
    return { status: 429, code: 'AI_BUSY', message: 'AI 服务繁忙，请稍后再试' };
  }
  return { status: 502, code: 'AI_UPSTREAM_ERROR', message: 'AI 上游服务返回异常' };
}

function isAllowedOrigin(request: Request, environment: NodeJS.ProcessEnv): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;

  const allowed = new Set<string>([new URL(request.url).origin]);
  const candidates = [
    environment.SITE_URL,
    environment.VERCEL_URL ? `https://${environment.VERCEL_URL}` : undefined,
    environment.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${environment.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      allowed.add(new URL(candidate).origin);
    } catch {
      // A malformed server environment value is ignored instead of widening CORS.
    }
  }

  return allowed.has(origin);
}

function clientIdentifier(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const address = forwarded || request.headers.get('x-real-ip')?.trim() || 'unknown';
  return createHash('sha256').update(address).digest('hex').slice(0, 24);
}

function rateHeaders(limit: number, remaining: number): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(remaining),
  };
}

function proxyStream(
  body: ReadableStream<Uint8Array>,
  onFinished: () => void,
): ReadableStream<Uint8Array> {
  const reader = body.getReader();
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    onFinished();
  };

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const result = await reader.read();
        if (result.done) {
          finish();
          controller.close();
          return;
        }
        controller.enqueue(result.value);
      } catch (error) {
        finish();
        controller.error(error);
      }
    },
    async cancel(reason) {
      try {
        await reader.cancel(reason);
      } finally {
        finish();
      }
    },
  });
}

export async function handleChat(
  request: Request,
  dependencies: Partial<ChatHandlerDependencies> = {},
): Promise<Response> {
  const environment = dependencies.environment ?? process.env;
  const fetchImpl = dependencies.fetchImpl ?? globalThis.fetch;
  const rateLimiter = dependencies.rateLimiter ?? defaultRateLimiter;
  const now = dependencies.now ?? Date.now;
  const randomUUID = dependencies.randomUUID ?? createRandomUUID;
  const logger = dependencies.logger ?? console;
  const upstreamTimeoutMs = dependencies.upstreamTimeoutMs ?? UPSTREAM_TIMEOUT_MS;
  const requestId = randomUUID();
  const startedAt = now();

  if (request.method !== 'POST') {
    return errorResponse(requestId, 405, 'METHOD_NOT_ALLOWED', '仅支持 POST 请求', {
      Allow: 'POST',
    });
  }
  if (!isAllowedOrigin(request, environment)) {
    return errorResponse(requestId, 403, 'ORIGIN_NOT_ALLOWED', '请求来源不受信任');
  }
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return errorResponse(requestId, 415, 'UNSUPPORTED_MEDIA_TYPE', '请求必须使用 JSON');
  }

  const declaredLength = Number(request.headers.get('content-length') ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return errorResponse(requestId, 413, 'PAYLOAD_TOO_LARGE', '请求内容过长');
  }

  const rate = rateLimiter.check(clientIdentifier(request), now());
  if (!rate.allowed) {
    return errorResponse(requestId, 429, 'RATE_LIMITED', '请求过于频繁，请稍后再试', {
      ...rateHeaders(rate.limit, rate.remaining),
      'Retry-After': String(rate.retryAfterSeconds),
    });
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return errorResponse(requestId, 400, 'INVALID_BODY', '无法读取请求内容');
  }
  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
    return errorResponse(requestId, 413, 'PAYLOAD_TOO_LARGE', '请求内容过长');
  }

  let input: ReturnType<typeof parseChatRequest>;
  try {
    input = parseChatRequest(JSON.parse(rawBody) as unknown);
  } catch (error) {
    return errorResponse(
      requestId,
      error instanceof SyntaxError ? 400 : 422,
      error instanceof ZodError ? 'VALIDATION_ERROR' : 'INVALID_JSON',
      error instanceof ZodError ? '请求字段不符合约定' : 'JSON 格式无效',
      rateHeaders(rate.limit, rate.remaining),
    );
  }

  let apiKey: string | undefined;
  try {
    apiKey = resolveApiKey(environment);
  } catch (error) {
    logger.error('[LFW AI]', {
      requestId,
      event: 'configuration_error',
      model: 'deepseek-v4-pro',
      baseHost: 'api.deepseek.com',
      durationMs: now() - startedAt,
      errorName: error instanceof Error ? error.name : 'Error',
      errorCode: 'INVALID_API_KEY_CHARACTERS',
    });
    return errorResponse(
      requestId,
      503,
      'AI_CONFIGURATION_ERROR',
      'API Key 包含非法字符，请重新复制 DeepSeek API Key。',
    );
  }
  if (!apiKey) {
    return errorResponse(requestId, 503, 'AI_NOT_CONFIGURED', 'AI 服务尚未配置');
  }

  let endpoint: string;
  try {
    assertConfiguredModel(environment);
    endpoint = `${resolveBaseUrl(environment)}/v1/messages`;
  } catch (error) {
    logger.error('[LFW AI]', {
      requestId,
      event: 'configuration_error',
      model: 'deepseek-v4-pro',
      baseHost: 'api.deepseek.com',
      durationMs: now() - startedAt,
      errorName: error instanceof Error ? error.name : 'Error',
      errorCode:
        error instanceof AIConfigurationError ? 'INVALID_API_KEY' : 'INVALID_PROVIDER_CONFIG',
    });
    return errorResponse(requestId, 503, 'AI_CONFIGURATION_ERROR', 'AI 服务配置无效');
  }

  if (activeStreams >= MAX_ACTIVE_STREAMS) {
    return errorResponse(requestId, 503, 'AI_BUSY', 'AI 服务繁忙，请稍后再试', {
      'Retry-After': '5',
    });
  }

  activeStreams += 1;
  const controller = new AbortController();
  const abortUpstream = () => controller.abort();
  request.signal.addEventListener('abort', abortUpstream, { once: true });
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    abortUpstream();
  }, upstreamTimeoutMs);
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    clearTimeout(timeout);
    request.signal.removeEventListener('abort', abortUpstream);
    activeStreams = Math.max(0, activeStreams - 1);
  };

  let upstream: Response;
  try {
    upstream = await fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        'x-api-key': apiKey,
      },
      body: JSON.stringify(buildDeepSeekRequest(input)),
      signal: controller.signal,
    });
  } catch (error) {
    release();
    const message = safeErrorMessage(error);
    const byteStringError = /bytestring/i.test(message);
    const timeoutError = timedOut || (error instanceof DOMException && error.name === 'AbortError');
    const code = byteStringError
      ? 'AI_CONFIGURATION_ERROR'
      : timeoutError
        ? 'AI_TIMEOUT'
        : 'AI_UPSTREAM_UNAVAILABLE';
    logger.error('[LFW AI]', {
      requestId,
      event: 'upstream_fetch_error',
      model: 'deepseek-v4-pro',
      baseHost: 'api.deepseek.com',
      durationMs: now() - startedAt,
      errorName: error instanceof Error ? error.name : 'Error',
      errorCode: code,
      message,
    });
    return errorResponse(
      requestId,
      byteStringError ? 503 : timeoutError ? 504 : 502,
      code,
      byteStringError
        ? 'API Key 包含非法字符，请重新复制 DeepSeek API Key。'
        : timeoutError
          ? 'AI 响应超时，请重试'
          : 'AI 上游服务暂时不可用',
    );
  }

  const validStream = upstream.headers.get('content-type')?.includes('text/event-stream');
  if (!upstream.ok || !upstream.body || !validStream) {
    release();
    const mapped = mapUpstreamError(upstream.status);
    const development = isDevelopment(environment);
    const upstreamMessage = development ? await readSafeUpstreamMessage(upstream) : undefined;
    if (!development) {
      try {
        await upstream.body?.cancel();
      } catch {
        // The upstream error body is intentionally discarded in production.
      }
    }
    logger.error('[LFW AI]', {
      requestId,
      event: 'upstream_error',
      status: upstream.status,
      model: 'deepseek-v4-pro',
      baseHost: 'api.deepseek.com',
      durationMs: now() - startedAt,
      errorName: 'DeepSeekHTTPError',
      errorCode: mapped.code,
    });
    return errorResponse(
      requestId,
      mapped.status,
      mapped.code,
      mapped.message,
      upstream.status === 429
        ? { 'Retry-After': upstream.headers.get('retry-after') ?? '10' }
        : undefined,
      development ? { upstreamStatus: upstream.status, upstreamMessage } : undefined,
    );
  }

  return new Response(proxyStream(upstream.body, release), {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Accel-Buffering': 'no',
      'X-Content-Type-Options': 'nosniff',
      'X-LFW-AI-Request-Id': requestId,
      ...rateHeaders(rate.limit, rate.remaining),
    },
  });
}

// Vercel detects Web API handlers from named `fetch`/HTTP method exports.
// A default `{ fetch }` object is a Cloudflare Worker shape and is not callable
// by the Vercel Node runtime.
export const fetch = handleChat;
