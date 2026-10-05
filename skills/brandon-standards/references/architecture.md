# Architecture

General practice, not a description of any one repo.

`SKILL.md` holds the design rules that apply everywhere, and `dotnet-layering.md` holds the mechanical type layering. This file holds structure, state, performance, and observability.

## Layer responsibilities

Three layers, each with one job:

| Layer | Responsibility | Forbidden |
|---|---|---|
| Endpoint | Marshal requests to and from domain services. Validate its own request data types so marshalling can succeed. | Any domain knowledge. Deciding what a failure means, or which domain operation applies. |
| Service | All business logic. | Nothing that belongs to the layers either side of it. |
| Data access | Read and write domain records: a repository under Dapper, the `DbContext` under EF Core. | Any business logic. |

Which types are allowed in each layer's signatures is in `dotnet-layering.md`, and the data-access rules for each library are in `data-access-dapper.md` and `data-access-efcore.md`.

An endpoint may read through data access directly when it makes no decision at all, which is the pure passthrough read. One branch, one normalization, or one rule and a service owns it.

Data access is not unit tested. It delegates to its data source, so a unit test over it asserts that the mapping library still works. Integration tests over the real schema cover it.

## Results, not booleans

A service returns a `Result`. The API translates that into the HTTP response. The error type and the arity are the repo's choice.

A `bool` or a bare `null` return cannot carry why something failed, which forces the endpoint to know that false means "already shipped" here and "out of stock" there. That is domain knowledge in the marshalling layer, so the endpoint ends up owning a rule it is not allowed to own.

## What earns a construct

| Construct | Earned by |
|---|---|
| Interface | Substitution. The practical test is "will I write a fake for this?" An external dependency always qualifies. |
| Record | Pure data. |
| Enum | Two or more members. A single member carries no information, so a `Result` whose error type has one case says only that the call failed, which an exception already says. |
| Static class or `extension(T)` | Pure methods. Purity beats injection, because a total function never needs a seam. |
| Its own class | Any branch or switch arm with a dependency, or with more than trivial behavior. Isolated behavior is easier to reason about and easier to test. |
| Nothing at all | Pass-through and forwarding types. If the body only forwards, the type should not exist. |

One seam per external dependency. Never stack a second interface over an interface that already covers the same seam, because the class between them can only forward.

When variation arrives, abstract the part that varies rather than the stable logic wrapped around it. A price calculator reading rates from several sources keeps its pure calculation static and takes an injected loader for the rates.

A switch is fine while every arm is trivial. As soon as one arm needs a dependency or holds real logic, the arms become their own types.

## DRY

Unconditional. Any duplication gets refactored, because the failure it prevents is a copy and paste bug. There is no rule of three and no exemption for two sites that happen to change for different reasons.

It outranks the convenience of a stable wire shape. If removing the duplication means a response type gains a nested block and consumers have to adjust, that is the cost of the fix.

Extraction must never read worse than the duplication did. When it does, the parameter is wrong rather than the extraction. A boolean argument or a required `null` argument at a call site is an architectural signal: the method is doing two things, or the type is wrong.

## YAGNI

YAGNI, the `SKILL.md` rule against code without a current requirement, does not compete with anything above it. Every structural rule here fires on something that exists right now: a seam a fake needs, a duplicate already in the file, an arm with a real dependency. YAGNI only ever speaks to what does not exist yet. The two never arbitrate the same decision, so there is no priority order to apply between them.

## State and immutability

Records stay dumb. A record holds data and no transition rules, because which transitions are legal is business logic and business logic lives in a service.

A state change is the service copying with `with`. When more than one service needs the same transition rules, those rules become a state machine holding real testable logic: a static class when it can be static, an interface only when it has dependencies worth faking.

## Performance

Reason before measuring. Static analysis of the growth curve comes first, then a measurement validates behavior within a shape already known to be correct. A profile taken against development data volumes cannot see an N+1, so it will report that the wrong shape is fine.

Rejected on sight, no measurement required: N+1 queries, unbounded result sets, per-row round trips. Each one scales with row count when a constant-cost version exists.

Everything else is empirical. Take a measurement whenever one can be taken, and let the number decide.

Set-based work belongs in the database, not in memory after materializing rows.

When a read needs to get faster, in order:

1. **Index.** Costs nothing, risks nothing.
2. **Cache.** Staleness is bounded by the TTL and heals itself.
3. **Denormalize.** Last resort. A second copy of a value drifts silently and permanently, and a stale column produces no error.

For the query-level mechanics behind those choices, read `dotnet-skills:database-performance` and `dotnet-skills:efcore-patterns`. This section decides *which* fix to reach for and in what order; those cover how to write it.

## Observability

Observability is a requirement, not a later phase. OpenTelemetry goes into a service from the first commit, because spans in particular are painful to retrofit once call sites exist.

The floor for any new service:

- Auto-instrumentation for the web framework, the HTTP client, and the database.
- A manual span for every domain operation that can fail or run for an unbounded time.
- Span tags carrying the same correlation identifiers the logs carry.
- `ILogger` routed through OpenTelemetry, so logs and traces correlate instead of living in two systems.

Metrics are earned, not automatic. A metric exists because there is a number worth alerting on, such as throughput, queue depth, or failure rate. One counter per method is noise.

Cardinality is a design constraint. A correlation identifier belongs on a span and in a log line, never as a metric dimension.

For setup, semantic conventions, exporter configuration, and instrumentation API details, read `dotnet-skills:opentelementry-dotnet-instrumentation`, plus `dotnet-skills:aspire-service-defaults` when the shared wiring belongs in one place. This section decides what must be instrumented and what earns a metric; those cover how to wire it.
