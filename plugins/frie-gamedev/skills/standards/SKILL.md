---
name: standards
description: Domain practices for games and mods, layered on engineering-patterns. Use before designing, writing, editing, or reviewing code or tests in a game, a game mod, or any real-time simulation that an engine ticks, in any engine or language.
---

# Game Development Standards

**Invoke `frie-core:engineering-patterns` first.** This skill is the domain layer for games and mods. It answers the rules that skill ends with a domain marker, and adds the practices that exist only where an engine calls the code every tick. It never restates the layer under it. An engine's framework skill, such as `frie-neoforge:standards`, lists that engine's entry points, tick paths, and test runner.

A game's backend service, such as a leaderboard or a matchmaking API, is a service and follows `frie-enterprise:standards` instead.

Before touching a test, read `references/gamedev-testing.md`.

## Domain decisions

| Key | Decision |
|---|---|
| `dependencies` | The engine constructs engine objects, and a parent hands a child what it needs. A decision takes values from the entry point that calls it, per Entry points and Dependencies below. |
| `state-change` | In place for simulation state. A value that leaves the simulation is an immutable copy, per State below. |
| `rejected-shapes` | Unbounded work in a tick path, and a world or scene scan repeated every tick, per Budget below. |
| `observability` | Log lines through the engine's logger, per Logging below. |
| `beyond-unit-tests` | Entry points, which engine-hosted tests verify, and presentation and feel, which playing verifies. |
| `integration-host` | The engine's own test runner on a headless instance, per `references/gamedev-testing.md`. |

## Entry points and decisions

The engine's callbacks are the entry-point layer. Each one reads engine state, calls a decision, and applies the result to the engine.

- A decision is a plain class or a static pure function that takes values, so it is testable without a running engine.
- Where a decision has to read the world, it takes the narrowest interface that exposes what it reads. That interface is the seam a state-based fake implements.
- A decision never reaches for an engine global, a singleton, or the scene tree. The entry point reads those and passes the values in.

## Dependencies

The engine constructs its own objects, so an engine object never receives constructor arguments from our code.

- A scene or object hierarchy is self-contained where it can be. When a child needs something from outside itself, its parent supplies it, by setting a reference or a callback on the child or by connecting to the child's event.
- Siblings never reference each other. Their common ancestor passes each one what it needs.
- A global access point, such as an autoload, a singleton, or a static registry, is for a system that manages its own data and never changes another object's data. It is the exception, and passing the dependency in is the default.

## Time

A tick path is any code the engine calls every frame or every simulation step, and everything that code calls.

- The simulation advances in fixed steps. Simulation logic runs in the engine's fixed-rate callback. The render-rate callback only presents, interpolating between simulation states where the engine supports it.
- Simulation logic takes the step's delta or tick count as a value from the entry point that calls it. It never reads the wall clock, because a simulation driven by real time gives different results on different machines.
- A duration in simulation logic is a count of ticks or a sum of deltas, never a difference of two timestamps.
- Code that needs the real date or time, such as a save timestamp, takes it from an injected clock like any other code.

## State

- Simulation state changes in place inside a tick path.
- A value that leaves the simulation is an immutable copy: a message to another subsystem, a network payload, a save record, or anything a contract returns. The receiver can then hold it across ticks without seeing it change.
- A collection is never changed while a tick iterates it. Additions and removals are queued and applied at one fixed point in the tick.
- Where update order between objects affects the result, the order is explicit in code and never left to the engine's default or to a hash collection's iteration order.
- State that outlives a session goes through the engine's save system. A static field that holds session state is cleared when the session ends, because the process can start another session.
- A value that is tuned by playing is data the engine loads, such as a resource or an exposed property, and not a constant in code.

## Determinism

The same starting state, the same inputs, and the same seed produce the same result.

- Randomness in simulation logic comes from a seeded generator the simulation owns and passes in. It never comes from a global or time-seeded generator.
- A simulation that must match across machines, such as lockstep networking or a replay, does not rely on floating-point results being identical between platforms.

## Budget

All the work of one tick fits inside one step, which is 16.6 ms at 60 steps a second. Work that cannot fit is spread across ticks, or runs on another thread and applies its result on the main thread.

These shapes are rejected without measurement, because each costs more as the world grows when a constant-cost version exists:

- Unbounded work in a tick path, such as a loop over every entity in the world.
- A world or scene scan repeated every tick, including a lookup by name or path. Find the object once and keep the reference.

Everything else is empirical, measured with the engine's profiler on the slowest hardware the game targets:

- In a garbage-collected runtime, a tick path reuses a collection its owner holds, and avoids boxing, closures, and string building. Pool an object type when the profiler shows collections from its churn.
- Lay out hot data contiguously in processing order when the profiler shows the tick is bound by memory access.

## Threads

Engine state is touched only from the engine's main thread. Work that runs on another thread hands its result to the main thread before the result touches the world.

## Authority

In a networked game, the authoritative side alone decides the game state, which is the server in a client-server game.

- A client sends its inputs, never an outcome. The authoritative side validates each input against its own state before acting on it.
- The client predicts and presents. Its prediction is replaced by the authoritative result.

## Logging

Logging goes through the engine's logger, and it is the whole of a game's observability. The engine's profiler and debug overlays cover what a service would use metrics and traces for. No log call sits in a tick path at a level that is enabled by default.
