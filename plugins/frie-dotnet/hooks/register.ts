import type { Register } from 'claude-code'
import { registerStandardsGate } from './standards-gate'

export const register: Register = on => {
  registerStandardsGate(on)
}
