import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const CORE_SKILL = 'plugins/frie-core/skills/engineering-patterns'
const DOMAIN_PLUGINS = ['frie-enterprise', 'frie-gamedev']
const MARKER = /\*\*\(domain: ([a-z-]+)\)\*\*/g
const TABLE_HEADING = '## Domain decisions'
const ROW_KEY = /^\| `([a-z-]+)` \|/

function listMarkdownFiles(folder) {
  return readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
    const path = join(folder, entry.name)
    if (entry.isDirectory()) {
      return listMarkdownFiles(path)
    }
    return entry.name.endsWith('.md') ? [path] : []
  })
}

function listMarkedKeys() {
  const keys = listMarkdownFiles(CORE_SKILL).flatMap(file => [...readFileSync(file, 'utf8').matchAll(MARKER)].map(match => match[1]))
  return [...new Set(keys)]
}

function listAnsweredKeys(plugin) {
  const lines = readFileSync(`plugins/${plugin}/skills/standards/SKILL.md`, 'utf8').split(/\r?\n/)
  const start = lines.indexOf(TABLE_HEADING)
  if (start === -1) {
    return []
  }
  const end = lines.findIndex((line, index) => index > start && line.startsWith('## '))
  return lines
    .slice(start + 1, end === -1 ? lines.length : end)
    .map(line => ROW_KEY.exec(line)?.[1])
    .filter(key => key !== undefined)
}

function listProblems(plugin, marked) {
  const answered = listAnsweredKeys(plugin)
  const missing = marked.filter(key => !answered.includes(key)).map(key => `${plugin} does not answer ${key}`)
  const unknown = answered.filter(key => !marked.includes(key)).map(key => `${plugin} answers ${key}, which frie-core does not mark`)
  const repeated = answered.filter((key, index) => answered.indexOf(key) !== index).map(key => `${plugin} answers ${key} more than once`)
  return [...missing, ...unknown, ...repeated]
}

const marked = listMarkedKeys()
const problems = DOMAIN_PLUGINS.flatMap(plugin => listProblems(plugin, marked))

for (const problem of problems) {
  console.error(problem)
}

if (problems.length === 0) {
  console.log(`Every domain plugin answers the ${marked.length} domain markers: ${marked.join(', ')}`)
}

process.exitCode = problems.length === 0 ? 0 : 1
