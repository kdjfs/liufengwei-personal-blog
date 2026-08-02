import { validateApiKeyValue } from './_chat-core.ts';

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

export function GET(_request: Request): Response {
  return handleAIHealth();
}
