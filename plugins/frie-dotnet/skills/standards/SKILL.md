---
name: standards
description: Language rules for C# and .NET, layered on engineering-patterns. Use before writing, editing, reviewing, or designing C# code or tests in any kind of project, including a service, a Blazor app, or a game.
---

# .NET Standards

**Invoke `frie-core:engineering-patterns` first.** It holds every rule that is the same in all languages: layers, precedence, naming, signatures, absence, control flow, comments, design, testing, suppressions, and the done checklist. This skill adds only how C# expresses those rules in its own idioms, and never restates them.

It holds nothing about hosting, data access, or Blazor. A .NET service or Blazor app also uses `frie-aspnet:standards`.

## Read the reference for what you touch

| Touching | Read |
|---|---|
| `*.cs` or `*.razor` | `references/csharp.md`, and `references/formatting.md` for line breaking and chain layout |
| a test, meaning any file under a `test` or `tests` folder or in a project whose name ends in `Test` or `Tests` | the references above, `references/csharp-testing.md`, and the `engineering-patterns` testing reference |

Read the reference **before** the first edit, not as a check afterward. `csharp.md` ends with canonical shapes. Copy those rather than re-deriving them from the rules.
