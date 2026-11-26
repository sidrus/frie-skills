import type { AgentLoop, On, SessionMessage, ToolCallArgs } from 'claude-code'
import { describe, expect, test, type Engine } from 'claude-code/testing'

type Call = ToolCallArgs & AgentLoop
type Outcome = 'allow' | 'deny'
type Use = { readonly tool: string; readonly input: Readonly<Record<string, unknown>>; readonly agentId?: string; readonly isError?: true }

const RAN = 'ran'
const HELPER = 'helper'
const SKILL_FILE = '/elsewhere/frie-gamedev/1.0.0/skills/standards/SKILL.md'
const GODOT_PROJECT = '/game/project.godot'
const SOURCE = '/game/scripts/Player.cs'
const GAMEDEV = buildSkillUse('frie-gamedev:standards')

function buildTranscript(uses: readonly Use[]): SessionMessage[] {
  const toolUses = uses.map(({ agentId, isError, ...use }) => ({
    tool_use_id: crypto.randomUUID(),
    ...use,
    text: RAN,
    ...(isError === undefined ? {} : { isError }),
  }))
  return [{ role: 'assistant', text: '', toolUses }]
}

function arrangeFiles(on: On, files: readonly string[]) {
  on('fs.exists', (_, e) => ({ value: files.some(file => e.path.replaceAll('\\', '/').endsWith(file)) }))
}

function arrange(on: On, uses: readonly Use[], files: readonly string[] = [GODOT_PROJECT]) {
  on('tool.call', () => ({ result: RAN }))
  arrangeFiles(on, files)
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

describe('game standards gate', () => {
  test('denies a Godot C# edit when the game skill was not invoked', async ($, on) => {
    arrange(on, [])

    expect(await decide($, buildEdit(SOURCE))).toBe('deny')
  })

  test('allows a Godot C# edit when the game skill was invoked', async ($, on) => {
    arrange(on, [GAMEDEV])

    expect(await decide($, buildEdit(SOURCE))).toBe('allow')
  })

  test('allows a Godot C# edit when the game SKILL.md was read in full', async ($, on) => {
    arrange(on, [{ tool: 'Read', input: { file_path: SKILL_FILE } }])

    expect(await decide($, buildEdit(SOURCE))).toBe('allow')
  })

  test('denies a Godot C# edit when the game SKILL.md was read with a limit', async ($, on) => {
    arrange(on, [{ tool: 'Read', input: { file_path: SKILL_FILE, limit: 20 } }])

    expect(await decide($, buildEdit(SOURCE))).toBe('deny')
  })

  test('denies a Godot C# edit when only another standards skill was invoked', async ($, on) => {
    arrange(on, [buildSkillUse('frie-dotnet:standards')])

    expect(await decide($, buildEdit(SOURCE))).toBe('deny')
  })

  test('denies a Godot C# edit when the skill invocation failed', async ($, on) => {
    arrange(on, [{ ...GAMEDEV, isError: true }])

    expect(await decide($, buildEdit(SOURCE))).toBe('deny')
  })

  test('denies a GDScript write when the game skill was not invoked', async ($, on) => {
    arrange(on, [])

    expect(await decide($, { tool: 'Write', file_path: '/game/scripts/player.gd', content: '' })).toBe('deny')
  })

  test('denies a Godot C# edit on a Windows path when the game skill was not invoked', async ($, on) => {
    arrange(on, [], ['C:/game/project.godot'])

    expect(await decide($, buildEdit('C:\\game\\scripts\\Player.cs'))).toBe('deny')
  })

  test('allows a C# edit outside a Godot project when nothing was invoked', async ($, on) => {
    arrange(on, [])

    expect(await decide($, buildEdit('/repo/src/Order.cs'))).toBe('allow')
  })

  test('allows a Godot scene edit when nothing was invoked', async ($, on) => {
    arrange(on, [])

    expect(await decide($, buildEdit('/game/scenes/player.tscn'))).toBe('allow')
  })

  test('allows a Godot C# edit when the file is under the .godot folder', async ($, on) => {
    arrange(on, [])

    expect(await decide($, buildEdit('/game/.godot/mono/temp/obj/Generated.cs'))).toBe('allow')
  })

  test('denies a Godot C# edit when another agent invoked the skill', async ($, on) => {
    arrange(on, [{ ...GAMEDEV, agentId: HELPER }])

    expect(await decide($, buildEdit(SOURCE))).toBe('deny')
  })

  test('allows a Godot C# edit when the subagent invoked the skill itself', async ($, on) => {
    arrange(on, [{ ...GAMEDEV, agentId: HELPER }])

    expect(await decide($, { ...buildEdit(SOURCE), agentId: HELPER })).toBe('allow')
  })

  test('allows a Godot C# edit when the project folders cannot be checked', async ($, on) => {
    on('tool.call', () => ({ result: RAN }))
    on('fs.exists', () => ({ deny: 'unreadable' }))

    expect(await decide($, buildEdit(SOURCE))).toBe('allow')
  })

  test('allows a Godot C# edit when the agent transcript cannot be read', async ($, on) => {
    on('tool.call', () => ({ result: RAN }))
    arrangeFiles(on, [GODOT_PROJECT])
    on('session.messages', () => ({ deny: 'unreadable' }))

    expect(await decide($, buildEdit(SOURCE))).toBe('allow')
  })
})
