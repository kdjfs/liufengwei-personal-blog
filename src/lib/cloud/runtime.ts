import type { LearningDatabase } from '../learning/db.ts';
import type { SyncStatus } from './sync.ts';

let activeSync: Promise<void> | undefined;
let syncRequested = false;
let retryTimer: ReturnType<typeof setTimeout> | undefined;
let registeredOnlineListener = false;
let latestDatabase: LearningDatabase | undefined;

function configuredOrigin(): string | undefined {
  const value = import.meta.env.PUBLIC_CLOUD_API_URL?.trim();
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.origin === value.replace(/\/$/, '') ? url.origin : undefined;
  } catch {
    return undefined;
  }
}

function publish(status: SyncStatus): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('lfw:cloud:sync-state', { detail: { status } }));
}

async function scheduleNextRetry(database: LearningDatabase): Promise<void> {
  if (retryTimer) clearTimeout(retryTimer);
  const nextAttempt = (await database.getAll('syncQueue'))
    .map((operation) => operation.nextAttemptAt)
    .filter((value): value is string => Boolean(value))
    .sort()[0];
  if (!nextAttempt) return;
  const delay = Math.max(0, new Date(nextAttempt).getTime() - Date.now());
  retryTimer = setTimeout(() => requestCloudSync(database), delay);
}

export function requestCloudSync(database: LearningDatabase): void {
  const origin = configuredOrigin();
  if (!origin || typeof window === 'undefined') return;
  latestDatabase = database;
  if (!registeredOnlineListener) {
    registeredOnlineListener = true;
    window.addEventListener('online', () => {
      if (latestDatabase) requestCloudSync(latestDatabase);
    });
  }
  if (activeSync) {
    syncRequested = true;
    return;
  }

  publish('syncing');
  activeSync = Promise.all([import('./client.ts'), import('./sync.ts')])
    .then(async ([{ CloudClient }, { syncPendingOperations }]) => {
      const result = await syncPendingOperations(database, new CloudClient(origin));
      publish(result.status);
      if (result.status === 'offline') await scheduleNextRetry(database);
    })
    .catch(() => publish('error'))
    .finally(() => {
      activeSync = undefined;
      if (syncRequested) {
        syncRequested = false;
        requestCloudSync(database);
      }
    });
}
