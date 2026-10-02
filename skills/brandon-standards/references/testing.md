# Testing

## TDD

Default to TDD for anything with real behavior. Agree the seams first, then go red to green. Pure data or config files need no test.

The red run is watched. Execute the failing test and show its failure output before writing any implementation, on every cycle. Arranging test doubles for several slices up front, with no intervening red run, reads as skipping TDD.

## Detroit school

Tests are classical, not mockist. The unit under test is a behavior, not a class.

- Exercise real collaborators inside the boundary. A test that pulls in several types because they collaborate to produce one behavior is correct, not a violation.
- Assert on the resulting state, not on the interactions that produced it. Interaction verification couples a test to how the code works, so a refactor that preserves behavior breaks the test.
- A test double appears only where the boundary is real: out of process, nondeterministic, or too slow. Everything in process gets the real type or a state-based fake.
- Design pressure comes from an assertion being awkward to write, not from a mock being awkward to set up.

## What not to test

- No tests for 1:1 mappers, pass-through wrappers, options records, or path literals.
- No feature-flag toggle tests. Test the implementations behind the flag, and never write a flag-off test.
- No persistence round-trip or schema-confirmation tests, meaning save-then-read-back asserting a column value. The database does its job. Schema and migration changes are verified transitively, because behavior tests running against the real built schema fail loudly when the DDL is wrong.
- Endpoint authorization is one Theory of role to status code, with no side-effect assertions.
- Don't chase a coverage percentage. If the behaviors are correct, assume the implementation is. Name an accepted coverage gap rather than adding an implementation-detail test to close it.

## How to assert

- Assert on values, never on booleans.
- Assert against the generated source object rather than a re-derived expectation.
- Use a library's intended extension point (generator overrides, DI `RemoveAll`, BCL built-ins) rather than working around it.
- Root-cause a flake empirically. Loop the suite and probe the generator rather than adding a retry.

## Test doubles

- Prefer hand-written, state-based fakes for in-process collaborators: a fake repository, a capturing publisher, a recording processor.
- A mocking library's `.Received()` is reserved for true external boundaries, such as an HTTP gateway, a cache publish, or a feature-flag client, plus orchestrator seams that have no state-based alternative.
- A non-obvious test double gets a short XML doc saying why the type exists. This is one of the few comment exceptions.

## Where test code lives

Tests are production code. Shared fakes, builders, and helpers live in one shared TestSupport project referenced by every test project, never duplicated across unit and integration projects.

TestSupport stays agnostic of any single consumer. When several projects reference it, a builder for one project's internal domain types stays local to that project's test project rather than being promoted, because promoting it would drag that project's reference into every test project.

## Integration tests

Testcontainers for managed dependencies such as a database or cache. Mock only unmanaged externals, meaning an identity provider or a third-party API. Integration tests live in a separate `*.IntegrationTests` project, need Docker, and are not run casually.

## Naming

.NET test names are strictly three-part: `Method_ExpectedBehavior_Condition`. The condition segment is mandatory, such as `When...` or `ByDefault`. A two-part name that folds the condition into the behavior is not acceptable.

## Fixtures

Fixtures stay byte-faithful. Commit the real artifact as received and decode it at read time.

## Test data

Every value a test builds comes from Faker: Bogus in .NET, Faker in Python. Generated data shows the behavior holds for any valid input, where a hand-picked literal shows it holds for one.

- A literal appears only where the behavior under test depends on that exact value: a boundary, a format the code parses, or two values that must collide or differ. Everything else in the arrangement is generated, including names, identifiers, dates, and amounts.
- Each domain type gets one `Faker<T>` in the test project, so a new required property is set in one place. A test overrides only the properties its behavior depends on.
- A value the test must reason about is drawn from Faker first, then reused in the arrangement and the assertion, never retyped.
- Assertions compare against the generated object, per "How to assert", so a generated value never has to be restated.
