'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { Loader2, Shield, CheckCircle2, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import axios from 'axios'

const schema = z.object({
  // Chama details
  name: z.string().min(3, 'At least 3 characters'),
  description: z.string().optional(),
  county: z.string().min(1, 'Required'),
  town: z.string().optional(),
  monthlyContribution: z.coerce.number().positive('Must be positive'),
  registrationFee: z.coerce.number().min(0).default(0),
  interestRate: z.coerce.number().min(0).max(100).default(10),
  maxLoanMultiple: z.coerce.number().positive().default(3),
  loanRepaymentMonths: z.coerce.number().int().positive().default(12),
  mpesaPaybill: z.string().optional(),
  // Admin member
  adminFirstName: z.string().min(1, 'Required'),
  adminLastName: z.string().min(1, 'Required'),
  adminEmail: z.string().email('Valid email required'),
  adminPassword: z.string().min(6, 'Min 6 characters'),
  adminPhone: z.string().regex(/^(?:254|0)[17]\d{8}$/, 'Valid Kenyan phone required'),
})
type FormData = z.infer<typeof schema>

const KENYAN_COUNTIES = [
  'Nairobi','Mombasa','Kisumu','Nakuru','Eldoret','Thika','Nyeri','Meru',
  'Kakamega','Machakos','Kiambu','Uasin Gishu','Kilifi','Kwale','Lamu',
  'Taita Taveta','Kajiado','Murang\'a','Kirinyaga','Nyandarua','Laikipia',
  'Samburu','Trans Nzoia','West Pokot','Siaya','Kisii','Nyamira','Migori',
  'Homa Bay','Vihiga','Bungoma','Busia','Kericho','Bomet','Nandi','Baringo',
  'Elgeyo Marakwet','Turkana','Marsabit','Mandera','Wajir','Garissa','Tana River',
  'Isiolo','Meru','Tharaka Nithi','Embu','Kitui','Makueni','Narok','Kericho',
]

