# NeoForge 21.4 and later

Applies when `neo_version` is 21.4 or later, which covers Minecraft 1.21.4 onward, including the 26.x releases. This file gives the APIs for the rules in `SKILL.md`, marking each one introduced after 21.4 with its version. These APIs keep changing between releases, so the docs page for the repo's exact version on `docs.neoforged.net` takes precedence over this file wherever the two differ.

## Events

`@EventBusSubscriber` subscribes each handler to the bus its event belongs to, so the annotation sets `modid` and leaves out `bus`.

## Registration

Block and item properties carry the object's registry ID. Blocks register through `DeferredRegister.Blocks#registerBlock` and items through `DeferredRegister.Items#registerItem`, `registerSimpleItem`, or `registerSimpleBlockItem`, which set the ID before calling the factory.

## Data generation

- The data run keeps the name `data` and uses the `clientData()` run type, with `--all`. `GatherDataEvent` is split into `GatherDataEvent.Client` and `GatherDataEvent.Server`, and one handler for `GatherDataEvent.Client`, in a subscriber with `value = Dist.CLIENT`, registers every provider.
- The handler calls `event.createDatapackRegistryObjects(builder)` before registering any other provider, which makes every later lookup from the event contain the mod's datapack entries.
- Providers register through `event.createProvider(...)`, which passes the `PackOutput` and lookup to the provider's constructor. Block and item tags register together through `event.createBlockAndItemTags(...)`, with item tags extending `BlockTagCopyingItemTagProvider`.
- Models, blockstates, and client items all come from one `ModelProvider` that overrides `registerModels(BlockModelGenerators, ItemModelGenerators)`. A `BlockItem` with no generated client item gets one that points at its block model. A missing texture slot or a duplicate model fails the run. `getKnownBlocks()` and `getKnownItems()` drive the provider's model validation, so they keep their defaults or return the mod's registered entries.
- Recipes come from a `RecipeProvider` that overrides `buildRecipes()`, registered through a nested class extending `RecipeProvider.Runner`.
- On 26.3, recipes and loot tables register as registry bootstraps in place of providers. The docs do not cover this yet, so the source for it is the NeoForge release notes and the MDK for that version.

## GameTests

- On 21.4, GameTests use the annotations described in `neoforge-21.1.md`.
- From 21.5, a GameTest has three parts. The test function is registered through a `DeferredRegister` on `BuiltInRegistries.TEST_FUNCTION`. The test instance and its environment are datapack entries in `Registries.TEST_INSTANCE` and `Registries.TEST_ENVIRONMENT`, generated through the `RegistrySetBuilder`. The test instance's `ResourceKey` path is the snake case name from `SKILL.md`.
