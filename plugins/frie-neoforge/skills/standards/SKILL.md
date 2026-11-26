---
name: standards
description: NeoForge Minecraft mod conventions, layered on the frie-java and frie-gamedev standards. Use when working in a NeoForge mod (a neoforge.mods.toml or the net.neoforged.moddev Gradle plugin), or for questions about mod registries, events, client and server sides, data generation, GameTests, or mixins.
---

# NeoForge Standards

**Invoke `frie-java:standards` and `frie-gamedev:standards` first.** That chain also loads `engineering-patterns`. This skill is the framework layer over both. It adds what is specific to a NeoForge mod, and never restates the layers under it.

## Read the reference for what you touch

Read `minecraft_version` and `neo_version` from `gradle.properties`, then read `references/neoforge.md` and the reference for that NeoForge version **before** the first edit of a mod's Java, JSON, TOML, or Gradle files.

| `neo_version` | Version reference |
|---|---|
| 21.0 and 21.1 (Minecraft 1.21 and 1.21.1) | `references/neoforge-21.1.md` |
| 21.4 and later (Minecraft 1.21.4 onward) | `references/neoforge-21.4.md` |

A version with no reference, and an API its reference does not name, is looked up on `docs.neoforged.net` for that exact version rather than from memory.
