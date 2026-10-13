'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import axios from 'axios'
import {
  Vote, Plus, Loader2, X, ThumbsUp, ThumbsDown, Minus,
  CheckCircle2, XCircle, Lock,
} from 'lucide-react'
import { formatDate, formatDateTime, resolutionStatusVariant, cn } from '@/lib/utils'
import { StatusBadge } from '@/components/StatusBadge'

const createSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  type: z.enum(['POLICY_CHANGE', 'LOAN_APPROVAL', 'MEMBER_ADMISSION', 'MEMBER_SUSPENSION', 'INVESTMENT', 'BYLAW_AMENDMENT', 'OTHER']),
  quorumPercent: z.coerce.number().min(0).max(100).default(50),
  passingPercent: z.coerce.number().min(0).max(100).default(50),
  opensAt: z.string().optional(),
  closesAt: z.string().optional(),
})
type CreateForm = z.infer<typeof createSchema>

export default function AdminResolutionsPage() {
  const { data: session } = useSession()
  const [resolutions, setResolutions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [votingId, setVotingId] = useState<string | null>(null)
  const [processing, setProcessing] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { type: 'OTHER', quorumPercent: 50, passingPercent: 50 },
  })

  const load = () => {
    axios.get('/api/resolutions').then(r => {
      setResolutions(r.data.data)
      setLoading(false)
    })
  }

  useEffect(() => { load() }, [])

  const onCreate = async (data: CreateForm) => {
    await axios.post('/api/resolutions', {
      ...data,
      opensAt: data.opensAt ? new Date(data.opensAt).toISOString() : undefined,
      closesAt: data.closesAt ? new Date(data.closesAt).toISOString() : undefined,
    })
    reset()
    setShowCreate(false)
    load()
  }

  const openVote = async (id: string) => {
    setProcessing(id)
    await axios.patch(`/api/resolutions/${id}`, { status: 'OPEN' }).catch(() => {
      // Inline status open via direct update — simplified for admin
      axios.post(`/api/resolutions/${id}/open`).catch(() => null)
    })
    setProcessing(null)
    load()
  }

  const castVote = async (resolutionId: string, vote: 'FOR' | 'AGAINST' | 'ABSTAIN') => {
    setProcessing(resolutionId)
    try {
      await axios.post(`/api/resolutions/${resolutionId}/vote`, { vote })
      setVotingId(null)
    } catch (e: any) {
      alert(e.response?.data?.error ?? 'Failed to cast vote')
    }
    setProcessing(null)
    load()
  }

  const closeResolution = async (id: string) => {
    setProcessing(id)
    await axios.post(`/api/resolutions/${id}/close`)
    setProcessing(null)
    load()
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-brand-600" /></div>

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Resolutions & Voting</h1>
          <p className="page-subtitle">Create resolutions and manage democratic governance</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary gap-2">
          <Plus className="w-4 h-4" /> New Resolution
        </button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">New Resolution</h2>
              <button onClick={() => setShowCreate(false)} className="btn-ghost btn-sm p-1"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit(onCreate)} className="space-y-4">
              <div>
                <label className="label">Title *</label>
                <input {...register('title')} placeholder="e.g. Increase monthly contribution to KES 3,000" className={cn('input', errors.title && 'input-error')} />
                {errors.title && <p className="field-error">{errors.title.message}</p>}
              </div>
              <div>
                <label className="label">Description *</label>
                <textarea {...register('description')} rows={4} placeholder="Provide full details of the resolution…" className={cn('input resize-none', errors.description && 'input-error')} />
                {errors.description && <p className="field-error">{errors.description.message}</p>}
              </div>
              <div>
                <label className="label">Type</label>
                <select {...register('type')} className="input">
                  {['POLICY_CHANGE', 'LOAN_APPROVAL', 'MEMBER_ADMISSION', 'MEMBER_SUSPENSION', 'INVESTMENT', 'BYLAW_AMENDMENT', 'OTHER'].map(t => (
                    <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Quorum (%)</label>
                  <input {...register('quorumPercent')} type="number" min={0} max={100} className="input" />
                </div>
                <div>
                  <label className="label">Passing threshold (%)</label>
                  <input {...register('passingPercent')} type="number" min={0} max={100} className="input" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Opens at <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input {...register('opensAt')} type="datetime-local" className="input" />
                </div>
                <div>
                  <label className="label">Closes at <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input {...register('closesAt')} type="datetime-local" className="input" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resolutions list */}
      {resolutions.length === 0 ? (
        <div className="card p-12 text-center">
          <Vote className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No resolutions yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {resolutions.map((r: any) => {
            const totalVotes = r.votesFor + r.votesAgainst + r.abstentions
            const forPct = totalVotes > 0 ? Math.round((r.votesFor / totalVotes) * 100) : 0
            const againstPct = totalVotes > 0 ? Math.round((r.votesAgainst / totalVotes) * 100) : 0
            const participationPct = r.totalEligible > 0 ? Math.round((totalVotes / r.totalEligible) * 100) : 0

            return (
              <div key={r.id} className="card p-5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="font-semibold text-gray-900">{r.title}</p>
                      <StatusBadge status={r.status} variant={resolutionStatusVariant(r.status)} />
                      <span className="text-xs text-gray-400">{r.type.replace(/_/g, ' ')}</span>
                    </div>
                    <p className="text-sm text-gray-600">{r.description}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Quorum: {r.quorumPercent}% · Pass: {r.passingPercent}% · Eligible: {r.totalEligible} members
                    </p>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {r.status === 'DRAFT' && (
                      <button onClick={() => openVote(r.id)} disabled={processing === r.id} className="btn-primary btn-sm gap-1">
                        {processing === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Vote className="w-3.5 h-3.5" />}
                        Open Voting
                      </button>
                    )}
                    {r.status === 'OPEN' && (
                      <>
                        {!r.myVote && (
                          <button onClick={() => setVotingId(r.id)} className="btn-primary btn-sm gap-1">
                            <ThumbsUp className="w-3.5 h-3.5" /> Cast Vote
                          </button>
                        )}
                        <button onClick={() => closeResolution(r.id)} disabled={processing === r.id} className="btn-secondary btn-sm gap-1">
                          {processing === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                          Close & Tally
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Vote tally */}
                {totalVotes > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Participation: {totalVotes}/{r.totalEligible} ({participationPct}%)</span>
                      <span>For: {r.votesFor} · Against: {r.votesAgainst} · Abstain: {r.abstentions}</span>
                    </div>

                    {/* Stacked bar */}
                    <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
                      {forPct > 0 && (
                        <div className="bg-green-500 transition-all" style={{ width: `${forPct}%` }} title={`For: ${forPct}%`} />
                      )}
                      {againstPct > 0 && (
                        <div className="bg-red-500 transition-all" style={{ width: `${againstPct}%` }} title={`Against: ${againstPct}%`} />
                      )}
                      {(100 - forPct - againstPct) > 0 && (
                        <div className="bg-gray-300 flex-1" title="Abstain" />
                      )}
                    </div>

                    {r.status === 'PASSED' && (
                      <div className="flex items-center gap-1.5 text-sm text-green-700 font-medium">
                        <CheckCircle2 className="w-4 h-4" /> Resolution Passed
                      </div>
                    )}
                    {r.status === 'REJECTED' && (
                      <div className="flex items-center gap-1.5 text-sm text-red-600 font-medium">
                        <XCircle className="w-4 h-4" /> Resolution Rejected
                      </div>
                    )}
                    {r.status === 'TIED' && (
                      <div className="flex items-center gap-1.5 text-sm text-yellow-700 font-medium">
                        <Minus className="w-4 h-4" /> Tied — Chairperson's casting vote required
                      </div>
                    )}
                  </div>
                )}

                {/* My vote indicator */}
                {r.myVote && (
                  <p className="text-xs text-gray-400 mt-2">
                    You voted: <strong className={r.myVote === 'FOR' ? 'text-green-600' : r.myVote === 'AGAINST' ? 'text-red-600' : 'text-gray-500'}>{r.myVote}</strong>
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Inline vote panel */}
      {votingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <Vote className="w-12 h-12 text-brand-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold mb-1">Cast Your Vote</h3>
            <p className="text-sm text-gray-500 mb-6">
              {resolutions.find(r => r.id === votingId)?.title}
            </p>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => castVote(votingId, 'FOR')}
                disabled={!!processing}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-green-200 hover:bg-green-50 hover:border-green-400 transition-colors"
              >
                <ThumbsUp className="w-6 h-6 text-green-600" />
                <span className="text-sm font-medium text-green-700">For</span>
              </button>
              <button
                onClick={() => castVote(votingId, 'AGAINST')}
                disabled={!!processing}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-red-200 hover:bg-red-50 hover:border-red-400 transition-colors"
              >
                <ThumbsDown className="w-6 h-6 text-red-600" />
                <span className="text-sm font-medium text-red-700">Against</span>
              </button>
              <button
                onClick={() => castVote(votingId, 'ABSTAIN')}
                disabled={!!processing}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-200 hover:bg-gray-50 hover:border-gray-400 transition-colors"
              >
                <Minus className="w-6 h-6 text-gray-500" />
                <span className="text-sm font-medium text-gray-600">Abstain</span>
              </button>
            </div>
            <button onClick={() => setVotingId(null)} className="btn-ghost btn-sm mt-4 w-full">Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
