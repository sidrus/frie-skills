import type { Hook, On } from 'claude-code'
import { DENY_REASON, isSecretPath, listFilePaths, reachesSecret } from './policy'

type Engine = Parameters<Hook<'tool.call'>>[0]

const FAILURE_REASON = 'Blocked: secret-files-guard could not inspect this call.'

async function landsOnSecret($: Engine, path: string): Promise<boolean> {
  const stat = await $.fs.stat(path, { resolve: true }).catch(() => undefined)
  if (stat === undefined) {
    return false
  }
  return stat.realPath === undefined || isSecretPath(stat.realPath)
}

export function register(on: On) {
  on('tool.call', async ($, e, next) => {
    if (reachesSecret(e)) {
      return { deny: DENY_REASON }
    }
    for (const path of listFilePaths(e)) {
      if (await landsOnSecret($, path)) {
        return { deny: DENY_REASON }
      }
    }
    return next(e)
  }).catch(($, e, next) => (next.called ? next(e) : { deny: FAILURE_REASON }))
}
