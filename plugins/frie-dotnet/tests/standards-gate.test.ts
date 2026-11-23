import type { AgentLoop, On, SessionMessage, ToolCallArgs } from 'claude-code'
import { describe, expect, test, type Engine } from 'claude-code/testing'

type Call = ToolCallArgs & AgentLoop
type Outcome = 'allow' | 'deny'
type Read = { file_path: string; agentId?: string; limit?: number; isError?: true }

const RAN = 'ran'
const HELPER = 'helper'
const REFERENCES = '/elsewhere/frie-dotnet/skills/standards/references'
const CSHARP = `${REFERENCES}/csharp.md`
const FORMATTING = `${REFERENCES}/formatting.md`
const BLAZOR = `${REFERENCES}/blazor.md`
const TESTING = '/elsewhere/frie-core/skills/engineering-patterns/references/testing.md'
const WINDOWS_REFERENCES = 'C:\\Users\\u\\.claude\\plugins\\frie-dotnet\\skills\\standards\\references'
const WINDOWS_CSHARP = `${WINDOWS_REFERENCES}\\csharp.md`
const WINDOWS_FORMATTING = `${WINDOWS_REFERENCES}\\formatting.md`

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
  test('C# edit is denied when no reference was read', async ($, on) => {
    arrange(on, [])

    expect(await decide($, editOf('/repo/src/Order.cs'))).toBe('deny')
  })

  test('C# edit is allowed when its references were read in full', async ($, on) => {
    arrange(on, readsOf([CSHARP, FORMATTING]))

    expect(await decide($, editOf('/repo/src/Order.cs'))).toBe('allow')
  })

  test('C# edit is denied when a reference was read with a limit', async ($, on) => {
    arrange(on, [{ file_path: FORMATTING }, { file_path: CSHARP, limit: 40 }])

    expect(await decide($, editOf('/repo/src/Order.cs'))).toBe('deny')
  })

  test('C# edit is denied when the reference read failed', async ($, on) => {
    arrange(on, [{ file_path: FORMATTING }, { file_path: CSHARP, isError: true }])

    expect(await decide($, editOf('/repo/src/Order.cs'))).toBe('deny')
  })

  test('C# test edit is denied when testing.md was not read', async ($, on) => {
    arrange(on, readsOf([CSHARP, FORMATTING]))

    expect(await decide($, editOf('/repo/tests/Shop.Tests/OrderTests.cs'))).toBe('deny')
  })

  test('C# test edit is allowed when testing.md was read too', async ($, on) => {
    arrange(on, readsOf([CSHARP, FORMATTING, TESTING]))

    expect(await decide($, editOf('/repo/tests/Shop.Tests/OrderTests.cs'))).toBe('allow')
  })

  test('Razor write is denied when blazor.md was not read', async ($, on) => {
    arrange(on, readsOf([CSHARP, FORMATTING]))

    expect(await decide($, { tool: 'Write', file_path: '/repo/src/Cart.razor', content: '' })).toBe('deny')
  })

  test('Razor write is allowed when its references were read', async ($, on) => {
    arrange(on, readsOf([BLAZOR, CSHARP, FORMATTING]))

    expect(await decide($, { tool: 'Write', file_path: '/repo/src/Cart.razor', content: '' })).toBe('allow')
  })

  test('Razor code-behind edit is denied when blazor.md was not read', async ($, on) => {
    arrange(on, readsOf([CSHARP, FORMATTING]))

    expect(await decide($, editOf('/repo/src/Cart.razor.cs'))).toBe('deny')
  })

  test('Razor code-behind edit is allowed when its references were read', async ($, on) => {
    arrange(on, readsOf([BLAZOR, CSHARP, FORMATTING]))

    expect(await decide($, editOf('/repo/src/Cart.razor.cs'))).toBe('allow')
  })

  test('Razor scoped CSS edit is denied when blazor.md was not read', async ($, on) => {
    arrange(on, [])

    expect(await decide($, editOf('/repo/src/Cart.razor.css'))).toBe('deny')
  })

  test('Razor scoped CSS edit is allowed when blazor.md was read', async ($, on) => {
    arrange(on, readsOf([BLAZOR]))

    expect(await decide($, editOf('/repo/src/Cart.razor.css'))).toBe('allow')
  })

  test('Plain CSS edit is allowed when nothing was read', async ($, on) => {
    arrange(on, [])

    expect(await decide($, editOf('/repo/src/wwwroot/app.css'))).toBe('allow')
  })

  test('Python edit is allowed when nothing was read', async ($, on) => {
    arrange(on, [])

    expect(await decide($, editOf('/repo/app/orders.py'))).toBe('allow')
  })

  test('C# edit is allowed when the file is under obj', async ($, on) => {
    arrange(on, [])

    expect(await decide($, editOf('/repo/src/obj/Generated.cs'))).toBe('allow')
  })

  test('C# edit is allowed when the file is under /tmp', async ($, on) => {
    arrange(on, [])

    expect(await decide($, editOf('/tmp/Scratch.cs'))).toBe('allow')
  })

  test('C# edit is allowed when Windows-path references were read in full', async ($, on) => {
    arrange(on, readsOf([WINDOWS_CSHARP, WINDOWS_FORMATTING]))

    expect(await decide($, editOf('C:\\repo\\src\\Order.cs'))).toBe('allow')
  })

  test('C# test edit is denied on a Windows path when testing.md was not read', async ($, on) => {
    arrange(on, readsOf([WINDOWS_CSHARP, WINDOWS_FORMATTING]))

    expect(await decide($, editOf('C:\\repo\\tests\\Shop.Tests\\OrderTests.cs'))).toBe('deny')
  })

  test('C# edit is allowed when a Windows-path file is under obj', async ($, on) => {
    arrange(on, [])

    expect(await decide($, editOf('C:\\repo\\src\\obj\\Generated.cs'))).toBe('allow')
  })

  test('C# edit is denied when the references were read by another agent', async ($, on) => {
    arrange(on, [CSHARP, FORMATTING].map(path => ({ file_path: path, agentId: HELPER })))

    expect(await decide($, editOf('/repo/src/Order.cs'))).toBe('deny')
  })

  test('C# edit is allowed when the subagent read the references itself', async ($, on) => {
    arrange(on, [CSHARP, FORMATTING].map(path => ({ file_path: path, agentId: HELPER })))

    expect(await decide($, { ...editOf('/repo/src/Order.cs'), agentId: HELPER })).toBe('allow')
  })

  test('C# edit is allowed when the agent transcript cannot be read', async ($, on) => {
    on('tool.call', () => ({ result: RAN }))
    on('session.messages', () => ({ deny: 'unreadable' }))

    expect(await decide($, editOf('/repo/src/Order.cs'))).toBe('allow')
  })
})
