'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import axios from 'axios'
import { Loader2, CreditCard, Plus, X, TrendingUp, AlertCircle } from 'lucide-react'
import { StatusBadge } from '@/components/StatusBadge'
import { formatKES, formatDate, loanStatusVariant, calculateLoanRepayable } from '@/lib/utils'
import { cn } from '@/lib/utils'

const applySchema = z.object({
  type: z.enum(['EMERGENCY', 'DEVELOPMENT', 'EDUCATION', 'WELFARE', 'NORMAL']),
  principalAmount: z.coerce.number().positive('Enter a valid amount'),
  purpose: z.string().min(10, 'Describe the purpose (min 10 chars)').max(500),
  repaymentMonths: z.coerce.number().int().min(1).max(60).optional(),
})
type ApplyForm = z.infer<typeof applySchema>

export default function LoansPage() {
  const { data: session } = useSession()
  const [loans, setLoans] = useState<any[]>([])
  const [chama, setChama] = useState<any>(null)
  const [member, setMember] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showApply, setShowApply] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const load = async () => {
    const [loansRes, chamaRes, memberRes] = await Promise.all([
      axios.get('/api/loans'),
      axios.get('/api/chama/settings'),
      session?.user?.id ? axios.get(`/api/members/${session.user.id}`) : null,
    ])
    setLoans(loansRes.data.data)
    setChama(chamaRes.data.data)
    if (memberRes) setMember(memberRes.data.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [session])

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<ApplyForm>({
    resolver: zodResolver(applySchema),
    defaultValues: { type: 'NORMAL', repaymentMonths: chama?.loanRepaymentMonths ?? 12 },
  })

  const watchedAmount = watch('principalAmount')
  const watchedMonths = watch('repaymentMonths')
  const preview = chama && watchedAmount > 0
    ? calculateLoanRepayable(watchedAmount, chama.interestRate, watchedMonths ?? chama.loanRepaymentMonths)
    : null

  const onApply = async (data: ApplyForm) => {
    setSubmitError('')
    try {
      await axios.post('/api/loans', data)
      setSubmitSuccess(true)
      setShowApply(false)
      load()
    } catch (err: any) {
      setSubmitError(err.response?.data?.error ?? 'Failed to submit application')
    }
  }

  const activeLoan = loans.find(l => ['ACTIVE', 'DISBURSED'].includes(l.status))
  const maxEligible = member && chama ? member.totalContributed * chama.maxLoanMultiple : 0
  const hasActiveLoan = loans.some(l => ['ACTIVE', 'DISBURSED', 'APPROVED'].includes(l.status))

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-brand-600" /></div>

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Loans</h1>
          <p className="page-subtitle">Apply for and manage your chama loans</p>
        </div>
        {!hasActiveLoan && (
          <button onClick={() => setShowApply(true)} className="btn-primary gap-2">
            <Plus className="w-4 h-4" /> Apply for Loan
          </button>
        )}
      </div>

      {submitSuccess && (
        <div className="alert-success">
          <AlertCircle className="w-4 h-4" />
          Application submitted! The treasurer will review it shortly.
        </div>
      )}

      {/* Active loan progress */}
      {activeLoan && (
        <div className="card p-6 border-l-4 border-l-blue-500">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-gray-500">Active Loan</p>
              <p className="text-2xl font-bold text-gray-900">{formatKES(activeLoan.outstandingBalance)}</p>
              <p className="text-sm text-gray-500">remaining of {formatKES(activeLoan.totalRepayable)}</p>
            </div>
            <StatusBadge status={activeLoan.status} variant={loanStatusVariant(activeLoan.status)} />
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div
              className="bg-brand-600 h-2 rounded-full transition-all"
              style={{ width: `${Math.round((activeLoan.amountRepaid / activeLoan.totalRepayable) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500">
            {Math.round((activeLoan.amountRepaid / activeLoan.totalRepayable) * 100)}% repaid ·
            {activeLoan.expectedEndDate && ` Due: ${formatDate(activeLoan.expectedEndDate)}`}
          </p>
          <p className="text-sm text-gray-600 mt-2">Purpose: {activeLoan.purpose}</p>
        </div>
      )}

      {/* Loan eligibility */}
      {member && chama && (
        <div className="card p-5 flex items-center gap-4">
          <TrendingUp className="w-8 h-8 text-brand-600 flex-shrink-0" />
          <div>
            <p className="font-medium text-gray-900">Your Loan Eligibility</p>
            <p className="text-sm text-gray-500">
              Based on {formatKES(member.totalContributed)} contributed × {chama.maxLoanMultiple}x multiple
            </p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xl font-bold text-brand-600">{formatKES(maxEligible)}</p>
            <p className="text-xs text-gray-400">maximum loan</p>
          </div>
        </div>
      )}

      {/* Apply modal */}
      {showApply && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">Apply for a Loan</h2>
              <button onClick={() => setShowApply(false)} className="btn-ghost btn-sm p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit(onApply)} className="p-6 space-y-4">
              {submitError && <div className="alert-error"><span>{submitError}</span></div>}

              <div>
                <label className="label">Loan type</label>
                <select {...register('type')} className="input">
                  {['NORMAL', 'EMERGENCY', 'DEVELOPMENT', 'EDUCATION', 'WELFARE'].map(t => (
                    <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Amount (KES)</label>
                <input {...register('principalAmount')} type="number" placeholder="50000" className={cn('input', errors.principalAmount && 'input-error')} />
                {errors.principalAmount && <p className="field-error">{errors.principalAmount.message}</p>}
                {maxEligible > 0 && <p className="field-hint">Max eligible: {formatKES(maxEligible)}</p>}
              </div>

              <div>
                <label className="label">Repayment period (months)</label>
                <input {...register('repaymentMonths')} type="number" min={1} max={60} className="input" />
              </div>

              <div>
                <label className="label">Purpose</label>
                <textarea {...register('purpose')} rows={3} placeholder="Describe what the loan will be used for…" className={cn('input resize-none', errors.purpose && 'input-error')} />
                {errors.purpose && <p className="field-error">{errors.purpose.message}</p>}
              </div>

              {/* Preview */}
              {preview && chama && (
                <div className="bg-brand-50 border border-brand-200 rounded-lg p-4 text-sm space-y-1">
                  <p className="font-medium text-brand-800 mb-2">Loan preview</p>
                  <div className="flex justify-between"><span className="text-gray-600">Interest ({chama.interestRate}%/mo)</span><span className="font-medium">{formatKES(preview.totalInterest)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Total repayable</span><span className="font-semibold text-brand-700">{formatKES(preview.totalRepayable)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Monthly instalment</span><span className="font-medium">{formatKES(preview.monthlyInstalment)}</span></div>
                </div>
              )}

              <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
                {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" />Submitting…</> : 'Submit Application'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* All loans */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-base font-semibold">Loan History</h2>
        </div>
        {loans.length === 0 ? (
          <div className="p-12 text-center">
            <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No loan history yet</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Principal</th>
                  <th>Total Repayable</th>
                  <th>Outstanding</th>
                  <th>Applied</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loans.map((l: any) => (
                  <tr key={l.id}>
                    <td className="capitalize">{l.type.toLowerCase()}</td>
                    <td>{formatKES(l.principalAmount)}</td>
                    <td>{formatKES(l.totalRepayable)}</td>
                    <td className={l.outstandingBalance > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
                      {formatKES(l.outstandingBalance)}
                    </td>
                    <td>{formatDate(l.appliedAt)}</td>
                    <td><StatusBadge status={l.status} variant={loanStatusVariant(l.status)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
