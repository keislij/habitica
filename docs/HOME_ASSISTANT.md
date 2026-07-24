# Home Assistant integration

Home Assistant 2026.7 includes a native Platinum Habitica integration that
accepts a custom instance URL, user ID, API token, and SSL-verification choice.
It provides Habitica sensors, to-do/daily lists, calendars, and actions. It is
the primary integration path.

## Phase 1 — validate native support

1. Deploy a TLS-valid test instance.
2. Create a dedicated Habitica automation account or deliberately scoped
   household identity; do not reuse an administrator.
3. Configure Home Assistant's Habitica integration with the custom URL.
4. Verify read entities, task creation, daily/to-do completion, scoring,
   rewards, calendars, reconnects, and restart behavior.
5. Measure polling/rate behavior. Habitica documents a 30 requests/minute limit;
   background tools must identify themselves and handle rate limits.

Initial household proofs should be reversible: create a dishwasher chore from
an appliance state, complete a daily from a toothbrush/input event, and map a
small reward flow. Prevent repeated events from scoring the same task twice.

## Phase 2 — gap analysis

Build no custom component or bridge unless native validation demonstrates a
specific gap. Possible gaps include event latency, shared-household identity,
party workflows, richer reward approval, and reliable bidirectional ownership.

If needed, a bridge must use a dedicated identity, durable queue,
idempotency/deduplication keys, retry bounds, observable dead letters, and
feedback-loop suppression. Treat Habitica webhooks as untrusted input.

## Alchemy relationship

Alchemy is the current chore/reward system. During evaluation it remains the
source of truth, or a clearly documented parallel pilot is used. Migration
requires an entity/task mapping, ownership rules, history decision, cutover,
rollback, and duplicate-award prevention.

