import type { On } from 'claude-code'
import { describe, expect, test, type Engine } from 'claude-code/testing'

type Call = { tool: string; [field: string]: unknown }
type Outcome = 'allow' | 'deny'

const RAN = 'ran'
const FAILED_READ = '/elsewhere/skills/brandon-standards/references/broken/csharp.md'
const REFERENCES = '/elsewhere/skills/brandon-standards/references'
const CSHARP = `${REFERENCES}/csharp.md`
const FORMATTING = `${REFERENCES}/formatting.md`
const BLAZOR = `${REFERENCES}/blazor.md`
const PYTHON = `${REFERENCES}/python.md`
const TESTING = '/elsewhere/skills/engineering-patterns/references/testing.md'

function arrange(on: On) {
  on('tool.call', (_, e) =>
    (e.tool === 'Read' && e.file_path === FAILED_READ ? { result: 'missing', isError: true } : { result: RAN }) as never,
  )
}

async function readAll($: Engine, paths: string[]) {
  for (const path of paths) {
    await $.tool.call({ tool: 'Read', file_path: path } as never)
  }
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
    arrange(on)

    expect(await decide($, editOf('/repo/src/Order.cs'))).toBe('deny')
  })

  test('C# edit is allow when its references were read in full', async ($, on) => {
    arrange(on)
    await readAll($, [CSHARP, FORMATTING])

    expect(await decide($, editOf('/repo/src/Order.cs'))).toBe('allow')
  })

  test('C# edit is deny when a reference was read with a limit', async ($, on) => {
    arrange(on)
    await readAll($, [FORMATTING])
    await $.tool.call({ tool: 'Read', file_path: CSHARP, limit: 40 } as never)

    expect(await decide($, editOf('/repo/src/Order.cs'))).toBe('deny')
  })

  test('C# edit is deny when the reference read failed', async ($, on) => {
    arrange(on)
    await readAll($, [FORMATTING, FAILED_READ])

    expect(await decide($, editOf('/repo/src/Order.cs'))).toBe('deny')
  })

  test('C# test edit is deny when testing.md was not read', async ($, on) => {
    arrange(on)
    await readAll($, [CSHARP, FORMATTING])

    expect(await decide($, editOf('/repo/tests/Shop.Tests/OrderTests.cs'))).toBe('deny')
  })

  test('C# test edit is allow when testing.md was read too', async ($, on) => {
    arrange(on)
    await readAll($, [CSHARP, FORMATTING, TESTING])

    expect(await decide($, editOf('/repo/tests/Shop.Tests/OrderTests.cs'))).toBe('allow')
  })

  test('Razor write is deny when blazor.md was not read', async ($, on) => {
    arrange(on)
    await readAll($, [CSHARP, FORMATTING])

    expect(await decide($, { tool: 'Write', file_path: '/repo/src/Cart.razor', content: '' })).toBe('deny')
  })

  test('Razor write is allow when its references were read', async ($, on) => {
    arrange(on)
    await readAll($, [BLAZOR, CSHARP, FORMATTING])

    expect(await decide($, { tool: 'Write', file_path: '/repo/src/Cart.razor', content: '' })).toBe('allow')
  })

  test('Python edit is deny when python.md was not read', async ($, on) => {
    arrange(on)

    expect(await decide($, editOf('/repo/app/orders.py'))).toBe('deny')
  })

  test('Python test edit is deny when testing.md was not read', async ($, on) => {
    arrange(on)
    await readAll($, [PYTHON])

    expect(await decide($, editOf('/repo/app/test_orders.py'))).toBe('deny')
  })

  test('Python edit is allow when python.md was read', async ($, on) => {
    arrange(on)
    await readAll($, [PYTHON])

    expect(await decide($, editOf('/repo/app/orders.py'))).toBe('allow')
  })

  test('Java edit is allow when nothing was read', async ($, on) => {
    arrange(on)

    expect(await decide($, editOf('/repo/src/Order.java'))).toBe('allow')
  })

  test('C# edit is allow when the file is under obj', async ($, on) => {
    arrange(on)

    expect(await decide($, editOf('/repo/src/obj/Generated.cs'))).toBe('allow')
  })

  test('C# edit is allow when the file is under /tmp', async ($, on) => {
    arrange(on)

    expect(await decide($, editOf('/tmp/Scratch.cs'))).toBe('allow')
  })

  test('C# edit is deny when the references were read by another agent', async ($, on) => {
    arrange(on)
    for (const path of [CSHARP, FORMATTING]) {
      await $.tool.call({ tool: 'Read', file_path: path, agentId: 'helper' } as never)
    }

    expect(await decide($, editOf('/repo/src/Order.cs'))).toBe('deny')
  })

  test('C# edit is deny when the conversation was compacted after the reads', async ($, on) => {
    arrange(on)
    on('session.compact', (_, e) => ({ messages: e.messages }))
    await readAll($, [CSHARP, FORMATTING])
    await $.session.compact({ trigger: 'manual', messages: [{ role: 'user', text: 'summary', toolUses: [] }] } as never)

    expect(await decide($, editOf('/repo/src/Order.cs'))).toBe('deny')
  })

  test('C# edit is allow when compaction was skipped', async ($, on) => {
    arrange(on)
    on('session.compact', () => ({ skip: 'off' }))
    await readAll($, [CSHARP, FORMATTING])
    await $.session.compact({ trigger: 'manual', messages: [] } as never)

    expect(await decide($, editOf('/repo/src/Order.cs'))).toBe('allow')
  })

  test('C# edit is deny when the conversation was cleared after the reads', async ($, on) => {
    arrange(on)
    on('session.end', (_, e) => ({ sessionId: e.sessionId }))
    await readAll($, [CSHARP, FORMATTING])
    await $.session.end({ reason: 'clear', sessionId: 's', resume: {} } as never)

    expect(await decide($, editOf('/repo/src/Order.cs'))).toBe('deny')
  })
})
