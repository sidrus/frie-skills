---
name: brandon-standards
description: Language rules for C#, .NET, Blazor, Python, and Java, layered on engineering-patterns. Use before writing, editing, reviewing, or designing code or tests.
---

# Coding Standards

**Invoke `frie-skills:engineering-patterns` first.** It holds every rule that is the same in all languages: precedence, naming, signatures, absence, control flow, comments, design, testing, suppressions, and the done checklist. This skill adds only how each language expresses those rules in its own idioms, and never restates them.

## Read the reference for what you touch

| Touching | Read |
|---|---|
| `*.cs` | `references/csharp.md`, `references/formatting.md` for line breaking and chain layout, and `references/dotnet-layering.md` for anything crossing a data-access, service, endpoint, or mapping boundary |
| .NET data access: a query, a write, a repository, a `DbContext`, an entity, a migration | `references/data-access-efcore.md` when the repo uses EF Core, `references/data-access-dapper.md` for Dapper or hand-written SQL |
| `*.razor` or a Blazor project's CSS | `references/blazor.md` |
| `*.py` | `references/python.md` |
| `*.java`, or a Gradle build for a Java project | `references/java.md` |

Read the reference **before** the first edit, not as a check afterward, and read it for test files in that language too, since each one holds its language's test conventions. `csharp.md`, `dotnet-layering.md`, `java.md`, and both data-access files end with canonical shapes. Copy those rather than re-deriving them from the rules.
