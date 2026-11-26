---
name: standards
description: Domain practices for services and business applications, layered on engineering-patterns. Use before designing, writing, editing, or reviewing code or tests in a deployed service, an API, a worker, or any application over a database.
---

# Enterprise Standards

**Invoke `frie-core:engineering-patterns` first.** This skill is the domain layer for services and business applications. It answers the rules that skill marks **(domain)** and adds the practices that exist only where there is a database, an endpoint, or a deployed process. It never restates the layer under it.

## Domain decisions

| **(domain)** rule in `engineering-patterns` | Decision here |
|---|---|
| How the composition root hands a type its dependencies | Constructor injection from the host's dependency injection container. No type resolves a dependency from the container itself. |
| Whether a state change copies or mutates | A modified copy of the record, in the language's copy idiom. A record is immutable once built. |
| Shapes rejected without measurement | N+1 queries, unbounded result sets, and per-row round trips, per `references/data.md`. |
| What a running system must emit | The OpenTelemetry floor in `references/observability.md`. |
| Code a unit test cannot usefully reach | Data access, which integration tests over the real schema cover, per `references/enterprise-testing.md`. |
| What hosts integration tests | Testcontainers, per `references/enterprise-testing.md`. |

## Read the reference for what you touch

| Touching | Read |
|---|---|
| an endpoint, a service, a repository, or any type that crosses between them | `references/layering.md` |
| a query, a write, a schema, a migration, a cache, or anything that needs to get faster | `references/data.md` |
| a new service, a log call, a span, or a metric | `references/observability.md` |
| any test file | `references/enterprise-testing.md` |

Read the reference **before** the first edit, not as a check afterward.
