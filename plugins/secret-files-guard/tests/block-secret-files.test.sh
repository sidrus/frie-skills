#!/usr/bin/env bash
# Runs the guard against synthetic PreToolUse payloads. SCRIPT overrides the hook under test.
set -uo pipefail

root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
script=${SCRIPT:-$root/hooks/block-secret-files.sh}
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
failures=0

check() {
  if [ "$2" = "$3" ]; then
    echo "ok   $1"
  else
    echo "FAIL $1: expected '$2', got '$3'"
    failures=$((failures + 1))
  fi
}

decide() {
  local out
  out=$("$script" <<<"$1" 2>/dev/null)
  if [ $? -eq 2 ]; then
    echo blocked
  elif [ -n "$out" ]; then
    jq -r '.hookSpecificOutput.permissionDecision' <<<"$out"
  else
    echo allow
  fi
}

call() {
  jq -nc --arg t "$1" --argjson i "$2" '{tool_name: $t, tool_input: $i}'
}

read_file() {
  decide "$(call Read "$(jq -nc --arg p "$1" '{file_path: $p}')")"
}

bash_cmd() {
  decide "$(call Bash "$(jq -nc --arg c "$1" '{command: $c}')")"
}

check "Read .env" deny "$(read_file /repo/.env)"
check "Read .env.local" deny "$(read_file /repo/.env.local)"
check "Read prod.env" deny "$(read_file /repo/prod.env)"
check "Read .env.example" allow "$(read_file /repo/.env.example)"
check "Read .env.ctmpl" allow "$(read_file /repo/.env.ctmpl)"
check "Read appsettings.Local.json" deny "$(read_file /repo/appsettings.Local.json)"
check "Read appsettings.json" allow "$(read_file /repo/appsettings.json)"
check "Bash cat .env" deny "$(bash_cmd 'cat .env')"
check "Bash glob over appsettings" deny "$(bash_cmd 'cat appsettings*')"
check "Bash process.env reference" allow "$(bash_cmd 'node -e "console.log(process.env.HOME)"')"
check "Grep glob that can match .env" deny "$(decide "$(call Grep '{"pattern":"x","glob":".env*"}')")"
check "Rider patch touching .env" deny "$(decide "$(call mcp__rider__apply_patch '{"input":"*** Update File: src/.env\n+X=1"}')")"
check "Rider read of a normal file" allow "$(decide "$(call mcp__rider__get_file_text_by_path '{"pathInProject":"src/app.cs"}')")"
check "Read a normal file" allow "$(read_file /repo/README.md)"

echo "== quoting"
check "Bash single-quote split" deny "$(bash_cmd "cat .e''nv")"
check "Bash double-quote split" deny "$(bash_cmd 'cat .e""nv')"
check "Bash backslash escape" deny "$(bash_cmd 'cat .\env')"

echo "== globs"
check "Bash .en*" deny "$(bash_cmd 'cat .en*')"
check "Bash .e?v" deny "$(bash_cmd 'cat .e?v')"
check "Bash .[e]nv" deny "$(bash_cmd 'cat .[e]nv')"
check "Bash .* " deny "$(bash_cmd 'cat .*')"
check "Bash quoted glob" deny "$(bash_cmd 'find . -name ".e*"')"
check "Bash *.pem" deny "$(bash_cmd 'cat *.pem')"
check "Bash bare * stays allowed" allow "$(bash_cmd 'grep -n foo *')"
check "Bash *.json stays allowed" allow "$(bash_cmd 'ls *.json')"
check "Bash test bracket stays allowed" allow "$(bash_cmd '[ -d src ] && ls src')"
check "Glob pattern **/.e*" deny "$(decide "$(call Glob '{"pattern":"**/.e*"}')")"
check "Glob pattern **/*.cs stays allowed" allow "$(decide "$(call Glob '{"pattern":"**/*.cs"}')")"

echo "== symlinks"
ln -s "$tmp/.env" "$tmp/notes.txt"
check "Read symlink to .env" deny "$(read_file "$tmp/notes.txt")"
check "Read relative symlink via cwd" deny "$(decide "$(jq -nc --arg c "$tmp" '{tool_name: "Read", cwd: $c, tool_input: {file_path: "notes.txt"}}')")"

echo "== existence checks"
check "test -e .env" allow "$(bash_cmd 'test -e .env')"
check "[ -f .env ] alone" allow "$(bash_cmd '[ -f .env ] && echo yes')"
check "[ -f .env ] then cat" deny "$(bash_cmd '[ -f .env ] && cat .env')"
check "test -e with command substitution" deny "$(bash_cmd 'test -e "$(cat .env)"')"
check "test -n is not an existence check" deny "$(bash_cmd 'test -n "$(cat .env)"')"

echo "== credential files"
for name in .envrc .npmrc .pypirc .netrc _netrc .git-credentials; do
  check "Read $name" deny "$(read_file "/home/u/$name")"
done
check "Read id_rsa" deny "$(read_file /home/u/.ssh/id_rsa)"
check "Read id_ed25519_work" deny "$(read_file /home/u/.ssh/id_ed25519_work)"
check "Read id_rsa.pub" allow "$(read_file /home/u/.ssh/id_rsa.pub)"
check "Read server.pem" deny "$(read_file /repo/certs/server.pem)"
check "Read cert.pfx" deny "$(read_file /repo/certs/cert.pfx)"
check "Read cert.p12" deny "$(read_file /repo/certs/cert.p12)"
check "Read tls.key" deny "$(read_file /repo/certs/tls.key)"
check "Bash cat id_rsa" deny "$(bash_cmd 'cat ~/.ssh/id_rsa')"
check "Bash cat .npmrc" deny "$(bash_cmd 'cat .npmrc')"
check "Bash row.key stays allowed" allow "$(bash_cmd "node -e 'rows.map(row => row.key)'")"

mkdir "$tmp/bin"
for tool in bash cat grep; do
  ln -s "$(command -v "$tool")" "$tmp/bin/$tool"
done
PATH="$tmp/bin" "$script" <<<'{"tool_name":"Read","tool_input":{"file_path":"/repo/.env"}}' >/dev/null 2>&1
check "blocks when jq is missing" 2 "$?"

echo
[ "$failures" -eq 0 ] && echo "all passed" || echo "$failures failed"
[ "$failures" -eq 0 ]
