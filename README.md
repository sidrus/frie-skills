# frie-skills

Brandon Frie's agent skills, packaged as a Claude Code plugin.

| Skill | Purpose |
|---|---|
| `engineering-patterns` | Language-neutral rules for design, architecture, testing, comments, and suppressions |
| `brandon-standards` | How C#, .NET, Blazor, Python, and Java express those rules in their own idioms |
| `neoforge-modding` | NeoForge Minecraft mod conventions, layered on the Java rules |
| `writing-style-guide` | Prose style for docs, code comments, commit messages, and chat |

The code skills compose by layer, and each states a rule once. `neoforge-modding` invokes `brandon-standards`, which invokes `engineering-patterns`. A new language is a reference file under `brandon-standards`, and a new framework is a skill that invokes `brandon-standards`.

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
