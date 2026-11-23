import type { On, SessionMessage } from 'claude-code'

const STANDARDS = 'standards/references'
const PYTHON = `${STANDARDS}/python.md`
const TESTING = 'engineering-patterns/references/testing.md'
const EXEMPT_PATH = /^\/tmp\/|\/scratchpad\/|\/\.venv\/|\/bin\/|\/node_modules\//
const TEST_PATH = /\/[Tt]ests?\/|\/test_[^/]*\.py$|\/[^/]*_test\.py$|\/conftest\.py$/

function toForwardSlashes(path: string): string {
  return path.replaceAll('\\', '/')
}

function listRequiredReferences(file: string): string[] {
  if (EXEMPT_PATH.test(file) || !file.endsWith('.py')) {
    return []
  }
  return TEST_PATH.test(file) ? [PYTHON, TESTING] : [PYTHON]
}

function locateReference(reference: string, root: string): string {
  return reference === TESTING ? `${TESTING} in the frie-core plugin` : `${root}/skills/${reference}`
}

function writeDenial(missing: string[]): string {
  const paths = missing.join(', ')
  return `BLOCKED by the standards gate. Brandon requires the reference for what you touch to be read BEFORE the first edit, not as a check afterward. Not read in full yet in this context window: ${paths}. Read each one with the Read tool and no offset or limit, then repeat this edit. Reading them is the entire point, so do not route around this by writing the file through Bash.`
}

function listFullReads(transcript: SessionMessage[]): string[] {
  return transcript
    .flatMap(message => message.toolUses)
    .filter(use => use.tool === 'Read' && use.isError === undefined && use.input.offset === undefined && use.input.limit === undefined)
    .map(use => use.input.file_path)
    .filter(path => typeof path === 'string')
    .map(toForwardSlashes)
}

export function registerStandardsGate(on: On) {
  on('tool.call', { tool: ['Edit', 'Write'] }, async ($, e, next) => {
    const file = toForwardSlashes(e.file_path)
    const required = listRequiredReferences(file)
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
    return { deny: writeDenial(missing.map(reference => locateReference(reference, $.plugin.root))) }
  }).catch(($, e, next) => next(e))
}
