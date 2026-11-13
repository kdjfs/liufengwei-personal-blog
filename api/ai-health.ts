import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * 健康检查必须零本地依赖：Vercel 会把这个文件单独编译成函数，
 * 引用 `./_chat-core.ts` 这类带扩展名的 TS 模块会在运行时解析失败。
 */
const PRIMARY_MODEL = 'deepseek-v4-pro';
const ALLOWED_MODELS = new Set<string>([PRIMARY_MODEL, 'deepseek-flash']);

function isConfigured(environment: NodeJS.ProcessEnv): boolean {
  const key = environment.DEEPSEEK_API_KEY?.trim() ?? '';
  if (!key || key.toLowerCase().replace(/[\s_-]+/g, '-') === 'replace-me') return false;
  if ([...key].some((character) => character.charCodeAt(0) < 33 || character.charCodeAt(0) > 126)) {
    return false;
  }
  return true;
}

function resolveModel(environment: NodeJS.ProcessEnv): string {
  return environment.DEEPSEEK_MODEL?.trim() || PRIMARY_MODEL;
}

function resolveFallbackModelSafely(
  environment: NodeJS.ProcessEnv,
  primary: string,
): string | null {
  const configured = environment.DEEPSEEK_FALLBACK_MODEL?.trim();
  if (!configured) return null;
  if (!ALLOWED_MODELS.has(configured)) return null;
  return configured === primary ? null : configured;
}

export function healthPayload(environment: NodeJS.ProcessEnv = process.env) {
  const model = resolveModel(environment);
  return {
    ok: true,
    configured: isConfigured(environment),
    model,
    fallbackModel: resolveFallbackModelSafely(environment, model),
    provider: 'DeepSeek',
    runtime: 'vercel',
  } as const;
}

export default async function vercelAIHealthHandler(
  _request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  response.statusCode = 200;
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-LFW-AI-Health-Version', '4');
  response.end(JSON.stringify(healthPayload()));
}
