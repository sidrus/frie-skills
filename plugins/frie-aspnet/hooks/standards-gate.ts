import type { Hook, On, SessionMessage } from 'claude-code'

type Engine = Parameters<Hook<'tool.call'>>[0]
type ToolUse = SessionMessage['toolUses'][number]
type SuffixReferences = { readonly suffix: string; readonly references: readonly string[]; readonly needsDomain: boolean }
type Requirement = { readonly references: readonly string[]; readonly needsDomain: boolean }

const STANDARDS = 'standards/references'
const HOSTING = `${STANDARDS}/dotnet-hosting.md`
const BLAZOR = `${STANDARDS}/blazor.md`
const ASPNET_TESTING = `${STANDARDS}/aspnet-testing.md`
const ENTERPRISE_TESTING = `${STANDARDS}/enterprise-testing.md`
const ENTERPRISE_PLUGIN = 'frie-enterprise'
const ENTERPRISE_SKILL = `${ENTERPRISE_PLUGIN}:standards`
const ENTERPRISE_SKILL_FILE = /\/frie-enterprise\/(?:[^/]+\/)?skills\/standards\/SKILL\.md$/
const GAME_PROJECT_FILE = 'project.godot'
const EXEMPT_PATH = /^\/tmp\/|\/scratchpad\/|\/obj\/|\/bin\/|\/node_modules\/|\.(Build|Target)\.cs$/
const TEST_PATH = /\/[Tt]ests?\/|\/[^/]*Tests?(\/|\.(cs|razor)$)/
const REFERENCES_BY_SUFFIX: readonly SuffixReferences[] = [
  { suffix: '.razor.cs', references: [BLAZOR, HOSTING], needsDomain: true },
  { suffix: '.razor.css', references: [BLAZOR], needsDomain: false },
  { suffix: '.razor', references: [BLAZOR, HOSTING], needsDomain: true },
  { suffix: '.cs', references: [HOSTING], needsDomain: true },
]

function normalizeSlashes(path: string): string {
  return path.replaceAll('\\', '/')
}

function listAncestorFolders(file: string): string[] {
  const segments = file.split('/')
  return segments
    .slice(1, -1)
    .map((_, index) => segments.slice(0, segments.length - 1 - index).join('/'))
    .filter(folder => folder !== '')
}

async function isInGameProject($: Engine, file: string): Promise<boolean> {
  for (const folder of listAncestorFolders(file)) {
    if (await $.fs.exists(`${folder}/${GAME_PROJECT_FILE}`)) {
      return true
    }
  }
  return false
}

function findRequirement(file: string): Requirement | undefined {
  const match = EXEMPT_PATH.test(file) ? undefined : REFERENCES_BY_SUFFIX.find(({ suffix }) => file.endsWith(suffix))
  if (match === undefined || !match.needsDomain || !TEST_PATH.test(file)) {
    return match
  }
  return { references: [...match.references, ASPNET_TESTING, ENTERPRISE_TESTING], needsDomain: true }
}

function locateReference(reference: string, root: string): string {
  return reference === ENTERPRISE_TESTING ? `${ENTERPRISE_TESTING} in the ${ENTERPRISE_PLUGIN} plugin` : `${root}/skills/${reference}`
}

function writeDenial(missing: readonly string[], file: string): string {
  const paths = missing.join(', ')
  const name = file.split('/').pop()
  return `BLOCKED by the ASP.NET standards gate. Brandon requires the standards for what you touch to be loaded BEFORE the first edit, not as a check afterward. Not loaded in full yet in this context window: ${paths}. Invoke a skill with the Skill tool and read each reference with the Read tool and no offset or limit, then repeat this edit. If ${name} crosses a repository, service, endpoint, or mapping boundary, read dotnet-layering.md as well. Loading them is the entire point, so do not route around this by writing the file through Bash.`
}

function listFullReads(uses: readonly ToolUse[]): string[] {
  return uses
    .filter(use => use.tool === 'Read' && use.input.offset === undefined && use.input.limit === undefined)
    .map(use => use.input.file_path)
    .filter(path => typeof path === 'string')
    .map(normalizeSlashes)
}

function hasLoadedDomain(uses: readonly ToolUse[], reads: readonly string[]): boolean {
  return uses.some(use => use.tool === 'Skill' && use.input.skill === ENTERPRISE_SKILL) || reads.some(path => ENTERPRISE_SKILL_FILE.test(path))
}

function listMissing({ references, needsDomain }: Requirement, transcript: SessionMessage[], root: string): string[] {
  const uses = transcript.flatMap(message => message.toolUses).filter(use => use.isError === undefined)
  const reads = listFullReads(uses)
  const missingReferences = references.filter(reference => !reads.some(path => path.endsWith(`/${reference}`))).map(reference => locateReference(reference, root))
  return needsDomain && !hasLoadedDomain(uses, reads) ? [`the ${ENTERPRISE_SKILL} skill`, ...missingReferences] : missingReferences
}

export function registerStandardsGate(on: On) {
  on('tool.call', { tool: ['Edit', 'Write'] }, async ($, e, next) => {
    const file = normalizeSlashes(e.file_path)
    const requirement = findRequirement(file)
    if (requirement === undefined || (await isInGameProject($, file))) {
      return next(e)
    }
    const transcript = await $.session.messages({ agentId: e.agentId })
    if (!Array.isArray(transcript)) {
      return next(e)
    }
    const missing = listMissing(requirement, transcript, $.plugin.root)
    if (missing.length === 0) {
      return next(e)
    }
    return { deny: writeDenial(missing, file) }
  }).catch(($, e, next) => next(e))
}
