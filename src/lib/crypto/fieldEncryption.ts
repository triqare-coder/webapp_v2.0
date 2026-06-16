import crypto from 'crypto'

/**
 * App-layer field encryption for sensitive PII (Aadhaar, license number).
 * AES-256-GCM with a fresh 12-byte IV per field. Key is `ENCRYPTION_KEY`
 * (32 bytes, base64) and lives only in the server process. SERVER-ONLY — never
 * import from client components. Plaintext must never be logged.
 */

const ALGORITHM = 'aes-256-gcm'

export interface EncryptedField {
  ciphertext: string // base64
  iv: string // base64
  tag: string // base64
}

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY
  if (!raw) {
    throw new Error('ENCRYPTION_KEY is not configured')
  }
  const key = Buffer.from(raw, 'base64')
  if (key.length !== 32) {
    throw new Error('ENCRYPTION_KEY must decode to exactly 32 bytes (base64-encoded)')
  }
  return key
}

export function encryptField(plaintext: string): EncryptedField {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return {
    ciphertext: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
  }
}

export function decryptField(enc: EncryptedField): string {
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(enc.iv, 'base64'))
  decipher.setAuthTag(Buffer.from(enc.tag, 'base64'))
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(enc.ciphertext, 'base64')),
    decipher.final(),
  ])
  return decrypted.toString('utf8')
}

/** Last 4 characters, for masked display (e.g. ••••1234). */
export function last4(value: string): string {
  return value.slice(-4)
}