export default function OnboardPage() {
  const router = useRouter()
  const [done, setDone] = useState<{ chamaId: string; name: string } | null>(null)
  const [serverError, setServerError] = useState('')
  const [step, setStep] = useState(1)

  const { register, handleSubmit, trigger, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { interestRate: 10, maxLoanMultiple: 3, loanRepaymentMonths: 12, registrationFee: 0, monthlyContribution: 2000 },
  })

  const nextStep = async () => {
    const fields: any = step === 1
      ? ['name', 'county', 'monthlyContribution', 'registrationFee', 'interestRate', 'maxLoanMultiple', 'loanRepaymentMonths']
      : []
    const ok = await trigger(fields)
    if (ok) setStep(2)
  }

  const onSubmit = async (data: FormData) => {
    setServerError('')
    try {
      const res = await axios.post('/api/chama', data)
      setDone({ chamaId: res.data.data.chama.id, name: res.data.data.chama.name })
    } catch (err: any) {
      setServerError(err.response?.data?.error ?? 'Failed to create chama')
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-50 to-white flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <CheckCircle2 className="w-16 h-16 text-brand-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900">{done.name} is ready!</h2>
          <p className="text-gray-500 mt-2 mb-1">Share your Chama ID with members to join:</p>
          <code className="bg-gray-100 px-4 py-2 rounded-lg text-brand-700 font-mono text-lg block mb-6">
            {done.chamaId}
          </code>
          <button onClick={() => router.push('/login')} className="btn-primary btn-lg">
            Sign in to your dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-600 rounded-2xl mb-4 shadow-lg">
            <Users className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Start your Chama</h1>
          <p className="text-gray-500 mt-1">Set up your group in 2 minutes</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2].map(s => (
            <div key={s} className={cn('flex-1 h-2 rounded-full transition-colors', step >= s ? 'bg-brand-600' : 'bg-gray-200')} />
          ))}
        </div>

        <div className="card p-8">
          {serverError && <div className="alert-error mb-4 rounded-lg"><span>{serverError}</span></div>}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {step === 1 && (
              <>
                <h3 className="font-semibold text-gray-900 mb-2">Chama details</h3>
                <div>
                  <label className="label">Chama name *</label>
                  <input {...register('name')} placeholder="e.g. Pamoja Investment Group" className={cn('input', errors.name && 'input-error')} />
                  {errors.name && <p className="field-error">{errors.name.message}</p>}
                </div>
                <div>
                  <label className="label">Description</label>
                  <textarea {...register('description')} rows={2} placeholder="What is your chama's goal?" className="input resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">County *</label>
                    <select {...register('county')} className={cn('input', errors.county && 'input-error')}>
                      <option value="">Select county</option>
                      {KENYAN_COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    {errors.county && <p className="field-error">{errors.county.message}</p>}
                  </div>
                  <div>
                    <label className="label">Town</label>
                    <input {...register('town')} placeholder="e.g. Westlands" className="input" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Monthly contribution (KES) *</label>
                    <input {...register('monthlyContribution')} type="number" placeholder="2000" className={cn('input', errors.monthlyContribution && 'input-error')} />
                    {errors.monthlyContribution && <p className="field-error">{errors.monthlyContribution.message}</p>}
                  </div>
                  <div>
                    <label className="label">Registration fee (KES)</label>
                    <input {...register('registrationFee')} type="number" placeholder="500" className="input" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="label">Interest rate (%/mo)</label>
                    <input {...register('interestRate')} type="number" step="0.5" className="input" />
                  </div>
                  <div>
                    <label className="label">Loan multiple</label>
                    <input {...register('maxLoanMultiple')} type="number" step="0.5" className="input" />
                  </div>
                  <div>
                    <label className="label">Repayment (months)</label>
                    <input {...register('loanRepaymentMonths')} type="number" className="input" />
                  </div>
                </div>
                <div>
                  <label className="label">M-Pesa Paybill / Till <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input {...register('mpesaPaybill')} placeholder="e.g. 522533" className="input" />
                </div>
                <button type="button" onClick={nextStep} className="btn-primary w-full btn-lg mt-2">
                  Next: Your account →
                </button>
              </>
            )}

            {step === 2 && (
              <>
                <h3 className="font-semibold text-gray-900 mb-2">Your admin account (Chairperson)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">First name *</label>
                    <input {...register('adminFirstName')} placeholder="John" className={cn('input', errors.adminFirstName && 'input-error')} />
                    {errors.adminFirstName && <p className="field-error">{errors.adminFirstName.message}</p>}
                  </div>
                  <div>
                    <label className="label">Last name *</label>
                    <input {...register('adminLastName')} placeholder="Kamau" className={cn('input', errors.adminLastName && 'input-error')} />
                    {errors.adminLastName && <p className="field-error">{errors.adminLastName.message}</p>}
                  </div>
                </div>
                <div>
                  <label className="label">Email *</label>
                  <input {...register('adminEmail')} type="email" placeholder="you@example.com" className={cn('input', errors.adminEmail && 'input-error')} />
                  {errors.adminEmail && <p className="field-error">{errors.adminEmail.message}</p>}
                </div>
                <div>
                  <label className="label">M-Pesa phone *</label>
                  <input {...register('adminPhone')} type="tel" placeholder="0712 345 678" className={cn('input', errors.adminPhone && 'input-error')} />
                  {errors.adminPhone && <p className="field-error">{errors.adminPhone.message}</p>}
                </div>
                <div>
                  <label className="label">Password *</label>
                  <input {...register('adminPassword')} type="password" placeholder="Min. 6 characters" className={cn('input', errors.adminPassword && 'input-error')} />
                  {errors.adminPassword && <p className="field-error">{errors.adminPassword.message}</p>}
                </div>
                <div className="flex gap-3 mt-2">
                  <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1">
                    ← Back
                  </button>
                  <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 btn-lg">
                    {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</> : 'Create Chama 🎉'}
                  </button>
                </div>
              </>
            )}
          </form>

          <p className="mt-4 text-center text-sm text-gray-600">
            Already have a chama?{' '}
            <Link href="/register" className="text-brand-600 font-medium hover:underline">Join as a member</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
