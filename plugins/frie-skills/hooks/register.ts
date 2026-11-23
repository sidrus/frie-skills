import type { Register } from 'claude-code'
import { registerSpellingReminder } from './spelling'
import { registerStandardsGate } from './standards-gate'

export const register: Register = on => {
  registerSpellingReminder(on)
  registerStandardsGate(on)
}
