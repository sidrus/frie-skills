---
type: regex
pattern: '\bas\s+(string|Customer)\b'
match: not_contains
weight: 2
target:
  source: file
  path: customers.ts
---
