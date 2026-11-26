# Data

## Integrity

Push integrity and cleanup into the database, with foreign key cascades and constraints, rather than app-ordered deletes or application-side locking. A constraint stays within one subsystem's storage.

Nullability on a collection belongs only on a persistence type, so the column stores NULL rather than an empty array. The mapping converts empty to null on write and null to empty on read.

## Rejected shapes

These shapes are rejected without measurement: N+1 queries, unbounded result sets, and per-row round trips. Each one scales with row count when a constant-cost version exists. A profile taken against development data volumes cannot see an N+1.

Set-based work belongs in the database, not in memory after materializing rows.

## Making a read faster

When a read needs to get faster, in order:

1. **Index.** It changes no code and cannot return stale data.
2. **Cache.** The TTL bounds staleness, and a stale entry is replaced when it expires.
3. **Denormalize.** Last resort. A second copy of a value drifts silently and permanently, and a stale column produces no error.
