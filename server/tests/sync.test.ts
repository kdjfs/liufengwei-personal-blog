import assert from 'node:assert/strict';
import test from 'node:test';
import {
  aggregateProgress,
  type DeviceProgressState,
  mergeDeviceProgress,
  resolveVersionedMutation,
} from '../src/sync/merge.ts';

const deviceA: DeviceProgressState = {
  articleSlug: 'mysql-index',
  deviceId: '9aa7193d-81d9-41b3-ab83-67216f818922',
  title: 'MySQL 索引',
  category: '后端',
  readSeconds: 100,
  listenSeconds: 20,
  maxProgress: 80,
  resumeProgress: 75,
  resumeHeadingId: 'covering-index',
  resumeScrollY: 1200,
  firstReadAt: new Date('2026-08-01T09:00:00.000Z'),
  lastActivityAt: new Date('2026-08-03T10:00:00.000Z'),
  completedAt: null,
};

test('per-device progress is monotonic while resume state follows newer activity', () => {
  const merged = mergeDeviceProgress(deviceA, {
    ...deviceA,
    readSeconds: 80,
    listenSeconds: 30,
    maxProgress: 70,
    resumeProgress: 60,
    resumeHeadingId: 'older-heading',
    resumeScrollY: 900,
    firstReadAt: new Date('2026-08-02T09:00:00.000Z'),
    lastActivityAt: new Date('2026-08-04T10:00:00.000Z'),
    completedAt: new Date('2026-08-04T10:00:00.000Z'),
  });

  assert.equal(merged.readSeconds, 100);
  assert.equal(merged.listenSeconds, 30);
  assert.equal(merged.maxProgress, 80);
  assert.equal(merged.resumeProgress, 60);
  assert.equal(merged.resumeHeadingId, 'older-heading');
  assert.equal(merged.resumeScrollY, 900);
  assert.equal(merged.firstReadAt.toISOString(), '2026-08-01T09:00:00.000Z');
  assert.equal(merged.completedAt?.toISOString(), '2026-08-04T10:00:00.000Z');
});

test('cloud aggregation sums device counters without copying the total into a device', () => {
  const deviceB: DeviceProgressState = {
    ...deviceA,
    deviceId: '7daf1fc8-8242-4c77-af3d-1930d61abdf7',
    readSeconds: 80,
    listenSeconds: 5,
    maxProgress: 100,
    resumeProgress: 95,
    resumeHeadingId: 'latest-heading',
    resumeScrollY: 1800,
    firstReadAt: new Date('2026-08-02T09:00:00.000Z'),
    lastActivityAt: new Date('2026-08-05T10:00:00.000Z'),
    completedAt: new Date('2026-08-05T10:00:00.000Z'),
  };
  const completedA = {
    ...deviceA,
    completedAt: new Date('2026-08-04T10:00:00.000Z'),
  };

  const aggregate = aggregateProgress([completedA, deviceB]);
  assert.equal(aggregate.readSeconds, 180);
  assert.equal(aggregate.listenSeconds, 25);
  assert.equal(aggregate.maxProgress, 100);
  assert.equal(aggregate.resumeHeadingId, 'latest-heading');
  assert.equal(aggregate.completedAt?.toISOString(), '2026-08-04T10:00:00.000Z');
  assert.equal(deviceB.readSeconds, 80);
});

test('versioned mutations reject stale writes with the authoritative record', () => {
  const existing = { version: 3, value: { note: 'newer server note' } };
  const conflict = resolveVersionedMutation(existing, 2, { note: 'stale offline note' });
  assert.deepEqual(conflict, { status: 'conflict', record: existing });

  const accepted = resolveVersionedMutation(existing, 3, { note: 'accepted note' });
  assert.deepEqual(accepted, {
    status: 'applied',
    record: { version: 4, value: { note: 'accepted note' } },
  });
});

test('new versioned records start at version one and require a null base version', () => {
  assert.deepEqual(resolveVersionedMutation(undefined, null, { favorite: true }), {
    status: 'applied',
    record: { version: 1, value: { favorite: true } },
  });
  assert.deepEqual(resolveVersionedMutation(undefined, 4, { favorite: true }), {
    status: 'conflict',
    record: undefined,
  });
});
