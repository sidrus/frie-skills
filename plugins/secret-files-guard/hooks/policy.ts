export type ToolInput = { readonly tool: string; readonly [field: string]: unknown }

export const DENY_REASON =
  'Blocked: this call reaches a secrets file (.env, *.local.json, .envrc, .npmrc, .pypirc, .netrc, .git-credentials, .pgpass, .my.cnf, .vault-token, a cloud or container credential file, a .NET UserSecrets folder, terraform state, a *secret* config file, a private key, or a .pem, .p12, .pfx, .jks, .keystore, or .key file), directly, through a symlink, or through a glob that can match one. Those files are off limits to every tool. Rewrite it with a more specific pattern that cannot match them, such as the exact file name (appsettings.json, .env.example, .env.ctmpl) or an explicit list of files. A file test such as [ -f .env ] is allowed.'

const SECRET_NAMES = new RegExp(
  [
    String.raw`local\.json`,
    String.raw`appsettings[^\s"']*[*?]`,
    String.raw`(?<!process)\.env(?!\.(ctmpl|example)\b)(?![\w-])`,
    String.raw`(?<![\w.-])(\.envrc|\.npmrc|\.pypirc|\.netrc|_netrc|\.git-credentials|\.pgpass|\.my\.cnf|\.vault-token)(?![\w.-])`,
    String.raw`(?<![\w-])id_(rsa|dsa|ecdsa|ed25519)(?![\w.-]*\.pub(?![\w.-]))`,
    String.raw`\.(pem|p12|pfx|jks|keystore)(?![\w.-])`,
    String.raw`terraform\.tfstate`,
    String.raw`secret[^/\\\s"']*\.(json|ya?ml|toml|properties|ini)(?![\w.-])`,
    String.raw`microsoft[/\\]usersecrets`,
    String.raw`\.aws[/\\]credentials`,
    String.raw`\.kube[/\\]config(?![\w.-])`,
    String.raw`\.docker[/\\]config\.json`,
    String.raw`\.claude[/\\]\.credentials\.json`,
  ].join('|'),
  'i',
)

const KEY_FILE = /\.key$/i
const EXISTENCE_TEST = /(\btest|\[\[?)\s+-[edfhLrsx]\s+("[^"$`]*"|'[^']*'|[^\s;&|\]$`"']+)\s*(\]\]?)?/g
const PATCH_HEADER = /^(\*\*\* (Add|Update|Delete) File:|\*\*\* Move to:|--- |\+\+\+ )/
const QUOTING = /["'\\]/g
const TOKEN_SEPARATOR = /[\s;|&<>()=,`]+/
const GLOB_CHARACTER = /[*?[]/
const GLOB_LITERAL = /[.+^$(){}|]/g
const DOT_FILES = ['.env', '.env.local', '.envrc', '.npmrc', '.pypirc', '.netrc', '.git-credentials', '.pgpass', '.my.cnf', '.vault-token']
const KEY_FILES = ['id_rsa', 'id_dsa', 'id_ecdsa', 'id_ed25519', 'x.pem', 'x.p12', 'x.pfx', 'x.jks', 'x.keystore', 'terraform.tfstate']
const FILE_TOOLS = new Set(['Read', 'Edit', 'Write', 'NotebookEdit', 'Grep'])
const RIDER_PREFIX = 'mcp__rider__'

function selectStrings(values: unknown[]): string[] {
  return values.filter((value): value is string => typeof value === 'string')
}

function listRiderPaths(call: ToolInput): string[] {
  const paths = Array.isArray(call.paths) ? call.paths : []
  return selectStrings([call.file_path, call.filePath, call.pathInProject, call.directoryPath, ...paths])
}

function listPatchHeaders(call: ToolInput): string[] {
  const [patch = ''] = selectStrings([call.input, call.patch])
  return patch.split('\n').filter(line => PATCH_HEADER.test(line))
}

function listTargets(call: ToolInput): string[] {
  switch (call.tool) {
    case 'Bash':
      return selectStrings([call.command]).map(command => command.replace(EXISTENCE_TEST, ''))
    case 'Grep':
      return selectStrings([call.path, call.glob])
    case 'Glob':
      return selectStrings([call.path, call.pattern])
    case `${RIDER_PREFIX}apply_patch`:
      return listPatchHeaders(call)
    case `${RIDER_PREFIX}search_file`:
      return [...listRiderPaths(call), ...selectStrings([call.q])]
    default:
      return call.tool.startsWith(RIDER_PREFIX)
        ? listRiderPaths(call)
        : selectStrings([call.file_path, call.notebook_path, call.path])
  }
}

function toGlobPattern(glob: string): RegExp | undefined {
  const source = glob
    .replace(GLOB_LITERAL, '\\$&')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '[^/]')
    .replace(/\[!/g, '[^')
  try {
    return new RegExp(`^${source}$`, 'i')
  } catch {
    return undefined
  }
}

function isRiskyGlob(token: string): boolean {
  const base = token.split('/').pop() ?? ''
  const pattern = GLOB_CHARACTER.test(base) ? toGlobPattern(base) : undefined
  if (pattern === undefined) {
    return false
  }
  const reachesDotFile = base.startsWith('.') && DOT_FILES.some(name => pattern.test(name))
  const reachesKeyFile = KEY_FILES.some(name => pattern.test(name)) && !pattern.test('readme.md')
  return reachesDotFile || reachesKeyFile
}

function hasRiskyGlob(text: string): boolean {
  return text.split(TOKEN_SEPARATOR).some(isRiskyGlob)
}

export function listFilePaths(call: ToolInput): string[] {
  return FILE_TOOLS.has(call.tool) ? selectStrings([call.file_path, call.notebook_path, call.path]) : []
}

export function isSecretPath(path: string): boolean {
  return SECRET_NAMES.test(path) || KEY_FILE.test(path)
}

export function reachesSecret(call: ToolInput): boolean {
  const raw = listTargets(call)
  const plain = raw.map(target => target.replace(QUOTING, ''))
  return (
    plain.some(hasRiskyGlob) ||
    [...raw, ...plain].some(target => SECRET_NAMES.test(target)) ||
    listFilePaths(call).some(isSecretPath)
  )
}
