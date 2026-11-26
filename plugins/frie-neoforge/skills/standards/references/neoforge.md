# NeoForge

Registries, events, networking, data generation, GameTests, and serialization APIs change between versions, so the version reference gives each API this file names only by concept. Vanilla Minecraft has no published API documentation, so its behavior comes from the decompiled sources that ModDevGradle attaches to the workspace, with Parchment parameter names where the repo configures Parchment.

## Entry points and decisions

Minecraft's callbacks are the entry points `frie-gamedev:standards` describes: `Block`, `Item`, `BlockEntity`, and `Entity` overrides, event subscribers, commands, and payload handlers.

- The narrow interface a decision takes is a vanilla one, such as `BlockGetter`, `LevelReader`, `LevelWriter`, or `LevelAccessor`, rather than `Level` or `ServerLevel`.
- An event subscriber's class and handler methods are `public`, because the event bus requires it.

## Layout

Packages are named for features (`portal`, `dimension`), never for kinds of game object (`block`, `item`). Client-only code for a feature sits in that feature's `client` subpackage, such as `portal.client`.

## Registration

- Every registry object is registered through a `DeferredRegister`. Each feature package owns the registers for its own objects and exposes one `register(IEventBus)` method, which the `@Mod` class calls as the composition root.
- A registry object is constructed only inside its supplier, and read through its holder after registration completes.
- Datapack registry content such as dimensions, biomes, and worldgen features is data, not a `DeferredRegister` entry.
- A lookup derived from registered objects that never changes afterward is built once during common setup through `enqueueWork`.

## Sides and threads

- Code that references `net.minecraft.client` classes lives only in a `client` package and is entered only through a `@Mod(dist = Dist.CLIENT)` class or a client-only subscriber. A reference from common code crashes a dedicated server.
- The authoritative side is the logical server, so logic that changes the world sits behind `!level.isClientSide()`.
- The server's handler for a client payload re-validates reach, permissions, and state before acting.
- A lifecycle event or payload handler that runs off the main thread hands its work to the main thread.

## Events

The mod bus carries lifecycle and registration events, and the game bus carries gameplay events. Many mod bus events fire in parallel across mods, so work on shared game state goes through `enqueueWork`.

Prefer, in order, an event, a NeoForge extension hook or interface, an access transformer, and a mixin. A mixin is the last resort, uses the narrowest injection that works, and never uses `@Overwrite`.

## Data generation

- Every asset and data file that a data provider can produce comes from data generation: models, blockstates, loot tables, recipes, tags, advancements, data maps, language files, and datapack registry entries. Hand-written JSON in `src/main/resources` is only for files no provider covers and for complex models authored in Blockbench.
- Output goes to `src/generated/resources`, which the main source set includes as a resource directory and git tracks. A generated file changes only through its provider and a rerun. The `.cache` directory is gitignored and excluded from the jar.
- One data run generates assets and data together with `--all`, and one gather-data handler registers every provider.
- Provider code lives in a `datagen` source set that the data run uses and the jar never contains. Its packages are named for the data kind (`loot`, `recipe`, `tag`, `model`, `lang`), because each provider covers one kind across every feature. A provider that spans many features splits into one class per feature or recipe type, which the kind's provider calls.
- Datapack registry entries are built in a `RegistrySetBuilder` that registers before any other provider, so every later provider's lookup contains them. Each entry's `ResourceKey` is a constant in its feature package, shared by game code and datagen.
- Coverage validation stays enabled. The loot table provider's known blocks are the mod's registered blocks, so a block without a loot table fails the run, and the fix is to generate the missing file.
- The language provider takes block, item, and entity names from their registered holders, and fails the run when a registered object has no English name.
- A material that another mod could also supply, such as an ingot, ore, or dust, gets the `c` namespace common tag, and recipes take that tag in place of the mod's own item. A tag key is a constant created once, and an item tag that mirrors a block tag is copied from the block tag.
- Every recipe saves with an explicit ID of the form `<modid>:<recipe type>/<name>`, such as `examplemod:crushing/iron_ore`. Data that depends on an optional mod has a mod-loaded condition.

## Text and serialization

- User-facing text is a translation key passed to `Component.translatable`, with the English text in the generated `en_us` language file.
- Serialization uses a `Codec` or `StreamCodec` wherever the version's API accepts one.

## State

- State that belongs to a world lives in `SavedData` or a data attachment.
- A static field that holds per-world state is cleared on `ServerStoppedEvent`, which is where a session ends. Single-player starts a new integrated server in the same JVM for each world opened.
- Configuration goes through a `ModConfigSpec`, read at the point of use so a reload takes effect.

## Logging

The logger is SLF4J from `LogUtils.getLogger()`.

## Performance

The tick paths are `tick`, `animateTick`, `entityInside`, and any frequently fired event. A mod adds chunk loading from a tick path to the shapes rejected without measurement.

## Testing

- **Unit tests** run on JUnit through ModDevGradle's `unitTest` support and `net.neoforged:testframework`. Registries and the mod load, but no level exists, so world reads and writes go through a map-backed fake of the narrow vanilla interfaces, kept in the test fixtures.
- **GameTests** are the engine-hosted tests, covering entities, block updates, structure placement, and events end to end. They live in a `gameTest` source set that the dev runs bind to the mod and the jar never contains, in the same packages as the code they test so they can reach package-private members.
- A GameTest name becomes a resource path, so it is lowercase snake case that keeps all three parts, such as `admits_refuses_zombie_when_destination_is_mining_dimension`.
- Inside a GameTest, the assertions are the GameTest helper's own.
- The gate command is the data run followed by a check that `git status --porcelain` prints nothing, then `./gradlew build`, then the repo's GameTest server run, unless the repo's `CLAUDE.md` or `AGENTS.md` specifies others. The client and server dev runs are not part of it.

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
