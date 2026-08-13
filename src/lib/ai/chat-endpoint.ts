import { normalizeApiOrigin } from '../cloud/config.ts';

const LOCAL_AI_ENDPOINT = 'http://127.0.0.1:8787/api/chat';

export type AiEndpointMode = 'auto' | 'local' | 'cloud';

export function resolveChatEndpoint(
  hostname: string,
  configuredOrigin?: string,
  mode: AiEndpointMode = 'auto',
): string {
  if (mode === 'local') return LOCAL_AI_ENDPOINT;
  const origin = normalizeApiOrigin(configuredOrigin);
  if (origin) return new URL('/api/v1/ai/chat', origin).href;
  return hostname === 'localhost' || hostname === '127.0.0.1' ? LOCAL_AI_ENDPOINT : '/api/chat';
}
