import type { AgentLoop, On, SessionMessage, ToolCallArgs } from 'claude-code'
import { describe, expect, test, type Engine } from 'claude-code/testing'

type Call = ToolCallArgs & AgentLoop
type Outcome = 'allow' | 'deny'
type Read = { readonly file_path: string; readonly agentId?: string; readonly limit?: number; readonly isError?: true }
type Files = Readonly<Record<string, string>>

const RAN = 'ran'
const HELPER = 'helper'
const REFERENCES = '/elsewhere/frie-neoforge/skills/standards/references'
const NEOFORGE = `${REFERENCES}/neoforge.md`
const NEOFORGE_21_1 = `${REFERENCES}/neoforge-21.1.md`
const NEOFORGE_21_4 = `${REFERENCES}/neoforge-21.4.md`
const WINDOWS_REFERENCES = 'C:\\Users\\u\\.claude\\plugins\\frie-neoforge\\skills\\standards\\references'
const MOD_PROPERTIES = '/mod/gradle.properties'
const MOD_SOURCE = '/mod/src/main/java/com/example/portal/PortalBlock.java'
const MOD_21_1: Files = { [MOD_PROPERTIES]: 'minecraft_version=1.21.1\nneo_version=21.1.172\n' }
const MOD_21_4: Files = { [MOD_PROPERTIES]: 'minecraft_version=1.21.4\nneo_version=21.4.98-beta\n' }

function buildTranscript(reads: readonly Read[]): SessionMessage[] {
  const toolUses = reads.map(({ agentId, isError, ...input }) => ({
    tool_use_id: crypto.randomUUID(),
    tool: 'Read',
    input,
    text: RAN,
    ...(isError === undefined ? {} : { isError }),
  }))
  return [{ role: 'assistant', text: '', toolUses }]
}

function findFile(files: Files, path: string): string | undefined {
  const normalized = path.replaceAll('\\', '/')
  return Object.entries(files).find(([name]) => normalized.endsWith(name))?.[1]
}

function arrangeFiles(on: On, files: Files) {
  on('fs.exists', (_, e) => ({ value: findFile(files, e.path) !== undefined }))
  on('fs.read', (_, e) => {
    const text = findFile(files, e.path)
    return text === undefined ? { deny: 'missing' } : { value: text }
  })
}

function arrange(on: On, files: Files, reads: readonly Read[]) {
  on('tool.call', () => ({ result: RAN }))
  arrangeFiles(on, files)
  on('session.messages', (_, e) => ({ value: buildTranscript(reads.filter(read => read.agentId === e.agentId)) }))
}

function buildReads(paths: readonly string[]): Read[] {
  return paths.map(path => ({ file_path: path }))
}

async function decide($: Engine, call: Call): Promise<Outcome> {
  const answer = await $.tool.call(call)
  return answer.result === RAN ? 'allow' : 'deny'
}

function buildEdit(path: string): Call {
  return { tool: 'Edit', file_path: path, old_string: 'a', new_string: 'b' }
}

