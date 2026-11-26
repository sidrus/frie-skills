import type { On } from 'claude-code'
import { registerStandardsGate } from './standards-gate'

export function register(on: On) {
  registerStandardsGate(on)
}
