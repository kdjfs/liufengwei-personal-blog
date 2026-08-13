import { existsSync, readFileSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { parseEnv } from 'node:util';

export const LOCAL_AI_HOST = '127.0.0.1';
export const LOCAL_AI_PORT = 8787;
export const LOCAL_AI_HEALTH_URL = `http://${LOCAL_AI_HOST}:${LOCAL_AI_PORT}/health`;

export function getApiKeyStatus(value) {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return 'missing';
  const normalized = trimmed
    .toLowerCase()
    .replace(/[<>"']/g, '')
    .replace(/[\s_-]+/g, '-');
  if (
    normalized === 'replace-me' ||
    /^your-(?:new-)?(?:deepseek-)?(?:api-)?key$/.test(normalized)
  ) {
    return 'placeholder';
  }
  if (
    [...trimmed].some((character) => character.charCodeAt(0) < 33 || character.charCodeAt(0) > 126)
  ) {
    return 'invalid';
  }
  return 'configured';
}

export function loadLocalDevEnvironment({ cwd = process.cwd(), environment = process.env } = {}) {
  const envPath = path.resolve(cwd, '.env.local');
  const fileEnvironment = existsSync(envPath) ? parseEnv(readFileSync(envPath, 'utf8')) : {};
  return {
    exists: existsSync(envPath),
    path: envPath,
    environment: { ...fileEnvironment, ...environment },
  };
}

async function isPortOpen(host, port, timeoutMs) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    const finish = (open) => {
      socket.destroy();
      resolve(open);
    };
    socket.setTimeout(timeoutMs, () => finish(false));
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
  });
}

export async function inspectLocalGateway({ fetchImpl = fetch, timeoutMs = 800 } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(LOCAL_AI_HEALTH_URL, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    const body = await response.json().catch(() => undefined);
    if (response.ok && body?.service === 'lfw-ai-local' && body?.ok === true) {
      return { state: 'lfw', configured: body.configured === true, model: body.model };
    }
  } catch {
    // The TCP probe below distinguishes a free port from another local service.
  } finally {
    clearTimeout(timeout);
  }
  return (await isPortOpen(LOCAL_AI_HOST, LOCAL_AI_PORT, timeoutMs))
    ? { state: 'occupied' }
    : { state: 'available' };
}
