# Testing

The `engineering-patterns` testing reference holds the rules for every test. This file adds the ones that exist only where there is a database or an endpoint.

## Integration tests

Integration tests use Testcontainers for managed dependencies such as a database or cache. Mock only unmanaged externals, meaning an identity provider or a third-party API. They need Docker.

Data access has no unit tests, per `layering.md`, so integration tests over the real built schema are what verify it.

## What not to test

- No persistence round-trip or schema-confirmation tests, meaning save-then-read-back asserting a column value. The database does its job. Schema and migration changes are verified transitively, because behavior tests running against the real built schema fail loudly when the DDL is wrong.
- A stored procedure is never the unit under test. It is exercised through the code that calls it, so a test class named after a procedure is the anti-pattern. A procedure nothing calls is dead and gets deleted, unless it was built recently for documented backlog work whose caller is still coming.
- Endpoint authorization is one parameterized test of role to status code, with no side-effect assertions.
