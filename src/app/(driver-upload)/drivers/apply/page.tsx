'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Info, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { DocumentUploadField } from '@/components/driver-application/DocumentUploadField'
import { useDocumentUpload } from '@/hooks/useDocumentUpload'
import { DOCUMENT_TYPES } from '@/lib/storage/driverDocuments'
import {
  driverApplicationSchema,
  VEHICLE_TYPES,
  VEHICLE_TYPE_LABELS,
  LICENSE_TYPES,
  VALIDATION_MESSAGES,
} from '@/lib/validation/driverApplication'

interface FormState {
  full_name: string
  phone: string
  email: string
  date_of_birth: string
  address: string
  aadhaar_number: string
  emergency_contact_name: string
  emergency_contact_phone: string
  vehicle_registration: string
  vehicle_type: string
  vehicle_make_model: string
  vehicle_year: string
  ambulance_permit_number: string
  license_number: string
  license_expiry: string
  license_type: string
  driving_experience_years: string
  previous_ambulance_experience: boolean | null
}

const EMPTY: FormState = {
  full_name: '', phone: '', email: '', date_of_birth: '', address: '',
  aadhaar_number: '', emergency_contact_name: '', emergency_contact_phone: '',
  vehicle_registration: '', vehicle_type: '', vehicle_make_model: '', vehicle_year: '',
  ambulance_permit_number: '', license_number: '', license_expiry: '', license_type: '',
  driving_experience_years: '', previous_ambulance_experience: null,
}

// Display order for "scroll to first error".
const FIELD_ORDER: (keyof FormState)[] = [
  'full_name', 'phone', 'email', 'date_of_birth', 'address', 'aadhaar_number',
  'emergency_contact_name', 'emergency_contact_phone', 'vehicle_registration',
  'vehicle_type', 'vehicle_make_model', 'vehicle_year', 'ambulance_permit_number',
  'license_number', 'license_expiry', 'license_type', 'driving_experience_years',
]

type Errors = Partial<Record<keyof FormState, string>>
type Phase = 'form' | 'success' | 'error'

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

