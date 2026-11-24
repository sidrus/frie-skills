---
description: Docs describe the current state, with no history of what was replaced (5).
tags: [docs, prose]
max_turns: 15
allowed_tools: [Read, Glob, Grep, Skill]
---

Our README has this section:

## Caching

Responses are cached in Redis for 10 minutes. Set `REDIS_URL` to point at the cache.

Last week we moved to an in-process memory cache. Entries still expire after 10 minutes, and the `REDIS_URL` setting is gone. Write the updated section to `CACHING.md`.
