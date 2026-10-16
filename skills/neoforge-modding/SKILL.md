---
name: neoforge-modding
description: NeoForge Minecraft mod conventions, layered on the brandon-standards Java rules. Use when working in a NeoForge mod (a neoforge.mods.toml or the net.neoforged.moddev Gradle plugin), or for questions about mod registries, events, client and server sides, data generation, GameTests, or mixins.
---

# NeoForge Modding

**Invoke `frie-skills:brandon-standards` first and read its `java.md`.** That chain also loads `engineering-patterns`. This skill adds what is specific to a mod and names the shared rules a mod expresses differently. It never restates them.

## Version

Read `minecraft_version` and `neo_version` from `gradle.properties` before writing mod code, then read the reference for that NeoForge version. It gives the version's APIs for events, registration, data generation, and GameTests.

| `neo_version` | Reference |
|---|---|
| 21.0 and 21.1 (Minecraft 1.21 and 1.21.1) | `references/neoforge-21.1.md` |
| 21.4 and later (Minecraft 1.21.4 onward) | `references/neoforge-21.4.md` |

Registries, events, networking, data generation, GameTests, and serialization APIs all change between versions. An API the reference does not name, or a version with no reference, is looked up on `docs.neoforged.net` for that exact version rather than from memory. Vanilla Minecraft has no published API documentation, so its behavior comes from the decompiled sources that ModDevGradle attaches to the workspace, with Parchment parameter names where the repo configures Parchment.

## Entry points and decisions

Minecraft's callbacks are the entry-point layer: `Block`, `Item`, `BlockEntity`, and `Entity` overrides, event subscribers, commands, and payload handlers. Each one reads game state, calls a decision, and applies the result. The decision lives in a plain class or a static pure function that takes values, so it is testable without a running world.

- A decision takes the narrowest vanilla interface it needs, such as `BlockGetter`, `LevelReader`, `LevelWriter`, or `LevelAccessor`, rather than `Level` or `ServerLevel`. That interface is the seam a state-based fake implements.
- Override and event-handler signatures are dictated by Minecraft and NeoForge, so the signature limits do not apply to them.
- An event subscriber's class and handler methods are `public`, because the event bus requires it.

## Layout

Packages are named for features (`portal`, `dimension`), never for kinds of game object (`block`, `item`). Client-only code for a feature sits in that feature's `client` subpackage, such as `portal.client`.

## Registration

- Every registry object is registered through a `DeferredRegister`. Each feature package owns the registers for its own objects and exposes one `register(IEventBus)` method, which the `@Mod` class calls.
- A registry object is constructed only inside its supplier, and read through its holder after registration completes.
- Datapack registry content such as dimensions, biomes, and worldgen features is data, not a `DeferredRegister` entry.
- A lookup derived from registered objects that never changes afterward is built once during common setup through `enqueueWork`.

## Sides

- Code that references `net.minecraft.client` classes lives only in a `client` package and is entered only through a `@Mod(dist = Dist.CLIENT)` class or a client-only subscriber. A reference from common code crashes a dedicated server.
- Logic that changes the world runs on the logical server, behind `!level.isClientSide()`. The client only predicts and presents.
- A payload from the client is untrusted input. The server's handler re-validates reach, permissions, and state before acting.
- World state is touched only from the main thread. Know which thread each lifecycle event and payload handler runs on for the repo's version, and hand work to the main thread when it does not.

## Events

NeoForge has two buses: the mod bus for lifecycle and registration events, and the game bus for gameplay. Many mod bus events fire in parallel across mods, so work on shared game state goes through `enqueueWork`. Confirm which bus an event fires on for the repo's version before subscribing.

Prefer, in order: an event, a NeoForge extension hook or interface, an access transformer, and then a mixin. A mixin is the last resort, uses the narrowest injection that works, and never uses `@Overwrite`.

## Data generation

