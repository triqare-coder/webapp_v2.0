/**
 * Map a Supabase unique-constraint violation on the `drivers` table to a
 * user-facing message.
 *
 * `aadhar_number` and `license_number` are UNIQUE. When a genuine duplicate is
 * inserted/updated Postgres raises a 23505 ("duplicate key") error whose raw
 * message ("duplicate key value violates unique constraint …") is meaningless
 * to an admin/transport user. Translate it; return null for anything that isn't
 * a duplicate so the caller falls back to its generic error.
 */
export function driverUniqueErrorMessage(
  error: { code?: string; message?: string } | null,
): string | null {
  if (!error) return null
  const msg = error.message ?? ''
  const isDuplicate = error.code === '23505' || msg.includes('duplicate key')
  if (!isDuplicate) return null
  if (msg.includes('aadhar_number')) return 'Aadhar number already exists'
  if (msg.includes('license_number')) return 'License number already exists'
  return null
}
