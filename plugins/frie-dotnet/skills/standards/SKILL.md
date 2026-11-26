---
name: standards
description: Language rules for C#, .NET, and Blazor, layered on engineering-patterns. Use before writing, editing, reviewing, or designing C#, Razor, or Blazor code or tests.
---

# .NET Standards

**Invoke `frie-core:engineering-patterns` first.** It holds every rule that is the same in all languages: precedence, naming, signatures, absence, control flow, comments, design, testing, suppressions, and the done checklist. This skill adds only how each language expresses those rules in its own idioms, and never restates them.

**Invoke `frie-enterprise:standards` as well.** The layering, data-access, and Blazor references here build on its layers, data, and observability rules.

## Read the reference for what you touch

| Touching | Read |
|---|---|
| `*.cs` | `references/csharp.md`, `references/formatting.md` for line breaking and chain layout, and `references/dotnet-layering.md` for anything crossing a data-access, service, endpoint, or mapping boundary |
| .NET data access: a query, a write, a repository, a `DbContext`, an entity, a migration | `references/data-access-efcore.md` when the repo uses EF Core, `references/data-access-dapper.md` for Dapper or hand-written SQL |
| `*.razor` or a Blazor project's CSS | `references/blazor.md` |
| a test, meaning any file under a `test` or `tests` folder or in a project whose name ends in `Test` or `Tests` | the references above, `references/csharp-testing.md`, and the `engineering-patterns` testing reference |

Read the reference **before** the first edit, not as a check afterward. `csharp.md`, `dotnet-layering.md`, and both data-access files end with canonical shapes. Copy those rather than re-deriving them from the rules.
