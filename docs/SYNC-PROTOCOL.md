# Local-first learning sync protocol

> Status: implemented backend and browser queue baseline
>
> API version: `/api/v1`

## Truth boundaries

- `articleProgress`, annotations, audio scripts and settings remain durable in IndexedDB and work
  without login or network access.
- MySQL stores authenticated cloud copies and per-device progress. Redis is not involved in learning
  writes or sync correctness.
- Git remains the only source of Markdown/MDX content. Sync payloads identify articles by slug and do
  not upload article bodies.

## IndexedDB v2

The `lfw-learning-db` upgrade preserves the four v1 stores and adds:

| Store           | Key           | Role                                                   |
| --------------- | ------------- | ------------------------------------------------------ |
| `syncQueue`     | `operationId` | Offline idempotent mutation envelopes and retry state  |
| `syncMeta`      | `key`         | Last successful server cursor and future sync metadata |
| `cloudProgress` | `articleSlug` | Read-only cloud aggregates, separate from device data  |
| `favorites`     | `articleSlug` | Local-first favorite state and tombstones              |

`deviceId` is created with `crypto.randomUUID()` inside a serialized IndexedDB transaction and saved
as the `cloud-device-id` setting. No fingerprint, IP, canvas or hardware signal participates.

Each local progress/annotation/favorite change and its queue envelope commit in one IndexedDB
transaction. A newer unsent absolute state replaces an older unsent operation for the same
`(entityType, entityId, deviceId)`. An in-flight operation keeps its ID across retries.

## Batch API

`POST /api/v1/sync/batch` accepts at most 50 Zod-validated operations. It requires:

- an active Better Auth database session;
- an exact configured Web `Origin` and no cross-site Fetch Metadata;
- UUID operation/device IDs, bounded strings and counters, and ISO timestamps;
- a tombstone timestamp for annotation/favorite deletes.

The response contains per-operation `applied`, `duplicate` or `conflict` status plus the user's cloud
progress aggregates, authoritative annotations/favorites (including tombstones), and a server cursor.
Every database query is scoped by the authenticated user ID.

## Transaction and idempotency

For each accepted envelope, `(user_id, operation_id)` is inserted with `INSERT IGNORE` inside the same
MySQL transaction as the entity mutation. A retry that loses the first response receives `duplicate`
and does not apply the mutation again. Conflict outcomes are also recorded; resolving a conflict
requires a new operation ID based on the returned server version.

The browser atomically removes acknowledged queue entries, applies authoritative snapshots and
updates `last-sync`. If a newer local mutation was queued while the request was in flight, the
authoritative response does not overwrite that pending entity.

## Progress rules

Clients upload absolute counters for only their own random device ID:

- `readSeconds`, `listenSeconds`, and `maxProgress` use monotonic maximum on that device row;
- `completedAt` keeps the earliest non-null value;
- resume heading/progress/scroll and article display metadata follow the newest accepted activity;
- `firstReadAt` keeps the earliest value.

Cloud aggregation sums device counters, takes maximum progress and earliest completion, and uses the
latest active device for resume state. Aggregates are stored in `cloudProgress`; they are never copied
into local device counters, so a later upload cannot double-count them.

## Annotation and favorite conflicts

Annotations and favorites use optimistic server versions. A new record supplies `baseVersion: null`.
An update/delete must supply the current server version; a stale base returns `conflict` and the
authoritative record instead of overwriting it. Deletes update `deleted_at` and increment the version,
so an offline device cannot resurrect a deleted row.

## Retry and failure behavior

The optional browser runtime is gated by `PUBLIC_CLOUD_API_URL` and dynamically loads the cloud client
only when configured. It uses credentialed fetch, an 8-second timeout, batches of 50, and capped
exponential backoff with jitter. Only 429, 5xx, timeouts and network failures are scheduled for
automatic retry. `navigator.onLine` only wakes the scheduler; a successful response proves recovery.

When the API is absent or unhealthy, local writes have already committed and static reading remains
fully usable. A 401/403/validation response is surfaced as an error and is not blindly retried.
