#!/usr/bin/env bash
# Runs the frie-skills hooks against synthetic PreToolUse payloads. HOOKS overrides the hook folder.
set -uo pipefail

root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
hooks=${HOOKS:-$root/hooks}
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

read_call() {
  jq -nc --arg p "$1" --argjson extra "${2:-{\}}" \
    '{type: "assistant", message: {content: [{type: "tool_use", name: "Read", input: ({file_path: $p} + $extra)}]}}'
}

transcript() {
  local path="$tmp/$1.jsonl"
  shift
  : > "$path"
  for ref in "$@"; do
    read_call "/cache/skills/$ref" >> "$path"
  done
  echo "$path"
}

gate_output() {
  jq -nc --arg t "$1" --arg f "$2" '{tool_name: "Edit", transcript_path: $t, tool_input: {file_path: $f}}' \
    | "$hooks/standards-gate.sh"
}

gate() {
  local out
  out=$(gate_output "$1" "$2")
  if [ -n "$out" ]; then
    jq -r '.hookSpecificOutput.permissionDecision' <<<"$out"
  else
    echo allow
  fi
}

spelling() {
  local out
  out=$("$hooks/american-english-reminder.sh" <<<"$1")
  if [ -n "$out" ]; then
    jq -r '.systemMessage | sub("^[^:]*: "; "")' <<<"$out"
  else
    echo none
  fi
}

edit() {
  jq -nc --arg o "$1" --arg n "$2" '{tool_name: "Edit", tool_input: {old_string: $o, new_string: $n}}'
}

cs=(brandon-standards/references/csharp.md brandon-standards/references/formatting.md)
testing=engineering-patterns/references/testing.md

echo "== standards-gate"
check "C# file with its references read" allow "$(gate "$(transcript cs "${cs[@]}")" /repo/src/Foo.cs)"
check "C# file with nothing read" deny "$(gate "$(transcript none)" /repo/src/Foo.cs)"
check "test file needs testing.md" deny "$(gate "$(transcript cs "${cs[@]}")" /repo/tests/FooTests.cs)"
check "test file with testing.md read" allow "$(gate "$(transcript cs-testing "${cs[@]}" "$testing")" /repo/tests/FooTests.cs)"
check "test project folder counts as tests" deny "$(gate "$(transcript cs "${cs[@]}")" /repo/App.Tests/Foo.cs)"
check "Latest.cs is not a test file" allow "$(gate "$(transcript cs "${cs[@]}")" /repo/src/Latest.cs)"
check "pytest file needs testing.md" deny "$(gate "$(transcript py brandon-standards/references/python.md)" /repo/foo_test.py)"
check "non-code file passes" allow "$(gate "$(transcript none)" /repo/README.md)"

bad="$tmp/bad.jsonl"
{ echo 'not json'; cat "$(transcript cs "${cs[@]}")"; } > "$bad"
check "malformed transcript line is skipped" allow "$(gate "$bad" /repo/src/Foo.cs)"

partial="$tmp/partial.jsonl"
{ read_call "/cache/skills/${cs[0]}" '{"limit": 20}'; read_call "/cache/skills/${cs[1]}"; } > "$partial"
check "partial read does not count" deny "$(gate "$partial" /repo/src/Foo.cs)"

compacted="$tmp/compacted.jsonl"
{ cat "$(transcript cs "${cs[@]}")"; echo '{"type":"user","isCompactSummary":true}'; } > "$compacted"
check "reads before compaction do not count" deny "$(gate "$compacted" /repo/src/Foo.cs)"

missing_paths=$(gate_output "$(transcript none)" /repo/tests/FooTests.razor \
  | jq -r '.systemMessage | capture("read (?<p>.*) before").p | split(", ")[]' \
  | while read -r path; do [ -f "$path" ] || echo "$path"; done)
check "every reference the gate asks for exists" "" "$missing_paths"

echo "== american-english-reminder"
check "flags a British word" colour "$(spelling "$(edit '' 'colour')")"
check "programmer is American" none "$(spelling "$(edit '' 'programmer programmed')")"
check "flags double-L forms" "labelled, modelling" "$(spelling "$(edit '' 'modelling labelled')")"
check "skips words already in old_string" none "$(spelling "$(edit 'colour = 1' 'colour = 2')")"
check "flags only the added word" behaviour "$(spelling "$(edit 'colour' 'colour behaviour')")"
check "CancellationToken is American" none "$(spelling "$(edit '' 'CancellationToken')")"
check "flags Write content" Visualise "$(spelling '{"tool_name":"Write","tool_input":{"content":"Visualise"}}')"
check "flags NotebookEdit source" colour "$(spelling '{"tool_name":"NotebookEdit","tool_input":{"new_source":"colour"}}')"

echo
[ "$failures" -eq 0 ] && echo "all passed" || echo "$failures failed"
[ "$failures" -eq 0 ]
