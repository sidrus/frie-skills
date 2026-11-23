import type { On, SessionMessage } from 'claude-code'

const STANDARDS = 'brandon-standards/references'
const PYTHON = `${STANDARDS}/python.md`
const CSHARP = `${STANDARDS}/csharp.md`
const FORMATTING = `${STANDARDS}/formatting.md`
const BLAZOR = `${STANDARDS}/blazor.md`
const TESTING = 'engineering-patterns/references/testing.md'
const EXEMPT_PATH = /^\/tmp\/|\/scratchpad\/|\/\.venv\/|\/obj\/|\/bin\/|\/node_modules\//
const TEST_PATH = /\/[Tt]ests?\/|\/[^/]*Tests?(\/|\.(cs|razor)$)|\/test_[^/]*\.py$|\/[^/]*_test\.py$|\/conftest\.py$/
const REFERENCES_BY_EXTENSION = new Map([
  ['py', [PYTHON]],
  ['cs', [CSHARP, FORMATTING]],
  ['razor', [BLAZOR, CSHARP, FORMATTING]],
])

function listRequiredReferences(file: string): string[] {
  const references = EXEMPT_PATH.test(file) ? undefined : REFERENCES_BY_EXTENSION.get(file.split('.').pop() ?? '')
  if (references === undefined) {
    return []
  }
  return TEST_PATH.test(file) ? [...references, TESTING] : references
}

function writeDenial(missing: string[], file: string): string {
  const paths = missing.join(', ')
  const name = file.split('/').pop()
  return `BLOCKED by the standards gate. Brandon requires the reference for what you touch to be read BEFORE the first edit, not as a check afterward. Not read in full yet in this context window: ${paths}. Read each one with the Read tool and no offset or limit, then repeat this edit. If ${name} crosses a repository, service, endpoint, or mapping boundary, read dotnet-layering.md as well. Reading them is the entire point, so do not route around this by writing the file through Bash.`
}

function listFullReads(transcript: SessionMessage[]): string[] {
  return transcript
    .flatMap(message => message.toolUses)
    .filter(use => use.tool === 'Read' && use.isError === undefined && use.input.offset === undefined && use.input.limit === undefined)
    .map(use => use.input.file_path)
    .filter(path => typeof path === 'string')
}

export function registerStandardsGate(on: On) {
  on('tool.call', { tool: ['Edit', 'Write'] }, async ($, e, next) => {
    const required = listRequiredReferences(e.file_path)
    if (required.length === 0) {
      return next(e)
    }
    const transcript = await $.session.messages({ agentId: e.agentId })
    if (!Array.isArray(transcript)) {
      return next(e)
    }
    const reads = listFullReads(transcript)
    const missing = required.filter(reference => !reads.some(path => path.endsWith(`/${reference}`)))
    if (missing.length === 0) {
      return next(e)
    }
    return { deny: writeDenial(missing.map(reference => `${$.plugin.root}/skills/${reference}`), e.file_path) }
  }).catch(($, e, next) => next(e))
}
