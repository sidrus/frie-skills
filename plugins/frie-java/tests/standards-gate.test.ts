import type { AgentLoop, On, SessionMessage, ToolCallArgs } from 'claude-code'
import { describe, expect, test, type Engine } from 'claude-code/testing'

type Call = ToolCallArgs & AgentLoop
type Outcome = 'allow' | 'deny'
type Read = { file_path: string; agentId?: string; limit?: number; isError?: true }

const RAN = 'ran'
const HELPER = 'helper'
const REFERENCES = '/elsewhere/frie-java/skills/standards/references'
const JAVA = `${REFERENCES}/java.md`
const JAVA_TESTING = `${REFERENCES}/java-testing.md`
const TESTING = '/elsewhere/frie-core/skills/engineering-patterns/references/testing.md'
const WINDOWS_JAVA = 'C:\\Users\\u\\.claude\\plugins\\frie-java\\skills\\standards\\references\\java.md'
const SOURCE = '/repo/src/main/java/com/example/orders/OrderService.java'

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

function arrange(on: On, reads: Read[]) {
  on('tool.call', () => ({ result: RAN }))
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

describe('standards gate', () => {
  test('Java edit is denied when java.md was not read', async ($, on) => {
    arrange(on, [])

    expect(await decide($, editOf(SOURCE))).toBe('deny')
  })

  test('Java edit is allowed when java.md was read in full', async ($, on) => {
    arrange(on, readsOf([JAVA]))

    expect(await decide($, editOf(SOURCE))).toBe('allow')
  })

  test('Java edit is denied when java.md was read with a limit', async ($, on) => {
    arrange(on, [{ file_path: JAVA, limit: 40 }])

    expect(await decide($, editOf(SOURCE))).toBe('deny')
  })

  test('Java edit is denied when the java.md read failed', async ($, on) => {
    arrange(on, [{ file_path: JAVA, isError: true }])

    expect(await decide($, editOf(SOURCE))).toBe('deny')
  })

  test('Java write is denied when java.md was not read', async ($, on) => {
    arrange(on, [])

    expect(await decide($, { tool: 'Write', file_path: SOURCE, content: '' })).toBe('deny')
  })

  test('Gradle build edit is denied when java.md was not read', async ($, on) => {
    arrange(on, [])

    expect(await decide($, editOf('/repo/build.gradle.kts'))).toBe('deny')
  })

  test('Gradle settings edit is denied when java.md was not read', async ($, on) => {
    arrange(on, [])

    expect(await decide($, editOf('/repo/settings.gradle'))).toBe('deny')
  })

  test('Java test edit is denied when java-testing.md was not read', async ($, on) => {
    arrange(on, readsOf([JAVA, TESTING]))

    expect(await decide($, editOf('/repo/src/test/java/com/example/orders/OrderServiceTest.java'))).toBe('deny')
  })

  test('Java test edit is denied when testing.md was not read', async ($, on) => {
    arrange(on, readsOf([JAVA, JAVA_TESTING]))

    expect(await decide($, editOf('/repo/src/test/java/com/example/orders/OrderServiceTest.java'))).toBe('deny')
  })

  test('Java test fixture edit is denied when the test references were not read', async ($, on) => {
    arrange(on, readsOf([JAVA]))

    expect(await decide($, editOf('/repo/src/testFixtures/java/com/example/orders/OrderFaker.java'))).toBe('deny')
  })

  test('Java integration test edit is denied when the test references were not read', async ($, on) => {
    arrange(on, readsOf([JAVA]))

    expect(await decide($, editOf('/repo/src/integrationTest/java/com/example/OrderIT.java'))).toBe('deny')
  })

  test('Java test edit is allowed when all three references were read', async ($, on) => {
    arrange(on, readsOf([JAVA, JAVA_TESTING, TESTING]))

    expect(await decide($, editOf('/repo/src/test/java/com/example/orders/OrderServiceTest.java'))).toBe('allow')
  })

  test('Python edit is allowed when nothing was read', async ($, on) => {
    arrange(on, [])

    expect(await decide($, editOf('/repo/app/orders.py'))).toBe('allow')
  })

  test('Java edit is allowed when the file is under build', async ($, on) => {
    arrange(on, [])

    expect(await decide($, editOf('/repo/build/generated/sources/Order.java'))).toBe('allow')
  })

  test('Java edit is allowed when the file is under /tmp', async ($, on) => {
    arrange(on, [])

    expect(await decide($, editOf('/tmp/Scratch.java'))).toBe('allow')
  })

  test('Java edit is allowed when a Windows-path java.md was read in full', async ($, on) => {
    arrange(on, readsOf([WINDOWS_JAVA]))

    expect(await decide($, editOf('C:\\repo\\src\\main\\java\\Order.java'))).toBe('allow')
  })

  test('Java edit is denied when java.md was read by another agent', async ($, on) => {
    arrange(on, [{ file_path: JAVA, agentId: HELPER }])

    expect(await decide($, editOf(SOURCE))).toBe('deny')
  })

  test('Java edit is allowed when the subagent read java.md itself', async ($, on) => {
    arrange(on, [{ file_path: JAVA, agentId: HELPER }])

    expect(await decide($, { ...editOf(SOURCE), agentId: HELPER })).toBe('allow')
  })

  test('Java edit is allowed when the agent transcript cannot be read', async ($, on) => {
    on('tool.call', () => ({ result: RAN }))
    on('session.messages', () => ({ deny: 'unreadable' }))

    expect(await decide($, editOf(SOURCE))).toBe('allow')
  })
})
