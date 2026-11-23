import type { AgentLoop, On, SessionMessage, ToolCallArgs } from 'claude-code'
import { describe, expect, test, type Engine } from 'claude-code/testing'

type Call = ToolCallArgs & AgentLoop
type Outcome = 'allow' | 'deny'
type Read = { file_path: string; agentId?: string; limit?: number; isError?: true }

const RAN = 'ran'
const HELPER = 'helper'
const PYTHON = '/elsewhere/frie-python/skills/standards/references/python.md'
const TESTING = '/elsewhere/frie-core/skills/engineering-patterns/references/testing.md'
const WINDOWS_PYTHON = 'C:\\Users\\u\\.claude\\plugins\\frie-python\\skills\\standards\\references\\python.md'

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
  test('Python edit is denied when python.md was not read', async ($, on) => {
    arrange(on, [])

    expect(await decide($, editOf('/repo/app/orders.py'))).toBe('deny')
  })

  test('Python edit is allowed when python.md was read in full', async ($, on) => {
    arrange(on, readsOf([PYTHON]))

    expect(await decide($, editOf('/repo/app/orders.py'))).toBe('allow')
  })

  test('Python edit is denied when python.md was read with a limit', async ($, on) => {
    arrange(on, [{ file_path: PYTHON, limit: 40 }])

    expect(await decide($, editOf('/repo/app/orders.py'))).toBe('deny')
  })

  test('Python edit is denied when the python.md read failed', async ($, on) => {
    arrange(on, [{ file_path: PYTHON, isError: true }])

    expect(await decide($, editOf('/repo/app/orders.py'))).toBe('deny')
  })

  test('Python write is denied when python.md was not read', async ($, on) => {
    arrange(on, [])

    expect(await decide($, { tool: 'Write', file_path: '/repo/app/orders.py', content: '' })).toBe('deny')
  })

  test('Python test edit is denied when testing.md was not read', async ($, on) => {
    arrange(on, readsOf([PYTHON]))

    expect(await decide($, editOf('/repo/app/test_orders.py'))).toBe('deny')
  })

  test('Python test edit is denied under a tests folder when testing.md was not read', async ($, on) => {
    arrange(on, readsOf([PYTHON]))

    expect(await decide($, editOf('/repo/tests/helpers.py'))).toBe('deny')
  })

  test('Python test edit is denied in a _test file when testing.md was not read', async ($, on) => {
    arrange(on, readsOf([PYTHON]))

    expect(await decide($, editOf('/repo/app/orders_test.py'))).toBe('deny')
  })

  test('conftest edit is denied when testing.md was not read', async ($, on) => {
    arrange(on, readsOf([PYTHON]))

    expect(await decide($, editOf('/repo/app/conftest.py'))).toBe('deny')
  })

  test('Python test edit is allowed when testing.md was read too', async ($, on) => {
    arrange(on, readsOf([PYTHON, TESTING]))

    expect(await decide($, editOf('/repo/app/test_orders.py'))).toBe('allow')
  })

  test('C# edit is allowed when nothing was read', async ($, on) => {
    arrange(on, [])

    expect(await decide($, editOf('/repo/src/Order.cs'))).toBe('allow')
  })

  test('Python edit is allowed when the file is under .venv', async ($, on) => {
    arrange(on, [])

    expect(await decide($, editOf('/repo/.venv/lib/site.py'))).toBe('allow')
  })

  test('Python edit is allowed when the file is under /tmp', async ($, on) => {
    arrange(on, [])

    expect(await decide($, editOf('/tmp/scratch.py'))).toBe('allow')
  })

  test('Python edit is allowed when a Windows-path python.md was read in full', async ($, on) => {
    arrange(on, readsOf([WINDOWS_PYTHON]))

    expect(await decide($, editOf('C:\\repo\\app\\orders.py'))).toBe('allow')
  })

  test('Python edit is denied when python.md was read by another agent', async ($, on) => {
    arrange(on, [{ file_path: PYTHON, agentId: HELPER }])

    expect(await decide($, editOf('/repo/app/orders.py'))).toBe('deny')
  })

  test('Python edit is allowed when the subagent read python.md itself', async ($, on) => {
    arrange(on, [{ file_path: PYTHON, agentId: HELPER }])

    expect(await decide($, { ...editOf('/repo/app/orders.py'), agentId: HELPER })).toBe('allow')
  })

  test('Python edit is allowed when the agent transcript cannot be read', async ($, on) => {
    on('tool.call', () => ({ result: RAN }))
    on('session.messages', () => ({ deny: 'unreadable' }))

    expect(await decide($, editOf('/repo/app/orders.py'))).toBe('allow')
  })
})
