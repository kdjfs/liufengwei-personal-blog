import { once } from 'node:events';
import type { IncomingMessage, ServerResponse } from 'node:http';

const MAX_VERCEL_REQUEST_BYTES = 4_500_000;

function firstHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value?.split(',')[0]?.trim();
}

async function readBody(request: IncomingMessage): Promise<Uint8Array | undefined> {
  if (request.method === 'GET' || request.method === 'HEAD') return undefined;

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  for await (const chunk of request) {
    const bytes = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
    totalBytes += bytes.byteLength;
    if (totalBytes > MAX_VERCEL_REQUEST_BYTES) {
      throw new RangeError('Vercel request body exceeds the platform limit');
    }
    chunks.push(bytes);
  }
  return totalBytes > 0 ? Buffer.concat(chunks, totalBytes) : undefined;
}

export async function toWebRequest(
  request: IncomingMessage,
  signal?: AbortSignal,
): Promise<Request> {
  const encrypted = Boolean(
    (request.socket as typeof request.socket & { encrypted?: boolean }).encrypted,
  );
  const protocol =
    firstHeader(request.headers['x-forwarded-proto']) ?? (encrypted ? 'https' : 'http');
  const host = firstHeader(request.headers.host) ?? 'localhost';
  const url = new URL(request.url ?? '/', `${protocol}://${host}`);
  const headers = new Headers();

  for (const [name, value] of Object.entries(request.headers)) {
    if (Array.isArray(value)) {
      for (const item of value) headers.append(name, item);
    } else if (value !== undefined) {
      headers.set(name, value);
    }
  }

  const body = await readBody(request);
  if (body && !headers.has('content-length'))
    headers.set('content-length', String(body.byteLength));
  const requestBody = body ? new Uint8Array(body).buffer : undefined;

  return new Request(url, {
    method: request.method ?? 'GET',
    headers,
    body: requestBody,
    signal,
  });
}

export async function sendWebResponse(
  webResponse: Response,
  response: ServerResponse,
): Promise<void> {
  response.statusCode = webResponse.status;
  webResponse.headers.forEach((value, name) => {
    response.setHeader(name, value);
  });

  if (!webResponse.body) {
    response.end();
    return;
  }

  const reader = webResponse.body.getReader();
  try {
    while (!response.destroyed) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!response.write(Buffer.from(value))) await once(response, 'drain');
    }
  } finally {
    if (response.destroyed) await reader.cancel().catch(() => undefined);
  }

  if (!response.destroyed) response.end();
}
