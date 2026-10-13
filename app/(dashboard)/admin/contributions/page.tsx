'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import axios from 'axios'
import {
  Wallet, Plus, Loader2, X, CheckCircle2, Users, Search,
} from 'lucide-react'
import { StatusBadge } from '@/components/StatusBadge'
import { formatKES, formatDate, getMonthName, contributionStatusVariant, cn } from '@/lib/utils'

const bulkSchema = z.object({
  periodMonth: z.coerce.number().int().min(1).max(12),
  periodYear: z.coerce.number().int().min(2020).max(2030),
  dueDate: z.string().min(1),
  expectedAmount: z.coerce.number().positive().optional(),
  type: z.enum(['MONTHLY', 'SPECIAL_LEVY', 'WELFARE']).default('MONTHLY'),
  description: z.string().optional(),
})
type BulkForm = z.infer<typeof bulkSchema>

const recordSchema = z.object({
  paidAmount: z.coerce.number().positive('Enter amount'),
  mpesaRef: z.string().optional(),
  paidAt: z.string().optional(),
})
type RecordForm = z.infer<typeof recordSchema>

export default function AdminContributionsPage() {
  const [contributions, setContributions] = useState<any[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showBulk, setShowBulk] = useState(false)
  const [recordModal, setRecordModal] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1)
  const [filterYear, setFilterYear] = useState(new Date().getFullYear())
  const [bulkSuccess, setBulkSuccess] = useState(false)

  const { register: bulkReg, handleSubmit: bulkSubmit, reset: bulkReset, formState: { isSubmitting: bulkSubmitting } } = useForm<BulkForm>({
    resolver: zodResolver(bulkSchema),
    defaultValues: {
      periodMonth: new Date().getMonth() + 1,
      periodYear: new Date().getFullYear(),
      type: 'MONTHLY',
    },
  })

  const { register: recReg, handleSubmit: recSubmit, reset: recReset, formState: { errors: recErrors, isSubmitting: recSubmitting } } = useForm<RecordForm>({
    resolver: zodResolver(recordSchema),
  })

  const load = () => {
    const params = new URLSearchParams()
    if (filterStatus !== 'all') params.set('status', filterStatus.toUpperCase())
    params.set('month', filterMonth.toString())
    params.set('year', filterYear.toString())

    axios.get(`/api/contributions?${params}`).then(r => {
      setContributions(r.data.data)
      setSummary(r.data.summary)
      setLoading(false)
    })
  }

  useEffect(() => { load() }, [filterStatus, filterMonth, filterYear])

  const onBulkGenerate = async (data: BulkForm) => {
    await axios.post('/api/contributions', {
      ...data,
      bulk: true,
      dueDate: new Date(data.dueDate).toISOString(),
    })
    bulkReset()
    setShowBulk(false)
    setBulkSuccess(true)
    setTimeout(() => setBulkSuccess(false), 4000)
    load()
  }

  const onRecord = async (data: RecordForm) => {
    await axios.post(`/api/contributions/${recordModal.id}/record`, {
      ...data,
      paidAt: data.paidAt ? new Date(data.paidAt).toISOString() : undefined,
    })
    recReset()
    setRecordModal(null)
    load()
  }

  const filtered = contributions.filter(c => {
    if (!search) return true
    const name = `${c.member?.firstName} ${c.member?.lastName} ${c.member?.phone}`.toLowerCase()
    return name.includes(search.toLowerCase())
  })

  const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)
  const YEARS = [2023, 2024, 2025, 2026]

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Contribution Management</h1>
          <p className="page-subtitle">Track and record member contributions</p>
        </div>
        <button onClick={() => setShowBulk(true)} className="btn-primary gap-2">
          <Users className="w-4 h-4" /> Generate Monthly Bills
        </button>
      </div>

      {bulkSuccess && (
        <div className="alert-success">
          <CheckCircle2 className="w-4 h-4" />
          Contribution bills generated for all active members successfully.
        </div>
      )}

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="card p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Collected</p>
            <p className="text-lg font-bold text-green-600">{formatKES(summary.totalPaid)}</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Pending</p>
            <p className="text-lg font-bold text-yellow-600">{formatKES(summary.totalPending)}</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Overdue</p>
            <p className="text-lg font-bold text-red-600">{formatKES(summary.totalLate)}</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Expected</p>
            <p className="text-lg font-bold text-gray-800">{formatKES(summary.totalExpected)}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search member…" className="input pl-9 w-48" />
        </div>

        <select value={filterMonth} onChange={e => setFilterMonth(Number(e.target.value))} className="input w-36">
          {MONTHS.map(m => <option key={m} value={m}>{getMonthName(m)}</option>)}
        </select>

        <select value={filterYear} onChange={e => setFilterYear(Number(e.target.value))} className="input w-28">
          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>

        {['all', 'pending', 'paid', 'late', 'partial'].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
              filterStatus === s ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-600 border-gray-200 hover:border-brand-400'
            )}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-brand-600" /></div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Period</th>
                <th>Expected</th>
                <th>Paid</th>
                <th>M-Pesa Ref</th>
                <th>Due Date</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-gray-400">
                    No contributions found
                  </td>
                </tr>
              ) : (
                filtered.map((c: any) => (
                  <tr key={c.id}>
                    <td>
                      <div>
                        <p className="font-medium">{c.member?.firstName} {c.member?.lastName}</p>
                        <p className="text-xs text-gray-400">{c.member?.phone}</p>
                      </div>
                    </td>
                    <td>{getMonthName(c.periodMonth)} {c.periodYear}</td>
                    <td>{formatKES(c.expectedAmount)}</td>
                    <td className={c.paidAmount > 0 ? 'text-green-700 font-medium' : 'text-gray-400'}>
                      {formatKES(c.paidAmount)}
                    </td>
                    <td className="text-xs font-mono text-gray-500">{c.mpesaRef ?? '—'}</td>
                    <td className="text-gray-500">{formatDate(c.dueDate)}</td>
                    <td><StatusBadge status={c.status} variant={contributionStatusVariant(c.status)} /></td>
                    <td>
                      {c.status !== 'PAID' && c.status !== 'WAIVED' && (
                        <button
                          onClick={() => { setRecordModal(c); recReset() }}
                          className="btn-secondary btn-sm"
                        >
                          Record
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Bulk generate modal */}
      {showBulk && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">Generate Monthly Bills</h2>
              <button onClick={() => setShowBulk(false)} className="btn-ghost btn-sm p-1"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-gray-500 mb-5">
              This creates a contribution record for every active member. Existing records for the same period are skipped.
            </p>
            <form onSubmit={bulkSubmit(onBulkGenerate)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Month</label>
                  <select {...bulkReg('periodMonth')} className="input">
                    {MONTHS.map(m => <option key={m} value={m}>{getMonthName(m)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Year</label>
                  <select {...bulkReg('periodYear')} className="input">
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Type</label>
                <select {...bulkReg('type')} className="input">
                  {['MONTHLY', 'SPECIAL_LEVY', 'WELFARE'].map(t => (
                    <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Custom amount (KES) <span className="text-gray-400 font-normal">leave blank to use chama default</span></label>
                <input {...bulkReg('expectedAmount')} type="number" placeholder="2000" className="input" />
              </div>
              <div>
                <label className="label">Due date *</label>
                <input {...bulkReg('dueDate')} type="date" className="input" />
              </div>
              <div>
                <label className="label">Description <span className="text-gray-400 font-normal">(optional)</span></label>
                <input {...bulkReg('description')} placeholder="e.g. March 2024 Monthly Contribution" className="input" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowBulk(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={bulkSubmitting} className="btn-primary flex-1">
                  {bulkSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Users className="w-4 h-4" /> Generate Bills</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record payment modal */}
      {recordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Record Payment</h3>
              <button onClick={() => setRecordModal(null)} className="btn-ghost btn-sm p-1"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              <strong>{recordModal.member?.firstName} {recordModal.member?.lastName}</strong>
              {' '}· {getMonthName(recordModal.periodMonth)} {recordModal.periodYear}
              {' '}· Expected: <strong>{formatKES(recordModal.expectedAmount)}</strong>
            </p>
            <form onSubmit={recSubmit(onRecord)} className="space-y-3">
              <div>
                <label className="label">Amount paid (KES) *</label>
                <input {...recReg('paidAmount')} type="number" placeholder={recordModal.expectedAmount} className={cn('input', recErrors.paidAmount && 'input-error')} />
                {recErrors.paidAmount && <p className="field-error">{recErrors.paidAmount.message}</p>}
              </div>
              <div>
                <label className="label">M-Pesa Reference <span className="text-gray-400 font-normal">(optional)</span></label>
                <input {...recReg('mpesaRef')} placeholder="e.g. QJK123XYZ" className="input" />
              </div>
              <div>
                <label className="label">Payment date <span className="text-gray-400 font-normal">(optional)</span></label>
                <input {...recReg('paidAt')} type="datetime-local" className="input" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setRecordModal(null)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={recSubmitting} className="btn-primary flex-1">
                  {recSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
