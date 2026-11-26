import type { AgentLoop, On, SessionMessage, ToolCallArgs } from 'claude-code'
import { describe, expect, test, type Engine } from 'claude-code/testing'

type Call = ToolCallArgs & AgentLoop
type Outcome = 'allow' | 'deny'
type Use = { readonly tool: string; readonly input: Readonly<Record<string, unknown>>; readonly agentId?: string; readonly isError?: true }

const RAN = 'ran'
const HELPER = 'helper'
const REFERENCES = '/elsewhere/frie-aspnet/skills/standards/references'
const HOSTING = `${REFERENCES}/dotnet-hosting.md`
const BLAZOR = `${REFERENCES}/blazor.md`
const ASPNET_TESTING = `${REFERENCES}/aspnet-testing.md`
const ENTERPRISE_TESTING = '/elsewhere/frie-enterprise/skills/standards/references/enterprise-testing.md'
const ENTERPRISE_SKILL_FILE = '/elsewhere/frie-enterprise/1.0.0/skills/standards/SKILL.md'
const WINDOWS_HOSTING = 'C:\\Users\\u\\.claude\\plugins\\frie-aspnet\\skills\\standards\\references\\dotnet-hosting.md'
const SOURCE = '/repo/src/Order.cs'
const TEST_SOURCE = '/repo/tests/Shop.Tests/OrderTests.cs'
const RAZOR = '/repo/src/Cart.razor'
const GODOT_PROJECT = '/game/project.godot'
const GODOT_SOURCE = '/game/scripts/Player.cs'
const ENTERPRISE = buildSkillUse('frie-enterprise:standards')

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

function arrange(on: On, uses: readonly Use[], files: readonly string[] = []) {
  on('tool.call', () => ({ result: RAN }))
  arrangeFiles(on, files)
  on('session.messages', (_, e) => ({ value: buildTranscript(uses.filter(use => use.agentId === e.agentId)) }))
}

function buildSkillUse(skill: string): Use {
  return { tool: 'Skill', input: { skill } }
}

function buildRead(path: string): Use {
  return { tool: 'Read', input: { file_path: path } }
}

async function decide($: Engine, call: Call): Promise<Outcome> {
  const answer = await $.tool.call(call)
  return answer.result === RAN ? 'allow' : 'deny'
}

function buildEdit(path: string): Call {
  return { tool: 'Edit', file_path: path, old_string: 'a', new_string: 'b' }
}

