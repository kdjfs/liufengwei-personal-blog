import { AnthropicSSEDecoder } from '@/lib/ai/sse';
import type { ChatRequestPayload } from '@/lib/ai/types';

interface ErrorPayload {
  error?: {
    code?: string;
    message?: string;
  };
}

export class AIChatClientError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'AIChatClientError';
  }
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
): Promise<void> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    const body = await readError(response);
    throw new AIChatClientError(
      body.error?.code ?? (response.status === 404 ? 'ENDPOINT_UNAVAILABLE' : 'AI_REQUEST_FAILED'),
      response.status,
      body.error?.message ?? 'AI 服务暂时不可用',
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
}
