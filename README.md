# frie-skills

Brandon Frie's agent skills, packaged as a Claude Code plugin.

| Skill | Purpose |
|---|---|
| `engineering-patterns` | Language-neutral rules for design, architecture, testing, comments, and suppressions |
| `brandon-standards` | How C#, .NET, Blazor, Python, and Java express those rules in their own idioms |
| `neoforge-modding` | NeoForge Minecraft mod conventions, layered on the Java rules |
| `writing-style-guide` | Prose style for docs, code comments, commit messages, and chat |

The code skills compose by layer, and each states a rule once. `neoforge-modding` invokes `brandon-standards`, which invokes `engineering-patterns`. A new language is a reference file under `brandon-standards`, and a new framework is a skill that invokes `brandon-standards`.

The plugin also installs two tool-call hooks.

| Hook | Behavior |
|---|---|
| `standards-gate.ts` | Denies an Edit or Write to a `.cs`, `.razor`, or `.py` file until the same agent has read the matching references in full since its last compaction or `/clear` |
| `spelling.ts` | Adds a reminder to the context after an edit that adds a likely British spelling, and never blocks |

## Plugins

| Plugin | Contents |
|---|---|
| `frie-skills` | The skills and hooks above |
| `secret-files-guard` | A tool-call hook that denies any tool call reaching a secrets file by name, symlink, or glob. It denies the call when the hook fails. |

The hooks in both plugins are hooks modules, which require Claude Code 2.1.330 or later. Anthropic documents the module API as early access, so it can change between releases.

### secret-files-guard

The guard protects `.env` files other than `.env.example` and `.env.ctmpl`, `*.local.json`, `.envrc`, `.npmrc`, `.pypirc`, `.netrc`, `.git-credentials`, `.pgpass`, `.my.cnf`, `.vault-token`, `.aws/credentials`, `.kube/config`, `.docker/config.json`, `.claude/.credentials.json`, .NET UserSecrets folders, `terraform.tfstate` files, `.json`, `.yaml`, `.yml`, `.toml`, `.properties`, and `.ini` files with `secret` in the name, private SSH keys, and `.pem`, `.p12`, `.pfx`, `.jks`, `.keystore`, and `.key` files. It checks `.key` on file paths only, because in Bash text it matches code such as `row.key`. A file test such as `[ -f .env ]` is allowed. It denies a symlink whose target it cannot resolve.

The guard matches text, so a Bash command that builds a name at run time, such as `cat $(echo .e)nv`, gets past it. To stop those, add the files to the Claude Code sandbox's filesystem read-deny list.

A file attached with `@` in a prompt is read before any tool runs, so no tool-call hook sees it. Claude Code applies `Read` deny rules to `@` attachments on a best-effort basis, so add rules such as these to `~/.claude/settings.json`:

```json
"permissions": {
  "deny": ["Read(//**/.env)", "Read(//**/*.local.json)"]
}
```

A deny rule for `.env.*` also blocks `.env.example`, because an allow rule cannot override a deny rule.

## Install

In a Claude Code session:

```
/plugin marketplace add sidrus/frie-skills
/plugin install frie-skills@frie
/plugin install secret-files-guard@frie
```

Skills install namespaced, so `brandon-standards` is invoked as `frie-skills:brandon-standards`.

## Test

```
claude plugin test plugins/frie-skills
claude plugin test plugins/secret-files-guard
```

## Update

Bump `version` in the changed plugin's `.claude-plugin/plugin.json`, push, then on each machine:

```
/plugin marketplace update frie
```

## Add a skill

Put it in `plugins/frie-skills/skills/<name>/SKILL.md` and add `./skills/<name>` to the `skills`
list in `plugins/frie-skills/.claude-plugin/plugin.json`.
