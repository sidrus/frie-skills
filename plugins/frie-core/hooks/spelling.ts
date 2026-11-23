import type { On } from 'claude-code'

export type ToolInput = { readonly tool: string; readonly [field: string]: unknown }

const BRITISH = new RegExp(
  String.raw`[a-z]*((real|organ|recogn|priorit|initial|serial|normal|optim|author|custom|minim|maxim|summar|final|categor|standard|util|emphas|apolog|synchron|visual|local|material|parameter|sanit|token|character|memor|capital|special|general|central|critic|modern|stabil)is(e[ds]?|ing|ation)|cancell(ed|ing)|(model|label|level|signal|total|travel|fuel)l(ed|ing|er)|fulfil(?!l)|judgement|behaviour|honour|neighbour|labour|rumour|colour|favour|flavour|humour|harbour|armour|endeavour|rigour|vigour|odour|vapour|savour|licence|centre|metre|analys(ed|e(?!s)|ing)|defence|catalogue|grey|programme(?![rd]))[a-z]*`,
  'gi',
)
const MAX_WORDS = 12

function selectStrings(values: unknown[]): string[] {
  return values.filter((value): value is string => typeof value === 'string')
}

function listWords(texts: string[]): string[] {
  return texts.flatMap(text => text.match(BRITISH) ?? [])
}

export function findBritishSpellings(call: ToolInput): string[] {
  const added = listWords(selectStrings([call.content, call.new_string, call.new_source]))
  const existing = new Set(listWords(selectStrings([call.old_string])).map(word => word.toLowerCase()))
  const found = new Map<string, string>()
  for (const word of added) {
    const key = word.toLowerCase()
    if (!existing.has(key) && !found.has(key)) {
      found.set(key, word)
    }
  }
  return [...found.values()].slice(0, MAX_WORDS)
}

function writeReminder(words: string[]): string {
  return `AMERICAN ENGLISH REMINDER. Brandon requires American English spelling in everything you write, including code, identifiers, XML docs, comments, and test data. This edit added: ${words.join(', ')}. Some matches are legitimate, such as deliberate fixture input data or ordinary words that only contain the pattern. Read each one and fix any that are genuinely British.`
}

export function registerSpellingReminder(on: On) {
  on('tool.call', { tool: ['Edit', 'Write', 'NotebookEdit'] }, async ($, e, next) => {
    const answer = await next(e)
    const words = findBritishSpellings(e)
    if (answer.deny !== undefined || answer.isError === true || words.length === 0) {
      return answer
    }
    return { ...answer, context: [...(answer.context ?? []), writeReminder(words)] }
  })
}