describe('ASP.NET standards gate', () => {
  test('denies a C# edit when nothing was loaded', async ($, on) => {
    arrange(on, [])

    expect(await decide($, buildEdit(SOURCE))).toBe('deny')
  })

  test('allows a C# edit when the enterprise skill was invoked and dotnet-hosting.md was read', async ($, on) => {
    arrange(on, [ENTERPRISE, buildRead(HOSTING)])

    expect(await decide($, buildEdit(SOURCE))).toBe('allow')
  })

  test('denies a C# edit when the enterprise skill was not invoked', async ($, on) => {
    arrange(on, [buildRead(HOSTING)])

    expect(await decide($, buildEdit(SOURCE))).toBe('deny')
  })

  test('denies a C# edit when only another standards skill was invoked', async ($, on) => {
    arrange(on, [buildSkillUse('frie-dotnet:standards'), buildRead(HOSTING)])

    expect(await decide($, buildEdit(SOURCE))).toBe('deny')
  })

  test('denies a C# edit when the enterprise skill invocation failed', async ($, on) => {
    arrange(on, [{ ...ENTERPRISE, isError: true }, buildRead(HOSTING)])

    expect(await decide($, buildEdit(SOURCE))).toBe('deny')
  })

  test('allows a C# edit when the enterprise SKILL.md was read in full', async ($, on) => {
    arrange(on, [buildRead(ENTERPRISE_SKILL_FILE), buildRead(HOSTING)])

    expect(await decide($, buildEdit(SOURCE))).toBe('allow')
  })

  test('denies a C# edit when dotnet-hosting.md was not read', async ($, on) => {
    arrange(on, [ENTERPRISE])

    expect(await decide($, buildEdit(SOURCE))).toBe('deny')
  })

  test('denies a C# edit when dotnet-hosting.md was read with a limit', async ($, on) => {
    arrange(on, [ENTERPRISE, { tool: 'Read', input: { file_path: HOSTING, limit: 40 } }])

    expect(await decide($, buildEdit(SOURCE))).toBe('deny')
  })

  test('denies a C# edit when the dotnet-hosting.md read failed', async ($, on) => {
    arrange(on, [ENTERPRISE, { ...buildRead(HOSTING), isError: true }])

    expect(await decide($, buildEdit(SOURCE))).toBe('deny')
  })

  test('denies a C# test edit when aspnet-testing.md was not read', async ($, on) => {
    arrange(on, [ENTERPRISE, buildRead(HOSTING), buildRead(ENTERPRISE_TESTING)])

    expect(await decide($, buildEdit(TEST_SOURCE))).toBe('deny')
  })

  test('denies a C# test edit when enterprise-testing.md was not read', async ($, on) => {
    arrange(on, [ENTERPRISE, buildRead(HOSTING), buildRead(ASPNET_TESTING)])

    expect(await decide($, buildEdit(TEST_SOURCE))).toBe('deny')
  })

  test('allows a C# test edit when every reference was read', async ($, on) => {
    arrange(on, [ENTERPRISE, buildRead(HOSTING), buildRead(ASPNET_TESTING), buildRead(ENTERPRISE_TESTING)])

    expect(await decide($, buildEdit(TEST_SOURCE))).toBe('allow')
  })

  test('denies a Razor write when blazor.md was not read', async ($, on) => {
    arrange(on, [ENTERPRISE, buildRead(HOSTING)])

    expect(await decide($, { tool: 'Write', file_path: RAZOR, content: '' })).toBe('deny')
  })

  test('allows a Razor write when its references were read', async ($, on) => {
    arrange(on, [ENTERPRISE, buildRead(HOSTING), buildRead(BLAZOR)])

    expect(await decide($, { tool: 'Write', file_path: RAZOR, content: '' })).toBe('allow')
  })

  test('denies a Razor code-behind edit when blazor.md was not read', async ($, on) => {
    arrange(on, [ENTERPRISE, buildRead(HOSTING)])

    expect(await decide($, buildEdit('/repo/src/Cart.razor.cs'))).toBe('deny')
  })

  test('denies a Razor scoped CSS edit when blazor.md was not read', async ($, on) => {
    arrange(on, [])

    expect(await decide($, buildEdit('/repo/src/Cart.razor.css'))).toBe('deny')
  })

  test('allows a Razor scoped CSS edit when only blazor.md was read', async ($, on) => {
    arrange(on, [buildRead(BLAZOR)])

    expect(await decide($, buildEdit('/repo/src/Cart.razor.css'))).toBe('allow')
  })

  test('allows a C# edit in a Godot project when nothing was loaded', async ($, on) => {
    arrange(on, [], [GODOT_PROJECT])

    expect(await decide($, buildEdit(GODOT_SOURCE))).toBe('allow')
  })

  test('allows a C# edit on a Windows path in a Godot project when nothing was loaded', async ($, on) => {
    arrange(on, [], ['C:/game/project.godot'])

    expect(await decide($, buildEdit('C:\\game\\scripts\\Player.cs'))).toBe('allow')
  })

  test('denies a C# edit beside a Godot project when nothing was loaded', async ($, on) => {
    arrange(on, [], [GODOT_PROJECT])

    expect(await decide($, buildEdit(SOURCE))).toBe('deny')
  })

  test('allows a plain CSS edit when nothing was loaded', async ($, on) => {
    arrange(on, [])

    expect(await decide($, buildEdit('/repo/src/wwwroot/app.css'))).toBe('allow')
  })

  test('allows a Python edit when nothing was loaded', async ($, on) => {
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

  test('allows a C# edit on a Windows path when a Windows-path reference was read', async ($, on) => {
    arrange(on, [ENTERPRISE, buildRead(WINDOWS_HOSTING)])

    expect(await decide($, buildEdit('C:\\repo\\src\\Order.cs'))).toBe('allow')
  })

  test('denies a C# edit when another agent loaded everything', async ($, on) => {
    arrange(on, [ENTERPRISE, buildRead(HOSTING)].map(use => ({ ...use, agentId: HELPER })))

    expect(await decide($, buildEdit(SOURCE))).toBe('deny')
  })

  test('allows a C# edit when the subagent loaded everything itself', async ($, on) => {
    arrange(on, [ENTERPRISE, buildRead(HOSTING)].map(use => ({ ...use, agentId: HELPER })))

    expect(await decide($, { ...buildEdit(SOURCE), agentId: HELPER })).toBe('allow')
  })

  test('allows a C# edit when the project folders cannot be checked', async ($, on) => {
    on('tool.call', () => ({ result: RAN }))
    on('fs.exists', () => ({ deny: 'unreadable' }))

    expect(await decide($, buildEdit(SOURCE))).toBe('allow')
  })

  test('allows a C# edit when the agent transcript cannot be read', async ($, on) => {
    on('tool.call', () => ({ result: RAN }))
    arrangeFiles(on, [])
    on('session.messages', () => ({ deny: 'unreadable' }))

    expect(await decide($, buildEdit(SOURCE))).toBe('allow')
  })
})
