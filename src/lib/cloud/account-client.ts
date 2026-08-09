import { normalizeApiOrigin } from './config.ts';

export interface CloudUser {
  id: string;
  name: string;
  email?: string;
  image?: string;
}

export interface CloudSession {
  user: CloudUser;
}

interface AccountClientOptions {
  fetch?: typeof fetch;
}

function readUser(value: unknown): CloudUser | null {
  if (!value || typeof value !== 'object') return null;
  const user = value as Record<string, unknown>;
  if (typeof user.id !== 'string' || typeof user.name !== 'string') return null;
  return {
    id: user.id,
    name: user.name,
    email: typeof user.email === 'string' ? user.email : undefined,
    image: typeof user.image === 'string' ? user.image : undefined,
  };
}

export class CloudAccountClient {
  private readonly origin: URL;
  private readonly fetch: typeof fetch;

  constructor(apiOrigin: string, options: AccountClientOptions = {}) {
    const origin = normalizeApiOrigin(apiOrigin);
    if (!origin) throw new Error('Cloud API URL must be a secure path-free origin');
    this.origin = new URL(origin);
    this.fetch = options.fetch ?? globalThis.fetch.bind(globalThis);
  }

  async getSession(): Promise<CloudSession | null> {
    const response = await this.fetch(new URL('/api/auth/get-session', this.origin), {
      credentials: 'include',
      headers: { accept: 'application/json' },
    });
    if (!response.ok) throw new Error('Cloud session is unavailable');
    const body = (await response.json()) as { user?: unknown } | null;
    const user = readUser(body?.user);
    return user ? { user } : null;
  }

  async beginGithubSignIn(callbackUrl: string): Promise<string> {
    const response = await this.fetch(new URL('/api/auth/sign-in/social', this.origin), {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ provider: 'github', callbackURL: callbackUrl, disableRedirect: true }),
    });
    if (!response.ok) throw new Error('GitHub sign-in is unavailable');
    const body = (await response.json()) as { url?: unknown };
    if (typeof body.url !== 'string') throw new Error('GitHub sign-in response is invalid');
    const target = new URL(body.url);
    if (target.protocol !== 'https:' || target.hostname !== 'github.com') {
      throw new Error('GitHub sign-in response is invalid');
    }
    return target.href;
  }

  async signOut(): Promise<void> {
    const response = await this.fetch(new URL('/api/auth/sign-out', this.origin), {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    if (!response.ok) throw new Error('Sign-out is unavailable');
  }
}
