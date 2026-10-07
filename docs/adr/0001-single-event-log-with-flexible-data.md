# ADR 0001: Single event log with flexible data

Status: accepted
Date: 2026-10-08

## Context

The app records everything that happens to the puppy: feeds, outside trips, accidents, and later sleep, walks, training practice and vet visits. The questions we want to answer, such as the typical gap between outside trips or the best window after a meal, are all calculated from *when* things happened (see "Questions the data must be able to answer" in `docs/data-model.md`).

Constraints that shape the decision:

- New event types will keep arriving, and each has different details.
- Phones will eventually log offline and sync later, so the data must be easy to merge without conflicts.
- Old rows must stay readable by newer versions of the app, and the reverse.
- This is a small family app with one developer, so the fewer schema migrations, the better.

## Decision

1. **One `events` collection.** Every entry has the same basic shape: `dog`, `type`, `started_at`, optional `ended_at`, `logged_by`, `note`, `data` and `v`.
2. **Type-specific details live in a JSON `data` field.** The database knows nothing about individual event types. They are defined in the app, one module per type in `app/src/events/`, registered in `registry.ts`. A new type needs no schema change.
3. **Add, never change.** New optional fields, new event types and new collections are always fine. A field is never renamed, removed or repurposed. If a field turns out to be wrong, we stop writing it and keep reading it. Readers tolerate missing fields, `null`, `""` and unknown event types. `v` records the format version of `data`, to be bumped only if a breaking change is ever unavoidable.
4. **`dogs` is its own collection** and every event links to a dog, even though there is only one dog today.
5. **Event ids are generated on the client.** The server rejects a repeated id, so a retried or offline-queued write cannot create a duplicate.

## Consequences

Good:

- Adding an event type is one new module in the app. No migration, no backend deploy.
- One query, ordered by time, gives the whole timeline. Cross-type questions (for example, outside trips and accidents together) need no joins.
- Old and new app versions can share a database, because nothing is ever removed or repurposed.
- Adding a second pet later (#32) means creating a `dogs` row, with no backfill of existing events.

Costs:

- The database does not validate `data`. A typo in a key is stored without complaint. The app's event modules are the only validation, and TypeScript only helps inside the app.
- Querying inside `data` is less convenient than querying a real column. This is acceptable because the questions we ask are mostly about `type` and time, and the same key names are reused across types (`pee` and `tiko` on both `outside` and `accident`) so one query can span them.
- The rule "never change a field" means mistakes stay in the schema. We accept some clutter in exchange for never needing a data migration.
- A `dog` link on every event is slightly redundant while there is one dog.

## Alternatives considered

> Drafted from `docs/data-model.md` and general reasoning, not from a record of the original discussion. Please correct it if the real reasons differed.

- **One collection per event type** (`feeds`, `outings`, `accidents`). This gives proper columns and database-level validation. Rejected because every new type would need a migration and a deploy, and the timeline and cross-type queries would need several requests merged on the client.
- **One wide table with a column for every possible detail.** Rejected because most columns would be empty for most rows, and each new detail would still need a schema change.
- **No `dogs` collection, with a single hard-coded dog.** Simpler today. Rejected because adding the link later would mean backfilling every event, the kind of change this model is designed to avoid.

## Related

- `docs/data-model.md`: the fields and rules this decision produced.
- #32: handling two or more pets.
