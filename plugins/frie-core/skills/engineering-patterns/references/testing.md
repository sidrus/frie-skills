# Testing

Contents: TDD, Never weaken a test, Detroit school, Test doubles, What not to test, How to assert, Test structure, Naming, Test data, Harness, Where test code lives, Integration tests, Fixtures. Read all of it.

The language skill specifies that language's test runner, assertion library, Faker library, seed mechanism, and test-name casing. This file holds what is true in all of them.

## TDD

Every behavior a unit test can reach is written test first. Pure data and config files need no test. A bug fix starts with a test that fails because of the bug.

Some code a unit test cannot usefully reach. The domain skill says which code that is and what verifies it instead. **(domain: beyond-unit-tests)**

- Before the first test, state which seams the tests will fake and which collaborators stay real. Wait for the user's answer only when the change adds a new seam. In a run with no user to ask, put the seams in the report.
- Each cycle is red, green, refactor. Exactly one test is red at a time. Never write a second test, or arrange doubles for a later slice, until the current test is green.
- Start with the test even when the types it uses don't exist, because the compile failure is the first red. Add each missing type as a stub whose members fail loudly in the language's way, such as a not-implemented exception or a panic.
- The red run is watched. Execute the failing test and show its failure output before writing any implementation, on every cycle. The red is the test's own assertion failing, or the not-implemented failure raised by the member under test from the act step. A failure in setup, in a different member, or of a different kind is not the red, so fix the test first.
- A test that passes the first time it runs has proven nothing. Break the expectation or the code, watch it fail, and restore it before continuing.
- Implement one member at a time, rerunning after each. No code exists until a failing test needs it.
- Run the red filtered to the new test, using the language skill's filter command. Run the green filtered to the unit tests of the subsystem under change, and all of them pass before the next test is written. Refactor only on green, and add no test during a refactor.
- The full gate runs after the last cycle, and again after every fix until it passes. Integration tests come last.

When covering existing code, take the expected behavior from what the feature is for: the spec, the ticket, the contract's doc comments, or the user's answer. Where none of these states the behavior, ask before writing the test. Never copy a value the code produced into an expectation. The one exception is a pin-down test the user asks for before a refactor, which records current output, says so in its name, and is deleted when the refactor ends.

## Never weaken a test

A failing test is a possible bug to report, never a test to bend toward the code. Never make one pass by deleting it, skipping it, removing or loosening an assertion, changing its expected value to what the code returned, or special-casing its inputs in production code. A test changes only when the requirement it states has changed, and the report says which requirement.

## Detroit school

Tests are classical, not mockist. The unit under test is a behavior, not a class.

- Exercise real collaborators inside the subsystem under test. A test that pulls in several types because they collaborate to produce one behavior is correct, not a violation.
- Assert on the resulting state, not on the interactions that produced it. Interaction verification couples a test to how the code works, so a refactor that preserves behavior breaks the test.
- Design pressure comes from an assertion being awkward to write, not from a mock being awkward to configure.

## Test doubles

- A test double stands in only for another subsystem's contract, or for a dependency that is out of process, nondeterministic, too slow, or unavailable in the test runtime. Everything else is the real type.
- A double is a hand-written fake that records state, such as a fake repository or a capturing publisher. Assert on what it recorded.
- A mocking library is used only where a fake cannot be written for that boundary, and the report says why.
- Verify an interaction in one case only: the call is a command sent across a process boundary and leaves no state to read, such as an HTTP call or a published message. Never verify that a query was called, how many times, or in what order.
- Never assert on a value the test supplied to a double. An assertion must be able to fail because of the code under test.

## What not to test

- No tests for 1:1 mappers, pass-through wrappers, options records, or path literals.
- Test each implementation behind a feature flag directly, with the flag out of the test. Never test the flag library, and never write a test whose only assertion is that new behavior is absent. Tests that covered the behavior before the flag existed stay unchanged and run with the flag at its default, so the fallback path stays verified.
- Don't chase a coverage percentage. If the behaviors are correct, assume the implementation is. Name an accepted coverage gap in the report rather than adding an implementation-detail test to close it.

## How to assert

- Never assert a comparison the test computed. Hand the actual value and the expected value to the assertion library and let it compare. A boolean the system returns is a value, so assert it equals the expected `true` or `false`.
- Assert on observable state, such as the persisted entity, the returned object's typed fields, the captured message, or the exception type and its structured properties.
- Never assert on text written for a human reader or on a serialized form: exception messages, rendered HTML, `ToString()` output, raw JSON or XML, and substring or regex matches against any of them. Rewording any of these breaks the assertion with no change in behavior. Deserialize a payload and assert on its fields. A string-typed field of a returned value is a value, and is asserted by full equality.
  - The one exception is a behavior whose observable output is the text itself, such as a CSV writer, a slug generator, or a wire format, and only when the spec gives the exact expected value. Assert full equality against that value.
