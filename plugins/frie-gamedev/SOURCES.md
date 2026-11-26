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
| Explicit update order, and no change to a collection while a tick iterates it | *Game Programming Patterns*, Update Method: https://gameprogrammingpatterns.com/update-method.html |
| Self-contained scenes, a parent that supplies what a child needs, and siblings mediated by an ancestor | Godot documentation, Scene organization: https://docs.godotengine.org/en/stable/tutorials/best_practices/scene_organization.html |
| Floating-point differences between platforms break determinism, and a random generator needs a fixed seed | Glenn Fiedler, "Deterministic Lockstep": https://gafferongames.com/post/deterministic_lockstep/ |

## Partly supported

| Rule | Source and gap |
|---|---|
| Game logic runs in the fixed-rate callback | Godot documentation, Idle and physics processing: https://docs.godotengine.org/en/stable/tutorials/scripting/idle_and_physics_processing.html. The page confirms the fixed rate of 60 a second and the variable frame rate. It scopes the fixed callback to physics work and does not say all game logic belongs there. |
| Logic runs on the authoritative side | NeoForge documentation, Sides: https://docs.neoforged.net/docs/concepts/sides/. The page confirms that game logic runs on the logical server. It says nothing about validating client input or about client prediction. |

## Not checked

| Rule | Intended source |
|---|---|
| No allocation per entity per tick in a garbage-collected runtime | Unity manual, on managed memory and garbage collection. Its page moved and the new one was not read. A search result quoted the manual as advising zero bytes allocated per frame. |
| A global access point for a system that owns its own data | Godot documentation, Autoloads versus regular nodes. The address tried returned 404. |
| Client input is untrusted and the client only predicts | No source read. |

## Preferences

- Tuning values as data.
- No log call in a tick path at a default level.
- A literal seed in every simulation test.
- No automated test over rendering, audio, animation, or feel.
