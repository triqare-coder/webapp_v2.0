/**
 * PostgREST returns a to-ONE embed (`users -> drivers`, keyed by drivers.user_id)
 * as a single object and a to-MANY embed as an array, and which one you get
 * depends on what the schema cache believes about the relationship. Code that
 * assumes an array reads `undefined` when it is handed an object — silently, with
 * every derived field falling back to its default rather than erroring. That is
 * exactly how the ER Driver Status page came to render the whole fleet as
 * offline, unlicensed and company-less. Normalise both shapes to "the row, or
 * null".
 */
export function firstEmbedded<T>(embed: T | T[] | null | undefined): T | null {
  if (embed == null) return null
  return (Array.isArray(embed) ? embed[0] ?? null : embed) as T | null
}
