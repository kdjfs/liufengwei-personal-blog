import { spawnSync } from 'node:child_process';

const image = `lfw-space-api-smoke:${process.pid}`;
const container = `lfw-space-api-smoke-${process.pid}`;
const network = process.env.LFW_DOCKER_NETWORK ?? 'host';
const databaseUrl = process.env.LFW_DOCKER_DATABASE_URL ?? process.env.LFW_TEST_DATABASE_URL;
const redisUrl = process.env.LFW_DOCKER_REDIS_URL ?? process.env.LFW_TEST_REDIS_URL;
const hostPort = process.env.LFW_DOCKER_API_PORT ?? '8788';
const healthOrigin = process.env.LFW_DOCKER_HEALTH_ORIGIN ?? `http://127.0.0.1:${hostPort}`;

if (!databaseUrl || !redisUrl) {
  throw new Error('Docker smoke requires LFW_TEST_DATABASE_URL and LFW_TEST_REDIS_URL');
}

function docker(args, options = {}) {
  const result = spawnSync('docker', args, {
    encoding: options.capture ? 'utf8' : undefined,
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  });
  if (result.status !== 0 && !options.allowFailure) {
    throw new Error(`Docker command failed: docker ${args.slice(0, 2).join(' ')}`);
  }
  return result.stdout?.trim() ?? '';
}

function environmentArgs() {
  return [
    '--env',
    'NODE_ENV=test',
    '--env',
    'API_PORT=8788',
    '--env',
    'API_ORIGIN=http://127.0.0.1:8788',
    '--env',
    `DATABASE_URL=${databaseUrl}`,
    '--env',
    `REDIS_URL=${redisUrl}`,
    '--env',
    'WEB_ORIGIN=http://127.0.0.1:4321',
    '--env',
    'SESSION_SECRET=lfw_docker_smoke_session_secret_test_only',
  ];
}

async function waitForReady() {
  const deadline = Date.now() + 60_000;
  let lastStatus = 'unreachable';
  while (Date.now() < deadline) {
    try {
      const [live, ready] = await Promise.all([
        fetch(`${healthOrigin}/health/live`),
        fetch(`${healthOrigin}/health/ready`),
      ]);
      lastStatus = `live=${live.status}, ready=${ready.status}`;
      if (live.ok && ready.ok) return;
    } catch {
      lastStatus = 'unreachable';
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error(`Docker API health did not become ready (${lastStatus})`);
}

try {
  docker(['build', '--file', 'server/Dockerfile', '--tag', image, '.']);
  docker([
    'run',
    '--rm',
    '--network',
    network,
    ...environmentArgs(),
    image,
    'node',
    '--disable-warning=ExperimentalWarning',
    '--experimental-strip-types',
    'server/src/db/migrate.ts',
  ]);

  const runArgs = ['run', '--detach', '--name', container, '--network', network];
  if (network !== 'host') runArgs.push('--publish', `127.0.0.1:${hostPort}:8788`);
  runArgs.push(...environmentArgs(), image);
  docker(runArgs);
  await waitForReady();

  const health = docker(['inspect', '--format', '{{.State.Health.Status}}', container], {
    capture: true,
  });
  if (!['starting', 'healthy'].includes(health)) {
    throw new Error(`Docker healthcheck entered unexpected state: ${health}`);
  }
  console.log('Docker smoke passed: migration, liveness, readiness, and non-root API startup.');
} finally {
  docker(['rm', '--force', container], { allowFailure: true, capture: true });
  docker(['image', 'rm', '--force', image], { allowFailure: true, capture: true });
}
