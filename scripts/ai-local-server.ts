import { existsSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { resolve } from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { validateApiKeyValue } from '../api/_chat-core.ts';
import { handleChat } from '../api/_chat-handler.ts';

const HOST = '127.0.0.1';
const PORT = 8787;
const LOCAL_ORIGINS = new Set(['http://localhost:4321', 'http://127.0.0.1:4321']);

export function isAllowedLocalOrigin(origin: string | undefined): origin is string {
  return origin !== undefined && LOCAL_ORIGINS.has(origin);
}

function safeMessage(error: unknown): string {
  return (error instanceof Error ? error.message : String(error))
    .replace(/sk-[A-Za-z0-9_-]+/gi, '[REDACTED]')
    .replace(/[\r\n]+/g, ' ')
    .slice(0, 240);
}

function loadLocalEnvironment(): NodeJS.ProcessEnv {
  const envFile = resolve('.env.local');
  if (!existsSync(envFile)) throw new Error('[LFW AI] 未找到 .env.local');
  process.loadEnvFile(envFile);

  const key = validateApiKeyValue(process.env.DEEPSEEK_API_KEY);
  if (key.status === 'missing' || key.status === 'placeholder') {
    throw new Error('[LFW AI] DEEPSEEK_API_KEY 未配置');
  }
  if (key.status === 'invalid') {
    throw new Error('[LFW AI] API Key 包含非法字符，请重新复制 DeepSeek API Key。');
  }
  return process.env;
}

function writeJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(JSON.stringify(body));
}

async function readBody(request: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function appendRequestHeaders(request: IncomingMessage, headers: Headers): void {
  for (const [name, value] of Object.entries(request.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) headers.append(name, item);
    } else {
      headers.set(name, value);
    }
  }
  headers.set('x-real-ip', request.socket.remoteAddress ?? '127.0.0.1');
}

async function relayResponse(
  upstream: Response,
  response: ServerResponse,
  origin: string,
): Promise<void> {
  const headers: Record<string, string> = {};
  upstream.headers.forEach((value, name) => {
    headers[name] = value;
  });
  headers['access-control-allow-origin'] = origin;
  headers.vary = headers.vary ? `${headers.vary}, Origin` : 'Origin';
  response.writeHead(upstream.status, headers);

  if (!upstream.body) {
    response.end();
    return;
  }
  for await (const chunk of upstream.body) response.write(Buffer.from(chunk));
  response.end();
}

export function createLocalAiServer(environment: NodeJS.ProcessEnv = process.env) {
  return createServer(async (request, response) => {
    const origin = request.headers.origin;
    if (!isAllowedLocalOrigin(origin)) {
      writeJson(response, 403, { error: { code: 'ORIGIN_NOT_ALLOWED' } });
      return;
    }

    if (request.method === 'OPTIONS') {
      response.writeHead(204, {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '600',
        Vary: 'Origin',
      });
      response.end();
      return;
    }

    const url = new URL(request.url ?? '/', `http://${HOST}:${PORT}`);
    if (url.pathname !== '/api/chat') {
      writeJson(response, 404, { error: { code: 'NOT_FOUND' } });
      return;
    }

    try {
      const headers = new Headers();
      appendRequestHeaders(request, headers);
      const controller = new AbortController();
      request.once('aborted', () => controller.abort());
      response.once('close', () => controller.abort());
      const body = Uint8Array.from(await readBody(request));
      const webRequest = new Request(url, {
        method: request.method,
        headers,
        body,
        signal: controller.signal,
      });
      const result = await handleChat(webRequest, {
        environment: {
          ...environment,
          SITE_URL: origin,
          LFW_AI_LOCAL: '1',
          VERCEL: '',
        },
      });
      await relayResponse(result, response, origin);
    } catch (error) {
      console.error('[LFW AI]', {
        event: 'local_gateway_error',
        errorName: error instanceof Error ? error.name : 'Error',
        message: safeMessage(error),
      });
      if (!response.headersSent) {
        writeJson(response, 500, { error: { code: 'LOCAL_GATEWAY_ERROR' } });
      } else {
        response.destroy();
      }
    }
  });
}

export function startLocalAiServer() {
  const environment = loadLocalEnvironment();
  const server = createLocalAiServer(environment);
  server.on('error', (error: NodeJS.ErrnoException) => {
    const message = error.code === 'EADDRINUSE' ? `端口 ${PORT} 已被占用` : safeMessage(error);
    console.error(`[LFW AI] Local Gateway 启动失败：${message}`);
    process.exitCode = 1;
  });
  server.listen(PORT, HOST, () => {
    console.log(`[LFW AI] Local Gateway 已启动：http://${HOST}:${PORT}/api/chat`);
    console.log('[LFW AI] DeepSeek 配置：configured · deepseek-v4-pro');
  });
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, () => server.close(() => process.exit(0)));
  }
  return server;
}

const entry = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : '';
if (import.meta.url === entry) {
  try {
    startLocalAiServer();
  } catch (error) {
    console.error(safeMessage(error));
    process.exitCode = 1;
  }
}
