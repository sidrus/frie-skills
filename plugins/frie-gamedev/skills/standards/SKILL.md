---
name: standards
description: Domain practices for games and mods, layered on engineering-patterns. Use before designing, writing, editing, or reviewing code or tests in a game, a game mod, or any real-time simulation that an engine ticks, in any engine or language.
---

# Game Development Standards

**Invoke `frie-core:engineering-patterns` first.** This skill is the domain layer for games and mods. It answers the rules that skill marks **(domain)** and adds the practices that exist only where an engine calls the code every tick. It never restates the layer under it. An engine's framework skill, such as `frie-neoforge:standards`, lists that engine's entry points, tick paths, and test runner.

A game's backend service, such as a leaderboard or a matchmaking API, is a service and follows `frie-enterprise:standards` instead.

## Domain decisions

| **(domain)** rule in `engineering-patterns` | Decision here |
|---|---|
| How the composition root hands a type its dependencies | The engine constructs engine objects, and a parent hands a child what it needs. A decision receives values from the entry point that calls it, per `references/engine.md`. |
| Whether a state change copies or mutates | Simulation state changes in place. A value that leaves the simulation, such as a message, a save record, or a contract's return, is an immutable copy, per `references/simulation.md`. |
| Shapes rejected without measurement | Unbounded work in a tick path, a world or scene scan repeated every tick, and an allocation per entity per tick, per `references/simulation.md`. |
| What a running system must emit | Log lines through the engine's logger, per `references/engine.md`. |
| Code a unit test cannot usefully reach | Entry points, which engine-hosted tests cover, and presentation and feel, which playing verifies, per `references/gamedev-testing.md`. |
| What hosts integration tests | The engine's own test runner in a headless instance, per `references/gamedev-testing.md`. |

## Read the reference for what you touch

| Touching | Read |
|---|---|
| anything a tick path runs, or anything that reads time, randomness, or simulation state | `references/simulation.md` |
| an engine callback, a scene or object hierarchy, networking, saved state, or a log call | `references/engine.md` |
| any test file | `references/gamedev-testing.md` |

Read the reference **before** the first edit, not as a check afterward.
