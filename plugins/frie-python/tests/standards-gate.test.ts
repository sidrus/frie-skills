import type { AgentLoop, On, SessionMessage, ToolCallArgs } from 'claude-code'
import { describe, expect, test, type Engine } from 'claude-code/testing'

type Call = ToolCallArgs & AgentLoop
type Outcome = 'allow' | 'deny'
type Read = { readonly file_path: string; readonly agentId?: string; readonly limit?: number; readonly isError?: true }

const RAN = 'ran'
const HELPER = 'helper'
const REFERENCES = '/elsewhere/frie-python/skills/standards/references'
const PYTHON = `${REFERENCES}/python.md`
const PYTHON_TESTING = `${REFERENCES}/python-testing.md`
const TESTING = '/elsewhere/frie-core/skills/engineering-patterns/references/testing.md'
const WINDOWS_PYTHON = 'C:\\Users\\u\\.claude\\plugins\\frie-python\\skills\\standards\\references\\python.md'
const SOURCE = '/repo/app/orders.py'
const TEST_READS = [PYTHON, PYTHON_TESTING, TESTING]

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
  test('denies a Python edit when python.md was not read', async ($, on) => {
    arrange(on, [])

    expect(await decide($, buildEdit(SOURCE))).toBe('deny')
  })

  test('allows a Python edit when python.md was read in full', async ($, on) => {
    arrange(on, buildReads([PYTHON]))

    expect(await decide($, buildEdit(SOURCE))).toBe('allow')
  })

  test('denies a Python edit when python.md was read with a limit', async ($, on) => {
    arrange(on, [{ file_path: PYTHON, limit: 40 }])

    expect(await decide($, buildEdit(SOURCE))).toBe('deny')
  })

  test('denies a Python edit when the python.md read failed', async ($, on) => {
    arrange(on, [{ file_path: PYTHON, isError: true }])

    expect(await decide($, buildEdit(SOURCE))).toBe('deny')
  })

  test('denies a Python write when python.md was not read', async ($, on) => {
    arrange(on, [])

    expect(await decide($, { tool: 'Write', file_path: SOURCE, content: '' })).toBe('deny')
  })

  test('denies a Python test edit when python-testing.md was not read', async ($, on) => {
    arrange(on, buildReads([PYTHON, TESTING]))

    expect(await decide($, buildEdit('/repo/app/test_orders.py'))).toBe('deny')
  })

  test('denies a Python test edit when testing.md was not read', async ($, on) => {
    arrange(on, buildReads([PYTHON, PYTHON_TESTING]))

    expect(await decide($, buildEdit('/repo/app/test_orders.py'))).toBe('deny')
  })

  test('denies a Python edit under a tests folder when the test references were not read', async ($, on) => {
    arrange(on, buildReads([PYTHON]))

    expect(await decide($, buildEdit('/repo/tests/helpers.py'))).toBe('deny')
  })

  test('denies a _test file edit when the test references were not read', async ($, on) => {
    arrange(on, buildReads([PYTHON]))

    expect(await decide($, buildEdit('/repo/app/orders_test.py'))).toBe('deny')
  })

  test('denies a conftest edit when the test references were not read', async ($, on) => {
    arrange(on, buildReads([PYTHON]))

    expect(await decide($, buildEdit('/repo/app/conftest.py'))).toBe('deny')
  })

  test('allows a Python test edit when every reference was read', async ($, on) => {
    arrange(on, buildReads(TEST_READS))

    expect(await decide($, buildEdit('/repo/app/test_orders.py'))).toBe('allow')
  })

  test('allows a C# edit when nothing was read', async ($, on) => {
    arrange(on, [])

    expect(await decide($, buildEdit('/repo/src/Order.cs'))).toBe('allow')
  })

  test('allows a Python edit when the file is under .venv', async ($, on) => {
    arrange(on, [])

    expect(await decide($, buildEdit('/repo/.venv/lib/site.py'))).toBe('allow')
  })

  test('allows a Python edit when the file is under /tmp', async ($, on) => {
    arrange(on, [])

    expect(await decide($, buildEdit('/tmp/scratch.py'))).toBe('allow')
  })

  test('allows a Python edit when a Windows-path python.md was read in full', async ($, on) => {
    arrange(on, buildReads([WINDOWS_PYTHON]))

    expect(await decide($, buildEdit('C:\\repo\\app\\orders.py'))).toBe('allow')
  })

  test('denies a Python edit when python.md was read by another agent', async ($, on) => {
    arrange(on, [{ file_path: PYTHON, agentId: HELPER }])

    expect(await decide($, buildEdit(SOURCE))).toBe('deny')
  })

  test('allows a Python edit when the subagent read python.md itself', async ($, on) => {
    arrange(on, [{ file_path: PYTHON, agentId: HELPER }])

    expect(await decide($, { ...buildEdit(SOURCE), agentId: HELPER })).toBe('allow')
  })

  test('allows a Python edit when the agent transcript cannot be read', async ($, on) => {
    on('tool.call', () => ({ result: RAN }))
    on('session.messages', () => ({ deny: 'unreadable' }))

    expect(await decide($, buildEdit(SOURCE))).toBe('allow')
  })
})
