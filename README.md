# frie-skills

Brandon Frie's agent skills, packaged as a Claude Code plugin.

| Skill | Purpose |
|---|---|
| `brandon-standards` | Coding standards and architecture rules for C#, .NET, Blazor, and Python |
| `writing-style-guide` | Prose style for docs, code comments, commit messages, and chat |

## Install

In a Claude Code session:

```
/plugin marketplace add sidrus/frie-skills
/plugin install frie-skills@frie
```

Skills install namespaced, so `brandon-standards` is invoked as `frie-skills:brandon-standards`.

## Update

Bump `version` in `.claude-plugin/plugin.json`, push, then on each machine:

```
/plugin marketplace update frie
```

## Add a skill

Put it in `skills/<name>/SKILL.md` and add `./skills/<name>` to the `skills` list in
`.claude-plugin/plugin.json`.
