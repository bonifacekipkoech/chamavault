'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import axios from 'axios'
import { Wallet, Loader2, Smartphone, CheckCircle2, Clock, AlertTriangle } from 'lucide-react'
import { StatusBadge } from '@/components/StatusBadge'
import { MpesaPayButton } from '@/components/MpesaPayButton'
import { formatKES, formatDate, getMonthName, contributionStatusVariant } from '@/lib/utils'

export default function ContributionsPage() {
  const { data: session } = useSession()
  const [contributions, setContributions] = useState<any[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  const load = () => {
    setLoading(true)
    const params = filter !== 'all' ? `?status=${filter.toUpperCase()}` : ''
    axios.get(`/api/contributions${params}`).then(r => {
      setContributions(r.data.data)
      setSummary(r.data.summary)
      setLoading(false)
    })
  }

  useEffect(() => { load() }, [filter])

  const filtered = contributions

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Contributions</h1>
          <p className="page-subtitle">Track and pay your monthly contributions</p>
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="card p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Total Paid</p>
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
            <p className="text-xs text-gray-500 mb-1">Total Expected</p>
            <p className="text-lg font-bold text-gray-800">{formatKES(summary.totalExpected)}</p>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'pending', 'paid', 'late', 'partial'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              filter === f
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white text-gray-600 border-gray-300 hover:border-brand-400'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Contributions list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No contributions found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c: any) => (
            <div key={c.id} className="card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  c.status === 'PAID' ? 'bg-green-100' :
                  c.status === 'LATE' ? 'bg-red-100' : 'bg-yellow-100'
                }`}>
                  {c.status === 'PAID'
                    ? <CheckCircle2 className="w-5 h-5 text-green-600" />
                    : c.status === 'LATE'
                    ? <AlertTriangle className="w-5 h-5 text-red-600" />
                    : <Clock className="w-5 h-5 text-yellow-600" />
                  }
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {getMonthName(c.periodMonth)} {c.periodYear}
                    {c.type !== 'MONTHLY' && (
                      <span className="ml-2 text-xs text-gray-500">({c.type.replace(/_/g, ' ')})</span>
                    )}
                  </p>
                  <p className="text-sm text-gray-500">
                    Due: {formatDate(c.dueDate)}
                    {c.paidAt && ` · Paid: ${formatDate(c.paidAt)}`}
                    {c.mpesaRef && ` · Ref: ${c.mpesaRef}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    {formatKES(c.paidAmount)} <span className="text-sm font-normal text-gray-400">/ {formatKES(c.expectedAmount)}</span>
                  </p>
                  <StatusBadge status={c.status} variant={contributionStatusVariant(c.status)} />
                </div>

                {(c.status === 'PENDING' || c.status === 'LATE' || c.status === 'PARTIAL') && (
                  <MpesaPayButton
                    contributionId={c.id}
                    amount={c.expectedAmount - c.paidAmount}
                    phone={session?.user?.phone ?? ''}
                    onSuccess={load}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
