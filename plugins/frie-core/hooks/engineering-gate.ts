import type { On, SessionMessage } from 'claude-code'

const SKILL_FILE = 'engineering-patterns/SKILL.md'
const SKILL_NAME = /^(?:[\w-]+:)?engineering-patterns$/
const EXEMPT_PATH = /^\/tmp\/|\/scratchpad\/|\/node_modules\/|\/\.venv\/|\/obj\/|\/bin\/|\/build\/|\/dist\/|\/\.gradle\/|\/\.claude-plugin\/types\//
const CODE_FILE = /\.(cs|razor|py|java|kt|kts|gradle|ts|tsx|mts|cts|js|jsx|mjs|cjs|go|rs|c|cc|cpp|h|hpp|gd|sql)$/
const DENIAL = `BLOCKED by the engineering gate. Brandon requires the frie-core:engineering-patterns skill BEFORE the first code edit in this context window, not as a check afterward. Invoke it with the Skill tool, or read ${SKILL_FILE} in the frie-core plugin with the Read tool and no offset or limit, then repeat this edit. Do not route around this by writing the file through Bash.`

function normalizeSlashes(path: string): string {
  return path.replaceAll('\\', '/')
}

function hasLoadedSkill(transcript: SessionMessage[]): boolean {
  return transcript
    .flatMap(message => message.toolUses)
    .filter(use => use.isError === undefined)
    .some(use => {
      if (use.tool === 'Skill') {
        return typeof use.input.skill === 'string' && SKILL_NAME.test(use.input.skill)
      }
      return (
        use.tool === 'Read' &&
        use.input.offset === undefined &&
        use.input.limit === undefined &&
        typeof use.input.file_path === 'string' &&
        normalizeSlashes(use.input.file_path).endsWith(`/${SKILL_FILE}`)
      )
    })
}

export function registerEngineeringGate(on: On) {
  on('tool.call', { tool: ['Edit', 'Write'] }, async ($, e, next) => {
    const file = normalizeSlashes(e.file_path)
    if (EXEMPT_PATH.test(file) || !CODE_FILE.test(file)) {
      return next(e)
    }
    const transcript = await $.session.messages({ agentId: e.agentId })
    if (!Array.isArray(transcript) || hasLoadedSkill(transcript)) {
      return next(e)
    }
    return { deny: DENIAL }
  }).catch(($, e, next) => next(e))
}
