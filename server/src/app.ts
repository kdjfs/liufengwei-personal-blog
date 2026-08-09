import { randomUUID } from 'node:crypto';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { liveHealthSchema, type ReadyHealth, readyHealthSchema } from '@lfw/contracts/health';
import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import { type AiRouteOptions, registerAiRoutes } from './ai/routes.ts';
import { type AuthHandler, registerAuthRoutes } from './auth-routes.ts';
import type { ServerConfig } from './config.ts';
import { registerSyncRoutes, type SyncRouteOptions } from './sync/routes.ts';

const API_BODY_LIMIT_BYTES = 64 * 1024;

export interface HealthProbe {
  check: () => Promise<void>;
}

export interface AppProbes {
  mysql: HealthProbe;
  redis: HealthProbe;
}

export interface BuildAppOptions {
  config: ServerConfig;
  probes: AppProbes;
  auth?: AuthHandler;
  sync?: SyncRouteOptions;
  ai?: AiRouteOptions;
  probeTimeoutMs?: number;
}

function loggerOptions(config: ServerConfig): FastifyServerOptions['logger'] {
  if (config.nodeEnv === 'test') return false;
  return {
    level: config.nodeEnv === 'production' ? 'info' : 'debug',
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'res.headers.set-cookie',
        '*.sessionSecret',
        '*.githubClientSecret',
        '*.deepSeekApiKey',
        '*.databaseUrl',
        '*.redisUrl',
      ],
      censor: '[REDACTED]',
    },
  };
}

function errorBody(requestId: string, code: string, message: string) {
  return { error: { code, message, requestId } };
}

function errorMetadata(error: unknown): {
  name: string;
  code?: string;
  statusCode?: number;
} {
  if (!error || typeof error !== 'object') return { name: 'UnknownError' };
  const value = error as { name?: unknown; code?: unknown; statusCode?: unknown };
  return {
    name: typeof value.name === 'string' ? value.name : 'Error',
    code: typeof value.code === 'string' ? value.code : undefined,
    statusCode: typeof value.statusCode === 'number' ? value.statusCode : undefined,
  };
}

async function probeStatus(probe: HealthProbe, timeoutMs: number): Promise<'up' | 'down'> {
  let timeout: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      probe.check(),
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => reject(new Error('Health probe timed out')), timeoutMs);
      }),
    ]);
    return 'up';
  } catch {
    return 'down';
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function buildApp({
  config,
  probes,
  auth,
  sync,
  ai,
  probeTimeoutMs = 1_000,
}: BuildAppOptions): Promise<FastifyInstance> {
  const app = Fastify({
    logger: loggerOptions(config),
    bodyLimit: API_BODY_LIMIT_BYTES,
    requestIdHeader: false,
    genReqId: () => randomUUID(),
    onProtoPoisoning: 'error',
    onConstructorPoisoning: 'error',
  });

  await app.register(cors, {
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    origin(origin, callback) {
      callback(null, origin === undefined || origin === config.webOrigin);
    },
  });
  await app.register(helmet);
  if (auth) registerAuthRoutes(app, auth, config);
  if (sync) registerSyncRoutes(app, sync, config);
  if (ai) registerAiRoutes(app, ai, config);

  app.addHook('onSend', async (request, reply, payload) => {
    reply.header('X-LFW-Request-Id', request.id);
    return payload;
  });

  app.setNotFoundHandler((request, reply) => {
    void reply
      .status(404)
      .send(errorBody(request.id, 'NOT_FOUND', 'The requested endpoint does not exist'));
  });

  app.setErrorHandler((error, request, reply) => {
    const metadata = errorMetadata(error);
    request.log.error(
      {
        errorName: metadata.name,
        errorCode: metadata.code,
        statusCode: metadata.statusCode,
      },
      'Request failed',
    );
    const status = metadata.statusCode && metadata.statusCode >= 400 ? metadata.statusCode : 500;
    const code = status === 413 ? 'PAYLOAD_TOO_LARGE' : 'INTERNAL_ERROR';
    void reply
      .status(status)
      .send(
        errorBody(
          request.id,
          code,
          status === 413 ? 'Request body is too large' : 'Request failed',
        ),
      );
  });

  app.get('/health/live', async (request) =>
    liveHealthSchema.parse({ status: 'ok', requestId: request.id }),
  );

  app.get('/health/ready', async (request, reply) => {
    const [mysql, redis] = await Promise.all([
      probeStatus(probes.mysql, probeTimeoutMs),
      probeStatus(probes.redis, probeTimeoutMs),
    ]);
    const ready = mysql === 'up' && redis === 'up';
    const body: ReadyHealth = readyHealthSchema.parse({
      status: ready ? 'ready' : 'not_ready',
      requestId: request.id,
      components: { mysql, redis },
    });
    return reply.status(ready ? 200 : 503).send(body);
  });

  await app.ready();
  return app;
}
