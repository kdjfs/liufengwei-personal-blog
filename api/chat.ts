import { createHash } from 'node:crypto';
import { ZodError } from 'zod';
import {
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
  fetchImpl: typeof fetch;
  rateLimiter: InMemoryRateLimiter;
  now: () => number;
}

interface ErrorBody {
  error: {
    code: string;
    message: string;
  };
}

function errorResponse(
  status: number,
  code: string,
  message: string,
  headers?: HeadersInit,
): Response {
  return Response.json({ error: { code, message } } satisfies ErrorBody, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    },
  });
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

  if (request.method !== 'POST') {
    return errorResponse(405, 'METHOD_NOT_ALLOWED', '仅支持 POST 请求', { Allow: 'POST' });
  }
  if (!isAllowedOrigin(request, environment)) {
    return errorResponse(403, 'ORIGIN_NOT_ALLOWED', '请求来源不受信任');
  }
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return errorResponse(415, 'UNSUPPORTED_MEDIA_TYPE', '请求必须使用 JSON');
  }

  const declaredLength = Number(request.headers.get('content-length') ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return errorResponse(413, 'PAYLOAD_TOO_LARGE', '请求内容过长');
  }

  const rate = rateLimiter.check(clientIdentifier(request), now());
  if (!rate.allowed) {
    return errorResponse(429, 'RATE_LIMITED', '请求过于频繁，请稍后再试', {
      ...rateHeaders(rate.limit, rate.remaining),
      'Retry-After': String(rate.retryAfterSeconds),
    });
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return errorResponse(400, 'INVALID_BODY', '无法读取请求内容');
  }
  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
    return errorResponse(413, 'PAYLOAD_TOO_LARGE', '请求内容过长');
  }

  let input: ReturnType<typeof parseChatRequest>;
  try {
    input = parseChatRequest(JSON.parse(rawBody) as unknown);
  } catch (error) {
    return errorResponse(
      error instanceof SyntaxError ? 400 : 422,
      error instanceof ZodError ? 'VALIDATION_ERROR' : 'INVALID_JSON',
      error instanceof ZodError ? '请求字段不符合约定' : 'JSON 格式无效',
      rateHeaders(rate.limit, rate.remaining),
    );
  }

  const apiKey = resolveApiKey(environment);
  if (!apiKey) {
    return errorResponse(503, 'AI_NOT_CONFIGURED', 'AI 服务尚未配置');
  }

  let endpoint: string;
  try {
    assertConfiguredModel(environment);
    endpoint = `${resolveBaseUrl(environment)}/v1/messages`;
  } catch {
    return errorResponse(503, 'AI_CONFIGURATION_ERROR', 'AI 服务配置无效');
  }

  if (activeStreams >= MAX_ACTIVE_STREAMS) {
    return errorResponse(503, 'AI_BUSY', 'AI 服务繁忙，请稍后再试', { 'Retry-After': '5' });
  }

  activeStreams += 1;
  const controller = new AbortController();
  const abortUpstream = () => controller.abort();
  request.signal.addEventListener('abort', abortUpstream, { once: true });
  const timeout = setTimeout(abortUpstream, UPSTREAM_TIMEOUT_MS);
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
  } catch {
    release();
    return errorResponse(
      controller.signal.aborted ? 504 : 502,
      controller.signal.aborted ? 'AI_TIMEOUT' : 'AI_UPSTREAM_UNAVAILABLE',
      controller.signal.aborted ? 'AI 响应超时，请重试' : 'AI 服务暂时不可用',
    );
  }

  if (!upstream.ok || !upstream.body) {
    release();
    if (upstream.status === 429) {
      return errorResponse(429, 'AI_BUSY', 'AI 服务繁忙，请稍后再试', {
        'Retry-After': upstream.headers.get('retry-after') ?? '10',
      });
    }
    if (upstream.status === 401 || upstream.status === 403) {
      return errorResponse(503, 'AI_AUTH_ERROR', 'AI 服务认证配置无效');
    }
    return errorResponse(502, 'AI_UPSTREAM_ERROR', 'AI 服务返回异常');
  }

  return new Response(proxyStream(upstream.body, release), {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Accel-Buffering': 'no',
      'X-Content-Type-Options': 'nosniff',
      ...rateHeaders(rate.limit, rate.remaining),
    },
  });
}

export default { fetch: handleChat };
