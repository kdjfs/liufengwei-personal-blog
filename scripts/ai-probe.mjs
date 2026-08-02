import { existsSync } from 'node:fs';
import process from 'node:process';
import { assertConfiguredModel, resolveBaseUrl, validateApiKeyValue } from '../api/_chat-core.ts';
import { AnthropicSSEDecoder } from '../src/lib/ai/sse.ts';

function safeText(value, maxLength = 300) {
  return String(value ?? '')
    .replace(/sk-[A-Za-z0-9_-]+/gi, '[REDACTED]')
    .replace(/[\r\n]+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function print(label, value) {
  console.log(`${label}: ${value}`);
}

function networkCause(error) {
  const cause = error instanceof Error ? error.cause : undefined;
  if (!cause || typeof cause !== 'object') return undefined;
  const value = cause;
  return {
    code: safeText(value.code, 80),
    message: safeText(value.message, 240),
  };
}

function loadLocalEnv() {
  if (!existsSync('.env.local')) throw new Error('[LFW AI] 未找到 .env.local');
  process.loadEnvFile('.env.local');
}

async function readSafeError(response) {
  try {
    const body = await response.json();
    return safeText(body?.error?.message ?? body?.error?.code ?? body?.message ?? 'Unknown error');
  } catch {
    return 'Non-JSON upstream response';
  }
}

function printStatusHelp(status) {
  if (status === 401 || status === 403) print('Diagnosis', 'DeepSeek API Key 无效');
  else if (status === 400 || status === 422) print('Diagnosis', 'DeepSeek 请求格式未被接受');
  else if (status === 429) print('Diagnosis', '余额不足、Rate Limit 或 API 服务限流');
  else if (status >= 500) print('Diagnosis', 'DeepSeek 上游服务异常');
}

async function probeDirect() {
  loadLocalEnv();
  const key = validateApiKeyValue(process.env.DEEPSEEK_API_KEY);
  print('DeepSeek Base URL', 'OK');
  print('Model', process.env.DEEPSEEK_MODEL ?? 'missing');
  print('API Key', key.status === 'valid' ? 'configured' : key.status);
  if (key.status !== 'valid') throw new Error('[LFW AI] DEEPSEEK_API_KEY 未正确配置');

  const model = assertConfiguredModel(process.env);
  const endpoint = `${resolveBaseUrl(process.env)}/v1/messages`;
  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key.value },
      body: JSON.stringify({
        model,
        max_tokens: 32,
        stream: false,
        thinking: { type: 'disabled' },
        messages: [
          {
            role: 'user',
            content: [{ type: 'text', text: '只回复：LFW_AI_OK' }],
          },
        ],
      }),
    });
  } catch (error) {
    print('Network Error', error instanceof Error ? error.name : 'Error');
    const cause = networkCause(error);
    if (cause?.code) print('Network Code', cause.code);
    throw new Error(cause?.message || safeText(error instanceof Error ? error.message : error));
  }

  print('HTTP Status', response.status);
  if (!response.ok) {
    printStatusHelp(response.status);
    print('Upstream Error', await readSafeError(response));
    process.exitCode = 1;
    return;
  }

  const body = await response.json();
  const text = Array.isArray(body.content)
    ? body.content
        .filter((block) => block?.type === 'text')
        .map((block) => block.text)
        .join('')
    : '';
  print('Actual Model', safeText(body.model, 80));
  print('Response', safeText(text));
  if (body.model !== 'deepseek-v4-pro' || !text.trim()) process.exitCode = 1;
}

async function probeProduction() {
  loadLocalEnv();
  const rawSite = process.env.SITE_URL;
  let site;
  try {
    site = new URL(rawSite ?? '');
  } catch {
    throw new Error('[LFW AI] SITE_URL 无效');
  }
  if (site.protocol !== 'https:' || ['localhost', '127.0.0.1'].includes(site.hostname)) {
    throw new Error('[LFW AI] ai:probe:prod 需要 HTTPS Production SITE_URL');
  }

  const endpoint = new URL('/api/chat', site);
  print('Production URL', site.origin);
  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: site.origin },
      body: JSON.stringify({
        mode: 'fast',
        messages: [{ role: 'user', content: '只回复：LFW_PROD_AI_OK' }],
        context: [],
        currentPage: { title: 'AI Health Check', url: '/' },
      }),
      redirect: 'error',
    });
  } catch (error) {
    print('Network Error', error instanceof Error ? error.name : 'Error');
    const cause = networkCause(error);
    if (cause?.code) print('Network Code', cause.code);
    throw new Error(cause?.message || safeText(error instanceof Error ? error.message : error));
  }

  print('HTTP Status', response.status);
  print('Request ID', response.headers.get('x-lfw-ai-request-id') ?? 'missing');
  if (!response.ok) {
    print('API Error', await readSafeError(response));
    process.exitCode = 1;
    return;
  }
  if (!response.body) throw new Error('[LFW AI] Production 响应没有 Streaming Body');

  const decoder = new AnthropicSSEDecoder();
  const textDecoder = new TextDecoder();
  const reader = response.body.getReader();
  let output = '';
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    output += decoder.push(textDecoder.decode(chunk.value, { stream: true })).join('');
  }
  output += decoder.push(textDecoder.decode()).join('');
  print('Response', safeText(output));
  if (!output.trim()) process.exitCode = 1;
}

try {
  if (process.argv.includes('--production')) await probeProduction();
  else await probeDirect();
} catch (error) {
  console.error(safeText(error instanceof Error ? error.message : error));
  process.exitCode = 1;
}
