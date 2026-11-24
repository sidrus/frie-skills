---
type: regex
pattern: '[\w)\]]!(?!=)'
match: not_contains
weight: 3
target:
  source: file
  path: customers.ts
---
