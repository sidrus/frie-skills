import type { FsStat, On, ToolCallArgs } from 'claude-code'
import { describe, expect, test, type Engine } from 'claude-code/testing'

type Call = ToolCallArgs
type Outcome = 'allow' | 'deny'

const RAN = 'ran'
const NO_LINKS = new Map<string, FsStat>()

function arrange(on: On, stats: ReadonlyMap<string, FsStat>) {
  on('tool.call', () => ({ result: RAN }))
  on('fs.stat', (_, e) => {
    const path = e.path.replaceAll('\\', '/')
    const stat = [...stats].find(([name]) => path.endsWith(name))?.[1]
    return stat === undefined ? { deny: 'missing' } : { value: stat }
  })
}

async function decide($: Engine, call: Call): Promise<Outcome> {
  const answer = await $.tool.call(call)
  return answer.result === RAN ? 'allow' : 'deny'
}

function buildRead(path: string): Call {
  return { tool: 'Read', file_path: path }
}

function buildBash(command: string): Call {
  return { tool: 'Bash', command }
}

function buildLink(realPath?: string): FsStat {
  return { kind: realPath === undefined ? 'other' : 'file', size: 0, mtimeMs: 0, isLink: true, realPath }
}

const CASES: [string, Call, Outcome][] = [
  ['Read .env', buildRead('/repo/.env'), 'deny'],
  ['Read .env.local', buildRead('/repo/.env.local'), 'deny'],
  ['Read prod.env', buildRead('/repo/prod.env'), 'deny'],
  ['Read .env.example', buildRead('/repo/.env.example'), 'allow'],
  ['Read .env.ctmpl', buildRead('/repo/.env.ctmpl'), 'allow'],
  ['Read appsettings.Local.json', buildRead('/repo/appsettings.Local.json'), 'deny'],
  ['Read appsettings.json', buildRead('/repo/appsettings.json'), 'allow'],
  ['Read a normal file', buildRead('/repo/README.md'), 'allow'],
  ['Bash cat .env', buildBash('cat .env'), 'deny'],
  ['Bash glob over appsettings', buildBash('cat appsettings*'), 'deny'],
  ['Bash process.env reference', buildBash('node -e "console.log(process.env.HOME)"'), 'allow'],
  ['Grep glob that can match .env', { tool: 'Grep', pattern: 'x', glob: '.env*' }, 'deny'],
  ['Rider patch touching .env', { tool: 'mcp__rider__apply_patch', input: '*** Update File: src/.env\n+X=1' }, 'deny'],
  ['Rider read of a normal file', { tool: 'mcp__rider__get_file_text_by_path', pathInProject: 'src/app.cs' }, 'allow'],
  ['Bash single-quote split', buildBash("cat .e''nv"), 'deny'],
  ['Bash double-quote split', buildBash('cat .e""nv'), 'deny'],
  ['Bash backslash escape', buildBash('cat .\\env'), 'deny'],
  ['Bash .en*', buildBash('cat .en*'), 'deny'],
  ['Bash .e?v', buildBash('cat .e?v'), 'deny'],
  ['Bash .[e]nv', buildBash('cat .[e]nv'), 'deny'],
  ['Bash brace expansion', buildBash('cat .{e,}nv'), 'deny'],
  ['Bash nested brace expansion', buildBash('cat .{x,e{n,}}v'), 'deny'],
  ['Bash brace expansion over normal files', buildBash('cat {README,CHANGELOG}.md'), 'allow'],
  ['Bash .*', buildBash('cat .*'), 'deny'],
  ['Bash quoted glob', buildBash('find . -name ".e*"'), 'deny'],
  ['Bash *.pem', buildBash('cat *.pem'), 'deny'],
  ['Bash bare *', buildBash('grep -n foo *'), 'allow'],
  ['Bash *.json', buildBash('ls *.json'), 'allow'],
  ['Bash test bracket', buildBash('[ -d src ] && ls src'), 'allow'],
  ['Glob pattern **/.e*', { tool: 'Glob', pattern: '**/.e*' }, 'deny'],
  ['Glob pattern **/*.cs', { tool: 'Glob', pattern: '**/*.cs' }, 'allow'],
  ['test -e .env', buildBash('test -e .env'), 'allow'],
  ['[ -f .env ] alone', buildBash('[ -f .env ] && echo yes'), 'allow'],
  ['[ -f .env ] then cat', buildBash('[ -f .env ] && cat .env'), 'deny'],
  ['test -e with command substitution', buildBash('test -e "$(cat .env)"'), 'deny'],
  ['test -n is not an existence check', buildBash('test -n "$(cat .env)"'), 'deny'],
  ['Read .envrc', buildRead('/home/u/.envrc'), 'deny'],
  ['Read .npmrc', buildRead('/home/u/.npmrc'), 'deny'],
  ['Read .pypirc', buildRead('/home/u/.pypirc'), 'deny'],
  ['Read .netrc', buildRead('/home/u/.netrc'), 'deny'],
  ['Read _netrc', buildRead('/home/u/_netrc'), 'deny'],
  ['Read .git-credentials', buildRead('/home/u/.git-credentials'), 'deny'],
  ['Read id_rsa', buildRead('/home/u/.ssh/id_rsa'), 'deny'],
  ['Read id_ed25519_work', buildRead('/home/u/.ssh/id_ed25519_work'), 'deny'],
  ['Read id_rsa.pub', buildRead('/home/u/.ssh/id_rsa.pub'), 'allow'],
  ['Read server.pem', buildRead('/repo/certs/server.pem'), 'deny'],
  ['Read cert.pfx', buildRead('/repo/certs/cert.pfx'), 'deny'],
  ['Read cert.p12', buildRead('/repo/certs/cert.p12'), 'deny'],
  ['Read tls.key', buildRead('/repo/certs/tls.key'), 'deny'],
  ['Bash cat id_rsa', buildBash('cat ~/.ssh/id_rsa'), 'deny'],
  ['Bash cat .npmrc', buildBash('cat .npmrc'), 'deny'],
  ['Bash row.key', buildBash("node -e 'rows.map(row => row.key)'"), 'allow'],
  ['Read .pgpass', buildRead('/home/u/.pgpass'), 'deny'],
  ['Read .my.cnf', buildRead('/home/u/.my.cnf'), 'deny'],
  ['Read a .jks keystore', buildRead('/repo/keys/release.jks'), 'deny'],
  ['Read a .keystore file', buildRead('/repo/keys/release.keystore'), 'deny'],
  ['Read terraform.tfstate', buildRead('/repo/infra/terraform.tfstate'), 'deny'],
  ['Read terraform.tfstate.backup', buildRead('/repo/infra/terraform.tfstate.backup'), 'deny'],
  ['Read secrets.json', buildRead('/repo/config/secrets.json'), 'deny'],
  ['Read client_secret.yaml', buildRead('/repo/config/client_secret.yaml'), 'deny'],
  ['Read app-secrets.yml', buildRead('/repo/config/app-secrets.yml'), 'deny'],
  ['Read secret.toml', buildRead('/repo/config/secret.toml'), 'deny'],
  ['Read db.secret.properties', buildRead('/repo/config/db.secret.properties'), 'deny'],
  ['Read secrets.ini', buildRead('/repo/config/secrets.ini'), 'deny'],
  ['Read SecretRotation.cs', buildRead('/repo/src/SecretRotation.cs'), 'allow'],
  ['Read secrets.md', buildRead('/repo/docs/secrets.md'), 'allow'],
  ['Read a UserSecrets file on Linux', buildRead('/home/u/.microsoft/usersecrets/abc/notes.txt'), 'deny'],
  ['Read a UserSecrets file on Windows', buildRead('/mnt/c/Users/u/AppData/Roaming/Microsoft/UserSecrets/abc/notes.txt'), 'deny'],
  ['Read .aws/credentials', buildRead('/home/u/.aws/credentials'), 'deny'],
  ['Read .aws/config', buildRead('/home/u/.aws/config'), 'allow'],
  ['Read .kube/config', buildRead('/home/u/.kube/config'), 'deny'],
  ['Read .docker/config.json', buildRead('/home/u/.docker/config.json'), 'deny'],
  ['Read a repo docker/config.json', buildRead('/repo/docker/config.json'), 'allow'],
  ['Read .vault-token', buildRead('/home/u/.vault-token'), 'deny'],
  ['Read .claude/.credentials.json', buildRead('/home/u/.claude/.credentials.json'), 'deny'],
  ['Bash cat .aws/credentials', buildBash('cat ~/.aws/credentials'), 'deny'],
  ['Bash terraform show tfstate', buildBash('terraform show terraform.tfstate'), 'deny'],
  ['Bash ls UserSecrets', buildBash('ls ~/.microsoft/usersecrets/'), 'deny'],
  ['dotnet user-secrets list', buildBash('dotnet user-secrets list'), 'deny'],
  ['dotnet user-secrets list with a project', buildBash('dotnet user-secrets --project src/Api list --json'), 'deny'],
  ['dotnet user-secrets set', buildBash('dotnet user-secrets set "Api:Url" "https://localhost"'), 'allow'],
  ['dotnet user-secrets init', buildBash('dotnet user-secrets init --project src/Api'), 'allow'],
  ['Bash .pg*', buildBash('cat ~/.pg*'), 'deny'],
  ['Bash *.jks', buildBash('cp *.jks /tmp'), 'deny'],
  ['Bash *.tfstate', buildBash('ls *.tfstate'), 'deny'],
  ['Bash *secret*.json', buildBash('cat config/*secret*.json'), 'deny'],
  ['Read .env.production', buildRead('/repo/.env.production'), 'deny'],
  ['C# DotNetEnv call', buildBash('grep -rn "DotNetEnv.Env.Load()" src'), 'allow'],
  ['C# environment variable read', buildBash('grep -rn "Environment.GetEnvironmentVariable" src'), 'allow'],
  ['Blazor host environment check', buildBash('grep -rn "builder.HostEnvironment.Environment" Client'), 'allow'],
  ['Grep glob over C# and Razor files', { tool: 'Grep', pattern: 'x', glob: '*.{cs,razor}' }, 'allow'],
  ['Python gym environment step', buildBash('grep -rn "self.env.step" src'), 'allow'],
  ['Python os.environ read', buildBash('uv run python -c "import os; print(os.environ.get(\'HOME\'))"'), 'allow'],
  ['Python dotenv import', buildBash('grep -rn "from dotenv import load_dotenv" src'), 'allow'],
  ['Java KeyStore import', buildBash('grep -rn "import java.security.KeyStore;" src'), 'allow'],
  ['Java getenv call', buildBash('grep -rn "System.getenv" src'), 'allow'],
  ['NeoForge environment check', buildBash('grep -rn "FMLEnvironment.dist.isClient()" src'), 'allow'],
  ['TypeScript import.meta.env', buildBash('grep -rn "import.meta.env" src'), 'allow'],
  ['TypeScript import.meta.env member', buildBash('grep -rn "import.meta.env.VITE_API_URL" src'), 'allow'],
  ['TypeScript process.env object', buildBash('node -e "console.log(process.env)"'), 'allow'],
  ['TypeScript Deno.env read', buildBash('grep -rn "Deno.env.get" src'), 'allow'],
  ['TypeScript Worker binding', buildBash('grep -rn "c.env.DB" src'), 'allow'],
  ['Read a config.env.ts module', buildRead('/repo/src/config.env.ts'), 'allow'],
  ['Read vite-env.d.ts', buildRead('/repo/src/vite-env.d.ts'), 'allow'],
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
    arrange(on, new Map([['/repo/notes.txt', buildLink('/repo/.env')]]))

    expect(await decide($, buildRead('/repo/notes.txt'))).toBe('deny')
  })

  test('denies a Read when its symlink target is missing', async ($, on) => {
    arrange(on, new Map([['/repo/notes.txt', buildLink()]]))

    expect(await decide($, buildRead('/repo/notes.txt'))).toBe('deny')
  })

  test('allows a Read when its symlink targets a normal file', async ($, on) => {
    arrange(on, new Map([['/repo/notes.txt', buildLink('/repo/README.md')]]))

    expect(await decide($, buildRead('/repo/notes.txt'))).toBe('allow')
  })

  test('denies the call when inspection throws', async ($, on) => {
    arrange(on, new Map([['/repo/notes.txt', null as never]]))

    expect(await decide($, buildRead('/repo/notes.txt'))).toBe('deny')
  })
})
