# Observability

Observability is a requirement for any deployed service, such as an API or a worker, not a later phase. OpenTelemetry goes in from the first commit, because spans in particular are hard to add once call sites exist. Each language reference specifies the packages that provide it.

The floor for any new service:

- Auto-instrumentation for the web framework, the HTTP client, and the database.
- A manual span for every domain operation that can fail or run for an unbounded time.
- Span tags holding the same correlation identifiers the logs hold.
- The logging framework routed through OpenTelemetry, so logs and traces correlate instead of living in two systems.

Metrics are not automatic. A metric exists because there is a number worth alerting on, such as throughput, queue depth, or failure rate. One counter per method is noise.

Cardinality is a design constraint. A correlation identifier belongs on a span and in a log line, never as a metric dimension.
