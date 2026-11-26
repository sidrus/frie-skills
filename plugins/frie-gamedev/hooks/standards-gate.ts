import type { Hook, On, SessionMessage } from 'claude-code'

type Engine = Parameters<Hook<'tool.call'>>[0]

const SKILL = 'frie-gamedev:standards'
const SKILL_FILE = /\/frie-gamedev\/(?:[^/]+\/)?skills\/standards\/SKILL\.md$/
const GAME_PROJECT_FILE = 'project.godot'
const EXEMPT_PATH = /^\/tmp\/|\/scratchpad\/|\/\.godot\/|\/obj\/|\/bin\//
const SCRIPT_FILE = /\.(cs|gd)$/
const DENIAL = `BLOCKED by the game standards gate. Brandon requires the ${SKILL} skill BEFORE the first script edit in a game project in this context window, not as a check afterward. Invoke it with the Skill tool, or read its SKILL.md in the frie-gamedev plugin with the Read tool and no offset or limit, then repeat this edit. Do not route around this by writing the file through Bash.`

function normalizeSlashes(path: string): string {
  return path.replaceAll('\\', '/')
}

function listAncestorFolders(file: string): string[] {
  const segments = file.split('/')
  return segments
    .slice(1, -1)
    .map((_, index) => segments.slice(0, segments.length - 1 - index).join('/'))
    .filter(folder => folder !== '')
}

async function isInGameProject($: Engine, file: string): Promise<boolean> {
  for (const folder of listAncestorFolders(file)) {
    if (await $.fs.exists(`${folder}/${GAME_PROJECT_FILE}`)) {
      return true
    }
  }
  return false
}

function hasLoadedSkill(transcript: SessionMessage[]): boolean {
  return transcript
    .flatMap(message => message.toolUses)
    .filter(use => use.isError === undefined)
    .some(use => {
      if (use.tool === 'Skill') {
        return use.input.skill === SKILL
      }
      return (
        use.tool === 'Read' &&
        use.input.offset === undefined &&
        use.input.limit === undefined &&
        typeof use.input.file_path === 'string' &&
        SKILL_FILE.test(normalizeSlashes(use.input.file_path))
      )
    })
}

export function registerStandardsGate(on: On) {
  on('tool.call', { tool: ['Edit', 'Write'] }, async ($, e, next) => {
    const file = normalizeSlashes(e.file_path)
    if (EXEMPT_PATH.test(file) || !SCRIPT_FILE.test(file) || !(await isInGameProject($, file))) {
      return next(e)
    }
    const transcript = await $.session.messages({ agentId: e.agentId })
    if (!Array.isArray(transcript) || hasLoadedSkill(transcript)) {
      return next(e)
    }
    return { deny: DENIAL }
  }).catch(($, e, next) => next(e))
}