describe('NeoForge standards gate', () => {
  test('denies a mod Java edit when no reference was read', async ($, on) => {
    arrange(on, MOD_21_1, [])

    expect(await decide($, buildEdit(MOD_SOURCE))).toBe('deny')
  })

  test('allows a 21.1 mod Java edit when neoforge.md and the 21.1 reference were read', async ($, on) => {
    arrange(on, MOD_21_1, buildReads([NEOFORGE, NEOFORGE_21_1]))

    expect(await decide($, buildEdit(MOD_SOURCE))).toBe('allow')
  })

  test('denies a 21.1 mod Java edit when only the 21.4 reference was read', async ($, on) => {
    arrange(on, MOD_21_1, buildReads([NEOFORGE, NEOFORGE_21_4]))

    expect(await decide($, buildEdit(MOD_SOURCE))).toBe('deny')
  })

  test('denies a 21.4 mod Java edit when only the 21.1 reference was read', async ($, on) => {
    arrange(on, MOD_21_4, buildReads([NEOFORGE, NEOFORGE_21_1]))

    expect(await decide($, buildEdit(MOD_SOURCE))).toBe('deny')
  })

  test('allows a 21.4 mod Java edit when neoforge.md and the 21.4 reference were read', async ($, on) => {
    arrange(on, MOD_21_4, buildReads([NEOFORGE, NEOFORGE_21_4]))

    expect(await decide($, buildEdit(MOD_SOURCE))).toBe('allow')
  })

  test('allows a 26.x mod Java edit when neoforge.md and the 21.4 reference were read', async ($, on) => {
    arrange(on, { [MOD_PROPERTIES]: 'neo_version=26.1.0.12\n' }, buildReads([NEOFORGE, NEOFORGE_21_4]))

    expect(await decide($, buildEdit(MOD_SOURCE))).toBe('allow')
  })

  test('allows a mod Java edit on a version with no reference when neoforge.md was read', async ($, on) => {
    arrange(on, { [MOD_PROPERTIES]: 'neo_version=21.3.50\n' }, buildReads([NEOFORGE]))

    expect(await decide($, buildEdit(MOD_SOURCE))).toBe('allow')
  })

  test('denies a mod Java edit when neoforge.md was read with a limit', async ($, on) => {
    arrange(on, MOD_21_1, [{ file_path: NEOFORGE, limit: 40 }, { file_path: NEOFORGE_21_1 }])

    expect(await decide($, buildEdit(MOD_SOURCE))).toBe('deny')
  })

  test('denies a mod Java edit when the neoforge.md read failed', async ($, on) => {
    arrange(on, MOD_21_1, [{ file_path: NEOFORGE, isError: true }, { file_path: NEOFORGE_21_1 }])

    expect(await decide($, buildEdit(MOD_SOURCE))).toBe('deny')
  })

  test('denies a subproject Java edit when neo_version is set in the root project', async ($, on) => {
    arrange(on, { ...MOD_21_1, '/mod/common/gradle.properties': 'org.gradle.jvmargs=-Xmx2G\n' }, [])

    expect(await decide($, buildEdit('/mod/common/src/main/java/com/example/Portal.java'))).toBe('deny')
  })

  test('denies a mod resource JSON write when no reference was read', async ($, on) => {
    arrange(on, MOD_21_1, [])

    expect(await decide($, { tool: 'Write', file_path: '/mod/src/main/resources/assets/example/models/block/portal.json', content: '' })).toBe('deny')
  })

  test('denies a mod Gradle build edit when no reference was read', async ($, on) => {
    arrange(on, MOD_21_1, [])

    expect(await decide($, buildEdit('/mod/build.gradle'))).toBe('deny')
  })

  test('allows a mod README edit when nothing was read', async ($, on) => {
    arrange(on, MOD_21_1, [])

    expect(await decide($, buildEdit('/mod/README.md'))).toBe('allow')
  })

  test('allows a mod Java edit when the file is under build', async ($, on) => {
    arrange(on, MOD_21_1, [])

    expect(await decide($, buildEdit('/mod/build/generated/Portal.java'))).toBe('allow')
  })

  test('allows a mod JSON edit when the file is under the dev run folder', async ($, on) => {
    arrange(on, MOD_21_1, [])

    expect(await decide($, buildEdit('/mod/runs/client/options.json'))).toBe('allow')
  })

  test('allows a Java edit outside a mod when nothing was read', async ($, on) => {
    arrange(on, { '/service/gradle.properties': 'org.gradle.caching=true\n' }, [])

    expect(await decide($, buildEdit('/service/src/main/java/com/example/Order.java'))).toBe('allow')
  })

  test('allows a Java edit with no gradle.properties when nothing was read', async ($, on) => {
    arrange(on, {}, [])

    expect(await decide($, buildEdit('/scripts/Tool.java'))).toBe('allow')
  })

  test('allows a mod Java edit on a Windows path when Windows-path references were read', async ($, on) => {
    arrange(on, { 'C:/mod/gradle.properties': 'neo_version=21.1.172\n' }, buildReads([`${WINDOWS_REFERENCES}\\neoforge.md`, `${WINDOWS_REFERENCES}\\neoforge-21.1.md`]))

    expect(await decide($, buildEdit('C:\\mod\\src\\main\\java\\Portal.java'))).toBe('allow')
  })

  test('denies a mod Java edit when the references were read by another agent', async ($, on) => {
    arrange(on, MOD_21_1, [NEOFORGE, NEOFORGE_21_1].map(path => ({ file_path: path, agentId: HELPER })))

    expect(await decide($, buildEdit(MOD_SOURCE))).toBe('deny')
  })

  test('allows a mod Java edit when the subagent read the references itself', async ($, on) => {
    arrange(on, MOD_21_1, [NEOFORGE, NEOFORGE_21_1].map(path => ({ file_path: path, agentId: HELPER })))

    expect(await decide($, { ...buildEdit(MOD_SOURCE), agentId: HELPER })).toBe('allow')
  })

  test('allows a mod Java edit when gradle.properties cannot be read', async ($, on) => {
    on('tool.call', () => ({ result: RAN }))
    on('fs.exists', () => ({ value: true }))
    on('fs.read', () => ({ deny: 'unreadable' }))

    expect(await decide($, buildEdit(MOD_SOURCE))).toBe('allow')
  })

  test('allows a mod Java edit when the agent transcript cannot be read', async ($, on) => {
    on('tool.call', () => ({ result: RAN }))
    arrangeFiles(on, MOD_21_1)
    on('session.messages', () => ({ deny: 'unreadable' }))

    expect(await decide($, buildEdit(MOD_SOURCE))).toBe('allow')
  })
})
