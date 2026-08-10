import { createAiCoordinator } from './ai/coordinator.ts';
import { createDeepSeekProvider } from './ai/provider.ts';
import { createAiRepository } from './ai/repository.ts';
import { buildApp } from './app.ts';
import { createAuth } from './auth.ts';
import { parseServerConfig } from './config.ts';
import { createInfrastructure } from './infrastructure.ts';
import { createSyncService } from './sync/service.ts';

const config = parseServerConfig(process.env);
const infrastructure = createInfrastructure(config);
const auth = createAuth(config, infrastructure.database);
const syncService = createSyncService(infrastructure.database);
const aiRepository = createAiRepository(infrastructure.database);
const aiCoordinator = createAiCoordinator({
  async eval(script, options) {
    await infrastructure.ensureRedisConnection();
    return infrastructure.redis.eval(script, options);
  },
});
const app = await buildApp({
  config,
  probes: infrastructure.probes,
  auth,
  sync: {
    service: syncService,
    async getUserId(headers) {
      const session = await auth.api.getSession({ headers });
      return session?.user.id ?? null;
    },
  },
  ai: {
    coordinator: aiCoordinator,
    provider: createDeepSeekProvider(config),
    repository: aiRepository,
    async getUserId(headers) {
      const session = await auth.api.getSession({ headers });
      return session?.user.id ?? null;
    },
  },
});

let shuttingDown = false;
async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  app.log.info({ signal }, 'Graceful shutdown started');
  await app.close();
  await infrastructure.close();
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    void shutdown(signal);
  });
}

try {
  await app.listen({ host: '0.0.0.0', port: config.port });
} catch (error) {
  app.log.error(
    { errorName: error instanceof Error ? error.name : 'UnknownError' },
    'Startup failed',
  );
  await app.close();
  await infrastructure.close();
  throw error;
}
