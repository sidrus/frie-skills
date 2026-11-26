---
name: standards
description: Domain practices for services and business applications, layered on engineering-patterns. Use before designing, writing, editing, or reviewing code or tests in a deployed service, an API, a worker, or any application over a database.
---

# Enterprise Standards

**Invoke `frie-core:engineering-patterns` first.** This skill is the domain layer for services and business applications. It answers the rules that skill ends with a domain marker, and adds the practices that exist only where there is a database, an endpoint, or a deployed process. It never restates the layer under it.

Before touching a test, read `references/enterprise-testing.md`.

## Domain decisions

| Key | Decision |
|---|---|
| `dependencies` | Constructor injection from the host's dependency injection container, per Dependencies below. |
| `state-change` | A modified copy. A record is immutable once built, and a service produces the copy in the language's copy idiom and hands it to data access. |
| `rejected-shapes` | N+1 queries, unbounded result sets, and per-row round trips, per Performance below. |
| `observability` | OpenTelemetry traces, logs, and metrics, per Observability below. |
| `beyond-unit-tests` | Data access, which integration tests over the real schema verify. |
| `integration-host` | Testcontainers, per `references/enterprise-testing.md`. |

## Data access

Data access is the third layer of a subsystem, beside the entry point and the service.

| Layer | Responsibility | Forbidden |
|---|---|---|
| Data access | Read and write domain records, through a repository or the ORM's own context. | Any business logic. |

- Each subsystem owns its data access, and a persistence type never leaves that layer.
- An entry point may read through data access directly when it makes no decision at all, which is the pure passthrough read. One branch, one normalization, or one rule and a service owns it.
- Data access is not unit tested. It delegates to its data source, so a unit test over it asserts that the mapping library still works.

## Dependencies

A type declares what it depends on in its constructor, and the host's dependency injection container supplies it. A subsystem's registration is the only code that tells the container about the subsystem's types. No type takes the container, or a service locator over it, as a dependency.

## Integrity

- Push integrity and cleanup into the database, with foreign key cascades and constraints, rather than app-ordered deletes or application-side locking. A constraint stays within one subsystem's storage.
- Nullability on a collection belongs only on a persistence type, so the column stores NULL rather than an empty array. The mapping converts empty to null on write and null to empty on read.

## Performance

These shapes are rejected without measurement: N+1 queries, unbounded result sets, and per-row round trips. Each one scales with row count when a constant-cost version exists. A profile taken against development data volumes cannot see an N+1.

Set-based work belongs in the database, not in memory after materializing rows.

When a read needs to get faster, in order:

1. **Index.** It changes no code and cannot return stale data.
2. **Cache.** The TTL bounds staleness, and a stale entry is replaced when it expires.
3. **Denormalize.** Last resort. A second copy of a value drifts silently and permanently, and a stale column produces no error.

## Observability

Observability is a requirement for any deployed service, such as an API or a worker, not a later phase. OpenTelemetry goes in from the first commit, because spans in particular are hard to add once call sites exist. Each language reference specifies the packages that provide it.

The floor for any new service:

- Auto-instrumentation for the web framework, the HTTP client, and the database.
- A manual span for every domain operation that can fail or run for an unbounded time.
- Span tags holding the same correlation identifiers the logs hold.
- The logging framework routed through OpenTelemetry, so logs and traces correlate instead of living in two systems.

Metrics are not automatic. A metric exists because there is a number worth alerting on, such as throughput, queue depth, or failure rate. One counter per method is noise.

Cardinality is a design constraint. A correlation identifier belongs on a span and in a log line, never as a metric dimension.

## Canonical shape

Match this shape rather than re-deriving it from the rules. It is the shape in the `engineering-patterns` architecture reference with each subsystem's data access added.

```
Orders/                         subsystem
  OrderLookup                   contract: the operation other subsystems call
  OrderSummary                  contract: the record OrderLookup returns
  OrderPlaced                   contract: the event Orders publishes
  OrdersRegistration            contract: registration, the only code that registers Orders types
  Order                         internal domain record, used by both features below
  OrderRepository               internal data access over the Orders schema
  OrderEntity                   internal persistence type
  Placement/
    PlaceOrderEndpoint          entry point: marshals the request and calls the service
    OrderPlacementService       service: decides, then writes through OrderRepository
  Lookup/
    OrderLookupService          implements OrderLookup
Inventory/                      subsystem, depends on the Orders contract only
  StockLevels                   contract
  InventoryRegistration         contract: registration
  Reservation/
    OrderPlacedHandler          entry point: consumes OrderPlaced
    ReservationService          service: calls OrderLookup
    StockRepository             internal data access over the Inventory schema
Host/
  Startup                       composition root: calls OrdersRegistration and InventoryRegistration
tests/
  TestSupport/
    FakeOrderLookup             state-based fake of the Orders contract
  Inventory/
    ReservationServiceTests     real Reservation internals with FakeOrderLookup
```
