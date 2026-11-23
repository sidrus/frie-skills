# frie-skills

Brandon Frie's Claude Code marketplace, `frie`, with two plugins: `frie-skills`, his agent skills and the hooks that enforce them, and `secret-files-guard`, a hook that keeps tool calls away from secrets files.

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
| `standards-gate.ts` | Denies an Edit or Write to a `.cs`, `.razor`, `.razor.css`, or `.py` file until the same agent has read the matching references in full since its last compaction or `/clear` |
| `spelling.ts` | Adds a reminder to the context after an edit that adds a likely British spelling, and never blocks |

## Plugins

| Plugin | Contents |
|---|---|
| `frie-skills` | The skills and hooks above |
| `secret-files-guard` | A tool-call hook that denies a tool call that reaches a secrets file. It denies the call when the hook fails. |

The hooks in both plugins are hooks modules, which require Claude Code 2.1.330 or later. Anthropic documents the module API as early access, so it can change between releases.

### secret-files-guard

The guard denies a tool call whose path, command, or glob matches one of these files:

| Kind | Files |
|---|---|
| Environment | `.env`, `.env.*` except `.env.example` and `.env.ctmpl`, `*.env`, `.envrc` |
| Local settings | `*.local.json` |
| Tool credentials | `.npmrc`, `.pypirc`, `.netrc`, `_netrc`, `.git-credentials`, `.pgpass`, `.my.cnf`, `.vault-token`, `.claude/.credentials.json` |
| Cloud and containers | `.aws/credentials`, `.kube/config`, `.docker/config.json`, `terraform.tfstate` |
| .NET | UserSecrets folders, and `dotnet user-secrets list`, which prints them |
| Named secrets | `.json`, `.yaml`, `.yml`, `.toml`, `.properties`, and `.ini` files with `secret` in the name |
| Keys and certificates | Private SSH keys, `.pem`, `.p12`, `.pfx`, `.jks`, `.keystore`, `.key` |

How it decides:

- It strips quoting and expands brace groups before matching, so `.e''nv` and `.{e,}nv` are denied.
- It checks `.key` only in file paths, because in Bash text it matches code such as `row.key`.
- It allows a file test such as `[ -f .env ]`.
- It follows a symlink in the file path of a `Read`, `Edit`, `Write`, `NotebookEdit`, or `Grep` call, and denies the call when the target is a secrets file or can't be resolved.

It is a best-effort text check, so these get past it:

- A Bash command that builds a name at run time, such as `cat $(echo .e)nv`.
- A recursive read that never mentions the file, such as `grep -r TOKEN .`.
- A symlink in a Bash command or a Rider tool call, or inside a directory a tool searches.

The Claude Code sandbox's filesystem read-deny list stops all three, so add the files to it.

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
npx -y -p typescript@5.9.3 tsc -p plugins/frie-skills/tsconfig.json
npx -y -p typescript@5.9.3 tsc -p plugins/secret-files-guard/tsconfig.json
```

The type check reads the declarations Claude Code writes to each plugin's `.claude-plugin/types` folder when a session loads the plugin from this folder.

## Update

Bump `version` in the changed plugin's `.claude-plugin/plugin.json`, push, then on each machine:

```
/plugin marketplace update frie
```

## Add a skill

Put it in `plugins/frie-skills/skills/<name>/SKILL.md` and add `./skills/<name>` to the `skills` list in `plugins/frie-skills/.claude-plugin/plugin.json`.
