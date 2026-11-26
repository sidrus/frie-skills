# frie-skills

Brandon Frie's Claude Code marketplace, `frie`. Each language, domain, or framework is its own plugin, so a machine installs only the standards it needs.

## Plugins

| Plugin | Skills | Hook | Depends on |
|---|---|---|---|
| `frie-core` | `engineering-patterns`: language-neutral rules for design, architecture, testing, comments, and suppressions. `writing-style-guide`: prose style for docs, code comments, commit messages, and chat | `engineering-gate.ts` denies an Edit or Write to a source code file until the same agent has invoked `engineering-patterns` since its last compaction or `/clear`. `spelling.ts` adds a reminder to the context after an edit that adds a likely British spelling, and never blocks | |
| `frie-enterprise` | `standards`: the domain practices for services and business applications, covering layering, data access, performance, observability, and integration testing | | `frie-core` |
| `frie-gamedev` | `standards`: the domain practices for games and mods, covering simulation ticks, determinism, engine entry points, authority, and engine-hosted testing | `standards-gate.ts` denies an Edit or Write to a `.cs` or `.gd` file under a folder that holds a `project.godot` until the same agent has invoked the skill | `frie-core` |
| `frie-dotnet` | `standards`: how C# and .NET express the core rules | `standards-gate.ts` denies an Edit or Write to a `.cs` or `.razor` file until the same agent has read the matching references in full since its last compaction or `/clear` | `frie-core` |
| `frie-aspnet` | `standards`: hosting, layering, EF Core and Dapper data access, and Blazor for .NET services and apps | `standards-gate.ts` denies an Edit or Write to a `.cs`, `.razor`, or `.razor.css` file until the same agent has invoked `frie-enterprise:standards` and read the matching references. It allows every edit under a folder that holds a `project.godot` | `frie-dotnet`, `frie-enterprise` |
| `frie-python` | `standards`: how Python expresses the core rules | `standards-gate.ts` does the same for a `.py` file | `frie-core` |
| `frie-java` | `standards`: how Java expresses the core rules | `standards-gate.ts` does the same for a `.java` file or a Gradle build or settings file | `frie-core` |
| `frie-neoforge` | `standards`: NeoForge Minecraft mod conventions | `standards-gate.ts` does the same for a Java, JSON, TOML, or Gradle file in a project whose `gradle.properties` sets `neo_version`. It requires `frie-gamedev:standards` and the reference for that version | `frie-java`, `frie-gamedev` |
| `frie-typescript` | `standards`: how TypeScript and React express the core rules | `standards-gate.ts` does the same for a `.ts`, `.mts`, `.cts`, or `.tsx` file | `frie-core` |
| `secret-files-guard` | | A tool-call hook that denies a tool call that reaches a secrets file. It denies the call when the hook fails. | |

The code skills compose by layer, and each states a rule once. Installing a plugin installs its dependencies.

| Layer | Plugins | Rules on |
|---|---|---|
| Core | `frie-core` | What holds in every language and every kind of software |
| Language | `frie-dotnet`, `frie-python`, `frie-java`, `frie-typescript` | Syntax, idiom, and tooling |
| Domain | `frie-enterprise`, `frie-gamedev` | Architecture, state, performance, verification, and operations for one kind of software |
| Framework | `frie-aspnet`, `frie-neoforge` | One framework's conventions, over a language and a domain |

A layer adds rules and never negates one from a layer under it. Where practice differs by domain, `frie-core` states the intent, marks the rule **(domain)**, and leaves the mechanism to the domain skill. Each domain skill answers every **(domain)** rule in its `Domain decisions` table. A rule that a layer would have to negate gets narrowed in the file that states it.

A new language, domain, or framework is a new plugin whose `standards` skill invokes the layer under it and lists that layer's plugin in `dependencies`. A domain plugin also has a `SOURCES.md` that no skill loads, which records the published source of each practice and lists the rules that are Brandon's own preference.

The hooks are hooks modules, which require Claude Code 2.1.330 or later. Anthropic documents the module API as early access, so it can change between releases.

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
/plugin install frie-aspnet@frie
/plugin install secret-files-guard@frie
```

Install the plugin for each language or framework the machine works in. A framework plugin brings its language and domain plugins with it, so `frie-aspnet` installs `frie-dotnet`, `frie-enterprise`, and `frie-core`. Skills install namespaced, so the .NET skill is invoked as `frie-dotnet:standards`.

## Test

```
claude plugin test plugins/frie-core
claude plugin test plugins/frie-gamedev
claude plugin test plugins/frie-dotnet
claude plugin test plugins/frie-aspnet
claude plugin test plugins/frie-python
claude plugin test plugins/frie-java
claude plugin test plugins/frie-neoforge
claude plugin test plugins/frie-typescript
claude plugin test plugins/secret-files-guard
npx -y -p typescript@5.9.3 tsc -p plugins/frie-core/tsconfig.json
npx -y -p typescript@5.9.3 tsc -p plugins/frie-gamedev/tsconfig.json
npx -y -p typescript@5.9.3 tsc -p plugins/frie-dotnet/tsconfig.json
npx -y -p typescript@5.9.3 tsc -p plugins/frie-aspnet/tsconfig.json
npx -y -p typescript@5.9.3 tsc -p plugins/frie-python/tsconfig.json
npx -y -p typescript@5.9.3 tsc -p plugins/frie-java/tsconfig.json
npx -y -p typescript@5.9.3 tsc -p plugins/frie-neoforge/tsconfig.json
npx -y -p typescript@5.9.3 tsc -p plugins/frie-typescript/tsconfig.json
npx -y -p typescript@5.9.3 tsc -p plugins/secret-files-guard/tsconfig.json
```

The type check reads the declarations Claude Code writes to each plugin's `.claude-plugin/types` folder when a session loads the plugin from this folder.

## Evals

`plugins/frie-core/evals` holds one case for each of the five rules Brandon corrects most: no unrequested comments, American spelling, state-based tests, explicit absence, and docs as current state. Each case grades the file Claude writes with a regex, so the graders cost nothing, and the runs themselves use your plan's model usage. The cases write files, so grant the write tools:

```
claude plugin eval plugins/frie-core --allow-tools Write Edit
```

Each case runs three times with the plugin and three times without it, and the summary reports the difference. CI does not run the evals, because each run is a model call.

## Update

Bump `version` in the changed plugin's `.claude-plugin/plugin.json`, push, then on each machine:

```
/plugin marketplace update frie
```

## Add a skill

Put it in `plugins/<plugin>/skills/<name>/SKILL.md` and add `./skills/<name>` to the `skills` list in `plugins/<plugin>/.claude-plugin/plugin.json`.

## Add a plugin

Create `plugins/<plugin>/.claude-plugin/plugin.json`, add the plugin to `.claude-plugin/marketplace.json`, and add its validate step, and its test step when it has hooks, to `.github/workflows/tests.yml`.

A new domain plugin answers every rule marked **(domain)** in `plugins/frie-core/skills/engineering-patterns`. Search that folder for `**(domain)**` to list them.
