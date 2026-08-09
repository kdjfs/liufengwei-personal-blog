import { syncBatchRequestSchema } from '@lfw/contracts/sync';
import { fromNodeHeaders } from 'better-auth/node';
import type { FastifyInstance } from 'fastify';
import type { ServerConfig } from '../config.ts';
import type { SyncService } from './service.ts';

export interface SyncRouteOptions {
  service: SyncService;
  getUserId: (headers: Headers) => Promise<string | null>;
}

function errorBody(requestId: string, code: string, message: string) {
  return { error: { code, message, requestId } };
}

export function registerSyncRoutes(
  app: FastifyInstance,
  options: SyncRouteOptions,
  config: ServerConfig,
): void {
  app.post('/api/v1/sync/batch', async (request, reply) => {
    const origin = request.headers.origin;
    if (origin !== config.webOrigin || request.headers['sec-fetch-site'] === 'cross-site') {
      return reply
        .status(403)
        .send(errorBody(request.id, 'ORIGIN_FORBIDDEN', 'Request origin is not allowed'));
    }

    const userId = await options.getUserId(fromNodeHeaders(request.headers));
    if (!userId) {
      return reply
        .status(401)
        .send(errorBody(request.id, 'UNAUTHORIZED', 'An authenticated session is required'));
    }

    const parsed = syncBatchRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send(errorBody(request.id, 'VALIDATION_ERROR', 'Request fields are invalid'));
    }

    return options.service.sync(userId, parsed.data);
  });
}
