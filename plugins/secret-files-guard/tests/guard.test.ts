import type { FsStat, On, ToolCallArgs } from 'claude-code'
import { describe, expect, test, type Engine } from 'claude-code/testing'

type Call = ToolCallArgs
type Outcome = 'allow' | 'deny'

const RAN = 'ran'
const NO_LINKS = new Map<string, FsStat>()

function arrange(on: On, stats: Map<string, FsStat>) {
  on('tool.call', () => ({ result: RAN }))
  on('fs.stat', (_, e) => {
    const stat = stats.get(e.path)
    return stat === undefined ? { deny: 'missing' } : { value: stat }
  })
}

async function decide($: Engine, call: Call): Promise<Outcome> {
  const answer = await $.tool.call(call)
  return answer.result === RAN ? 'allow' : 'deny'
}

function readOf(path: string): Call {
  return { tool: 'Read', file_path: path }
}

function bashOf(command: string): Call {
  return { tool: 'Bash', command }
}

function linkTo(realPath?: string): FsStat {
  return { kind: realPath ? 'file' : 'other', size: 0, mtimeMs: 0, isLink: true, realPath }
}

const CASES: [string, Call, Outcome][] = [
  ['Read .env', readOf('/repo/.env'), 'deny'],
  ['Read .env.local', readOf('/repo/.env.local'), 'deny'],
  ['Read prod.env', readOf('/repo/prod.env'), 'deny'],
  ['Read .env.example', readOf('/repo/.env.example'), 'allow'],
  ['Read .env.ctmpl', readOf('/repo/.env.ctmpl'), 'allow'],
  ['Read appsettings.Local.json', readOf('/repo/appsettings.Local.json'), 'deny'],
  ['Read appsettings.json', readOf('/repo/appsettings.json'), 'allow'],
  ['Read a normal file', readOf('/repo/README.md'), 'allow'],
  ['Bash cat .env', bashOf('cat .env'), 'deny'],
  ['Bash glob over appsettings', bashOf('cat appsettings*'), 'deny'],
  ['Bash process.env reference', bashOf('node -e "console.log(process.env.HOME)"'), 'allow'],
  ['Grep glob that can match .env', { tool: 'Grep', pattern: 'x', glob: '.env*' }, 'deny'],
  ['Rider patch touching .env', { tool: 'mcp__rider__apply_patch', input: '*** Update File: src/.env\n+X=1' }, 'deny'],
  ['Rider read of a normal file', { tool: 'mcp__rider__get_file_text_by_path', pathInProject: 'src/app.cs' }, 'allow'],
  ['Bash single-quote split', bashOf("cat .e''nv"), 'deny'],
  ['Bash double-quote split', bashOf('cat .e""nv'), 'deny'],
  ['Bash backslash escape', bashOf('cat .\\env'), 'deny'],
  ['Bash .en*', bashOf('cat .en*'), 'deny'],
  ['Bash .e?v', bashOf('cat .e?v'), 'deny'],
  ['Bash .[e]nv', bashOf('cat .[e]nv'), 'deny'],
  ['Bash brace expansion', bashOf('cat .{e,}nv'), 'deny'],
  ['Bash nested brace expansion', bashOf('cat .{x,e{n,}}v'), 'deny'],
  ['Bash brace expansion over normal files', bashOf('cat {README,CHANGELOG}.md'), 'allow'],
  ['Bash .*', bashOf('cat .*'), 'deny'],
  ['Bash quoted glob', bashOf('find . -name ".e*"'), 'deny'],
  ['Bash *.pem', bashOf('cat *.pem'), 'deny'],
  ['Bash bare *', bashOf('grep -n foo *'), 'allow'],
  ['Bash *.json', bashOf('ls *.json'), 'allow'],
  ['Bash test bracket', bashOf('[ -d src ] && ls src'), 'allow'],
  ['Glob pattern **/.e*', { tool: 'Glob', pattern: '**/.e*' }, 'deny'],
  ['Glob pattern **/*.cs', { tool: 'Glob', pattern: '**/*.cs' }, 'allow'],
  ['test -e .env', bashOf('test -e .env'), 'allow'],
  ['[ -f .env ] alone', bashOf('[ -f .env ] && echo yes'), 'allow'],
  ['[ -f .env ] then cat', bashOf('[ -f .env ] && cat .env'), 'deny'],
  ['test -e with command substitution', bashOf('test -e "$(cat .env)"'), 'deny'],
  ['test -n is not an existence check', bashOf('test -n "$(cat .env)"'), 'deny'],
  ['Read .envrc', readOf('/home/u/.envrc'), 'deny'],
  ['Read .npmrc', readOf('/home/u/.npmrc'), 'deny'],
  ['Read .pypirc', readOf('/home/u/.pypirc'), 'deny'],
  ['Read .netrc', readOf('/home/u/.netrc'), 'deny'],
  ['Read _netrc', readOf('/home/u/_netrc'), 'deny'],
  ['Read .git-credentials', readOf('/home/u/.git-credentials'), 'deny'],
  ['Read id_rsa', readOf('/home/u/.ssh/id_rsa'), 'deny'],
  ['Read id_ed25519_work', readOf('/home/u/.ssh/id_ed25519_work'), 'deny'],
  ['Read id_rsa.pub', readOf('/home/u/.ssh/id_rsa.pub'), 'allow'],
  ['Read server.pem', readOf('/repo/certs/server.pem'), 'deny'],
  ['Read cert.pfx', readOf('/repo/certs/cert.pfx'), 'deny'],
  ['Read cert.p12', readOf('/repo/certs/cert.p12'), 'deny'],
  ['Read tls.key', readOf('/repo/certs/tls.key'), 'deny'],
  ['Bash cat id_rsa', bashOf('cat ~/.ssh/id_rsa'), 'deny'],
  ['Bash cat .npmrc', bashOf('cat .npmrc'), 'deny'],
  ['Bash row.key', bashOf("node -e 'rows.map(row => row.key)'"), 'allow'],
  ['Read .pgpass', readOf('/home/u/.pgpass'), 'deny'],
  ['Read .my.cnf', readOf('/home/u/.my.cnf'), 'deny'],
  ['Read a .jks keystore', readOf('/repo/keys/release.jks'), 'deny'],
  ['Read a .keystore file', readOf('/repo/keys/release.keystore'), 'deny'],
  ['Read terraform.tfstate', readOf('/repo/infra/terraform.tfstate'), 'deny'],
  ['Read terraform.tfstate.backup', readOf('/repo/infra/terraform.tfstate.backup'), 'deny'],
  ['Read secrets.json', readOf('/repo/config/secrets.json'), 'deny'],
  ['Read client_secret.yaml', readOf('/repo/config/client_secret.yaml'), 'deny'],
  ['Read app-secrets.yml', readOf('/repo/config/app-secrets.yml'), 'deny'],
  ['Read secret.toml', readOf('/repo/config/secret.toml'), 'deny'],
  ['Read db.secret.properties', readOf('/repo/config/db.secret.properties'), 'deny'],
  ['Read secrets.ini', readOf('/repo/config/secrets.ini'), 'deny'],
  ['Read SecretRotation.cs', readOf('/repo/src/SecretRotation.cs'), 'allow'],
  ['Read secrets.md', readOf('/repo/docs/secrets.md'), 'allow'],
  ['Read a UserSecrets file on Linux', readOf('/home/u/.microsoft/usersecrets/abc/notes.txt'), 'deny'],
  ['Read a UserSecrets file on Windows', readOf('/mnt/c/Users/u/AppData/Roaming/Microsoft/UserSecrets/abc/notes.txt'), 'deny'],
  ['Read .aws/credentials', readOf('/home/u/.aws/credentials'), 'deny'],
  ['Read .aws/config', readOf('/home/u/.aws/config'), 'allow'],
  ['Read .kube/config', readOf('/home/u/.kube/config'), 'deny'],
  ['Read .docker/config.json', readOf('/home/u/.docker/config.json'), 'deny'],
  ['Read a repo docker/config.json', readOf('/repo/docker/config.json'), 'allow'],
  ['Read .vault-token', readOf('/home/u/.vault-token'), 'deny'],
  ['Read .claude/.credentials.json', readOf('/home/u/.claude/.credentials.json'), 'deny'],
  ['Bash cat .aws/credentials', bashOf('cat ~/.aws/credentials'), 'deny'],
  ['Bash terraform show tfstate', bashOf('terraform show terraform.tfstate'), 'deny'],
  ['Bash ls UserSecrets', bashOf('ls ~/.microsoft/usersecrets/'), 'deny'],
  ['dotnet user-secrets list', bashOf('dotnet user-secrets list'), 'deny'],
  ['dotnet user-secrets list with a project', bashOf('dotnet user-secrets --project src/Api list --json'), 'deny'],
  ['dotnet user-secrets set', bashOf('dotnet user-secrets set "Api:Url" "https://localhost"'), 'allow'],
  ['dotnet user-secrets init', bashOf('dotnet user-secrets init --project src/Api'), 'allow'],
  ['Bash .pg*', bashOf('cat ~/.pg*'), 'deny'],
  ['Bash *.jks', bashOf('cp *.jks /tmp'), 'deny'],
  ['Bash *.tfstate', bashOf('ls *.tfstate'), 'deny'],
  ['Bash *secret*.json', bashOf('cat config/*secret*.json'), 'deny'],
  ['Read .env.production', readOf('/repo/.env.production'), 'deny'],
  ['C# DotNetEnv call', bashOf('grep -rn "DotNetEnv.Env.Load()" src'), 'allow'],
  ['C# environment variable read', bashOf('grep -rn "Environment.GetEnvironmentVariable" src'), 'allow'],
  ['Blazor host environment check', bashOf('grep -rn "builder.HostEnvironment.Environment" Client'), 'allow'],
  ['Grep glob over C# and Razor files', { tool: 'Grep', pattern: 'x', glob: '*.{cs,razor}' }, 'allow'],
  ['Python gym environment step', bashOf('grep -rn "self.env.step" src'), 'allow'],
  ['Python os.environ read', bashOf('uv run python -c "import os; print(os.environ.get(\'HOME\'))"'), 'allow'],
  ['Python dotenv import', bashOf('grep -rn "from dotenv import load_dotenv" src'), 'allow'],
  ['Java KeyStore import', bashOf('grep -rn "import java.security.KeyStore;" src'), 'allow'],
  ['Java getenv call', bashOf('grep -rn "System.getenv" src'), 'allow'],
  ['NeoForge environment check', bashOf('grep -rn "FMLEnvironment.dist.isClient()" src'), 'allow'],
  ['TypeScript import.meta.env', bashOf('grep -rn "import.meta.env" src'), 'allow'],
  ['TypeScript import.meta.env member', bashOf('grep -rn "import.meta.env.VITE_API_URL" src'), 'allow'],
  ['TypeScript process.env object', bashOf('node -e "console.log(process.env)"'), 'allow'],
  ['TypeScript Deno.env read', bashOf('grep -rn "Deno.env.get" src'), 'allow'],
  ['TypeScript Worker binding', bashOf('grep -rn "c.env.DB" src'), 'allow'],
  ['Read a config.env.ts module', readOf('/repo/src/config.env.ts'), 'allow'],
  ['Read vite-env.d.ts', readOf('/repo/src/vite-env.d.ts'), 'allow'],
  ['Grep glob over TypeScript files', { tool: 'Grep', pattern: 'x', glob: '*.{ts,tsx}' }, 'allow'],
]

describe('guard', () => {
  for (const [name, call, expected] of CASES) {
    test(`${expected === 'deny' ? 'denies' : 'allows'} the call when it is ${name}`, async ($, on) => {
      arrange(on, NO_LINKS)

      expect(await decide($, call)).toBe(expected)
    })
  }

  test('denies a Read when its symlink targets .env', async ($, on) => {
    arrange(on, new Map([['/repo/notes.txt', linkTo('/repo/.env')]]))

    expect(await decide($, readOf('/repo/notes.txt'))).toBe('deny')
  })

  test('denies a Read when its symlink target is missing', async ($, on) => {
    arrange(on, new Map([['/repo/notes.txt', linkTo()]]))

    expect(await decide($, readOf('/repo/notes.txt'))).toBe('deny')
  })

  test('allows a Read when its symlink targets a normal file', async ($, on) => {
    arrange(on, new Map([['/repo/notes.txt', linkTo('/repo/README.md')]]))

    expect(await decide($, readOf('/repo/notes.txt'))).toBe('allow')
  })

  test('denies the call when inspection throws', async ($, on) => {
    arrange(on, new Map([['/repo/notes.txt', null as never]]))

    expect(await decide($, readOf('/repo/notes.txt'))).toBe('deny')
  })
})
