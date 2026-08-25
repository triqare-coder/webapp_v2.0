import { describe, it, expect } from 'vitest'
import {
  destinationLabel,
  historyRowToCells,
  toHistoryCsv,
  type AdmissionHistoryRow,
} from '../historyColumns'
import { formatEta } from '../eta'

const base: AdmissionHistoryRow = {
  triggered_at: '2026-08-25T10:00:00.000Z',
  patient_name: 'Anil Kumar',
  blood_group: 'O+',
  known_conditions: 'Diabetes',
  registration_type: 'PRIMARY',
  outcome: 'ADMITTED',
  status: 'CONFIRMED_INCOMING',
  destination_label: 'Pushpagiri Medical Centre',
  destination_kind: 'primary',
  eta_at_confirmation_minutes: 12,
}

describe('admission history destination (US-009)', () => {
  it('names the hospital for a QSoS destination', () => {
    expect(destinationLabel(base)).toBe('Pushpagiri Medical Centre')
  })

  it('reports Scenario C with the exact wording the spec requires', () => {
    expect(destinationLabel({ ...base, destination_kind: 'nearby', destination_label: 'Some Clinic' }))
      .toBe('Nearest Hospital (Off-Platform)')
  })

  it('does not invent a destination for an incident still in progress', () => {
    expect(destinationLabel({ ...base, outcome: 'PENDING', destination_label: null, destination_kind: null }))
      .toBe('Pending')
  })
})

describe('CSV export (US-009 AC3/AC5)', () => {
  it('leaves the ETA blank for an off-platform destination', () => {
    const cells = historyRowToCells({ ...base, destination_kind: 'nearby', eta_at_confirmation_minutes: 9 })
    expect(cells[7]).toBe('')
  })

  it('keeps the ETA for a confirmed QSoS destination', () => {
    expect(historyRowToCells(base)[7]).toBe('12')
  })

  it('retains name, blood group and conditions for a departed patient', () => {
    // The snapshot is the whole point: this row outlives the patient's account.
    const cells = historyRowToCells(base)
    expect(cells[1]).toBe('Anil Kumar')
    expect(cells[2]).toBe('O+')
    expect(cells[3]).toBe('Diabetes')
  })

  it('quotes a value containing a comma rather than splitting the row', () => {
    const csv = toHistoryCsv([{ ...base, known_conditions: 'Diabetes, Asthma' }])
    expect(csv).toContain('"Diabetes, Asthma"')
    expect(csv.split('\r\n')).toHaveLength(2)
  })

  it('escapes an embedded double quote', () => {
    expect(toHistoryCsv([{ ...base, patient_name: 'A "Nick" B' }])).toContain('"A ""Nick"" B"')
  })

  it('neutralises a value Excel would run as a formula', () => {
    // A patient legitimately named starting with '-' must not become a formula.
    const csv = toHistoryCsv([{ ...base, patient_name: '=cmd|calc' }])
    // Prefixed with an apostrophe so Excel treats it as text. No surrounding
    // quotes, because the value contains no comma, quote or newline.
    expect(csv).toContain("'=cmd|calc")
    expect(csv).not.toMatch(/,=cmd/)
    // historyRowToCells returns raw values; escaping is toHistoryCsv's job.
    expect(toHistoryCsv([{ ...base, patient_name: '-1+1' }])).toContain("'-1+1")
    expect(historyRowToCells({ ...base, patient_name: '-1+1' })[1]).toBe('-1+1')
  })

  it('emits a header row even with no records', () => {
    expect(toHistoryCsv([]).split('\r\n')).toEqual(['Date & Time,Patient Name,Blood Group,Known Conditions,Registration Type,Outcome,Destination,ETA at Confirmation (min)'])
  })
})

describe('ETA caption (US-008)', () => {
  it('reads naturally at the boundaries', () => {
    expect(formatEta(12)).toBe('Arriving in 12 minutes')
    expect(formatEta(1)).toBe('Arriving in 1 minute')
    // Never "arriving in 0 minutes", which reads as "already here".
    expect(formatEta(0)).toBe('Arriving in 1 minute')
  })

  it('says so plainly when there is no route', () => {
    expect(formatEta(null)).toBe('ETA unavailable')
    expect(formatEta(undefined)).toBe('ETA unavailable')
  })
})
