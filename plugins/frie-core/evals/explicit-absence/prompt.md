---
description: Absence is handled with a guard or a fallback, never a non-null assertion or a cast (5).
tags: [absence, code]
max_turns: 15
allowed_tools: [Read, Glob, Grep, Skill]
---

Create `customers.ts` with `type Customer = { id: string; email?: string }` and an exported function `findCustomerEmail(customers: Customer[], id: string): string` that returns the matching customer's email in lowercase.