- Logs are never an assertion target, structured or not (`FakeLogger`, `caplog`, a substituted logger). If a test needs to know something, the system exposes it through its interfaces.
- When the result is an input carried through unchanged, assert it equals the generated source object. When the result is computed from inputs, those inputs are literals and the expected result is a literal taken from the spec or worked by hand. A test never computes its expected value, because that repeats the code under test.

Right: `assert_equal(order.total, summary.total)`. Wrong: `assert_true(summary.total == order.total)`. Wrong: `assert_equal(summary.total, price * quantity)`, which repeats the implementation's arithmetic.

## Test structure

- A test verifies one behavior. A name that needs "and" is two tests.
- A test body is straight-line arrange, act, assert, with no loops and no conditionals. A set of cases uses the runner's parameterized-test feature.
- Every test builds its own state and passes alone, in any order, and in parallel. No test reads state another test wrote, including statics, files, and database rows.
- A test never sleeps, never reads the system clock, and never waits on a timeout. Time comes from the injected clock `SKILL.md` requires, and asynchronous work is awaited through a completion signal.

## Naming

A test name has three parts in this order: the operation the test calls, the expected behavior, and the condition. The condition is mandatory, such as `When...` or `ByDefault`. `PlaceOrder_ReturnsOutOfStock_WhenStockIsZero` and `PlaceOrder_ReservesStock_ByDefault` are right. `PlaceOrder_FailsWhenStockIsZero` is wrong, because it folds the condition into the behavior. The language skill gives the casing and the separator.

## Test data

Every value a test builds comes from the language's Faker library, through a generator the test seeds. Generated data keeps a test from passing because of one convenient literal.

- A literal appears only where the behavior depends on that exact value: a boundary, a format the code parses, an input the expected result is computed from, two values that must collide or differ, a recorded failing case, or a seed handed to the code under test.
- Every generated value stays inside one equivalence class of the behavior under test. A value that selects a branch, crosses a validation limit, or must be unique gets a constraint on the generator, such as a range, a maximum length, or a uniqueness guarantee. An enum or boolean input that chooses the code path is a literal or a parameterized case, never a random draw.
- Each test draws from its own generator instance with its own seed. No test draws from a global or shared generator, so the values a test gets never depend on test order or parallel execution.
- The seed is new on every run, appears in the output of every failing test, and can be supplied to rerun that test alone with the same values. A failure that cannot be replayed from its seed is a harness defect, and it gets fixed before the test does.
- A failing run is never rerun to get a pass. Replay the seed, find the value that failed, and add that value as a literal case in a new test before fixing the code, because a seed stops reproducing when the Faker library changes version.
- Generators never read the system clock or the machine's locale. Dates are generated relative to the test's fixed clock, and the locale is set explicitly.
- Each domain type gets one generator, placed as Where test code lives says, so a new required property is set in one place. A test overrides only the properties that affect its behavior.
- A value the test must reason about is drawn once, then reused in the arrangement and the assertion, never retyped.

## Harness

- Use a library's intended extension point, such as generator overrides, the dependency injection container's replacement API, or standard-library built-ins, rather than working around it.
- Root-cause a flake empirically. Replay its seed and loop the suite rather than adding a retry.

## Where test code lives

Tests are production code. Shared fakes, builders, and helpers live in one shared test-support module referenced by every test suite, never duplicated across unit and integration suites. The language skill specifies the module's form.

The test-support module stays agnostic of any single consumer. When several projects reference it, a builder for one project's internal domain types stays local to that project's tests rather than being promoted, because promoting it would add that project's reference to every test suite.

## Integration tests

An integration test runs the code against the real thing a unit test fakes. Integration tests live in a separate test project or source set and are not part of the TDD cycle. Run them before claiming done whenever the change touches code they cover. If they cannot run in this environment, the report says so and never describes them as passing. What hosts them, and what they still fake, is the domain skill's decision. **(domain: integration-host)**

## Fixtures

Fixtures stay byte-faithful. Commit the real artifact as received and decode it at read time with its real encoding. A Windows-1252 file decodes as CP1252, never as ISO-8859-1, which mangles 0x80 to 0x9F.

- A fixture file is marked binary for version control, so no tool rewrites its bytes.
- An artifact that holds personal data or secrets is never committed as received. Ask for a scrubbed capture.
