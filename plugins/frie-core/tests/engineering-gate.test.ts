import type { AgentLoop, On, SessionMessage, ToolCallArgs } from 'claude-code'
import { describe, expect, test, type Engine } from 'claude-code/testing'

type Call = ToolCallArgs & AgentLoop
type Outcome = 'allow' | 'deny'
type Use = { readonly tool: string; readonly input: Readonly<Record<string, unknown>>; readonly agentId?: string; readonly isError?: true }

const RAN = 'ran'
const HELPER = 'helper'
const SKILL_FILE = '/elsewhere/frie-core/skills/engineering-patterns/SKILL.md'
const SOURCE = '/repo/src/orders.py'

function buildTranscript(uses: readonly Use[]): SessionMessage[] {
  const toolUses = uses.map(({ agentId, isError, ...use }) => ({
    tool_use_id: crypto.randomUUID(),
    ...use,
    text: RAN,
    ...(isError === undefined ? {} : { isError }),
  }))
  return [{ role: 'assistant', text: '', toolUses }]
}

function arrange(on: On, uses: readonly Use[]) {
  on('tool.call', () => ({ result: RAN }))
  on('session.messages', (_, e) => ({ value: buildTranscript(uses.filter(use => use.agentId === e.agentId)) }))
}

function buildSkillUse(skill: string): Use {
  return { tool: 'Skill', input: { skill } }
}

async function decide($: Engine, call: Call): Promise<Outcome> {
  const answer = await $.tool.call(call)
  return answer.result === RAN ? 'allow' : 'deny'
}

function buildEdit(path: string): Call {
  return { tool: 'Edit', file_path: path, old_string: 'a', new_string: 'b' }
}

describe('engineering gate', () => {
  test('denies a code edit when engineering-patterns was not invoked', async ($, on) => {
    arrange(on, [])

    expect(await decide($, buildEdit(SOURCE))).toBe('deny')
  })

  test('allows a code edit when the namespaced skill was invoked', async ($, on) => {
    arrange(on, [buildSkillUse('frie-core:engineering-patterns')])

    expect(await decide($, buildEdit(SOURCE))).toBe('allow')
  })

  test('allows a code edit when the bare skill name was invoked', async ($, on) => {
    arrange(on, [buildSkillUse('engineering-patterns')])

    expect(await decide($, buildEdit(SOURCE))).toBe('allow')
  })

  test('allows a code edit when SKILL.md was read in full', async ($, on) => {
    arrange(on, [{ tool: 'Read', input: { file_path: SKILL_FILE } }])

    expect(await decide($, buildEdit(SOURCE))).toBe('allow')
  })

  test('denies a code edit when SKILL.md was read with a limit', async ($, on) => {
    arrange(on, [{ tool: 'Read', input: { file_path: SKILL_FILE, limit: 20 } }])

    expect(await decide($, buildEdit(SOURCE))).toBe('deny')
  })

  test('denies a code edit when the skill invocation failed', async ($, on) => {
    arrange(on, [{ ...buildSkillUse('frie-core:engineering-patterns'), isError: true }])

    expect(await decide($, buildEdit(SOURCE))).toBe('deny')
  })

  test('denies a code edit when only another skill was invoked', async ($, on) => {
    arrange(on, [buildSkillUse('frie-core:writing-style-guide')])

    expect(await decide($, buildEdit(SOURCE))).toBe('deny')
  })

  test('denies a code write when engineering-patterns was not invoked', async ($, on) => {
    arrange(on, [])

    expect(await decide($, { tool: 'Write', file_path: '/repo/src/Order.cs', content: '' })).toBe('deny')
  })

  test('denies a TypeScript component edit when engineering-patterns was not invoked', async ($, on) => {
    arrange(on, [])

    expect(await decide($, buildEdit('/repo/src/ShipButton.tsx'))).toBe('deny')
  })

  test('denies a Godot script edit when engineering-patterns was not invoked', async ($, on) => {
    arrange(on, [])

    expect(await decide($, buildEdit('/game/scripts/player.gd'))).toBe('deny')
  })

  test('allows a Markdown edit when nothing was invoked', async ($, on) => {
    arrange(on, [])

    expect(await decide($, buildEdit('/repo/README.md'))).toBe('allow')
  })

  test('allows a JSON edit when nothing was invoked', async ($, on) => {
    arrange(on, [])

    expect(await decide($, buildEdit('/repo/package.json'))).toBe('allow')
  })

  test('allows a code edit when the file is under node_modules', async ($, on) => {
    arrange(on, [])

    expect(await decide($, buildEdit('/repo/node_modules/zod/index.js'))).toBe('allow')
  })

  test('allows a code edit when the file is under /tmp', async ($, on) => {
    arrange(on, [])

    expect(await decide($, buildEdit('/tmp/scratch.py'))).toBe('allow')
  })

  test('allows a code edit on a Windows path when a Windows-path SKILL.md was read', async ($, on) => {
    arrange(on, [{ tool: 'Read', input: { file_path: 'C:\\Users\\u\\.claude\\plugins\\frie-core\\skills\\engineering-patterns\\SKILL.md' } }])

    expect(await decide($, buildEdit('C:\\repo\\src\\orders.py'))).toBe('allow')
  })

  test('denies a code edit when another agent invoked the skill', async ($, on) => {
    arrange(on, [{ ...buildSkillUse('frie-core:engineering-patterns'), agentId: HELPER }])

    expect(await decide($, buildEdit(SOURCE))).toBe('deny')
  })

  test('allows a code edit when the subagent invoked the skill itself', async ($, on) => {
    arrange(on, [{ ...buildSkillUse('frie-core:engineering-patterns'), agentId: HELPER }])

    expect(await decide($, { ...buildEdit(SOURCE), agentId: HELPER })).toBe('allow')
  })

  test('allows a code edit when the agent transcript cannot be read', async ($, on) => {
    on('tool.call', () => ({ result: RAN }))
    on('session.messages', () => ({ deny: 'unreadable' }))

    expect(await decide($, buildEdit(SOURCE))).toBe('allow')
  })
})
