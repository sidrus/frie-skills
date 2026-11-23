#!/usr/bin/env bash
# PreToolUse guard: denies a tool call that reaches a secrets file (.env, *.local.json, credential
# stores, private keys) by name, through a symlink, or through a glob that could match one.
# .env.ctmpl and .env.example hold no secrets and stay allowed. Blocks the call when it cannot
# inspect it.
set -uo pipefail

if ! command -v jq >/dev/null 2>&1; then
  echo "Blocked: secret-files-guard needs jq to inspect this call, and jq is not installed." >&2
  exit 2
fi

program=$(cat <<'JQ'
# Removes file tests such as [ -f .env ] whose operand cannot run a command.
def without_existence_tests:
  gsub("(\\btest|\\[\\[?)\\s+-[edfhLrsx]\\s+(\"[^\"$`]*\"|'[^']*'|[^\\s;&|\\]$`\"']+)\\s*(\\]\\]?)?"; "");

def targets:
  .tool_name as $t
  | .tool_input as $i
  | if $t == "Bash" then [$i.command | strings | without_existence_tests]
    elif $t == "Grep" then [$i.path, $i.glob]
    elif $t == "Glob" then [$i.path, $i.pattern]
    elif $t == "mcp__rider__apply_patch" then
      [ ($i.input // $i.patch // "")
        | split("\n")[]
        | select(test("^(\\*\\*\\* (Add|Update|Delete) File:|\\*\\*\\* Move to:|--- |\\+\\+\\+ )")) ]
    elif ($t | startswith("mcp__rider__")) then
      [$i.file_path, $i.filePath, $i.pathInProject, $i.directoryPath, ($i.paths // [])[]]
      + (if $t == "mcp__rider__search_file" then [$i.q] else [] end)
    else [$i.file_path, $i.notebook_path, $i.path]
    end
  | map(strings);

def file_paths:
  if (.tool_name | test("^(Read|Edit|Write|NotebookEdit|Grep)$"))
  then [.tool_input.file_path, .tool_input.notebook_path, .tool_input.path] | map(strings)
  else [] end;

def unquoted: gsub("[\"'\\\\]"; "");

def glob_regex:
  gsub("(?<c>[.+^$(){}|])"; "\\\(.c)")
  | gsub("\\*"; "[^/]*")
  | gsub("\\?"; "[^/]")
  | gsub("\\[!"; "[^")
  | "^" + . + "$";

def matches_glob($name): try (glob_regex as $r | $name | test($r; "i")) catch false;

def risky_glob:
  (split("/") | last) as $base
  | ($base | test("[*?\\[]"))
    and (
      (($base | startswith("."))
        and any(".env", ".env.local", ".envrc", ".npmrc", ".pypirc", ".netrc", ".git-credentials";
                . as $name | $base | matches_glob($name)))
      or (any("id_rsa", "id_dsa", "id_ecdsa", "id_ed25519", "x.pem", "x.p12", "x.pfx";
              . as $name | $base | matches_glob($name))
          and ($base | matches_glob("readme.md") | not))
    );

targets as $raw
| ($raw | map(unquoted)) as $plain
| {
    text: ($raw + $plain | join("\n")),
    files: file_paths,
    glob: ([$plain[] | splits("[\\s;|&<>()=,`]+") | select(length > 0) | risky_glob] | any)
  }
JQ
)

payload=$(cat)

if ! inspected=$(jq -c "$program" <<<"$payload" 2>/dev/null); then
  echo "Blocked: secret-files-guard could not parse this tool call." >&2
  exit 2
fi

deny() {
  jq -nc '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: "Blocked: this call reaches a secrets file (.env, *.local.json, .envrc, .npmrc, .pypirc, .netrc, .git-credentials, a private key, or a .pem, .p12, .pfx, or .key file), directly, through a symlink, or through a glob that can match one. Those files are off limits to every tool. Rewrite it with a more specific pattern that cannot match them, such as the exact file name (appsettings.json, .env.example, .env.ctmpl) or an explicit list of files. A file test such as [ -f .env ] is allowed."
    }
  }'
  exit 0
}

[ "$(jq -r '.glob' <<<"$inspected")" = true ] && deny

files=$(jq -r '.files[]' <<<"$inspected")
resolved=""
if [ -n "$files" ]; then
  cwd=$(jq -r '.cwd // ""' <<<"$payload")
  resolved=$(
    cd "${cwd:-.}" 2>/dev/null
    while IFS= read -r file; do
      realpath -m -- "$file" 2>/dev/null
    done <<<"$files"
  )
fi

names='local\.json|appsettings[^\s"'\'']*[*?]|(?<!process)\.env(?!\.(ctmpl|example)\b)(?![\w-])|(?<![\w.-])(\.envrc|\.npmrc|\.pypirc|\.netrc|_netrc|\.git-credentials)(?![\w.-])|(?<![\w-])id_(rsa|dsa|ecdsa|ed25519)(?![\w.-]*\.pub(?![\w.-]))|\.(pem|p12|pfx)(?![\w.-])'

printf '%s\n%s\n%s\n' "$(jq -r '.text' <<<"$inspected")" "$files" "$resolved" | grep -qPi "$names" && deny

# .key is checked on file paths only, because in Bash text it matches code such as row.key.
printf '%s\n%s\n' "$files" "$resolved" | grep -qPi '\.key$' && deny

exit 0
