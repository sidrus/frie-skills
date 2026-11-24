---
type: regex
pattern: '(redis|formerly|previously|no longer|used to|replaced|switched|migrat|moved to)'
flags: i
match: not_contains
weight: 3
target:
  source: file
  path: CACHING.md
---
