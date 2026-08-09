export function normalizeApiOrigin(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  try {
    const url = new URL(trimmed);
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    const safeProtocol = url.protocol === 'https:' || (url.protocol === 'http:' && loopback);
    return safeProtocol && url.origin === trimmed.replace(/\/$/, '') ? url.origin : undefined;
  } catch {
    return undefined;
  }
}
