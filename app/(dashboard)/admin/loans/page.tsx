'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { Loader2, CheckCircle2, XCircle, Send, ReceiptText, X } from 'lucide-react'
import { StatusBadge } from '@/components/StatusBadge'
import { formatKES, formatDate, loanStatusVariant, isOfficer } from '@/lib/utils'

export default function AdminLoansPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [loans, setLoans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('PENDING_APPROVAL')
  const [processing, setProcessing] = useState<string | null>(null)
  const [rejectModal, setRejectModal] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [repayModal, setRepayModal] = useState<any>(null)
  const [repayAmount, setRepayAmount] = useState('')
  const [repayRef, setRepayRef] = useState('')

  useEffect(() => {
    if (session && !isOfficer(session.user.role)) router.push('/dashboard')
  }, [session])

  const load = () => {
    setLoading(true)
    axios.get(`/api/loans?status=${filter}`).then(r => {
      setLoans(r.data.data)
      setLoading(false)
    })
  }

  useEffect(() => { load() }, [filter])

  const approve = async (id: string) => {
    setProcessing(id)
    await axios.post(`/api/loans/${id}/approve`)
    setProcessing(null)
    load()
  }

  const reject = async () => {
    if (!rejectModal) return
    setProcessing(rejectModal)
    await axios.post(`/api/loans/${rejectModal}/reject`, { reason: rejectReason })
    setProcessing(null)
    setRejectModal(null)
    setRejectReason('')
    load()
  }

  const disburse = async (id: string) => {
    setProcessing(id)
    try {
      await axios.post(`/api/loans/${id}/disburse`)
    } catch (e: any) {
      alert(e.response?.data?.error ?? 'Disbursement failed')
    }
    setProcessing(null)
    load()
  }

  const recordRepayment = async () => {
    if (!repayModal) return
    setProcessing(repayModal.id)
    await axios.post(`/api/loans/${repayModal.id}/repay`, {
      amount: parseFloat(repayAmount),
      mpesaRef: repayRef || undefined,
    })
    setProcessing(null)
    setRepayModal(null)
    setRepayAmount('')
    setRepayRef('')
    load()
  }

  const FILTERS = ['PENDING_APPROVAL', 'APPROVED', 'DISBURSED', 'ACTIVE', 'FULLY_REPAID', 'REJECTED']

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Loan Management</h1>
          <p className="page-subtitle">Review applications, disburse, and record repayments</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              filter === f ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-600 border-gray-300 hover:border-brand-400'
            }`}
          >
            {f.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-brand-600" /></div>
      ) : loans.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">No loans with status: {filter.replace(/_/g, ' ')}</div>
      ) : (
        <div className="space-y-4">
          {loans.map((l: any) => (
            <div key={l.id} className="card p-5">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <p className="font-semibold text-gray-900">
                      {l.member.firstName} {l.member.lastName}
                    </p>
                    <StatusBadge status={l.status} variant={loanStatusVariant(l.status)} />
                    <span className="text-xs text-gray-400 capitalize">{l.type.toLowerCase()}</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">{l.purpose}</p>
                  <div className="flex flex-wrap gap-4 text-sm mt-2">
                    <span><span className="text-gray-500">Principal:</span> <strong>{formatKES(l.principalAmount)}</strong></span>
                    <span><span className="text-gray-500">Total repayable:</span> <strong>{formatKES(l.totalRepayable)}</strong></span>
                    <span><span className="text-gray-500">Outstanding:</span> <strong className={l.outstandingBalance > 0 ? 'text-red-600' : 'text-green-600'}>{formatKES(l.outstandingBalance)}</strong></span>
                    <span><span className="text-gray-500">Applied:</span> {formatDate(l.appliedAt)}</span>
                    {l.approvedAt && <span><span className="text-gray-500">Approved:</span> {formatDate(l.approvedAt)}</span>}
                  </div>
                  {l.guarantor && (
                    <p className="text-xs text-gray-400 mt-1">Guarantor: {l.guarantor.firstName} {l.guarantor.lastName}</p>
                  )}
                </div>

                <div className="flex gap-2 flex-wrap">
                  {l.status === 'PENDING_APPROVAL' && (
                    <>
                      <button onClick={() => approve(l.id)} disabled={processing === l.id} className="btn-primary btn-sm gap-1">
                        {processing === l.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        Approve
                      </button>
                      <button onClick={() => setRejectModal(l.id)} className="btn-danger btn-sm gap-1">
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                    </>
                  )}
                  {l.status === 'APPROVED' && (
                    <button onClick={() => disburse(l.id)} disabled={processing === l.id} className="btn-mpesa btn-sm gap-1">
                      {processing === l.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      Disburse via M-Pesa
                    </button>
                  )}
                  {['DISBURSED', 'ACTIVE'].includes(l.status) && (
                    <button onClick={() => setRepayModal(l)} className="btn-secondary btn-sm gap-1">
                      <ReceiptText className="w-3.5 h-3.5" /> Record Repayment
                    </button>
                  )}
                </div>
              </div>

              {/* Repayment history */}
              {l.repayments?.length > 0 && (
                <div className="mt-4 border-t border-gray-100 pt-3">
                  <p className="text-xs font-medium text-gray-500 mb-2">Recent Repayments</p>
                  <div className="space-y-1">
                    {l.repayments.slice(0, 3).map((r: any) => (
                      <div key={r.id} className="flex justify-between text-xs text-gray-600">
                        <span>{formatDate(r.paidAt)}{r.mpesaRef && ` · ${r.mpesaRef}`}</span>
                        <span className="font-medium text-green-600">{formatKES(r.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Reject Loan Application</h3>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={3}
              placeholder="Reason for rejection (optional)"
              className="input resize-none mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => setRejectModal(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={reject} disabled={!!processing} className="btn-danger flex-1">
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record repayment modal */}
      {repayModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Record Repayment</h3>
              <button onClick={() => setRepayModal(null)} className="btn-ghost btn-sm p-1"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              {repayModal.member.firstName} {repayModal.member.lastName} ·
              Outstanding: <strong>{formatKES(repayModal.outstandingBalance)}</strong>
            </p>
            <div className="space-y-3 mb-4">
              <div>
                <label className="label">Amount (KES)</label>
                <input value={repayAmount} onChange={e => setRepayAmount(e.target.value)} type="number" placeholder="5000" className="input" />
              </div>
              <div>
                <label className="label">M-Pesa Reference <span className="text-gray-400 font-normal">(optional)</span></label>
                <input value={repayRef} onChange={e => setRepayRef(e.target.value)} placeholder="e.g. QJK123XYZ" className="input" />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setRepayModal(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={recordRepayment} disabled={!repayAmount || !!processing} className="btn-primary flex-1">
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Record Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
