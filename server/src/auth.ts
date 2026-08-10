import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { betterAuth } from 'better-auth';
import type { ServerConfig } from './config.ts';
import type { Database } from './db/client.ts';
import { authSchema } from './db/schema.ts';

export function createAuth(config: ServerConfig, database: Database) {
  const github =
    config.githubClientId && config.githubClientSecret
      ? {
          github: {
            clientId: config.githubClientId,
            clientSecret: config.githubClientSecret,
          },
        }
      : {};

  return betterAuth({
    appName: 'LFW Space',
    baseURL: config.apiOrigin,
    basePath: '/api/auth',
    secret: config.sessionSecret,
    trustedOrigins: [config.webOrigin],
    logger: { disabled: true },
    database: drizzleAdapter(database, {
      provider: 'mysql',
      schema: authSchema,
    }),
    emailAndPassword: { enabled: false },
    socialProviders: github,
    session: {
      cookieCache: { enabled: false },
    },
    advanced: {
      cookiePrefix: 'lfw-space',
      useSecureCookies: config.nodeEnv === 'production',
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: 'lax',
        secure: config.nodeEnv === 'production',
        path: '/',
      },
    },
  });
}
