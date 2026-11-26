# Simulation

A tick path is any code the engine calls every frame or every simulation step, and everything that code calls. The framework skill lists the engine's tick paths.

## Time

- The simulation advances in fixed steps. Game logic runs in the engine's fixed-rate callback, and the render-rate callback only presents, interpolating between simulation states where the engine supports it.
- Game logic takes the step's delta or tick count as a value from the entry point that calls it. It never reads the wall clock, including through an injected clock, because a simulation driven by real time gives different results on different machines.
- A duration in game logic is a count of ticks or a sum of deltas, never a difference of two timestamps.

## State

- Simulation state changes in place inside a tick path. Producing a modified copy of an entity every tick allocates for every entity.
- A value that leaves the simulation is an immutable copy: a message to another subsystem, a network payload, a save record, or anything a contract returns. The receiver can then hold it across ticks without seeing it change.
- A collection is never changed while a tick iterates it. Additions and removals are queued and applied at one fixed point in the tick.
- Where update order between objects affects the result, the order is explicit in code and never left to the engine's default or to a hash collection's iteration order.

## Determinism

The same starting state, the same inputs, and the same seed produce the same result.

- Randomness in game logic comes from a seeded generator the simulation owns and passes in. It never comes from a global or time-seeded generator.
- A simulation that must match across machines, such as lockstep networking or a replay, does not rely on floating-point results being identical between platforms.

## Budget

- All the work of one tick fits inside one step, which is 16.6 ms at 60 steps a second. Work that cannot fit is spread across ticks, or runs on another thread and applies its result on the main thread.
- Measure with the engine's profiler on the slowest hardware the game targets. A development machine hides a blown budget.

These shapes are rejected without measurement, because each costs more as the world grows when a constant-cost version exists:

- Unbounded work in a tick path, such as a loop over every entity in the world.
- A world or scene scan repeated every tick, including a lookup by name or path. Find the object once and keep the reference.
- An allocation per entity per tick in a garbage-collected runtime. Reuse a collection held by the owner, avoid query pipelines, closures, boxing, and string building in a tick path, and pool objects that spawn and die often.

Everything else about performance is empirical. Laying out hot data contiguously in processing order is the fix when a profile shows the tick is bound by memory access, and not before.
