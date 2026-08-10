import { fromNodeHeaders } from 'better-auth/node';
import type { FastifyInstance } from 'fastify';
import type { ServerConfig } from './config.ts';

export interface AuthHandler {
  handler: (request: Request) => Promise<Response>;
}

function requestBody(request: { body?: unknown }): BodyInit | undefined {
  if (request.body === undefined || request.body === null) return undefined;
  if (typeof request.body === 'string') return request.body;
  if (request.body instanceof Uint8Array) return new Uint8Array(request.body).buffer;
  return JSON.stringify(request.body);
}

export function registerAuthRoutes(
  app: FastifyInstance,
  auth: AuthHandler,
  config: ServerConfig,
): void {
  app.route({
    method: ['GET', 'POST'],
    url: '/api/auth/*',
    async handler(request, reply) {
      const url = new URL(request.url, config.apiOrigin);
      const response = await auth.handler(
        new Request(url, {
          method: request.method,
          headers: fromNodeHeaders(request.headers),
          body: requestBody(request),
        }),
      );

      reply.status(response.status);
      response.headers.forEach((value, key) => {
        if (key !== 'set-cookie') reply.header(key, value);
      });
      const cookies = response.headers.getSetCookie();
      if (cookies.length > 0) reply.header('set-cookie', cookies);
      return reply.send(response.body ? await response.text() : null);
    },
  });
}
