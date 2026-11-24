import type { AgentLoop, On, SessionMessage, ToolCallArgs } from 'claude-code'
import { describe, expect, test, type Engine } from 'claude-code/testing'

type Call = ToolCallArgs & AgentLoop
type Outcome = 'allow' | 'deny'
type Read = { file_path: string; agentId?: string; limit?: number; isError?: true }

const RAN = 'ran'
const HELPER = 'helper'
const REFERENCES = '/elsewhere/frie-neoforge/skills/standards/references'
const NEOFORGE = `${REFERENCES}/neoforge.md`
const NEOFORGE_21_1 = `${REFERENCES}/neoforge-21.1.md`
const NEOFORGE_21_4 = `${REFERENCES}/neoforge-21.4.md`
const WINDOWS_REFERENCES = 'C:\\Users\\u\\.claude\\plugins\\frie-neoforge\\skills\\standards\\references'
const MOD_PROPERTIES = '/mod/gradle.properties'
const MOD_SOURCE = '/mod/src/main/java/com/example/portal/PortalBlock.java'
const MOD_21_1 = { [MOD_PROPERTIES]: 'minecraft_version=1.21.1\nneo_version=21.1.172\n' }
const MOD_21_4 = { [MOD_PROPERTIES]: 'minecraft_version=1.21.4\nneo_version=21.4.98-beta\n' }

function buildTranscript(reads: Read[]): SessionMessage[] {
  const toolUses = reads.map(({ agentId, isError, ...input }) => ({
    tool_use_id: crypto.randomUUID(),
    tool: 'Read',
    input,
    text: RAN,
    ...(isError === undefined ? {} : { isError }),
  }))
  return [{ role: 'assistant', text: '', toolUses }]
}

function arrange(on: On, files: Record<string, string>, reads: Read[]) {
  on('tool.call', () => ({ result: RAN }))
  on('fs.read', (_, e) => {
    const path = e.path.replaceAll('\\', '/')
    const file = Object.entries(files).find(([name]) => path.endsWith(name))
    return file === undefined ? { deny: 'missing' } : { value: file[1] }
  })
  on('session.messages', (_, e) => ({ value: buildTranscript(reads.filter(read => read.agentId === e.agentId)) }))
}

function readsOf(paths: string[]): Read[] {
  return paths.map(path => ({ file_path: path }))
}

async function decide($: Engine, call: Call): Promise<Outcome> {
  const answer = await $.tool.call(call)
  return answer.result === RAN ? 'allow' : 'deny'
}

function editOf(path: string): Call {
  return { tool: 'Edit', file_path: path, old_string: 'a', new_string: 'b' }
}

