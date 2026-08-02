import assert from 'node:assert/strict';
import { createServer, type RequestListener } from 'node:http';
import test from 'node:test';
import vercelHealth from '../../api/ai-health.ts';
import vercelChat from '../../api/chat.ts';

async function withServer(listener: RequestListener, run: (baseUrl: string) => Promise<void>) {
  const server = createServer(listener);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}

test('Vercel health Node handler bridges a Web Response', async () => {
  await withServer(vercelHealth, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/ai-health`);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).provider, 'DeepSeek');
  });
});

test('Vercel chat Node handler reaches shared validation without invoking DeepSeek', async () => {
  await withServer(vercelChat, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/chat`);
    assert.equal(response.status, 405);
    assert.equal(response.headers.has('x-lfw-ai-request-id'), true);
    assert.equal((await response.json()).error.code, 'METHOD_NOT_ALLOWED');
  });
});
