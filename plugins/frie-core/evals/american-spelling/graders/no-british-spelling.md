---
type: regex
pattern: '(colour|behaviour|favour|normalis|organis|catalogue|grey|licence|centre|analys(e|ing))'
flags: i
match: not_contains
weight: 3
target:
  source: file
  path: README.md
---
