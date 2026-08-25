export interface AdmissionHistoryRow {
  triggered_at: string
  patient_name: string | null
  blood_group: string | null
  known_conditions: string | null
  registration_type: string
  outcome: string
  status: string
  destination_label: string | null
  destination_kind: string | null
  eta_at_confirmation_minutes: number | null
}

/**
 * Neutralise values Excel would execute as a formula. Copied in spirit from
 * lib/export/driverApplicationColumns.ts, which already does this for the driver
 * export: a patient could legitimately be named something starting with '-',
 * and a CSV opened in Excel treats that as a formula.
 */
function escapeCell(value: string): string {
  const guarded = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return /[",\n\r]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded
}

export const HISTORY_HEADERS = [
  'Date & Time',
  'Patient Name',
  'Blood Group',
  'Known Conditions',
  'Registration Type',
  'Outcome',
  'Destination',
  'ETA at Confirmation (min)',
] as const

/**
 * The destination as the spec words it. Scenario C is reported verbatim as
 * 'Nearest Hospital (Off-Platform)'; a hospital that admitted the patient names
 * itself as the destination only when it was actually confirmed.
 */
export function destinationLabel(row: AdmissionHistoryRow): string {
  if (row.destination_kind === 'nearby') return 'Nearest Hospital (Off-Platform)'
  return row.destination_label ?? (row.outcome === 'PENDING' ? 'Pending' : '—')
}

export function historyRowToCells(row: AdmissionHistoryRow): string[] {
  return [
    new Date(row.triggered_at).toISOString(),
    row.patient_name ?? '',
    row.blood_group ?? '',
    row.known_conditions ?? '',
    row.registration_type,
    row.outcome,
    destinationLabel(row),
    // Blank for an off-platform destination: no ETA was ever quoted (US-009 AC3).
    row.destination_kind === 'nearby' || row.eta_at_confirmation_minutes == null
      ? ''
      : String(row.eta_at_confirmation_minutes),
  ]
}

export function toHistoryCsv(rows: AdmissionHistoryRow[]): string {
  const lines = [HISTORY_HEADERS.join(',')]
  for (const row of rows) lines.push(historyRowToCells(row).map(escapeCell).join(','))
  return lines.join('\r\n')
}
