import { resolveChatEndpoint } from '@/lib/ai/chat-endpoint';
import { AnthropicSSEDecoder } from '@/lib/ai/sse';
import type { ChatRequestPayload } from '@/lib/ai/types';

interface ErrorPayload {
  error?: {
    code?: string;
    message?: string;
    requestId?: string;
  };
}

export class AIChatClientError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = 'AIChatClientError';
  }
}

export interface AIStreamResult {
  conversationId?: string;
}

async function readError(response: Response): Promise<ErrorPayload> {
  try {
    return (await response.json()) as ErrorPayload;
  } catch {
    return {};
  }
}

export async function streamAIResponse(
  payload: ChatRequestPayload,
  onDelta: (delta: string) => void,
  signal: AbortSignal,
): Promise<AIStreamResult> {
  let response: Response;
  try {
    response = await fetch(
      resolveChatEndpoint(
        window.location.hostname,
        import.meta.env.PUBLIC_AI_API_URL,
        import.meta.env.DEV && import.meta.env.PUBLIC_LFW_AI_MODE === 'local' ? 'local' : 'auto',
      ),
      {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal,
      },
    );
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new AIChatClientError('ENDPOINT_UNAVAILABLE', 0, '完整 AI 联调请运行 pnpm dev:ai');
  }

  if (!response.ok) {
    const body = await readError(response);
    throw new AIChatClientError(
      body.error?.code ?? (response.status === 404 ? 'ENDPOINT_UNAVAILABLE' : 'AI_REQUEST_FAILED'),
      response.status,
      body.error?.message ?? 'AI 服务暂时不可用',
      body.error?.requestId,
    );
  }

  if (!response.body || !response.headers.get('content-type')?.includes('text/event-stream')) {
    throw new AIChatClientError('INVALID_STREAM', response.status, 'AI 返回了无效响应');
  }

  const reader = response.body.getReader();
  const textDecoder = new TextDecoder();
  const eventDecoder = new AnthropicSSEDecoder();

  while (true) {
    const result = await reader.read();
    if (result.done) break;
    for (const delta of eventDecoder.push(textDecoder.decode(result.value, { stream: true }))) {
      onDelta(delta);
    }
  }

  for (const delta of eventDecoder.push(textDecoder.decode())) onDelta(delta);
  return { conversationId: response.headers.get('x-lfw-conversation-id') ?? undefined };
}