describe('NeoForge standards gate', () => {
  test('mod Java edit is denied when no reference was read', async ($, on) => {
    arrange(on, MOD_21_1, [])

    expect(await decide($, editOf(MOD_SOURCE))).toBe('deny')
  })

  test('21.1 mod Java edit is allowed when neoforge.md and the 21.1 reference were read', async ($, on) => {
    arrange(on, MOD_21_1, readsOf([NEOFORGE, NEOFORGE_21_1]))

    expect(await decide($, editOf(MOD_SOURCE))).toBe('allow')
  })

  test('21.1 mod Java edit is denied when only the 21.4 reference was read', async ($, on) => {
    arrange(on, MOD_21_1, readsOf([NEOFORGE, NEOFORGE_21_4]))

    expect(await decide($, editOf(MOD_SOURCE))).toBe('deny')
  })

  test('21.4 mod Java edit is denied when only the 21.1 reference was read', async ($, on) => {
    arrange(on, MOD_21_4, readsOf([NEOFORGE, NEOFORGE_21_1]))

    expect(await decide($, editOf(MOD_SOURCE))).toBe('deny')
  })

  test('21.4 mod Java edit is allowed when neoforge.md and the 21.4 reference were read', async ($, on) => {
    arrange(on, MOD_21_4, readsOf([NEOFORGE, NEOFORGE_21_4]))

    expect(await decide($, editOf(MOD_SOURCE))).toBe('allow')
  })

  test('26.x mod Java edit is allowed when neoforge.md and the 21.4 reference were read', async ($, on) => {
    arrange(on, { [MOD_PROPERTIES]: 'neo_version=26.1.0.12\n' }, readsOf([NEOFORGE, NEOFORGE_21_4]))

    expect(await decide($, editOf(MOD_SOURCE))).toBe('allow')
  })

  test('mod Java edit is allowed on a version with no reference when neoforge.md was read', async ($, on) => {
    arrange(on, { [MOD_PROPERTIES]: 'neo_version=21.3.50\n' }, readsOf([NEOFORGE]))

    expect(await decide($, editOf(MOD_SOURCE))).toBe('allow')
  })

  test('mod Java edit is denied when neoforge.md was read with a limit', async ($, on) => {
    arrange(on, MOD_21_1, [{ file_path: NEOFORGE, limit: 40 }, { file_path: NEOFORGE_21_1 }])

    expect(await decide($, editOf(MOD_SOURCE))).toBe('deny')
  })

  test('mod Java edit is denied when the neoforge.md read failed', async ($, on) => {
    arrange(on, MOD_21_1, [{ file_path: NEOFORGE, isError: true }, { file_path: NEOFORGE_21_1 }])

    expect(await decide($, editOf(MOD_SOURCE))).toBe('deny')
  })

  test('subproject Java edit is denied when neo_version is set in the root project', async ($, on) => {
    arrange(on, { ...MOD_21_1, '/mod/common/gradle.properties': 'org.gradle.jvmargs=-Xmx2G\n' }, [])

    expect(await decide($, editOf('/mod/common/src/main/java/com/example/Portal.java'))).toBe('deny')
  })

  test('mod resource JSON write is denied when no reference was read', async ($, on) => {
    arrange(on, MOD_21_1, [])

    expect(await decide($, { tool: 'Write', file_path: '/mod/src/main/resources/assets/example/models/block/portal.json', content: '' })).toBe('deny')
  })

  test('mod Gradle build edit is denied when no reference was read', async ($, on) => {
    arrange(on, MOD_21_1, [])

    expect(await decide($, editOf('/mod/build.gradle'))).toBe('deny')
  })

  test('mod README edit is allowed when nothing was read', async ($, on) => {
    arrange(on, MOD_21_1, [])

    expect(await decide($, editOf('/mod/README.md'))).toBe('allow')
  })

  test('mod Java edit is allowed when the file is under build', async ($, on) => {
    arrange(on, MOD_21_1, [])

    expect(await decide($, editOf('/mod/build/generated/Portal.java'))).toBe('allow')
  })

  test('mod JSON edit is allowed when the file is under the dev run folder', async ($, on) => {
    arrange(on, MOD_21_1, [])

    expect(await decide($, editOf('/mod/runs/client/options.json'))).toBe('allow')
  })

  test('Java edit outside a mod is allowed when nothing was read', async ($, on) => {
    arrange(on, { '/service/gradle.properties': 'org.gradle.caching=true\n' }, [])

    expect(await decide($, editOf('/service/src/main/java/com/example/Order.java'))).toBe('allow')
  })

  test('Java edit with no gradle.properties is allowed when nothing was read', async ($, on) => {
    arrange(on, {}, [])

    expect(await decide($, editOf('/scripts/Tool.java'))).toBe('allow')
  })

  test('mod Java edit on a Windows path is allowed when Windows-path references were read', async ($, on) => {
    arrange(on, { 'C:/mod/gradle.properties': 'neo_version=21.1.172\n' }, readsOf([`${WINDOWS_REFERENCES}\\neoforge.md`, `${WINDOWS_REFERENCES}\\neoforge-21.1.md`]))

    expect(await decide($, editOf('C:\\mod\\src\\main\\java\\Portal.java'))).toBe('allow')
  })

  test('mod Java edit is denied when the references were read by another agent', async ($, on) => {
    arrange(on, MOD_21_1, [NEOFORGE, NEOFORGE_21_1].map(path => ({ file_path: path, agentId: HELPER })))

    expect(await decide($, editOf(MOD_SOURCE))).toBe('deny')
  })

  test('mod Java edit is allowed when the subagent read the references itself', async ($, on) => {
    arrange(on, MOD_21_1, [NEOFORGE, NEOFORGE_21_1].map(path => ({ file_path: path, agentId: HELPER })))

    expect(await decide($, { ...editOf(MOD_SOURCE), agentId: HELPER })).toBe('allow')
  })

  test('mod Java edit is allowed when the agent transcript cannot be read', async ($, on) => {
    on('tool.call', () => ({ result: RAN }))
    on('fs.read', () => ({ value: MOD_21_1[MOD_PROPERTIES] }))
    on('session.messages', () => ({ deny: 'unreadable' }))

    expect(await decide($, editOf(MOD_SOURCE))).toBe('allow')
  })
})
