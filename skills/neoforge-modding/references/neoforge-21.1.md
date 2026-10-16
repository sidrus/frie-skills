# NeoForge 21.1

Applies when `neo_version` is 21.0 or 21.1, which target Minecraft 1.21 and 1.21.1. This file gives this version's APIs for the rules in `SKILL.md`. The docs for this version are at `docs.neoforged.net/docs/1.21.1/`. Where a page there has tabs for ranges of 21.1 builds, the tab containing the repo's build applies.

## Events

- On 21.1.181 and later, `@EventBusSubscriber` subscribes each handler to the bus its event belongs to, so the annotation sets `modid` and leaves out `bus`.
- On 21.1.0 through 21.1.180, the default bus is the game bus. A subscriber for mod bus events sets `bus = EventBusSubscriber.Bus.MOD`, so one class holds the handlers for one bus.

## Data generation

- The data run uses the `data()` run type with `--mod <modid> --all --output <src/generated/resources> --existing <src/main/resources>`, with absolute paths. `--existing` is how the existing file helper finds hand-written textures and models. Each mod whose models or textures a generated file references is added with `--existing-mod <id>`.
- One `GatherDataEvent` handler adds every provider through `event.getGenerator().addProvider(include, provider)`. `include` is `event.includeClient()` for assets, which are models, blockstates, sounds, and language files, and `event.includeServer()` for everything else.
- The handler builds `new DatapackBuiltinEntriesProvider(output, event.getLookupProvider(), builder, Set.of(MOD_ID))` and adds it before any other provider. Every later provider receives that provider's `getRegistryProvider()` in place of `event.getLookupProvider()`, because the event's lookup does not contain the mod's own datapack entries.
- Block models and blockstates come from a `BlockStateProvider`, which also writes block item models through `simpleBlockWithItem` and its siblings. Other item models come from an `ItemModelProvider`. Both take the event's `ExistingFileHelper`, which fails the run when a model's parent or texture is missing, so a model referenced by name is looked up through `models().getExistingFile(...)` to keep it checked.
- The `ItemTagsProvider` takes the block tag provider's `contentsGetter()`, and copies each mirrored tag with `copy(blockTag, itemTag)`.
- Loot tables come from `new LootTableProvider(output, Set.of(), List.of(new LootTableProvider.SubProviderEntry(ModBlockLoot::new, LootContextParamSets.BLOCK)), lookupProvider)`. `ModBlockLoot` extends `BlockLootSubProvider` and overrides `getKnownBlocks()` to return the block register's entries.
- Recipes come from a `RecipeProvider` that overrides `buildRecipes(RecipeOutput)`. Each builder ends with `save(output, id)`, passing the ID from `SKILL.md`, and conditional recipes go through `output.withConditions(...)`.

## GameTests

- A test class carries `@GameTestHolder(MOD_ID)`, which registers it. Each test is a `public static void` method annotated `@GameTest` that takes a `GameTestHelper`.
- The test name is the lowercased class and method names, so the method name is the snake case name from `SKILL.md`. That is the one place a Java method name is snake case.
- Each test runs in a structure template, a `.nbt` file under `data/<modid>/structure`. With `@PrefixGameTestTemplate(false)` on the class, `@GameTest(template = "...")` names a template that every class shares, such as one empty platform for tests that build their own setup.
- The `gameTestServer` run sets the `neoforge.enabledGameTestNamespaces` system property to the mod ID.
