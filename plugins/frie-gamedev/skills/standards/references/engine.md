# Engine

## Entry points and decisions

The engine's callbacks are the entry-point layer. Each one reads engine state, calls a decision, and applies the result to the engine. The framework skill lists the engine's entry points.

- A decision is a plain class or a static pure function that takes values, so it is testable without a running engine.
- Where a decision has to read the world, it takes the narrowest interface that exposes what it reads. That interface is the seam a state-based fake implements.
- A decision never reaches for an engine global, a singleton, or the scene tree. The entry point reads those and passes the values in.

## Dependencies

The engine constructs its own objects, so an engine object never receives constructor arguments from our code.

- A scene or object hierarchy is self-contained where it can be. When a child needs something from outside itself, its parent supplies it, by setting a reference or a callback on the child or by connecting to the child's event.
- Siblings never reference each other. Their common ancestor passes each one what it needs.
- A global access point, such as an autoload, a singleton, or a static registry, is for a system that owns its own data and that most of the game uses. It is the exception, and passing the dependency in is the default.

## Threads

Engine state is touched only from the engine's main thread. Work that runs on another thread hands its result to the main thread before the result touches the world.

## Authority

In a networked game, logic that changes the world runs on the authoritative side, which is the server in a client-server game.

- Input from a client is untrusted. The authoritative side validates it against its own state before acting on it.
- The client predicts and presents. It never decides an outcome that other players see.

## Saved state and tuning

- State that outlives a session goes through the engine's save system. A static field that holds session state is cleared when the session ends, because the process can start another session.
- A value that is tuned by playing is data the engine loads, such as a resource or an exposed property, and not a constant in code.

## Logging

Logging goes through the engine's logger, and it is the whole of a game's observability. The engine's profiler and debug overlays cover what a service would use metrics and traces for. No log call sits in a tick path at a level that is enabled by default.
