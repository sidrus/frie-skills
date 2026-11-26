# Sources

No skill loads this file. It records where each practice in `frie-enterprise` comes from, so a rule can be checked against its source when it is questioned. A rule listed under Preferences is Brandon's own choice and needs no source.

## Checked against the page

Each of these was read on 2026-11-26 and supports the rule beside it.

| Rule | Source |
|---|---|
| A service layer that holds the business operations | Martin Fowler, *Patterns of Enterprise Application Architecture*, Service Layer: https://martinfowler.com/eaaCatalog/serviceLayer.html |
| Data access as a repository over domain records | The same catalog, Repository: https://martinfowler.com/eaaCatalog/repository.html |
| One composition root, and no other code references the container | Mark Seemann, "Composition Root": https://blog.ploeh.dk/2011/07/28/CompositionRoot/ |
| Constructor injection, and no service locator | Mark Seemann, "Service Locator is an Anti-Pattern": https://blog.ploeh.dk/2010/02/03/ServiceLocatorisanAnti-Pattern/ |
| Real managed dependencies in integration tests, and mocks only for unmanaged ones | Vladimir Khorikov, "When to Mock": https://enterprisecraftsmanship.com/posts/when-to-mock/ |
| Logs correlated with traces through trace and span identifiers | OpenTelemetry documentation, Logs: https://opentelemetry.io/docs/concepts/signals/logs/ |
| Metric cardinality as a design constraint | OpenTelemetry documentation, Metrics: https://opentelemetry.io/docs/concepts/signals/metrics/ |

## Partly supported

| Rule | Source and gap |
|---|---|
| Immutable records with decisions in services | Gary Bernhardt, "Functional Core, Imperative Shell": https://www.destroyallsoftware.com/screencasts/catalog/functional-core-imperative-shell. Only the page's summary of the screencast was read, and it supports the functional core being testable without test doubles. |
| N+1 queries rejected | Markus Winand, *Use The Index, Luke*: https://use-the-index-luke.com/sql/join/nested-loops-join-n1-problem. The page confirms the cost grows with the row count. It does not say a development profile hides it. |
| Testcontainers as the integration test host | https://testcontainers.com/. The page confirms throwaway real dependencies in containers. It does not compare them with in-memory substitutes. |

## Not checked

| Rule | Intended source |
|---|---|
| Integrity in database constraints, and denormalized copies that drift | Martin Kleppmann, *Designing Data-Intensive Applications*. The book was not read. |
| No unit tests over data access | Vladimir Khorikov, *Unit Testing Principles, Practices, and Patterns*. The book was not read. |

## Preferences

- OpenTelemetry from the first commit.
- Index, then cache, then denormalize.
- Endpoint authorization as one parameterized test.
- No stored procedure as a unit under test.
- Empty collections stored as NULL.
