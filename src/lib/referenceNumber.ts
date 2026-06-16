/**
 * Driver-application reference number helpers.
 *
 * The authoritative, concurrency-safe generator lives in Postgres
 * (`next_driver_application_ref()`), which returns the full string. These pure
 * helpers validate / format that shape and are unit-tested.
 */

export const REFERENCE_NUMBER_RE = /^QSO-DRV-\d{8}-\d{4}$/

export function isValidReferenceNumber(ref: string): boolean {
  return REFERENCE_NUMBER_RE.test(ref)
}

/** Mirror of the SQL format (QSO-DRV-YYYYMMDD-XXXX) for a given day + sequence. */
export function formatApplicationRef(day: Date, seq: number): string {
  const y = day.getUTCFullYear()
  const m = String(day.getUTCMonth() + 1).padStart(2, '0')
  const d = String(day.getUTCDate()).padStart(2, '0')
  return `QSO-DRV-${y}${m}${d}-${String(seq).padStart(4, '0')}`
}
