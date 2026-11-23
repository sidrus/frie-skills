import type { On } from 'claude-code'

const MAIN_AGENT = 'main'
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

export function registerStandardsGate(on: On) {
  const readsByAgent = new Map<string, Set<string>>()

  on('tool.call', { tool: 'Read' }, async ($, e, next) => {
    const answer = await next(e)
    const isFullRead = e.offset === undefined && e.limit === undefined
    if (isFullRead && answer.deny === undefined && answer.isError !== true) {
      const agent = e.agentId ?? MAIN_AGENT
      readsByAgent.set(agent, (readsByAgent.get(agent) ?? new Set()).add(e.file_path))
    }
    return answer
  })

  on('tool.call', { tool: ['Edit', 'Write'] }, ($, e, next) => {
    const reads = [...(readsByAgent.get(e.agentId ?? MAIN_AGENT) ?? [])]
    const missing = listRequiredReferences(e.file_path).filter(reference => !reads.some(path => path.endsWith(`/${reference}`)))
    if (missing.length === 0) {
      return next(e)
    }
    return { deny: writeDenial(missing.map(reference => `${$.plugin.root}/skills/${reference}`), e.file_path) }
  }).catch(($, e, next) => next(e))

  on('session.compact', async ($, e, next) => {
    const answer = await next(e)
    if (answer.skip === undefined) {
      readsByAgent.delete(e.agentId ?? MAIN_AGENT)
    }
    return answer
  })

  on('session.end', ($, e, next) => {
    if (e.reason === 'clear') {
      readsByAgent.clear()
    }
    return next(e)
  })
}
