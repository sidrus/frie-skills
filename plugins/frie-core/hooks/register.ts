import type { Register } from 'claude-code'
import { registerSpellingReminder } from './spelling'

export const register: Register = on => {
  registerSpellingReminder(on)
}
