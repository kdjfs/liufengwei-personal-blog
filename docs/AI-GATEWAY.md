# Node AI Gateway

> Status: implemented and CI-verified as an optional strangler path; the production browser default remains `/api/chat`.

## Route truth

| Context                           | Endpoint                         | Status                                                                                                       |
| --------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Local AI development              | `http://127.0.0.1:8787/api/chat` | Reuses the Vercel handler; `pnpm dev` starts it when a valid key is present, while `pnpm dev:ai` requires it |
| Current Vercel production default | `/api/chat`                      | Deployed serverless route used when no explicit AI origin is configured                                      |
| Optional Node cloud route         | `/api/v1/ai/chat`                | Implemented and tested; production enablement is not asserted by repository state                            |

The local gateway accepts exact HTTP loopback origins (`localhost`, `127.0.0.1`, or `[::1]`) so Astro may move to a free port without weakening production origin checks. `pnpm ai:doctor` reports safe configuration metadata only; `--probe` adds a minimal live request without printing the key.

## Endpoint

`POST /api/v1/ai/chat` accepts the existing Fast/Deep browser payload plus an optional `cloud`
object. The shared Zod contract is exported from `@lfw/contracts/ai`; provider, model, API URL, API
key and system instructions are never client-controlled.

The response is the existing Anthropic-compatible DeepSeek SSE stream, so the current browser
decoder remains compatible. The legacy Vercel `/api/chat` endpoint is intentionally retained until
the Dockerized Node endpoint is deployed and smoke-tested. Merging this branch does not change the
production AI route.

## Distributed controls

Every accepted request passes through Redis before opening the provider stream:

- a fixed-window request counter is updated atomically with `INCR` and `PEXPIRE`;
- a single Lua acquisition checks and reserves both per-user/client and global sorted-set capacity;
- each lease uses a random owner token and expiry score;
- release removes only that token from both sets, while TTL is the crash safety net;
- Redis keys use a shared cluster hash tag and opaque SHA-256 identifiers, never raw addresses,
  prompts, cookies, notes or user IDs.

Redis failure returns a retryable `503 AI_COORDINATION_UNAVAILABLE`; concurrency exhaustion returns
`503 AI_BUSY`; request quota exhaustion returns `429 RATE_LIMITED`. Cost controls never fail open.

## Authentication, persistence and privacy

Anonymous SSE remains supported and does not query the session store when no cookie or cloud option
is present. `cloud` options require a valid Better Auth session:

```json
{
  "cloud": {
    "persistConversation": true,
    "conversationId": "optional UUID for a conversation owned by this user",
    "privateLearningContext": true
  }
}
```

Both persistence and private learning context are off by default and opt in per request. Private
context is restricted to at most three slugs relevant to the selection/current page/retrieval set,
eight recent non-deleted annotations, bounded note/quote excerpts, aggregated progress and active
favorites. Cross-user conversation IDs return the same unavailable response and cannot be read or
extended.

Public context, selections, annotations and private learning data are serialized inside explicit
read-only XML boundaries. The system prompt defines all of them as untrusted data and forbids
executing embedded instructions. General request logs contain neither bodies nor conversation text.

The browser switches to this endpoint only when `PUBLIC_AI_API_URL` is an explicit path-free origin.
That build-time flag must be set only after the Node deployment passes its smoke gate; otherwise the
proven Vercel `/api/chat` route remains the default. The account client is loaded only after the AI
panel opens, uses credentialed session requests, and keeps both privacy choices off until an
authenticated user enables them. Turning persistence off also clears the browser's conversation ID.

## Validation

CI uses a mocked provider and real MySQL/Redis services. Integration tests are serialized because the
migration compatibility test intentionally upgrades one shared populated database before the AI
repository tests run. No real DeepSeek credential is used in tests.