export default function DriverApplyPage() {
  const [draftId] = useState(() => crypto.randomUUID())
  const [form, setForm] = useState<FormState>(EMPTY)
  const [errors, setErrors] = useState<Errors>({})
  const [topError, setTopError] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('form')
  const [submitting, setSubmitting] = useState(false)
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [referenceNumber, setReferenceNumber] = useState<string>('')

  const uploads = useDocumentUpload(draftId)

  const set = (field: keyof FormState, value: string | boolean) => {
    setForm((p) => ({ ...p, [field]: value }))
    if (errors[field]) setErrors((p) => ({ ...p, [field]: '' }))
  }

  const toZodInput = () => ({
    ...form,
    previous_ambulance_experience: form.previous_ambulance_experience ?? undefined,
  })

  const computeErrors = (): Errors => {
    const result = driverApplicationSchema.safeParse(toZodInput())
    if (result.success) return {}
    const errs: Errors = {}
    for (const issue of result.error.issues) {
      const key = issue.path[0] as keyof FormState
      if (key && !errs[key]) errs[key] = issue.message
    }
    return errs
  }

  const handleBlur = (field: keyof FormState) => {
    const all = computeErrors()
    setErrors((p) => ({ ...p, [field]: all[field] ?? '' }))
  }

  const doSubmit = async () => {
    setSubmitting(true)
    setTopError(null)
    try {
      const res = await fetch('/api/drivers/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...toZodInput(),
          draftId,
          documents: uploads.getDraftPaths(),
        }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        reference_number?: string
        error?: string
      }
      if (!res.ok || !data.reference_number) {
        throw new Error(data.error || 'Submission failed')
      }
      setReferenceNumber(data.reference_number)
      setPhase('success')
      window.scrollTo({ top: 0 })
    } catch {
      setPhase('error')
      window.scrollTo({ top: 0 })
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitAttempted(true)

    const errs = computeErrors()
    if (Object.keys(errs).length) {
      setErrors(errs)
      setTopError(VALIDATION_MESSAGES.missingMandatory)
      const first = FIELD_ORDER.find((k) => errs[k])
      if (first) scrollToId(`field-${first}`)
      return
    }
    if (uploads.isUploading) {
      setTopError('Please wait for all uploads to finish.')
      return
    }
    if (uploads.missingRequired.length) {
      setTopError('Please upload all required documents')
      scrollToId(`doc-${uploads.missingRequired[0]}`)
      return
    }
    void doSubmit()
  }

  // ---- success / failure screens -------------------------------------------
  if (phase === 'success') {
    return (
      <div className="mx-auto max-w-md space-y-5 py-8 text-center">
        <CheckCircle2 className="mx-auto h-16 w-16 text-green-600" />
        <h1 className="text-2xl font-bold text-[#1a1a1a]">Application Submitted Successfully!</h1>
        <p className="text-sm text-[#555555]">
          Our team is reviewing your documents and will get back to you within{' '}
          <strong>48 hours</strong>.
        </p>
        <div className="rounded-md border border-[#e6e6e6] bg-[#f5f5f5] px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-[#999999]">Your reference number</p>
          <p className="mt-1 text-lg font-bold text-[#003366]">{referenceNumber}</p>
        </div>
        <Button asChild className="bg-[#cc3333] text-white hover:bg-[#b32d2d]">
          <a href="https://triqare.in">Return to Homepage</a>
        </Button>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className="mx-auto max-w-md space-y-5 py-8 text-center">
        <XCircle className="mx-auto h-16 w-16 text-[#cc3333]" />
        <h1 className="text-2xl font-bold text-[#1a1a1a]">Submission Failed</h1>
        <p className="text-sm text-[#555555]">
          Something went wrong while submitting your application. Your details and uploaded
          documents are safe — please try again.
        </p>
        <p className="text-sm text-[#666666]">
          If the problem persists, contact{' '}
          <a className="font-medium text-[#cc3333] hover:underline" href="mailto:support@triqare.in">
            support@triqare.in
          </a>
          .
        </p>
        {/* Returns to the form with all fields + uploaded documents still in
            React state (re-populated, no re-entry); the user reviews and resubmits. */}
        <Button
          onClick={() => { setTopError(null); setPhase('form'); window.scrollTo({ top: 0 }) }}
          className="bg-[#cc3333] text-white hover:bg-[#b32d2d]"
        >
          Try Again
        </Button>
      </div>
    )
  }

  // ---- field helper (function, not a nested component, to keep focus) ------
  const textField = (
    field: keyof FormState,
    label: string,
    opts: { type?: string; placeholder?: string; required?: boolean; className?: string; inputMode?: 'numeric' } = {},
  ) => {
    const { type = 'text', placeholder, required, className, inputMode } = opts
    const value = form[field]
    return (
      <div id={`field-${field}`} className={`space-y-1.5 ${className ?? ''}`}>
        <Label htmlFor={field} className="text-sm font-medium text-[#333333]">
          {label}
          {required && <span className="ml-0.5 text-[#cc3333]">*</span>}
        </Label>
        <Input
          id={field}
          type={type}
          inputMode={inputMode}
          value={typeof value === 'string' ? value : ''}
          placeholder={placeholder}
          onChange={(e) => set(field, e.target.value)}
          onBlur={() => handleBlur(field)}
          aria-invalid={!!errors[field]}
          className={errors[field] ? 'border-[#cc3333] focus-visible:ring-[#cc3333]/40' : ''}
        />
        {errors[field] && <p className="text-xs text-[#cc3333]">{errors[field]}</p>}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <div>
        <h1 className="text-xl font-bold text-[#1a1a1a]">Driver Application</h1>
        <p className="mt-1 text-sm text-[#666666]">
          Complete all sections and upload the required documents.
        </p>
      </div>

      {/* Mandatory note */}
      <div className="flex items-start gap-2 rounded-md border border-[#ccd9e6] bg-[#ccd9e6]/30 px-3 py-2.5 text-sm text-[#003366]">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>Fields marked with <span className="font-semibold text-[#cc3333]">*</span> are mandatory.</p>
      </div>

      {topError && (
        <div className="rounded-md border border-[#cc3333] bg-[#f5cccc]/30 px-3 py-2.5 text-sm font-medium text-[#cc3333]">
          {topError}
        </div>
      )}

      {/* 1 · Personal */}
      <Card className="border-[#e6e6e6]">
        <CardHeader className="pb-3"><CardTitle className="text-base text-[#003366]">Personal Information</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {textField('full_name', 'Full Name', { required: true, placeholder: 'As per official documents', className: 'sm:col-span-2' })}
          {textField('phone', 'Phone', { required: true, type: 'tel', inputMode: 'numeric', placeholder: '10-digit mobile number' })}
          {textField('email', 'Email', { required: true, type: 'email', placeholder: 'name@example.com' })}
          {textField('date_of_birth', 'Date of Birth', { required: true, type: 'date' })}
          {textField('aadhaar_number', 'Aadhaar Number', { required: true, inputMode: 'numeric', placeholder: '12-digit Aadhaar' })}
          <div id="field-address" className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="address" className="text-sm font-medium text-[#333333]">Residential Address<span className="ml-0.5 text-[#cc3333]">*</span></Label>
            <Textarea
              id="address"
              value={form.address}
              placeholder="House no., street, area, city, state, pincode"
              onChange={(e) => set('address', e.target.value)}
              onBlur={() => handleBlur('address')}
              aria-invalid={!!errors.address}
              className={errors.address ? 'border-[#cc3333] focus-visible:ring-[#cc3333]/40' : ''}
              rows={2}
            />
            {errors.address && <p className="text-xs text-[#cc3333]">{errors.address}</p>}
          </div>
          {textField('emergency_contact_name', 'Emergency Contact Name', { required: true, placeholder: 'Full name' })}
          {textField('emergency_contact_phone', 'Emergency Contact Phone', { required: true, type: 'tel', inputMode: 'numeric', placeholder: '10-digit mobile number' })}
        </CardContent>
      </Card>

      {/* 2 · Vehicle */}
      <Card className="border-[#e6e6e6]">
        <CardHeader className="pb-3"><CardTitle className="text-base text-[#003366]">Vehicle Information</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {textField('vehicle_registration', 'Vehicle Registration Number', { required: true, placeholder: 'e.g. KA01AB1234' })}
          <div id="field-vehicle_type" className="space-y-1.5">
            <Label htmlFor="vehicle_type" className="text-sm font-medium text-[#333333]">Vehicle Type<span className="ml-0.5 text-[#cc3333]">*</span></Label>
            <Select value={form.vehicle_type} onValueChange={(v) => set('vehicle_type', v)}>
              <SelectTrigger id="vehicle_type" className={errors.vehicle_type ? 'border-[#cc3333]' : ''}><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                {VEHICLE_TYPES.map((t) => <SelectItem key={t} value={t}>{VEHICLE_TYPE_LABELS[t]}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.vehicle_type && <p className="text-xs text-[#cc3333]">{errors.vehicle_type}</p>}
          </div>
          {textField('vehicle_make_model', 'Make and Model', { placeholder: 'Optional — e.g. Force Traveller' })}
          {textField('vehicle_year', 'Year of Manufacture', { type: 'number', placeholder: 'Optional — e.g. 2022' })}
          {textField('ambulance_permit_number', 'Ambulance Permit Number', { required: true, placeholder: 'Permit number' })}
        </CardContent>
      </Card>

      {/* 3 · License */}
      <Card className="border-[#e6e6e6]">
        <CardHeader className="pb-3"><CardTitle className="text-base text-[#003366]">License Information</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {textField('license_number', 'Driving License Number', { required: true, placeholder: 'License number' })}
          {textField('license_expiry', 'License Expiry Date', { required: true, type: 'date' })}
          <div id="field-license_type" className="space-y-1.5">
            <Label htmlFor="license_type" className="text-sm font-medium text-[#333333]">License Type<span className="ml-0.5 text-[#cc3333]">*</span></Label>
            <Select value={form.license_type} onValueChange={(v) => set('license_type', v)}>
              <SelectTrigger id="license_type" className={errors.license_type ? 'border-[#cc3333]' : ''}><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                {LICENSE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.license_type && <p className="text-xs text-[#cc3333]">{errors.license_type}</p>}
          </div>
        </CardContent>
      </Card>

      {/* 4 · Additional */}
      <Card className="border-[#e6e6e6]">
        <CardHeader className="pb-3"><CardTitle className="text-base text-[#003366]">Additional Information</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {textField('driving_experience_years', 'Years of Driving Experience', { type: 'number', placeholder: 'Optional' })}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-[#333333]">Previous Ambulance Experience</Label>
            <div className="flex gap-2">
              {([['Yes', true], ['No', false]] as const).map(([label, val]) => (
                <Button
                  key={label}
                  type="button"
                  variant={form.previous_ambulance_experience === val ? 'default' : 'outline'}
                  onClick={() => set('previous_ambulance_experience', val)}
                  className={form.previous_ambulance_experience === val ? 'bg-[#003366] text-white hover:bg-[#002952]' : ''}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 5 · Documents */}
      <Card className="border-[#e6e6e6]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-[#003366]">Document Upload</CardTitle>
          <p className="text-xs text-[#666666]">All documents are mandatory. Max 10 MB per file.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {DOCUMENT_TYPES.map((def) => (
            <div key={def.key} id={`doc-${def.key}`}>
              <DocumentUploadField
                def={def}
                files={uploads.docs[def.key] ?? []}
                onAdd={(files) => uploads.addFiles(def.key, files)}
                onRemove={(id) => uploads.removeFile(def.key, id)}
                onRetry={(id) => uploads.retryFile(def.key, id)}
                invalid={submitAttempted && uploads.missingRequired.includes(def.key)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        {uploads.isUploading && (
          <span className="text-sm text-[#666666]">Uploading documents…</span>
        )}
        <Button
          type="submit"
          disabled={submitting || uploads.isUploading}
          className="w-full bg-[#cc3333] text-white hover:bg-[#b32d2d] sm:w-auto"
        >
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Submit Application
        </Button>
      </div>
    </form>
  )
}
