# ADR 0001: Single event log with flexible data

Status: accepted
Date: 2026-10-08

## Context

The driving requirement: **add another data point without breaking the data points already added in the MVP.** Everything below follows from it.

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

- The database does not enforce the shape of `data`. A typo in a key is stored without complaint. Validation lives in the app's event modules (and in a Go backend, if one is built), and TypeScript only helps inside the app.
- `type` is plain text, so the database does not catch a typo in it either.
- There are no per-type access rules. Anyone who can write events can write any type.
- Querying inside `data` is less convenient than querying a real column. This is acceptable because the questions we ask are mostly about `type` and time, and the same key names are reused across types (`pee` and `tiko` on both `outside` and `accident`) so one query can span them.
- The rule "never change a field" means mistakes stay in the schema. We accept some clutter in exchange for never needing a data migration.
- A `dog` link on every event is slightly redundant while there is one dog.

## Alternatives considered

**A collection per event type** (feeds, outside trips, accidents). Rejected: every new type (sleep, walks, play, practice) would need a new collection and a migration, and questions like "how long after a feed do accidents happen?" would have to combine several collections. One list with a shared shape keeps those queries and the offline sync code simple.

**One wide table** with a nullable column for every possible detail. Rejected: every new detail would be a schema migration, and most columns would be empty on most rows. This conflicts with the requirement that new data points can be added without touching existing ones.

**No `dogs` collection.** Rejected: adding a `dog` link later would mean backfilling every existing event. It is cheap to include now.

**`type` as a database select field.** Rejected: adding a type would then need a migration. `type` is plain text, validated by the app's event registry.

**Separate pee and tiko events linked to an outside trip.** Considered, not chosen. This was an alternative raised by Claude while designing the model, and it was not weighed in depth in the original discussion. `pee` and `tiko` are flags on the trip (and on accidents, with the same names), which keeps one record per trip and makes "trips with a result" a simple filter. The cost is that several pees in one trip are recorded once. A `pee_count` can be added later without breaking anything.

**Required timing for outside trips.** Rejected in favour of an optional `ended_at`: one tap stays the default, and timing is there when wanted.

Hosted backends (Supabase, Firebase) and native apps are out of scope here. They belong in a separate ADR about the overall stack.

## Related

- `docs/data-model.md`: the fields and rules this decision produced.
- #32: handling two or more pets.
