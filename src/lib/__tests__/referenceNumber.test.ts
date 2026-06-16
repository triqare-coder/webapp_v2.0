import { describe, it, expect } from 'vitest'
import {
  formatApplicationRef,
  isValidReferenceNumber,
} from '@/lib/referenceNumber'

describe('formatApplicationRef', () => {
  it('formats QSO-DRV-YYYYMMDD-XXXX with zero-padding', () => {
    const day = new Date(Date.UTC(2026, 5, 9)) // 2026-06-09
    expect(formatApplicationRef(day, 1)).toBe('QSO-DRV-20260609-0001')
    expect(formatApplicationRef(day, 42)).toBe('QSO-DRV-20260609-0042')
    expect(formatApplicationRef(day, 9999)).toBe('QSO-DRV-20260609-9999')
  })
})

describe('isValidReferenceNumber', () => {
  it('accepts well-formed references', () => {
    expect(isValidReferenceNumber('QSO-DRV-20260610-0001')).toBe(true)
  })
  it('rejects malformed references', () => {
    expect(isValidReferenceNumber('QSO-DRV-2026-1')).toBe(false)
    expect(isValidReferenceNumber('DRV-20260610-0001')).toBe(false)
    expect(isValidReferenceNumber('')).toBe(false)
  })
})
