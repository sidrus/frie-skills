# Testing

The `engineering-patterns` testing reference holds the rules for every test. This file adds the ones that exist only where an engine runs the code.

## What each kind of test covers

| Code | Verified by |
|---|---|
| Decisions | Unit tests, written test-first, with no engine running. A decision that reads the world gets a state-based fake of the narrow interface it takes. |
| Entry points, and behavior that needs a real world or scene | Engine-hosted tests in the engine's own test runner, on a headless instance. The framework skill specifies the runner. |
| Rendering, audio, animation, and feel | Playing the game. No automated test asserts on them, and a tuning value has no test because it is data. |

## Simulation tests

- A test that steps the simulation fixes the seed and advances a fixed number of ticks with a fixed delta. It never sleeps and never waits on real time.
- The seed is a literal in the test, so a failure reruns with the same sequence.
- A test asserts on simulation state after the ticks, never on a frame count or on timing.
