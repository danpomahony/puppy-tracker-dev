# Data model (MVP)

Status: draft v0.1

## Principles

- **One event log.** Everything that happens (a feed, an outside trip, an accident) is a row in a single `events` collection with the same basic shape.
- **Flexible details.** Anything specific to one event type lives in a JSON `data` field, so new details never need a schema change.
- **Timestamps do the analysis.** We only store *when* things happened. Gaps, delays and correlations are calculated from the times, never stored.
- **Add, never change.** See "Rules for changing this model" below.

## Collections

### `dogs`

| Field | Type | Required | Notes |
|---|---|---|---|
| name | text | yes | |
| birthdate | date | no | |
| breed | text | no | |

Included from day one even with a single dog. Adding a `dog` link to existing events later would mean backfilling every row, which is exactly the kind of change this model is designed to avoid.

### `events`

| Field | Type | Required | Notes |
|---|---|---|---|
| id | text (15 chars) | yes | Generated on the phone, so entries logged offline sync without creating duplicates |
| dog | relation to `dogs` | yes | |
| type | text | yes | `feed`, `outside`, `accident`. Defined by the app's event registry (`app/src/events/registry.ts`), not the database, so a new type needs no schema change |
| started_at | date | yes | When it happened. Defaults to now, editable. Stored in UTC, shown in the phone's local time |
| ended_at | date | no | Only for timed events (optional timing) |
| logged_by | relation to `users` | yes | Set automatically from the logged-in user |
| note | text | no | Free text, available on every type |
| data | json | yes | Type-specific details (default `{}`). See below |
| v | number | yes | Format version of `data`, default 1. Only bumped if a breaking change is ever unavoidable |
| created, updated | autodate | auto | When it was *logged*, as opposed to when it *happened* |

## Event types (MVP)

### `feed`

| `data` field | Type | Required | Notes |
|---|---|---|---|
| food | text | no | e.g. kibble, treat |
| amount_g | number | no | grams |

`started_at` is when she was fed. `ended_at` is optional (how long the meal took).

### `outside`

| `data` field | Type | Required | Notes |
|---|---|---|---|
| pee | boolean | yes, default false | Did she pee during this trip? |
| tiko | boolean | yes, default false | Did she tiko during this trip? |

Both false means she went out and did nothing. That is still a valuable record: it shows trips that were too early or too short. `ended_at` is optional timing: one tap logs the trip, and the timer is only used when wanted.

### `accident`

| `data` field | Type | Required | Notes |
|---|---|---|---|
| pee | boolean | yes, default false | |
| tiko | boolean | yes, default false | |
| where | text | no | Room or spot |

`pee` and `tiko` deliberately use the same names as on `outside`, so one query can compare outcomes across both types.

## Example event

```json
{
  "id": "k3j9x0q2m8w1z7a",
  "dog": "<dog id>",
  "type": "outside",
  "started_at": "2026-10-07T19:05:00Z",
  "ended_at": null,
  "logged_by": "<user id>",
  "note": "",
  "data": { "pee": true, "tiko": false },
  "v": 1
}
```

## Questions the data must be able to answer

These are the acceptance tests for the model. All are calculated from timestamps and the `pee` / `tiko` flags, with nothing extra stored.

1. How long since she last peed, tikoed, went outside, or was fed? (the dashboard)
2. What is the typical gap between outside trips?
3. How long after a feed does the next outside trip happen?
4. How long after a feed do accidents happen?
5. How many accidents per day, and at what times of day?
6. What share of outside trips end with a pee or tiko, grouped by minutes since the last feed? (finding the best post-meal window)

## Rules for changing this model

1. **Add, never change.** New optional fields, new event types and new collections are always fine.
2. **Never rename, remove or repurpose a field.** If a field turns out to be wrong, stop writing it and keep reading it.
3. **Readers must be tolerant.** A missing field, null, and an empty string (PocketBase returns "" for empty optional fields such as ended_at) all mean "unknown". An unknown event type is shown as a generic row.
4. **Schema changes go through migrations** committed in `backend/pb_migrations/`.
5. **One module per event type** in `app/src/events/`, registered in `registry.ts`. Each module exports an `EventDef`: its button label, its yes/no toggles (stored as booleans in `data`; no toggles means one tap logs it) and a one-line summary for the log. Adding a type means adding one module. A type that needs a "time since" tile on the home screen also needs an entry in `tiles` in `app/src/Home.tsx`.

## Access rules (MVP)

Any logged-in family member can read, create and edit `events` and `dogs`. Logged-out visitors can do nothing.

## Planned, not in the MVP

- Sleep, walk and play event types
- `words` collection (the vocabulary library) and a `practice` event type referencing a word
- Weight and vet records
- Possible later additions: `pee_count`, outside location, soft delete, households for sharing between families
