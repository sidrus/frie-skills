import type { Hook, On, SessionMessage } from 'claude-code'

type Engine = Parameters<Hook<'tool.call'>>[0]
type NeoVersion = { readonly major: number; readonly minor: number }
type ToolUse = SessionMessage['toolUses'][number]

const REFERENCES = 'standards/references'
const NEOFORGE = `${REFERENCES}/neoforge.md`
const NEOFORGE_21_1 = `${REFERENCES}/neoforge-21.1.md`
const NEOFORGE_21_4 = `${REFERENCES}/neoforge-21.4.md`
const DOMAIN_SKILL = 'frie-gamedev:standards'
const DOMAIN_SKILL_FILE = /\/frie-gamedev\/(?:[^/]+\/)?skills\/standards\/SKILL\.md$/
const EXEMPT_PATH = /^\/tmp\/|\/scratchpad\/|\/build\/|\/runs?\/|\/\.gradle\/|\/node_modules\//
const MOD_FILE = /\.(java|json|toml|gradle|kts)$/
const NEO_VERSION = /^\s*neo_version\s*=\s*(\d+)\.(\d+)/m

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

function parseNeoVersion(properties: string): NeoVersion | undefined {
  const match = NEO_VERSION.exec(properties)
  if (match === null) {
    return undefined
  }
  return { major: Number(match[1]), minor: Number(match[2]) }
}

async function findNeoVersion($: Engine, file: string): Promise<NeoVersion | undefined> {
  for (const folder of listAncestorFolders(file)) {
    const path = `${folder}/gradle.properties`
    const version = (await $.fs.exists(path)) ? parseNeoVersion(await $.fs.read(path)) : undefined
    if (version !== undefined) {
      return version
    }
  }
  return undefined
}

function listRequiredReferences({ major, minor }: NeoVersion): string[] {
  if (major === 21 && minor <= 1) {
    return [NEOFORGE, NEOFORGE_21_1]
  }
  if (major > 21 || (major === 21 && minor >= 4)) {
    return [NEOFORGE, NEOFORGE_21_4]
  }
  return [NEOFORGE]
}

function writeDenial(missing: string[], { major, minor }: NeoVersion): string {
  const paths = missing.join(', ')
  return `BLOCKED by the NeoForge standards gate. Brandon requires the standards for what you touch to be loaded BEFORE the first edit, not as a check afterward. This file is in a NeoForge ${major}.${minor} mod. Not loaded in full yet in this context window: ${paths}. Invoke a skill with the Skill tool and read each reference with the Read tool and no offset or limit, then repeat this edit. Loading them is the entire point, so do not route around this by writing the file through Bash.`
}

function listFullReads(uses: readonly ToolUse[]): string[] {
  return uses
    .filter(use => use.tool === 'Read' && use.input.offset === undefined && use.input.limit === undefined)
    .map(use => use.input.file_path)
    .filter(path => typeof path === 'string')
    .map(normalizeSlashes)
}

function listMissing(version: NeoVersion, transcript: SessionMessage[], root: string): string[] {
  const uses = transcript.flatMap(message => message.toolUses).filter(use => use.isError === undefined)
  const reads = listFullReads(uses)
  const hasDomain = uses.some(use => use.tool === 'Skill' && use.input.skill === DOMAIN_SKILL) || reads.some(path => DOMAIN_SKILL_FILE.test(path))
  const missingReferences = listRequiredReferences(version)
    .filter(reference => !reads.some(path => path.endsWith(`/${reference}`)))
    .map(reference => `${root}/skills/${reference}`)
  return hasDomain ? missingReferences : [`the ${DOMAIN_SKILL} skill`, ...missingReferences]
}

export function registerStandardsGate(on: On) {
  on('tool.call', { tool: ['Edit', 'Write'] }, async ($, e, next) => {
    const file = normalizeSlashes(e.file_path)
    if (EXEMPT_PATH.test(file) || !MOD_FILE.test(file)) {
      return next(e)
    }
    const version = await findNeoVersion($, file)
    if (version === undefined) {
      return next(e)
    }
    const transcript = await $.session.messages({ agentId: e.agentId })
    if (!Array.isArray(transcript)) {
      return next(e)
    }
    const missing = listMissing(version, transcript, $.plugin.root)
    if (missing.length === 0) {
      return next(e)
    }
    return { deny: writeDenial(missing, version) }
  }).catch(($, e, next) => next(e))
}
