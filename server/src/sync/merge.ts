export interface DeviceProgressState {
  articleSlug: string;
  deviceId: string;
  title: string;
  category: string;
  readSeconds: number;
  listenSeconds: number;
  maxProgress: number;
  resumeProgress: number;
  resumeHeadingId?: string;
  resumeScrollY: number;
  firstReadAt: Date;
  lastActivityAt: Date;
  completedAt: Date | null;
}

export interface AggregateProgressState extends Omit<DeviceProgressState, 'deviceId'> {}

function earliest(left: Date | null, right: Date | null): Date | null {
  if (!left) return right;
  if (!right) return left;
  return left <= right ? left : right;
}

export function mergeDeviceProgress(
  existing: DeviceProgressState | undefined,
  incoming: DeviceProgressState,
): DeviceProgressState {
  if (!existing) return incoming;
  const incomingIsNewer = incoming.lastActivityAt > existing.lastActivityAt;
  return {
    ...existing,
    title: incomingIsNewer ? incoming.title : existing.title,
    category: incomingIsNewer ? incoming.category : existing.category,
    readSeconds: Math.max(existing.readSeconds, incoming.readSeconds),
    listenSeconds: Math.max(existing.listenSeconds, incoming.listenSeconds),
    maxProgress: Math.max(existing.maxProgress, incoming.maxProgress),
    resumeProgress: incomingIsNewer ? incoming.resumeProgress : existing.resumeProgress,
    resumeHeadingId: incomingIsNewer ? incoming.resumeHeadingId : existing.resumeHeadingId,
    resumeScrollY: incomingIsNewer ? incoming.resumeScrollY : existing.resumeScrollY,
    firstReadAt:
      incoming.firstReadAt < existing.firstReadAt ? incoming.firstReadAt : existing.firstReadAt,
    lastActivityAt: incomingIsNewer ? incoming.lastActivityAt : existing.lastActivityAt,
    completedAt: earliest(existing.completedAt, incoming.completedAt),
  };
}

export function aggregateProgress(records: DeviceProgressState[]): AggregateProgressState {
  const first = records[0];
  if (!first) throw new Error('Cannot aggregate an empty progress collection');
  const latest = records.reduce((current, record) =>
    record.lastActivityAt > current.lastActivityAt ? record : current,
  );
  return {
    articleSlug: latest.articleSlug,
    title: latest.title,
    category: latest.category,
    readSeconds: records.reduce((total, record) => total + record.readSeconds, 0),
    listenSeconds: records.reduce((total, record) => total + record.listenSeconds, 0),
    maxProgress: Math.max(...records.map((record) => record.maxProgress)),
    resumeProgress: latest.resumeProgress,
    resumeHeadingId: latest.resumeHeadingId,
    resumeScrollY: latest.resumeScrollY,
    firstReadAt: records.reduce(
      (value, record) => (record.firstReadAt < value ? record.firstReadAt : value),
      first.firstReadAt,
    ),
    lastActivityAt: latest.lastActivityAt,
    completedAt: records.reduce<Date | null>(
      (value, record) => earliest(value, record.completedAt),
      null,
    ),
  };
}

export interface Versioned<T> {
  version: number;
  value: T;
}

export type VersionedMutationResult<T> =
  | { status: 'applied'; record: Versioned<T> }
  | { status: 'conflict'; record: Versioned<T> | undefined };

export function resolveVersionedMutation<T>(
  existing: Versioned<T> | undefined,
  baseVersion: number | null,
  value: T,
): VersionedMutationResult<T> {
  if (!existing) {
    return baseVersion === null
      ? { status: 'applied', record: { version: 1, value } }
      : { status: 'conflict', record: undefined };
  }
  if (baseVersion !== existing.version) return { status: 'conflict', record: existing };
  return { status: 'applied', record: { version: existing.version + 1, value } };
}
