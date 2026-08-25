import { z } from 'zod'

/**
 * Hospital Admin password policy (US-001): at least 8 characters, with at least
 * one uppercase letter, one number and one special character.
 *
 * Defined once and used on BOTH sides — the set-password form and the API route
 * that actually applies the change — so a caller who skips the form cannot land
 * a weaker password than the form advertises.
 */
export const SPECIAL_CHARACTERS = '!@#$%^&*()_+-=[]{};:\'",.<>/?\\|`~'

export const hospitalPasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .refine((v) => /[A-Z]/.test(v), 'Password must contain at least one uppercase letter')
  .refine((v) => /[0-9]/.test(v), 'Password must contain at least one number')
  .refine(
    (v) => new RegExp(`[${SPECIAL_CHARACTERS.replace(/[\\\]^-]/g, '\\$&')}]`).test(v),
    'Password must contain at least one special character',
  )

/** Every unmet rule, for a checklist the user can read while typing. */
export function passwordRuleState(value: string): { label: string; met: boolean }[] {
  const specials = new RegExp(`[${SPECIAL_CHARACTERS.replace(/[\\\]^-]/g, '\\$&')}]`)
  return [
    { label: 'At least 8 characters', met: value.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(value) },
    { label: 'One number', met: /[0-9]/.test(value) },
    { label: 'One special character', met: specials.test(value) },
  ]
}
