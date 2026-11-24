import type { AgentLoop, On, SessionMessage, ToolCallArgs } from 'claude-code'
import { describe, expect, test, type Engine } from 'claude-code/testing'

type Call = ToolCallArgs & AgentLoop
type Outcome = 'allow' | 'deny'
type Read = { readonly file_path: string; readonly agentId?: string; readonly limit?: number; readonly isError?: true }

const RAN = 'ran'
const HELPER = 'helper'
const REFERENCES = '/elsewhere/frie-java/skills/standards/references'
const JAVA = `${REFERENCES}/java.md`
const JAVA_TESTING = `${REFERENCES}/java-testing.md`
const TESTING = '/elsewhere/frie-core/skills/engineering-patterns/references/testing.md'
const WINDOWS_JAVA = 'C:\\Users\\u\\.claude\\plugins\\frie-java\\skills\\standards\\references\\java.md'
const SOURCE = '/repo/src/main/java/com/example/orders/OrderService.java'
const TEST_SOURCE = '/repo/src/test/java/com/example/orders/OrderServiceTest.java'

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

function arrange(on: On, reads: readonly Read[]) {
  on('tool.call', () => ({ result: RAN }))
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

describe('standards gate', () => {
  test('denies a Java edit when java.md was not read', async ($, on) => {
    arrange(on, [])

    expect(await decide($, buildEdit(SOURCE))).toBe('deny')
  })

  test('allows a Java edit when java.md was read in full', async ($, on) => {
    arrange(on, buildReads([JAVA]))

    expect(await decide($, buildEdit(SOURCE))).toBe('allow')
  })

  test('denies a Java edit when java.md was read with a limit', async ($, on) => {
    arrange(on, [{ file_path: JAVA, limit: 40 }])

    expect(await decide($, buildEdit(SOURCE))).toBe('deny')
  })

  test('denies a Java edit when the java.md read failed', async ($, on) => {
    arrange(on, [{ file_path: JAVA, isError: true }])

    expect(await decide($, buildEdit(SOURCE))).toBe('deny')
  })

  test('denies a Java write when java.md was not read', async ($, on) => {
    arrange(on, [])

    expect(await decide($, { tool: 'Write', file_path: SOURCE, content: '' })).toBe('deny')
  })

  test('denies a Gradle build edit when java.md was not read', async ($, on) => {
    arrange(on, [])

    expect(await decide($, buildEdit('/repo/build.gradle.kts'))).toBe('deny')
  })

  test('denies a Gradle settings edit when java.md was not read', async ($, on) => {
    arrange(on, [])

    expect(await decide($, buildEdit('/repo/settings.gradle'))).toBe('deny')
  })

  test('denies a Java test edit when java-testing.md was not read', async ($, on) => {
    arrange(on, buildReads([JAVA, TESTING]))

    expect(await decide($, buildEdit(TEST_SOURCE))).toBe('deny')
  })

  test('denies a Java test edit when testing.md was not read', async ($, on) => {
    arrange(on, buildReads([JAVA, JAVA_TESTING]))

    expect(await decide($, buildEdit(TEST_SOURCE))).toBe('deny')
  })

  test('denies a test fixture edit when the test references were not read', async ($, on) => {
    arrange(on, buildReads([JAVA]))

    expect(await decide($, buildEdit('/repo/src/testFixtures/java/com/example/orders/OrderFaker.java'))).toBe('deny')
  })

  test('denies an integration test edit when the test references were not read', async ($, on) => {
    arrange(on, buildReads([JAVA]))

    expect(await decide($, buildEdit('/repo/src/integrationTest/java/com/example/OrderIT.java'))).toBe('deny')
  })

  test('allows a Java test edit when every reference was read', async ($, on) => {
    arrange(on, buildReads([JAVA, JAVA_TESTING, TESTING]))

    expect(await decide($, buildEdit(TEST_SOURCE))).toBe('allow')
  })

  test('allows a Python edit when nothing was read', async ($, on) => {
    arrange(on, [])

    expect(await decide($, buildEdit('/repo/app/orders.py'))).toBe('allow')
  })

  test('allows a Java edit when the file is under build', async ($, on) => {
    arrange(on, [])

    expect(await decide($, buildEdit('/repo/build/generated/sources/Order.java'))).toBe('allow')
  })

  test('allows a Java edit when the file is under /tmp', async ($, on) => {
    arrange(on, [])

    expect(await decide($, buildEdit('/tmp/Scratch.java'))).toBe('allow')
  })

  test('allows a Java edit when a Windows-path java.md was read in full', async ($, on) => {
    arrange(on, buildReads([WINDOWS_JAVA]))

    expect(await decide($, buildEdit('C:\\repo\\src\\main\\java\\Order.java'))).toBe('allow')
  })

  test('denies a Java edit when java.md was read by another agent', async ($, on) => {
    arrange(on, [{ file_path: JAVA, agentId: HELPER }])

    expect(await decide($, buildEdit(SOURCE))).toBe('deny')
  })

  test('allows a Java edit when the subagent read java.md itself', async ($, on) => {
    arrange(on, [{ file_path: JAVA, agentId: HELPER }])

    expect(await decide($, { ...buildEdit(SOURCE), agentId: HELPER })).toBe('allow')
  })

  test('allows a Java edit when the agent transcript cannot be read', async ($, on) => {
    on('tool.call', () => ({ result: RAN }))
    on('session.messages', () => ({ deny: 'unreadable' }))

    expect(await decide($, buildEdit(SOURCE))).toBe('allow')
  })
})
