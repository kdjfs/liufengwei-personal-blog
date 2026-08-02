import type { IncomingMessage, ServerResponse } from 'node:http';

function isConfigured(environment: NodeJS.ProcessEnv): boolean {
  const key = environment.DEEPSEEK_API_KEY?.trim() ?? '';
  if (!key || key.toLowerCase().replace(/[\s_-]+/g, '-') === 'replace-me') return false;
  if ([...key].some((character) => character.charCodeAt(0) < 33 || character.charCodeAt(0) > 126)) {
    return false;
  }
  return (
    environment.DEEPSEEK_MODEL === undefined ||
    environment.DEEPSEEK_MODEL.trim() === 'deepseek-v4-pro'
  );
}

export function healthPayload(environment: NodeJS.ProcessEnv = process.env) {
  return {
    ok: true,
    configured: isConfigured(environment),
    model: 'deepseek-v4-pro',
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
  response.setHeader('X-LFW-AI-Health-Version', '2');
  response.end(JSON.stringify(healthPayload()));
}
