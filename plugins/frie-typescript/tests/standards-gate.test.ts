import type { AgentLoop, On, SessionMessage, ToolCallArgs } from 'claude-code'
import { describe, expect, test, type Engine } from 'claude-code/testing'

type Call = ToolCallArgs & AgentLoop
type Outcome = 'allow' | 'deny'
type Read = { file_path: string; agentId?: string; limit?: number; isError?: true }

const RAN = 'ran'
const HELPER = 'helper'
const REFERENCES = '/elsewhere/frie-typescript/skills/standards/references'
const TYPESCRIPT = `${REFERENCES}/typescript.md`
const TYPESCRIPT_TESTING = `${REFERENCES}/typescript-testing.md`
const REACT = `${REFERENCES}/react.md`
const TESTING = '/elsewhere/frie-core/skills/engineering-patterns/references/testing.md'
const WINDOWS_TYPESCRIPT = 'C:\\Users\\u\\.claude\\plugins\\frie-typescript\\skills\\standards\\references\\typescript.md'
const SOURCE = '/repo/src/orders/ship.ts'

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
  test('TypeScript edit is denied when typescript.md was not read', async ($, on) => {
    arrange(on, [])

    expect(await decide($, editOf(SOURCE))).toBe('deny')
  })

  test('TypeScript edit is allowed when typescript.md was read in full', async ($, on) => {
    arrange(on, readsOf([TYPESCRIPT]))

    expect(await decide($, editOf(SOURCE))).toBe('allow')
  })

  test('TypeScript edit is denied when typescript.md was read with a limit', async ($, on) => {
    arrange(on, [{ file_path: TYPESCRIPT, limit: 40 }])

    expect(await decide($, editOf(SOURCE))).toBe('deny')
  })

  test('TypeScript edit is denied when the typescript.md read failed', async ($, on) => {
    arrange(on, [{ file_path: TYPESCRIPT, isError: true }])

    expect(await decide($, editOf(SOURCE))).toBe('deny')
  })

  test('TypeScript write is denied when typescript.md was not read', async ($, on) => {
    arrange(on, [])

    expect(await decide($, { tool: 'Write', file_path: SOURCE, content: '' })).toBe('deny')
  })

  test('ES module TypeScript edit is denied when typescript.md was not read', async ($, on) => {
    arrange(on, [])

    expect(await decide($, editOf('/repo/scripts/release.mts'))).toBe('deny')
  })

  test('TSX edit is denied when react.md was not read', async ($, on) => {
    arrange(on, readsOf([TYPESCRIPT]))

    expect(await decide($, editOf('/repo/src/orders/ShipButton.tsx'))).toBe('deny')
  })

  test('TSX edit is allowed when typescript.md and react.md were read', async ($, on) => {
    arrange(on, readsOf([TYPESCRIPT, REACT]))

    expect(await decide($, editOf('/repo/src/orders/ShipButton.tsx'))).toBe('allow')
  })

  test('TypeScript test edit is denied when typescript-testing.md was not read', async ($, on) => {
    arrange(on, readsOf([TYPESCRIPT, TESTING]))

    expect(await decide($, editOf('/repo/tests/orders/ship.test.ts'))).toBe('deny')
  })

  test('TypeScript test edit is denied when testing.md was not read', async ($, on) => {
    arrange(on, readsOf([TYPESCRIPT, TYPESCRIPT_TESTING]))

    expect(await decide($, editOf('/repo/tests/orders/ship.test.ts'))).toBe('deny')
  })

  test('colocated spec edit is denied when the test references were not read', async ($, on) => {
    arrange(on, readsOf([TYPESCRIPT]))

    expect(await decide($, editOf('/repo/src/orders/ship.spec.ts'))).toBe('deny')
  })

  test('test support edit is denied when the test references were not read', async ($, on) => {
    arrange(on, readsOf([TYPESCRIPT]))

    expect(await decide($, editOf('/repo/tests/support/buildOrder.ts'))).toBe('deny')
  })

  test('TypeScript test edit is allowed when all three references were read', async ($, on) => {
    arrange(on, readsOf([TYPESCRIPT, TYPESCRIPT_TESTING, TESTING]))

    expect(await decide($, editOf('/repo/tests/orders/ship.test.ts'))).toBe('allow')
  })

  test('TSX test edit is allowed when all four references were read', async ($, on) => {
    arrange(on, readsOf([TYPESCRIPT, REACT, TYPESCRIPT_TESTING, TESTING]))

    expect(await decide($, editOf('/repo/tests/orders/ShipButton.test.tsx'))).toBe('allow')
  })

  test('JavaScript edit is allowed when nothing was read', async ($, on) => {
    arrange(on, [])

    expect(await decide($, editOf('/repo/src/legacy.js'))).toBe('allow')
  })

  test('TypeScript edit is allowed when the file is under node_modules', async ($, on) => {
    arrange(on, [])

    expect(await decide($, editOf('/repo/node_modules/zod/index.d.ts'))).toBe('allow')
  })

  test('TypeScript edit is allowed when the file is under dist', async ($, on) => {
    arrange(on, [])

    expect(await decide($, editOf('/repo/dist/orders/ship.d.ts'))).toBe('allow')
  })

  test('TypeScript edit is allowed when the file is in generated plugin types', async ($, on) => {
    arrange(on, [])

    expect(await decide($, editOf('/repo/plugins/frie-core/.claude-plugin/types/claude-code/index.d.ts'))).toBe('allow')
  })

  test('TypeScript edit is allowed when a Windows-path typescript.md was read in full', async ($, on) => {
    arrange(on, readsOf([WINDOWS_TYPESCRIPT]))

    expect(await decide($, editOf('C:\\repo\\src\\orders\\ship.ts'))).toBe('allow')
  })

  test('TypeScript edit is denied when typescript.md was read by another agent', async ($, on) => {
    arrange(on, [{ file_path: TYPESCRIPT, agentId: HELPER }])

    expect(await decide($, editOf(SOURCE))).toBe('deny')
  })

  test('TypeScript edit is allowed when the subagent read typescript.md itself', async ($, on) => {
    arrange(on, [{ file_path: TYPESCRIPT, agentId: HELPER }])

    expect(await decide($, { ...editOf(SOURCE), agentId: HELPER })).toBe('allow')
  })

  test('TypeScript edit is allowed when the agent transcript cannot be read', async ($, on) => {
    on('tool.call', () => ({ result: RAN }))
    on('session.messages', () => ({ deny: 'unreadable' }))

    expect(await decide($, editOf(SOURCE))).toBe('allow')
  })
})
