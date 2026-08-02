const LOCAL_AI_ENDPOINT = 'http://127.0.0.1:8787/api/chat';

export function resolveChatEndpoint(hostname: string): string {
  return hostname === 'localhost' || hostname === '127.0.0.1' ? LOCAL_AI_ENDPOINT : '/api/chat';
}
