# Testing

Each language plugin's `standards` reference specifies that language's test runner, assertion library, Faker library, and test-name casing. This file holds what is true in all of them.

## TDD

Default to TDD for any behavior a unit test can reach. Agree the seams first, then go red to green. Pure data or config files need no test.

Some code a unit test cannot usefully reach. The domain skill says which code that is and what verifies it instead. **(domain: beyond-unit-tests)**

The red run is watched. Execute the failing test and show its failure output before writing any implementation, on every cycle. Arranging test doubles for several slices up front, with no intervening red run, reads as skipping TDD.

Start with the test even when the types it uses don't exist, because the compile failure is the first red. Add each missing type as a stub whose members throw, and rerun until the failures are behavior failures. Then implement one member at a time, rerunning after each. No code exists until a failing test needs it, and integration tests come last.

Run the red narrowly, with one filtered run per cycle using the language reference's filter command. The full gate runs once, at the end.

When covering existing code, take the expected behavior from what the feature is for, never from reading the implementation. A failure is a possible bug to report, not a test to bend toward the code.

## Detroit school

Tests are classical, not mockist. The unit under test is a behavior, not a class.

- Exercise real collaborators inside the subsystem under test. A test that pulls in several types because they collaborate to produce one behavior is correct, not a violation.
- Assert on the resulting state, not on the interactions that produced it. Interaction verification couples a test to how the code works, so a refactor that preserves behavior breaks the test.
- A test double appears only where the boundary is real: another subsystem's contract, or a dependency that is out of process, nondeterministic, too slow, or unavailable in the test runtime. Everything else in process gets the real type or a state-based fake.
- Design pressure comes from an assertion being awkward to write, not from a mock being awkward to configure.

## What not to test

- No tests for 1:1 mappers, pass-through wrappers, options records, or path literals.
- No feature-flag toggle tests. Test the implementations behind the flag, and never write a flag-off test.
- Don't chase a coverage percentage. If the behaviors are correct, assume the implementation is. Name an accepted coverage gap rather than adding an implementation-detail test to close it.

## How to assert

- Assert on values, never on booleans. Compare the actual value to the expected one in the assertion library, rather than computing a comparison and asserting it is true.
- Assert on observable state, such as the persisted entity, the returned object's typed fields, the captured message, or the exception type and its structured properties. Never assert on strings, including exception messages, log output, rendered HTML, serialized payloads, `ToString()` output, and substring or regex matches against any of them. Rewording any of these breaks a string assertion with no change in behavior.
  - The one exception is a behavior whose observable output is the string itself, such as a CSV writer, a slug generator, or a wire format, and only when the spec gives the exact expected value. Assert full equality against that value.
- Logs are never an assertion target, structured or not (`FakeLogger`, `caplog`, a substituted logger). If a test needs to know something, the system exposes it through its interfaces.
- Assert against the generated source object rather than a re-derived expectation.

## Harness

- Use a library's intended extension point (generator overrides, the DI container's replacement API, standard-library built-ins) rather than working around it.
- Root-cause a flake empirically. Loop the suite and probe the generator rather than adding a retry.

## Test doubles

- Prefer hand-written, state-based fakes for in-process collaborators: a fake repository, a capturing publisher, a recording processor.
- A mocking library's interaction verification is reserved for true external boundaries, such as an HTTP gateway, a cache publish, or a feature-flag client, plus orchestrator seams that have no state-based alternative.

## Where test code lives

Tests are production code. Shared fakes, builders, and helpers live in one shared test-support module referenced by every test suite, never duplicated across unit and integration suites. The language reference specifies the module's form.

The test-support module stays agnostic of any single consumer. When several projects reference it, a builder for one project's internal domain types stays local to that project's tests rather than being promoted, because promoting it would add that project's reference to every test suite.

## Integration tests

An integration test runs the code against the real thing a unit test fakes. Integration tests live in a separate test project or source set and are not run casually. What hosts them, and what they still fake, is the domain skill's decision. **(domain: integration-host)**

## Naming

Test names are strictly three-part: the unit, the expected behavior, and the condition. The condition segment is mandatory, such as `When...` or `ByDefault`. A two-part name that folds the condition into the behavior is not acceptable. The language reference gives the casing.

## Fixtures

Fixtures stay byte-faithful. Commit the real artifact as received and decode it at read time with its real encoding. A Windows-1252 file decodes as CP1252, never as Latin-1, which mangles 0x80 to 0x9F.

## Test data

Every value a test builds comes from the language's Faker library. Generated data shows the behavior holds for any valid input, where a hand-picked literal shows it holds for one.

- A literal appears only where the behavior under test depends on that exact value: a boundary, a format the code parses, two values that must collide or differ, or a seed that makes a run repeatable. Everything else in the arrangement is generated, including names, identifiers, dates, and amounts.
- Each domain type gets one generator, placed as Where test code lives says, so a new required property is set in one place. A test overrides only the properties that affect its behavior.
- A value the test must reason about is drawn from Faker first, then reused in the arrangement and the assertion, never retyped.
