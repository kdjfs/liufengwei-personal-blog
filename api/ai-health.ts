import type { IncomingMessage, ServerResponse } from 'node:http';
import { validateApiKeyValue } from './_chat-core.ts';
import { sendWebResponse } from './_vercel-node.ts';

export function handleAIHealth(environment: NodeJS.ProcessEnv = process.env): Response {
  const key = validateApiKeyValue(environment.DEEPSEEK_API_KEY);
  const configured =
    key.status === 'valid' &&
    (environment.DEEPSEEK_MODEL === undefined ||
      environment.DEEPSEEK_MODEL.trim() === 'deepseek-v4-pro');

  return Response.json(
    {
      ok: true,
      configured,
      model: 'deepseek-v4-pro',
      provider: 'DeepSeek',
      runtime: 'vercel',
    },
    {
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    },
  );
}

export default async function vercelAIHealthHandler(
  _request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  try {
    await sendWebResponse(handleAIHealth(), response);
  } catch {
    if (!response.headersSent) {
      response.statusCode = 500;
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
      response.end(JSON.stringify({ error: { code: 'AI_HEALTH_ERROR' } }));
    } else if (!response.destroyed) {
      response.end();
    }
  }
}
