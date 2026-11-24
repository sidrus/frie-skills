import type { On } from 'claude-code'
import { registerEngineeringGate } from './engineering-gate'
import { registerSpellingReminder } from './spelling'

export function register(on: On) {
  registerEngineeringGate(on)
  registerSpellingReminder(on)
}
