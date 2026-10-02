---
name: brandon-standards
description: Brandon's coding standards and architecture rules for C#, .NET, Blazor, and Python. Use before writing, editing, reviewing, or designing code. Covers interfaces, where logic lives, layering, DRY, comments, tests, performance, observability.
---

# Coding Standards

## Precedence

1. The repo's own `CLAUDE.md` or `AGENTS.md` wins for repo-specific facts: schema names, package versions, folder layout, exemption lists, gate commands.
2. This skill wins for style, layering, and policy.
3. Generic installed skills (`dotnet-skills:csharp-coding-standards`, `dignified-python`, `astral:ruff`, `astral:ty`) cover what neither of the above does. Where they conflict with this skill, this skill wins.

Rules marked **(tooling)** are enforceable by an analyzer, `.editorconfig`, ruff, or ty, but whether they are enforced is per repo. Check what the repo actually configures. Where a rule is enforced, write it right the first time and don't spend review comments on it, because the build catches it. Where it isn't, the rule still holds and it's on you.

## Read the reference for what you touch

| Touching | Read |
|---|---|
| designing anything: a new feature, a new type, a seam, a state change, a query, a service | `references/architecture.md` first. It decides what earns an interface, where logic lives, and what YAGNI does and does not govern. |
| `*.cs` | `references/csharp.md`, and `references/dotnet-layering.md` for anything crossing a data-access, service, endpoint, or mapping boundary |
| data access: a query, a write, a repository, a `DbContext`, an entity, a migration | `references/data-access-efcore.md` when the repo uses EF Core, `references/data-access-dapper.md` for Dapper or hand-written SQL |
| `*.razor` or a Blazor project's CSS | `references/blazor.md` |
| `*.py` | `references/python.md` |
| any test file | `references/testing.md` |

Read the reference **before** the first edit, not as a check afterward. `csharp.md`, `dotnet-layering.md`, and both data-access files end with canonical shapes; copy those rather than re-deriving them from the rules. When existing code nearby already shows the shape, follow the code.

Skip the references only for a change that touches no code, such as a docs or config edit. The rules below apply either way.

## Comments and documentation

**Never add a comment unless explicitly asked.** This is absolute and covers why-comments, test narration, config and YAML notes, cross-file coordination notes, and code blocks inside plans and specs. Rationale goes in the chat message instead, where it can be read once and discarded.

Two exceptions:

- XML docs on the API surface, following the file's existing convention. Public and internal members are equivalent for this, since an internal-by-design assembly still has a cross-layer contract. Never downgrade an existing XML doc to `//`.
- A non-obvious test double or support type gets a short XML doc saying why the type exists.

When a comment **is** requested, write one terse line. Don't explain how a test works, don't restate the name of the thing being commented, and don't add a second line.

If the user deleted a comment or a block of code, it stays deleted. Never restore it.

A comment that turns out to be wrong or misleading gets deleted, not corrected. Rewriting it to be accurate is still adding a comment, and the code and config already say what is true.

## Prose in docs and messages

- American English spelling. Scan touched files before finishing.
- No AI-speak punctuation: no em-dash asides, no colon-chained clauses. Restructure into flowing grammatical sentences rather than choppy fragments. Term-definition bullets and tables are fine.
- Docs state project-specific facts only. Cut anything most developers already know.
- When removing content from a spec or doc, keep the section title and its numbering and replace the body with a brief note that it was removed as out of scope.
- Temporary or one-off docs don't get linked from a docs index.

## Design

Structure, state, performance, and observability are in `references/architecture.md`. Read it before designing anything. What follows applies to every decision regardless of layer:

- The simplest solution that solves the problem wins. This governs the size of what you build, never whether the code you do build is properly structured.
- No code without a current requirement. Speculative abstractions, fan-out over one implementation, and extension points for changes nobody asked for all get cut.
- Surface simplifications unprompted during design work.
- When a decision changes, re-derive everything downstream of it. Treat every remaining element as unjustified until it re-earns its place, rather than patching around a superseded decision.
- Classify errors at the call site, where the type and the stage are both known. Dispatch on exception type or structured fields, never on message text.
- Push integrity and cleanup into the database (foreign key cascades, constraints) rather than app-ordered deletes or application-side locking.

## Testing, in brief

Full detail in `references/testing.md`. The six that are never negotiable:

- TDD for anything with real behavior. Run the failing test and show its output before writing implementation, every cycle.
- Behavior only. No tests for 1:1 mappers, pass-through wrappers, options records, path literals, or feature-flag toggles, and no chasing a coverage percentage.
- No persistence round-trip or schema-confirmation tests. The database does its job.
- Assert on values, never on booleans.
- Never assert on strings. Assert on observable state, because string assertions break when wording changes and behavior doesn't. The only exception is when the string is the observable output and the spec gives its exact value.
- Test data comes from Faker. A literal appears only where the behavior under test depends on that exact value.

## Suppressions

Never suppress a warning. No `#pragma`, no `[SuppressMessage]`, no csproj `<NoWarn>`, no bare `# noqa` or `# type: ignore`. This includes analyzer style rules. Fix every call site instead. If a warning is a genuine false positive, ask before suppressing it, and when a suppression is approved, explain it inline.

## Before claiming done

1. Run the repo's gate command (its `CLAUDE.md` names it).
2. Scan every touched file for comments you added without being asked, and for non-American spellings.
3. Confirm no new suppression was introduced.
4. Report failures with their output. Never describe unverified work as passing.
