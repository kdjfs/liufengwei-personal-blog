import { z } from 'zod';

const optionalCredential = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().trim().min(1).optional(),
);

function isPlaceholderCredential(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return (
    normalized === 'example' ||
    normalized.includes('replace_me') ||
    normalized.startsWith('replace_with') ||
    normalized.includes('change_me') ||
    normalized.includes('changeme') ||
    normalized.includes('placeholder')
  );
}

const environmentSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    API_PORT: z.coerce.number().int().min(1).max(65_535).default(8788),
    API_ORIGIN: z.string().trim().url(),
    DATABASE_URL: z.string().trim().url(),
    REDIS_URL: z.string().trim().url(),
    WEB_ORIGIN: z.string().trim().url(),
    GITHUB_CLIENT_ID: optionalCredential,
    GITHUB_CLIENT_SECRET: optionalCredential,
    SESSION_SECRET: z.string().min(32),
    DEEPSEEK_API_KEY: optionalCredential,
    DEEPSEEK_BASE_URL: z.string().trim().url().default('https://api.deepseek.com/anthropic'),
    DEEPSEEK_MODEL: z.literal('deepseek-v4-pro').default('deepseek-v4-pro'),
  })
  .superRefine((value, context) => {
    const database = new URL(value.DATABASE_URL);
    if (database.protocol !== 'mysql:') {
      context.addIssue({ code: 'custom', path: ['DATABASE_URL'], message: 'MySQL URL required' });
    }

    const redis = new URL(value.REDIS_URL);
    if (!['redis:', 'rediss:'].includes(redis.protocol)) {
      context.addIssue({ code: 'custom', path: ['REDIS_URL'], message: 'Redis URL required' });
    }

    const web = new URL(value.WEB_ORIGIN);
    if (web.origin !== value.WEB_ORIGIN.replace(/\/$/, '')) {
      context.addIssue({
        code: 'custom',
        path: ['WEB_ORIGIN'],
        message: 'Web origin cannot contain a path',
      });
    }
    if (value.NODE_ENV === 'production' && web.protocol !== 'https:') {
      context.addIssue({
        code: 'custom',
        path: ['WEB_ORIGIN'],
        message: 'Production Web origin must use HTTPS',
      });
    }

    const api = new URL(value.API_ORIGIN);
    if (api.origin !== value.API_ORIGIN.replace(/\/$/, '')) {
      context.addIssue({
        code: 'custom',
        path: ['API_ORIGIN'],
        message: 'API origin cannot contain a path',
      });
    }
    if (value.NODE_ENV === 'production' && api.protocol !== 'https:') {
      context.addIssue({
        code: 'custom',
        path: ['API_ORIGIN'],
        message: 'Production API origin must use HTTPS',
      });
    }

    if (value.NODE_ENV === 'production') {
      const productionCredentials: Array<[string, string | undefined]> = [
        ['DATABASE_URL', database.password],
        ['REDIS_URL', redis.password],
        ['GITHUB_CLIENT_ID', value.GITHUB_CLIENT_ID],
        ['GITHUB_CLIENT_SECRET', value.GITHUB_CLIENT_SECRET],
        ['SESSION_SECRET', value.SESSION_SECRET],
        ['DEEPSEEK_API_KEY', value.DEEPSEEK_API_KEY],
      ];
      for (const [path, credential] of productionCredentials) {
        if (isPlaceholderCredential(credential)) {
          context.addIssue({
            code: 'custom',
            path: [path],
            message: 'Production credentials cannot use example values',
          });
        }
      }
    }

    if (Boolean(value.GITHUB_CLIENT_ID) !== Boolean(value.GITHUB_CLIENT_SECRET)) {
      context.addIssue({
        code: 'custom',
        path: ['GITHUB_CLIENT_ID'],
        message: 'GitHub OAuth credentials must be configured together',
      });
    }

    const deepSeek = new URL(value.DEEPSEEK_BASE_URL);
    if (
      deepSeek.protocol !== 'https:' ||
      deepSeek.hostname !== 'api.deepseek.com' ||
      deepSeek.pathname.replace(/\/$/, '') !== '/anthropic' ||
      deepSeek.search ||
      deepSeek.hash
    ) {
      context.addIssue({
        code: 'custom',
        path: ['DEEPSEEK_BASE_URL'],
        message: 'Official DeepSeek Anthropic endpoint required',
      });
    }
  });

export interface ServerConfig {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  apiOrigin: string;
  databaseUrl: string;
  redisUrl: string;
  webOrigin: string;
  githubClientId?: string;
  githubClientSecret?: string;
  sessionSecret: string;
  deepSeekApiKey?: string;
  deepSeekBaseUrl: string;
  deepSeekModel: 'deepseek-v4-pro';
}

export class ServerConfigError extends Error {
  constructor() {
    super('Server environment is invalid');
    this.name = 'ServerConfigError';
  }
}

export function parseServerConfig(environment: Record<string, string | undefined>): ServerConfig {
  const result = environmentSchema.safeParse(environment);
  if (!result.success) throw new ServerConfigError();
  const value = result.data;
  return {
    nodeEnv: value.NODE_ENV,
    port: value.API_PORT,
    apiOrigin: new URL(value.API_ORIGIN).origin,
    databaseUrl: value.DATABASE_URL,
    redisUrl: value.REDIS_URL,
    webOrigin: new URL(value.WEB_ORIGIN).origin,
    githubClientId: value.GITHUB_CLIENT_ID,
    githubClientSecret: value.GITHUB_CLIENT_SECRET,
    sessionSecret: value.SESSION_SECRET,
    deepSeekApiKey: value.DEEPSEEK_API_KEY,
    deepSeekBaseUrl: value.DEEPSEEK_BASE_URL.replace(/\/$/, ''),
    deepSeekModel: value.DEEPSEEK_MODEL,
  };
}
