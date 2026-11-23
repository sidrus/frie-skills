#!/usr/bin/env bash
# PreToolUse gate: denies an Edit or Write to a C#, Razor, or Python file until the standards
# references for that file have been read in full in the current context window.
set -uo pipefail

skills=$(cd "$(dirname "${BASH_SOURCE[0]}")/../skills" && pwd) || exit 0

payload=$(cat)

case "$(jq -r '.tool_name // ""' <<<"$payload" 2>/dev/null)" in
  Edit|Write) ;;
  *) exit 0 ;;
esac

file=$(jq -r '.tool_input.file_path // ""' <<<"$payload")
[ -n "$file" ] || exit 0

case "$file" in
  /tmp/*|*/scratchpad/*|*/.venv/*|*/obj/*|*/bin/*|*/node_modules/*) exit 0 ;;
esac

standards=brandon-standards/references
case "$file" in
  *.py) required="$standards/python.md" ;;
  *.cs) required="$standards/csharp.md $standards/formatting.md" ;;
  *.razor) required="$standards/blazor.md $standards/csharp.md $standards/formatting.md" ;;
  *) exit 0 ;;
esac

if grep -qE '/[Tt]ests?/|/[^/]*Tests?(/|\.(cs|razor)$)|/test_[^/]*\.py$|/[^/]*_test\.py$|/conftest\.py$' <<<"$file"; then
  required="$required engineering-patterns/references/testing.md"
fi

transcript=$(jq -r '.transcript_path // ""' <<<"$payload")
[ -f "$transcript" ] || exit 0

start=$(grep -n '"isCompactSummary"[[:space:]]*:[[:space:]]*true' "$transcript" | tail -1 | cut -d: -f1)

read_paths=$(tail -n +"$(( ${start:-0} + 1 ))" "$transcript" | jq -rR '
  fromjson?
  | select(.type == "assistant")
  | .message.content[]?
  | select(.type == "tool_use" and .name == "Read" and .input.offset == null and .input.limit == null)
  | .input.file_path // empty
')

missing=""
for ref in $required; do
  [ -f "$skills/$ref" ] || continue
  grep -qF "/$ref" <<<"$read_paths" || missing="$missing $skills/$ref"
done

[ -n "$missing" ] || exit 0

paths=$(printf '%s\n' $missing | paste -sd, - | sed 's/,/, /g')

jq -nc --arg paths "$paths" --arg file "${file##*/}" '{
  systemMessage: ("Standards gate: read " + $paths + " before editing " + $file),
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "deny",
    permissionDecisionReason: ("BLOCKED by the standards gate. Brandon requires the reference for what you touch to be read BEFORE the first edit, not as a check afterward. Not read in full yet in this context window: " + $paths + ". Read each one with the Read tool and no offset or limit, then repeat this edit. If " + $file + " crosses a repository, service, endpoint, or mapping boundary, read dotnet-layering.md as well. Reading them is the entire point, so do not route around this by writing the file through Bash.")
  }
}'

exit 0
