import type { AgentLoop, On, SessionMessage, ToolCallArgs } from 'claude-code'
import { describe, expect, test, type Engine } from 'claude-code/testing'

type Call = ToolCallArgs & AgentLoop
type Outcome = 'allow' | 'deny'
type Read = { readonly file_path: string; readonly agentId?: string; readonly limit?: number; readonly isError?: true }

const RAN = 'ran'
const HELPER = 'helper'
const REFERENCES = '/elsewhere/frie-dotnet/skills/standards/references'
const CSHARP = `${REFERENCES}/csharp.md`
const CSHARP_TESTING = `${REFERENCES}/csharp-testing.md`
const FORMATTING = `${REFERENCES}/formatting.md`
const TESTING = '/elsewhere/frie-core/skills/engineering-patterns/references/testing.md'
const WINDOWS_REFERENCES = 'C:\\Users\\u\\.claude\\plugins\\frie-dotnet\\skills\\standards\\references'
const WINDOWS_CSHARP = `${WINDOWS_REFERENCES}\\csharp.md`
const WINDOWS_FORMATTING = `${WINDOWS_REFERENCES}\\formatting.md`
const SOURCE = '/repo/src/Order.cs'
const TEST_SOURCE = '/repo/tests/Shop.Tests/OrderTests.cs'

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
  test('denies a C# edit when no reference was read', async ($, on) => {
    arrange(on, [])

    expect(await decide($, buildEdit(SOURCE))).toBe('deny')
  })

  test('allows a C# edit when its references were read in full', async ($, on) => {
    arrange(on, buildReads([CSHARP, FORMATTING]))

    expect(await decide($, buildEdit(SOURCE))).toBe('allow')
  })

  test('denies a C# edit when a reference was read with a limit', async ($, on) => {
    arrange(on, [{ file_path: FORMATTING }, { file_path: CSHARP, limit: 40 }])

    expect(await decide($, buildEdit(SOURCE))).toBe('deny')
  })

  test('denies a C# edit when the reference read failed', async ($, on) => {
    arrange(on, [{ file_path: FORMATTING }, { file_path: CSHARP, isError: true }])

    expect(await decide($, buildEdit(SOURCE))).toBe('deny')
  })

  test('denies a C# test edit when csharp-testing.md was not read', async ($, on) => {
    arrange(on, buildReads([CSHARP, FORMATTING, TESTING]))

    expect(await decide($, buildEdit(TEST_SOURCE))).toBe('deny')
  })

  test('denies a C# test edit when testing.md was not read', async ($, on) => {
    arrange(on, buildReads([CSHARP, FORMATTING, CSHARP_TESTING]))

    expect(await decide($, buildEdit(TEST_SOURCE))).toBe('deny')
  })

  test('allows a C# test edit when every reference was read', async ($, on) => {
    arrange(on, buildReads([CSHARP, FORMATTING, CSHARP_TESTING, TESTING]))

    expect(await decide($, buildEdit(TEST_SOURCE))).toBe('allow')
  })

  test('denies a Razor write when formatting.md was not read', async ($, on) => {
    arrange(on, buildReads([CSHARP]))

    expect(await decide($, { tool: 'Write', file_path: '/repo/src/Cart.razor', content: '' })).toBe('deny')
  })

  test('allows a Razor write when the C# references were read', async ($, on) => {
    arrange(on, buildReads([CSHARP, FORMATTING]))

    expect(await decide($, { tool: 'Write', file_path: '/repo/src/Cart.razor', content: '' })).toBe('allow')
  })

  test('allows a Razor code-behind edit when the C# references were read', async ($, on) => {
    arrange(on, buildReads([CSHARP, FORMATTING]))

    expect(await decide($, buildEdit('/repo/src/Cart.razor.cs'))).toBe('allow')
  })

  test('allows a Razor scoped CSS edit when nothing was read', async ($, on) => {
    arrange(on, [])

    expect(await decide($, buildEdit('/repo/src/Cart.razor.css'))).toBe('allow')
  })

  test('allows a plain CSS edit when nothing was read', async ($, on) => {
    arrange(on, [])

    expect(await decide($, buildEdit('/repo/src/wwwroot/app.css'))).toBe('allow')
  })

  test('allows a Python edit when nothing was read', async ($, on) => {
    arrange(on, [])

    expect(await decide($, buildEdit('/repo/app/orders.py'))).toBe('allow')
  })

  test('allows a C# edit when the file is under obj', async ($, on) => {
    arrange(on, [])

    expect(await decide($, buildEdit('/repo/src/obj/Generated.cs'))).toBe('allow')
  })

  test('allows a C# edit when the file is under /tmp', async ($, on) => {
    arrange(on, [])

    expect(await decide($, buildEdit('/tmp/Scratch.cs'))).toBe('allow')
  })

  test('allows a C# edit when Windows-path references were read in full', async ($, on) => {
    arrange(on, buildReads([WINDOWS_CSHARP, WINDOWS_FORMATTING]))

    expect(await decide($, buildEdit('C:\\repo\\src\\Order.cs'))).toBe('allow')
  })

  test('denies a C# test edit on a Windows path when the test references were not read', async ($, on) => {
    arrange(on, buildReads([WINDOWS_CSHARP, WINDOWS_FORMATTING]))

    expect(await decide($, buildEdit('C:\\repo\\tests\\Shop.Tests\\OrderTests.cs'))).toBe('deny')
  })

  test('allows a C# edit when a Windows-path file is under obj', async ($, on) => {
    arrange(on, [])

    expect(await decide($, buildEdit('C:\\repo\\src\\obj\\Generated.cs'))).toBe('allow')
  })

  test('denies a C# edit when the references were read by another agent', async ($, on) => {
    arrange(on, [CSHARP, FORMATTING].map(path => ({ file_path: path, agentId: HELPER })))

    expect(await decide($, buildEdit(SOURCE))).toBe('deny')
  })

  test('allows a C# edit when the subagent read the references itself', async ($, on) => {
    arrange(on, [CSHARP, FORMATTING].map(path => ({ file_path: path, agentId: HELPER })))

    expect(await decide($, { ...buildEdit(SOURCE), agentId: HELPER })).toBe('allow')
  })

  test('allows a C# edit when the agent transcript cannot be read', async ($, on) => {
    on('tool.call', () => ({ result: RAN }))
    on('session.messages', () => ({ deny: 'unreadable' }))

    expect(await decide($, buildEdit(SOURCE))).toBe('allow')
  })
})
