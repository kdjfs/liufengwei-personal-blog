import { buildApp } from './app.ts';
import { parseServerConfig } from './config.ts';
import { createInfrastructure } from './infrastructure.ts';

const config = parseServerConfig(process.env);
const infrastructure = createInfrastructure(config);
const app = await buildApp({ config, probes: infrastructure.probes });

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
