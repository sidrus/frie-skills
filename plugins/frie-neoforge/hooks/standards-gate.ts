import type { Hook, On, SessionMessage } from 'claude-code'

type Engine = Parameters<Hook<'tool.call'>>[0]
type NeoVersion = { readonly major: number; readonly minor: number }

const REFERENCES = 'standards/references'
const NEOFORGE = `${REFERENCES}/neoforge.md`
const NEOFORGE_21_1 = `${REFERENCES}/neoforge-21.1.md`
const NEOFORGE_21_4 = `${REFERENCES}/neoforge-21.4.md`
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
  return `BLOCKED by the NeoForge standards gate. Brandon requires the reference for what you touch to be read BEFORE the first edit, not as a check afterward. This file is in a NeoForge ${major}.${minor} mod. Not read in full yet in this context window: ${paths}. Read each one with the Read tool and no offset or limit, then repeat this edit. Reading them is the entire point, so do not route around this by writing the file through Bash.`
}

function listFullReads(transcript: SessionMessage[]): string[] {
  return transcript
    .flatMap(message => message.toolUses)
    .filter(use => use.tool === 'Read' && use.isError === undefined && use.input.offset === undefined && use.input.limit === undefined)
    .map(use => use.input.file_path)
    .filter(path => typeof path === 'string')
    .map(normalizeSlashes)
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
    const reads = listFullReads(transcript)
    const missing = listRequiredReferences(version).filter(reference => !reads.some(path => path.endsWith(`/${reference}`)))
    if (missing.length === 0) {
      return next(e)
    }
    return { deny: writeDenial(missing.map(reference => `${$.plugin.root}/skills/${reference}`), version) }
  }).catch(($, e, next) => next(e))
}
