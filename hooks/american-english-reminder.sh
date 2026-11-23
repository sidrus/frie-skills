#!/usr/bin/env bash
# PreToolUse reminder: flags likely British spellings that an Edit, Write, or NotebookEdit adds
# to a file. Never blocks and never returns a permission decision. Exits 0 always.
set -uo pipefail

payload=$(cat)

pattern='[[:alpha:]]*((real|organ|recogn|priorit|initial|serial|normal|optim|author|custom|minim|maxim|summar|final|categor|standard|util|emphas|apolog|synchron|visual|local|material|parameter|sanit|token|character|memor|capital|special|general|central|critic|modern|stabil)is(e[ds]?|ing|ation)|cancell(ed|ing)|(model|label|level|signal|total|travel|fuel)l(ed|ing|er)|fulfil([^l]|$)|judgement|behaviour|honour|neighbour|labour|rumour|colour|favour|licence|centre|metre|analys(e[ds]?|ing)|defence|catalogue|grey|programme([^rd]|$))[[:alpha:]]*'

matches() {
  jq -r "[$1] | map(select(type == \"string\")) | .[]" <<<"$payload" 2>/dev/null \
    | grep -oEi "$pattern" \
    | sed 's/[^[:alpha:]]//g' \
    | sort -uf
}

added=$(matches '.tool_input.content?, .tool_input.new_string?, .tool_input.new_source?, (.tool_input.edits[]?.new_string)')
[ -n "$added" ] || exit 0

existing=$(matches '.tool_input.old_string?, (.tool_input.edits[]?.old_string)')
if [ -n "$existing" ]; then
  added=$(grep -vxiF -f <(printf '%s\n' "$existing") <<<"$added")
fi

hits=$(head -12 <<<"$added" | paste -sd, - | sed 's/,/, /g')
[ -n "$hits" ] || exit 0

jq -nc --arg hits "$hits" '{
  systemMessage: ("American English check — possible British spellings in this edit: " + $hits),
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    additionalContext: ("AMERICAN ENGLISH REMINDER. Brandon requires American English spelling in everything you write, including code, identifiers, XML docs, comments, and test data. This edit adds: " + $hits + ". Some matches are legitimate, such as deliberate fixture input data or ordinary words that only contain the pattern. Read each one, fix any that are genuinely British, then proceed. Nothing is blocked.")
  }
}'

exit 0