- Every asset and data file that a data provider can produce comes from data generation: models, blockstates, loot tables, recipes, tags, advancements, data maps, language files, and datapack registry entries. Hand-written JSON in `src/main/resources` is only for files no provider covers and for complex models authored in Blockbench.
- Output goes to `src/generated/resources`, which the main source set includes as a resource directory and git tracks. A generated file changes only through its provider and a rerun. The `.cache` directory is gitignored and excluded from the jar.
- One data run generates assets and data together with `--all`, and one gather-data handler registers every provider. The version reference gives the run type and the event's API.
- Provider code lives in a `datagen` source set that the data run uses and the jar never contains. Its packages are named for the data kind (`loot`, `recipe`, `tag`, `model`, `lang`), because each provider covers one kind across every feature. A provider that spans many features splits into one class per feature or recipe type, which the kind's provider calls.
- Datapack registry entries are built in a `RegistrySetBuilder` that registers before any other provider, and every later provider receives a lookup that contains them. The version reference says where that lookup comes from. Each entry's `ResourceKey` is a constant in its feature package, shared by game code and datagen.
- Coverage validation stays on. The loot table provider's known blocks are the mod's registered blocks, so a block without a loot table fails the run, and a coverage failure is fixed by generating the missing file.
- The language provider takes block, item, and entity names from their registered holders, and fails the run when a registered object has no English name.
- A material that another mod could also supply, such as an ingot, ore, or dust, carries the `c` namespace common tag, and recipes take that tag in place of the mod's own item. A tag key is a constant created once, and an item tag that mirrors a block tag is copied from the block tag.
- Every recipe saves with an explicit ID of the form `<modid>:<recipe type>/<name>`, such as `examplemod:crushing/iron_ore`. Data that depends on an optional mod carries a mod-loaded condition.

## Text and serialization

- User-facing text is a translation key passed to `Component.translatable`, with the English text in the generated `en_us` language file.
- Serialization uses a `Codec` or `StreamCodec` wherever the version's API accepts one.

## State

- State that belongs to a world lives in `SavedData` or a data attachment.
- A static field that holds per-world state is cleared on `ServerStoppedEvent`, because single-player starts a new integrated server in the same JVM for each world opened.
- Configuration goes through a `ModConfigSpec`, read at the point of use so a reload takes effect.

## Logging

The logger is SLF4J from `LogUtils.getLogger()`. A mod is not a deployed service, so the observability floor in `engineering-patterns` does not apply, and logging is the whole of a mod's observability.

## Performance

Rejected on sight, alongside the shared list: unbounded work in a per-tick path, a block or entity scan repeated every tick, and chunk loading from a tick path. Per-tick paths include `tick`, `animateTick`, `entityInside`, and any frequently fired event.

## Testing

Two tiers, and the gate runs both.

- **Unit tests** run on JUnit through ModDevGradle's `unitTest` support and `net.neoforged:testframework`. Registries and the mod load, but no level exists, so a unit test never touches a real world. World reads and writes go through a map-backed fake that implements the narrow vanilla interfaces, kept in the test fixtures.
- **GameTests** cover behavior that needs a real world: entities, block updates, structure placement, and events end to end. They live in a `gameTest` source set that the dev runs bind to the mod and the jar never contains, in the same packages as the code they test so they can reach package-private members. The version reference gives the registration API.
- A GameTest name becomes a resource path, so it is lowercase snake case while keeping all three parts, such as `admits_refuses_zombie_when_destination_is_mining_dimension`.
- The GameTest helper's assertions are the assertion library inside a GameTest.
- The gate is the data run with a check that `git status --porcelain` prints nothing, then `./gradlew build`, then the repo's GameTest server run, unless the repo's `CLAUDE.md` or `AGENTS.md` names others. The client and server dev runs are not part of the gate.

## Canonical shape

An event subscriber is the entry point and calls a pure decision:

```java
@EventBusSubscriber(modid = Sanctuary.MOD_ID)
public final class HostileSpawnGuard {
    private HostileSpawnGuard() {}

    @SubscribeEvent
    public static void onEntityJoinLevel(EntityJoinLevelEvent event) {
        Level level = event.getLevel();
        if (!level.isClientSide() && !admits(event.getEntity(), level.dimension())) {
            event.setCanceled(true);
        }
    }

    static boolean admits(Entity entity, ResourceKey<Level> dimension) {
        if (!SanctuaryDimensions.ALL.contains(dimension)) {
            return true;
        }

        return entity.getPassengersAndSelf().noneMatch(Enemy.class::isInstance);
    }
}
```
