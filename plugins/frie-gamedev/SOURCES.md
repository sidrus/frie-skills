# Sources

No skill loads this file. It records where each practice in `frie-gamedev` comes from, so a rule can be checked against its source when it is questioned. A rule listed under Preferences is Brandon's own choice and needs no source.

## Checked against the page

Each of these was read on 2026-11-26 and supports the rule beside it.

| Rule | Source |
|---|---|
| Fixed simulation step, decoupled from rendering | Robert Nystrom, *Game Programming Patterns*, Game Loop: https://gameprogrammingpatterns.com/game-loop.html |
| A variable step makes the game non-deterministic | The same chapter |
| Fixed delta with an accumulator, and rendering that interpolates | Glenn Fiedler, "Fix Your Timestep!": https://gafferongames.com/post/fix_your_timestep/ |
| Pool objects that spawn and die often | *Game Programming Patterns*, Object Pool: https://gameprogrammingpatterns.com/object-pool.html |
| Contiguous hot data in processing order | *Game Programming Patterns*, Data Locality: https://gameprogrammingpatterns.com/data-locality.html |
| A global access point is the exception, and passing the dependency in is the default | *Game Programming Patterns*, Service Locator: https://gameprogrammingpatterns.com/service-locator.html |
| A global access point for a system that manages its own data and no other object's | Godot documentation, Autoloads versus regular nodes: https://docs.godotengine.org/en/stable/tutorials/best_practices/autoloads_versus_regular_nodes.html |
| Explicit update order, and no change to a collection while a tick iterates it | *Game Programming Patterns*, Update Method: https://gameprogrammingpatterns.com/update-method.html |
| Self-contained scenes, a parent that supplies what a child needs, and siblings mediated by an ancestor | Godot documentation, Scene organization: https://docs.godotengine.org/en/stable/tutorials/best_practices/scene_organization.html |
| Floating-point differences between platforms break determinism, and a random generator needs a fixed seed | Glenn Fiedler, "Deterministic Lockstep": https://gafferongames.com/post/deterministic_lockstep/ |
| The server alone decides the game state, and clients send inputs | Gabriel Gambetta, "Client-Server Game Architecture": https://gabrielgambetta.com/client-server-game-architecture.html |
| Measure with a profiler before optimizing | Godot documentation, General optimization tips: https://docs.godotengine.org/en/stable/tutorials/performance/general_optimization.html |

## Partly supported

| Rule | Source and gap |
|---|---|
| Simulation logic runs in the fixed-rate callback | Godot documentation, Idle and physics processing: https://docs.godotengine.org/en/stable/tutorials/scripting/idle_and_physics_processing.html. The page confirms the fixed rate of 60 a second and the variable frame rate. It scopes the fixed callback to physics work and does not say all simulation logic belongs there. |
| Avoid boxing, closures, and string building in a tick path, and pool churned objects | Unity manual, Optimizing your code for managed memory: https://docs.unity3d.com/Manual/performance-optimizing-code-managed-memory.html. The page supports each of those. It was not read as saying to reuse collections, which came from a search result quoting another page of the manual. Unity's collector differs from the .NET and JVM collectors, which is why this rule is empirical here and not a rejected shape. |

## Preferences

- Tuning values as data.
- No log call in a tick path at a default level.
- A literal seed in every simulation test.
- No automated test over rendering, audio, animation, or feel.
- Measuring on the slowest target hardware.
