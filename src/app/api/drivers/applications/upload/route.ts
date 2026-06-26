import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'
import {
  DRIVER_DOCS_BUCKET,
  MAX_FILE_BYTES,
  FILE_TOO_LARGE_MESSAGE,
  draftObjectPath,
  fileExtension,
  isValidDocumentType,
} from '@/lib/storage/driverDocuments'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Allowlist of file extensions a KYC document may use. Deliberately excludes
 * active/markup types (svg, html, htm, xml, js, etc.) that a private bucket
 * could later serve back and execute as stored XSS, plus anything unexpected
 * for scanned documents/photos.
 */
const ALLOWED_DOC_EXTENSIONS = new Set([
  'pdf',
  'jpg',
  'jpeg',
  'png',
  'webp',
  'heic',
  'heif',
])

// POST /api/drivers/applications/upload  (PUBLIC)
// Mints a Supabase signed upload URL for one KYC document into the draft prefix.
// The client then PUTs the file directly to that URL (XHR, with progress).
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request.headers)
    const allowed = await checkRateLimit(ip, 'upload', 50, '1 hour')
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many upload attempts. Please try again later.' },
        { status: 429 },
      )
    }

    const body = await request.json()
    const { draftId, documentType, fileName, size } = body as {
      draftId?: string
      documentType?: string
      fileName?: string
      size?: number
    }

    if (!draftId || !UUID_RE.test(draftId)) {
      return NextResponse.json({ error: 'Invalid draft id' }, { status: 400 })
    }
    if (!documentType || !isValidDocumentType(documentType)) {
      return NextResponse.json({ error: 'Invalid document type' }, { status: 400 })
    }
    if (!fileName || typeof fileName !== 'string') {
      return NextResponse.json({ error: 'Missing file name' }, { status: 400 })
    }
    // Reject markup/active and otherwise-unexpected file types up front, so a
    // signed upload URL is never issued for an svg/html payload (stored XSS).
    if (!ALLOWED_DOC_EXTENSIONS.has(fileExtension(fileName))) {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload a PDF or image (JPG, PNG, WEBP, HEIC).' },
        { status: 415 },
      )
    }
    if (typeof size !== 'number' || size <= 0) {
      return NextResponse.json({ error: 'Missing or invalid file size' }, { status: 400 })
    }
    // Server-side 10 MB cap (authoritative refusal to issue an upload URL).
    if (size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: FILE_TOO_LARGE_MESSAGE }, { status: 413 })
    }

    const path = draftObjectPath(draftId, documentType, fileName)
    const supabase = createServerClient()
    const { data, error } = await supabase.storage
      .from(DRIVER_DOCS_BUCKET)
      .createSignedUploadUrl(path)

    if (error || !data) {
      console.error('[upload] createSignedUploadUrl failed:', error?.message)
      return NextResponse.json(
        { error: 'Could not prepare the upload. Please try again.' },
        { status: 500 },
      )
    }

    return NextResponse.json({
      path: data.path,
      token: data.token,
      signedUrl: data.signedUrl,
    })
  } catch (err) {
    console.error('[upload] unexpected error:', err instanceof Error ? err.message : 'unknown')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
