---
name: engineering-patterns
description: Language-neutral engineering rules for design, architecture, testing, comments, and suppressions. Use before designing, writing, editing, or reviewing code or tests in any language. The language and framework skills build on it.
---

# Engineering Patterns

These rules hold in every language. `brandon-standards` adds each language's idioms, and framework skills such as `neoforge-modding` add their own conventions on top. Neither repeats what is here.

## Intent over form

Each rule states an intent, and each language expresses it in its own idiom. Where a language, its standard library, or a framework already has a conventional way to meet the intent, use that way. A rule never justifies a workaround against the language or a framework's dictated shape. Where the two genuinely conflict, the idiom wins at that site and the rule holds everywhere else.

## Precedence

1. The repo's own `CLAUDE.md` or `AGENTS.md` wins for repo-specific facts: schema names, package versions, folder layout, exemption lists, gate commands.
2. The frie-skills skills win for style, layering, and policy. A framework skill wins over a language reference, which wins over this skill, on the points where they deliberately differ.
3. Generic installed skills cover what neither of the above does. Each language reference names the ones that apply. Where they conflict with frie-skills, frie-skills wins.

Existing code that disagrees with these skills is drift, not precedent. Write to the skills unless the repo's `CLAUDE.md` or `AGENTS.md` overrides them.

Rules marked **(tooling)** are enforceable by an analyzer, formatter, or type checker, but whether they are enforced is per repo. Check what the repo actually configures. Where a rule is enforced, write it right the first time and don't spend review comments on it, because the build catches it. Where it isn't, the rule still holds and it's on you.

## Read the reference for what you touch

| Touching | Read |
|---|---|
| designing anything: a new feature, a new type, a seam, a state change, a query, a service | `references/architecture.md` first. It decides what earns an interface, where logic lives, and what YAGNI does and does not govern. |
| any test file | `references/testing.md` |

Read the reference **before** the first edit, not as a check afterward. Skip it only for a change that touches no code, such as a docs or config edit. The rules below apply either way.

## Naming

Anything callable is named with a verb: methods, functions, private helpers, test helpers, test fixtures, and any named lambda. A noun name belongs to a value, meaning a property, field, or variable. `Code(string code)`, `RedisDatabase()`, and a fixture called `candidates` are all wrong. An accessor whose shape the language dictates, such as a Java record component, keeps that shape.

## Signatures

- Two parameters at most, plus whatever trailing cancellation parameter the language uses.
- When a signature needs more, fold the extras into a type that already exists. A new record whose only purpose is to carry arguments is a last resort.
- A value that is constant per call site rather than per call is not a parameter. Hoist each combination to a named constant and pass that.
- No unused parameters. That includes a cancellation token the library underneath gives no way to pass on, and a parameter kept only because a sibling method takes one.
- These limits govern signatures you design. Where a framework dictates the shape, such as a route handler, an overridden framework method, an event handler, a generated partial, or a delegate matching a library's signature, they do not apply.

## Values and absence

- Handle absence explicitly, with a guard that fails loudly or with a fallback. Never use a non-null assertion that only silences the checker.
- No redundant null guards. If the target accepts null, assign directly.
- Collections are never null. Empty is the absent case, initialized to the language's empty literal. Nullability on a collection belongs only on a persistence type, so the column stores NULL rather than an empty array, and the mapping converts empty to null and back.
- No inline constant arrays at repeated call sites. Hoist them to a named constant.

## Control flow

- In languages with braces, every control-flow body gets them, including single-line bodies.
- Keep dispatch as a readable pattern-match switch. Bolt a narrow edge case on as an early guard rather than restructuring the switch around it.
- No empty catch blocks. Log at least at trace level, even for an expected shutdown-path exception such as cancellation.

## Comments and documentation

**Never add a comment unless explicitly asked.** This is absolute and covers why-comments, test narration, config and YAML notes, cross-file coordination notes, and code blocks inside plans and specs. Rationale goes in the chat message instead, where it can be read once and discarded.

Three exceptions:

- Doc comments on the API surface: XML docs in C#, docstrings in Python, Javadoc in Java. Each language reference defines what counts as the API surface there. Where both an interface and an implementing class exist, document the interface. Never downgrade an existing doc comment to a plain comment. Parameter, return, and exception tags appear only when they add something the signature doesn't already say.
- A non-obvious test double or support type gets a short doc comment saying why the type exists.
- The reason on an approved suppression, per Suppressions below.

The wording of comments, docs, and messages follows the `writing-style-guide` skill.

If the user deleted a comment or a block of code, it stays deleted.

A comment that turns out to be wrong or misleading gets deleted, not corrected. Rewriting it to be accurate is still adding a comment, and the code and config already say what is true.

## Design

These apply to every decision regardless of layer. Structure, state, performance, and observability are in `references/architecture.md`.

- The simplest solution that solves the problem wins. This governs the size of what you build, never whether the code you do build is properly structured.
- No code without a current requirement (YAGNI), because until the requirement exists you do not know what to build. Speculative abstractions, fan-out over one implementation, extension points for changes nobody asked for, and configuration for values that do not vary all get cut.
- Surface simplifications unprompted during design work.
- When a decision changes, re-derive everything downstream of it. Treat every remaining element as unjustified until it re-earns its place, rather than patching around a superseded decision.
- Classify errors at the call site, where the type and the stage are both known. Dispatch on exception type or structured fields, never on message text.
- Push integrity and cleanup into the database (foreign key cascades, constraints) rather than app-ordered deletes or application-side locking.

## Testing, in brief

Full detail in `references/testing.md`. These are never negotiable:

- TDD for anything with real behavior. Run the failing test and show its output before writing implementation, every cycle.
- Behavior only. No tests for 1:1 mappers, pass-through wrappers, options records, path literals, or feature-flag toggles, and no chasing a coverage percentage.
- No persistence round-trip or schema-confirmation tests. The database does its job.
- Assert on values, never on booleans.
- Assert on observable state, never on strings, because a string assertion breaks when wording changes and behavior doesn't. The only exception is when the string is the observable output and the spec gives its exact value.
- Test data comes from a Faker library. A literal appears only where the behavior under test depends on that exact value.

## Suppressions

Never suppress a warning, including style rules. Redesign so the warning does not fire, at every call site. Each language reference names the suppression mechanisms it rules out. If a warning is a genuine false positive, ask. An approved suppression carries its reason in a justification field where the mechanism has one, and on the suppression line where it does not.

Static analysis findings are authoritative, and only an existing suppression opts out of one. Where a finding contradicts a convention in these skills, the finding wins at the line it flags and the convention holds everywhere else.

## Config files

No empty sections in `.editorconfig` or similar config files.

## Before claiming done

1. Run the repo's gate command (its `CLAUDE.md` names it).
2. Scan every touched file for comments you added without being asked.
3. Confirm no new suppression was introduced.
4. Report failures with their output. Never describe unverified work as passing.
