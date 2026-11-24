---
name: standards
description: Language rules for Java, layered on engineering-patterns. Use before writing, editing, reviewing, or designing Java code, tests, or Gradle builds.
---

# Java Standards

**Invoke `frie-core:engineering-patterns` first.** It holds every rule that is the same in all languages. This skill adds only how Java expresses those rules, and never restates them.

## Read the reference for what you touch

| Touching | Read |
|---|---|
| `*.java`, or a `build.gradle` or `settings.gradle` file in Groovy or Kotlin DSL | `references/java.md` |
| a test, meaning any `*.java` file in a source set whose name contains `test`, such as `test`, `testFixtures`, or `integrationTest` | `references/java.md`, `references/java-testing.md`, and the `engineering-patterns` testing reference |

Read the reference **before** the first edit, not as a check afterward. Both references end with canonical shapes. Copy those rather than re-deriving them from the rules.
