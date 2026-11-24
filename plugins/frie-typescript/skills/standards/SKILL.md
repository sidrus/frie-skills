---
name: standards
description: Language rules for TypeScript and React, layered on engineering-patterns. Use before writing, editing, reviewing, or designing TypeScript or React code or tests.
---

# TypeScript Standards

**Invoke `frie-core:engineering-patterns` first.** It holds every rule that is the same in all languages. This skill adds only how TypeScript and React express those rules, and never restates them.

## Read the reference for what you touch

| Touching | Read |
|---|---|
| `*.ts`, `*.mts`, or `*.cts` | `references/typescript.md` |
| `*.tsx` | `references/typescript.md` and `references/react.md` |
| a test, meaning a `*.test.*` or `*.spec.*` file or any file under a `tests`, `test`, or `__tests__` folder | the references above, `references/typescript-testing.md`, and the `engineering-patterns` testing reference |

Read the reference **before** the first edit, not as a check afterward. Each reference ends with canonical shapes. Copy those rather than re-deriving them from the rules.
