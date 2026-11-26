# Sources

No skill loads this file. It records where each practice in `frie-enterprise` comes from, so a rule can be checked against its source when it is questioned. A rule listed under Preferences is Brandon's own choice and needs no source. Each citation identifies the work and has not been checked against its text.

## Practices

| Rule | Source |
|---|---|
| Entry point, service, and data access layers | Martin Fowler, *Patterns of Enterprise Application Architecture*: Service Layer and Repository |
| Constructor injection, one composition root, and no service locator | Mark Seemann and Steven van Deursen, *Dependency Injection Principles, Practices, and Patterns* |
| Immutable records with decisions in services | Gary Bernhardt, "Functional Core, Imperative Shell" |
| Integrity in database constraints | Martin Kleppmann, *Designing Data-Intensive Applications*, on constraints and on the drift of denormalized copies |
| N+1 queries and unbounded reads rejected | Markus Winand, *SQL Performance Explained* |
| Real managed dependencies in integration tests, and mocks only for unmanaged ones | Vladimir Khorikov, *Unit Testing Principles, Practices, and Patterns* |
| No unit tests over data access | Vladimir Khorikov, the same book, on testing repositories |
| Traces, logs, and metrics correlated through OpenTelemetry | The OpenTelemetry specification and its semantic conventions |
| Metric cardinality as a design constraint | The OpenTelemetry metrics documentation, and Charity Majors, Liz Fong-Jones, and George Miranda, *Observability Engineering* |

## Preferences

- OpenTelemetry from the first commit.
- Index, then cache, then denormalize.
- Endpoint authorization as one parameterized test.
- No stored procedure as a unit under test.
- Empty collections stored as NULL.
