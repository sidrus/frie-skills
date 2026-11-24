import type { On } from 'claude-code'
import { registerSpellingReminder } from './spelling'

export function register(on: On) {
  registerSpellingReminder(on)
}
