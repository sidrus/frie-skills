import type { On, SessionMessage } from 'claude-code'
import { describe, expect, test, type Engine } from 'claude-code/testing'

type Call = { tool: string; [field: string]: unknown }
type Outcome = 'allow' | 'deny'
type Read = { file_path: string; agentId?: string; limit?: number; isError?: true }

const RAN = 'ran'
const HELPER = 'helper'
const REFERENCES = '/elsewhere/skills/brandon-standards/references'
const CSHARP = `${REFERENCES}/csharp.md`
const FORMATTING = `${REFERENCES}/formatting.md`
const BLAZOR = `${REFERENCES}/blazor.md`
const PYTHON = `${REFERENCES}/python.md`
const TESTING = '/elsewhere/skills/engineering-patterns/references/testing.md'

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
  on('tool.call', () => ({ result: RAN }) as never)
  on('session.messages', (_, e) => ({ value: buildTranscript(reads.filter(read => read.agentId === e.agentId)) }) as never)
}

function readsOf(paths: string[]): Read[] {
  return paths.map(path => ({ file_path: path }))
}

async function decide($: Engine, call: Call): Promise<Outcome> {
  const answer = await $.tool.call(call as never)
  return answer.result === RAN ? 'allow' : 'deny'
}

function editOf(path: string): Call {
  return { tool: 'Edit', file_path: path, old_string: 'a', new_string: 'b' }
}

describe('standards gate', () => {
  test('C# edit is deny when no reference was read', async ($, on) => {
    arrange(on, [])

    expect(await decide($, editOf('/repo/src/Order.cs'))).toBe('deny')
  })

  test('C# edit is allow when its references were read in full', async ($, on) => {
    arrange(on, readsOf([CSHARP, FORMATTING]))

    expect(await decide($, editOf('/repo/src/Order.cs'))).toBe('allow')
  })

  test('C# edit is deny when a reference was read with a limit', async ($, on) => {
    arrange(on, [{ file_path: FORMATTING }, { file_path: CSHARP, limit: 40 }])

    expect(await decide($, editOf('/repo/src/Order.cs'))).toBe('deny')
  })

  test('C# edit is deny when the reference read failed', async ($, on) => {
    arrange(on, [{ file_path: FORMATTING }, { file_path: CSHARP, isError: true }])

    expect(await decide($, editOf('/repo/src/Order.cs'))).toBe('deny')
  })

  test('C# test edit is deny when testing.md was not read', async ($, on) => {
    arrange(on, readsOf([CSHARP, FORMATTING]))

    expect(await decide($, editOf('/repo/tests/Shop.Tests/OrderTests.cs'))).toBe('deny')
  })

  test('C# test edit is allow when testing.md was read too', async ($, on) => {
    arrange(on, readsOf([CSHARP, FORMATTING, TESTING]))

    expect(await decide($, editOf('/repo/tests/Shop.Tests/OrderTests.cs'))).toBe('allow')
  })

  test('Razor write is deny when blazor.md was not read', async ($, on) => {
    arrange(on, readsOf([CSHARP, FORMATTING]))

    expect(await decide($, { tool: 'Write', file_path: '/repo/src/Cart.razor', content: '' })).toBe('deny')
  })

  test('Razor write is allow when its references were read', async ($, on) => {
    arrange(on, readsOf([BLAZOR, CSHARP, FORMATTING]))

    expect(await decide($, { tool: 'Write', file_path: '/repo/src/Cart.razor', content: '' })).toBe('allow')
  })

  test('Python edit is deny when python.md was not read', async ($, on) => {
    arrange(on, [])

    expect(await decide($, editOf('/repo/app/orders.py'))).toBe('deny')
  })

  test('Python test edit is deny when testing.md was not read', async ($, on) => {
    arrange(on, readsOf([PYTHON]))

    expect(await decide($, editOf('/repo/app/test_orders.py'))).toBe('deny')
  })

  test('Python edit is allow when python.md was read', async ($, on) => {
    arrange(on, readsOf([PYTHON]))

    expect(await decide($, editOf('/repo/app/orders.py'))).toBe('allow')
  })

  test('Java edit is allow when nothing was read', async ($, on) => {
    arrange(on, [])

    expect(await decide($, editOf('/repo/src/Order.java'))).toBe('allow')
  })

  test('C# edit is allow when the file is under obj', async ($, on) => {
    arrange(on, [])

    expect(await decide($, editOf('/repo/src/obj/Generated.cs'))).toBe('allow')
  })

  test('C# edit is allow when the file is under /tmp', async ($, on) => {
    arrange(on, [])

    expect(await decide($, editOf('/tmp/Scratch.cs'))).toBe('allow')
  })

  test('C# edit is deny when the references were read by another agent', async ($, on) => {
    arrange(on, [CSHARP, FORMATTING].map(path => ({ file_path: path, agentId: HELPER })))

    expect(await decide($, editOf('/repo/src/Order.cs'))).toBe('deny')
  })

  test('C# edit is allow when the subagent read the references itself', async ($, on) => {
    arrange(on, [CSHARP, FORMATTING].map(path => ({ file_path: path, agentId: HELPER })))

    expect(await decide($, { ...editOf('/repo/src/Order.cs'), agentId: HELPER })).toBe('allow')
  })

  test('C# edit is allow when the agent transcript cannot be read', async ($, on) => {
    on('tool.call', () => ({ result: RAN }) as never)
    on('session.messages', () => ({ value: { deny: 'unreadable' } }) as never)

    expect(await decide($, editOf('/repo/src/Order.cs'))).toBe('allow')
  })
})
