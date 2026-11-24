import type { AgentLoop, On, SessionMessage, ToolCallArgs } from 'claude-code'
import { describe, expect, test, type Engine } from 'claude-code/testing'

type Call = ToolCallArgs & AgentLoop
type Outcome = 'allow' | 'deny'
type Read = { readonly file_path: string; readonly agentId?: string; readonly limit?: number; readonly isError?: true }

const RAN = 'ran'
const HELPER = 'helper'
const REFERENCES = '/elsewhere/frie-typescript/skills/standards/references'
const TYPESCRIPT = `${REFERENCES}/typescript.md`
const TYPESCRIPT_TESTING = `${REFERENCES}/typescript-testing.md`
const REACT = `${REFERENCES}/react.md`
const TESTING = '/elsewhere/frie-core/skills/engineering-patterns/references/testing.md'
const WINDOWS_TYPESCRIPT = 'C:\\Users\\u\\.claude\\plugins\\frie-typescript\\skills\\standards\\references\\typescript.md'
const SOURCE = '/repo/src/orders/ship.ts'
const COMPONENT = '/repo/src/orders/ShipButton.tsx'
const TEST_SOURCE = '/repo/tests/orders/ship.test.ts'

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
  test('denies a TypeScript edit when typescript.md was not read', async ($, on) => {
    arrange(on, [])

    expect(await decide($, buildEdit(SOURCE))).toBe('deny')
  })

  test('allows a TypeScript edit when typescript.md was read in full', async ($, on) => {
    arrange(on, buildReads([TYPESCRIPT]))

    expect(await decide($, buildEdit(SOURCE))).toBe('allow')
  })

  test('denies a TypeScript edit when typescript.md was read with a limit', async ($, on) => {
    arrange(on, [{ file_path: TYPESCRIPT, limit: 40 }])

    expect(await decide($, buildEdit(SOURCE))).toBe('deny')
  })

  test('denies a TypeScript edit when the typescript.md read failed', async ($, on) => {
    arrange(on, [{ file_path: TYPESCRIPT, isError: true }])

    expect(await decide($, buildEdit(SOURCE))).toBe('deny')
  })

  test('denies a TypeScript write when typescript.md was not read', async ($, on) => {
    arrange(on, [])

    expect(await decide($, { tool: 'Write', file_path: SOURCE, content: '' })).toBe('deny')
  })

  test('denies an ES module TypeScript edit when typescript.md was not read', async ($, on) => {
    arrange(on, [])

    expect(await decide($, buildEdit('/repo/scripts/release.mts'))).toBe('deny')
  })

  test('denies a TSX edit when react.md was not read', async ($, on) => {
    arrange(on, buildReads([TYPESCRIPT]))

    expect(await decide($, buildEdit(COMPONENT))).toBe('deny')
  })

  test('allows a TSX edit when typescript.md and react.md were read', async ($, on) => {
    arrange(on, buildReads([TYPESCRIPT, REACT]))

    expect(await decide($, buildEdit(COMPONENT))).toBe('allow')
  })

  test('denies a TypeScript test edit when typescript-testing.md was not read', async ($, on) => {
    arrange(on, buildReads([TYPESCRIPT, TESTING]))

    expect(await decide($, buildEdit(TEST_SOURCE))).toBe('deny')
  })

  test('denies a TypeScript test edit when testing.md was not read', async ($, on) => {
    arrange(on, buildReads([TYPESCRIPT, TYPESCRIPT_TESTING]))

    expect(await decide($, buildEdit(TEST_SOURCE))).toBe('deny')
  })

  test('denies a colocated spec edit when the test references were not read', async ($, on) => {
    arrange(on, buildReads([TYPESCRIPT]))

    expect(await decide($, buildEdit('/repo/src/orders/ship.spec.ts'))).toBe('deny')
  })

  test('denies a test support edit when the test references were not read', async ($, on) => {
    arrange(on, buildReads([TYPESCRIPT]))

    expect(await decide($, buildEdit('/repo/tests/support/buildOrder.ts'))).toBe('deny')
  })

  test('allows a TypeScript test edit when every reference was read', async ($, on) => {
    arrange(on, buildReads([TYPESCRIPT, TYPESCRIPT_TESTING, TESTING]))

    expect(await decide($, buildEdit(TEST_SOURCE))).toBe('allow')
  })

  test('allows a TSX test edit when every reference was read', async ($, on) => {
    arrange(on, buildReads([TYPESCRIPT, REACT, TYPESCRIPT_TESTING, TESTING]))

    expect(await decide($, buildEdit('/repo/tests/orders/ShipButton.test.tsx'))).toBe('allow')
  })

  test('allows a JavaScript edit when nothing was read', async ($, on) => {
    arrange(on, [])

    expect(await decide($, buildEdit('/repo/src/legacy.js'))).toBe('allow')
  })

  test('allows a TypeScript edit when the file is under node_modules', async ($, on) => {
    arrange(on, [])

    expect(await decide($, buildEdit('/repo/node_modules/zod/index.d.ts'))).toBe('allow')
  })

  test('allows a TypeScript edit when the file is under dist', async ($, on) => {
    arrange(on, [])

    expect(await decide($, buildEdit('/repo/dist/orders/ship.d.ts'))).toBe('allow')
  })

  test('allows a TypeScript edit when the file is in generated plugin types', async ($, on) => {
    arrange(on, [])

    expect(await decide($, buildEdit('/repo/plugins/frie-core/.claude-plugin/types/claude-code/index.d.ts'))).toBe('allow')
  })

  test('allows a TypeScript edit when a Windows-path typescript.md was read in full', async ($, on) => {
    arrange(on, buildReads([WINDOWS_TYPESCRIPT]))

    expect(await decide($, buildEdit('C:\\repo\\src\\orders\\ship.ts'))).toBe('allow')
  })

  test('denies a TypeScript edit when typescript.md was read by another agent', async ($, on) => {
    arrange(on, [{ file_path: TYPESCRIPT, agentId: HELPER }])

    expect(await decide($, buildEdit(SOURCE))).toBe('deny')
  })

  test('allows a TypeScript edit when the subagent read typescript.md itself', async ($, on) => {
    arrange(on, [{ file_path: TYPESCRIPT, agentId: HELPER }])

    expect(await decide($, { ...buildEdit(SOURCE), agentId: HELPER })).toBe('allow')
  })

  test('allows a TypeScript edit when the agent transcript cannot be read', async ($, on) => {
    on('tool.call', () => ({ result: RAN }))
    on('session.messages', () => ({ deny: 'unreadable' }))

    expect(await decide($, buildEdit(SOURCE))).toBe('allow')
  })
})
