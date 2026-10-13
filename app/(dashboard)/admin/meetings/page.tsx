'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import axios from 'axios'
import {
  CalendarDays, Plus, Loader2, X, ChevronDown, ChevronUp,
  Users, CheckCircle2, FileText,
} from 'lucide-react'
import { formatDate, formatDateTime, cn } from '@/lib/utils'
import { StatusBadge } from '@/components/StatusBadge'

const createSchema = z.object({
  title: z.string().min(3, 'At least 3 characters'),
  type: z.enum(['MONTHLY', 'AGM', 'SPECIAL', 'EMERGENCY']),
  scheduledAt: z.string().min(1, 'Required'),
  venue: z.string().optional(),
  agenda: z.string().optional(),
})
type CreateForm = z.infer<typeof createSchema>

const MEETING_STATUS_COLORS: Record<string, string> = {
  SCHEDULED: 'info',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'error',
}

export default function AdminMeetingsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [meetings, setMeetings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [editMinutes, setEditMinutes] = useState<{ id: string; text: string } | null>(null)
  const [savingMinutes, setSavingMinutes] = useState(false)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { type: 'MONTHLY' },
  })

  const load = () => {
    axios.get('/api/meetings').then(r => {
      setMeetings(r.data.data)
      setLoading(false)
    })
  }

  useEffect(() => { load() }, [])

  const onCreate = async (data: CreateForm) => {
    await axios.post('/api/meetings', {
      ...data,
      scheduledAt: new Date(data.scheduledAt).toISOString(),
    })
    reset()
    setShowCreate(false)
    load()
  }

  const updateStatus = async (id: string, status: string) => {
    await axios.patch(`/api/meetings/${id}`, { status })
    load()
  }

  const saveMinutes = async () => {
    if (!editMinutes) return
    setSavingMinutes(true)
    await axios.patch(`/api/meetings/${editMinutes.id}`, { minutes: editMinutes.text, status: 'COMPLETED' })
    setSavingMinutes(false)
    setEditMinutes(null)
    load()
  }

  if (loading) return (
    <div className="flex justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Meetings</h1>
          <p className="page-subtitle">Schedule meetings and record minutes</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary gap-2">
          <Plus className="w-4 h-4" /> Schedule Meeting
        </button>
      </div>

      {/* Create meeting modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">Schedule New Meeting</h2>
              <button onClick={() => setShowCreate(false)} className="btn-ghost btn-sm p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit(onCreate)} className="space-y-4">
              <div>
                <label className="label">Title *</label>
                <input {...register('title')} placeholder="e.g. March 2024 Monthly Meeting" className={cn('input', errors.title && 'input-error')} />
                {errors.title && <p className="field-error">{errors.title.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Type</label>
                  <select {...register('type')} className="input">
                    {['MONTHLY', 'AGM', 'SPECIAL', 'EMERGENCY'].map(t => (
                      <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Date & Time *</label>
                  <input {...register('scheduledAt')} type="datetime-local" className={cn('input', errors.scheduledAt && 'input-error')} />
                  {errors.scheduledAt && <p className="field-error">{errors.scheduledAt.message}</p>}
                </div>
              </div>
              <div>
                <label className="label">Venue</label>
                <input {...register('venue')} placeholder="e.g. Westlands Community Hall" className="input" />
              </div>
              <div>
                <label className="label">Agenda</label>
                <textarea {...register('agenda')} rows={4} placeholder="List agenda items…" className="input resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Minutes editor modal */}
      {editMinutes && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Meeting Minutes</h2>
              <button onClick={() => setEditMinutes(null)} className="btn-ghost btn-sm p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <textarea
              value={editMinutes.text}
              onChange={e => setEditMinutes({ ...editMinutes, text: e.target.value })}
              rows={16}
              placeholder="Record meeting minutes here…&#10;&#10;Attendance: …&#10;Matters Arising: …&#10;Any Other Business: …"
              className="input resize-none w-full font-mono text-sm"
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setEditMinutes(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={saveMinutes} disabled={savingMinutes} className="btn-primary flex-1">
                {savingMinutes ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> Save & Complete</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Meetings list */}
      {meetings.length === 0 ? (
        <div className="card p-12 text-center">
          <CalendarDays className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No meetings scheduled yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {meetings.map((m: any) => (
            <div key={m.id} className="card overflow-hidden">
              <div
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpanded(expanded === m.id ? null : m.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <CalendarDays className="w-5 h-5 text-brand-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{m.title}</p>
                    <p className="text-sm text-gray-500">
                      {formatDateTime(m.scheduledAt)}
                      {m.venue && ` · ${m.venue}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn(
                    'text-xs font-medium px-2.5 py-0.5 rounded-full',
                    m.type === 'AGM' ? 'bg-purple-100 text-purple-700' :
                    m.type === 'EMERGENCY' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-600'
                  )}>
                    {m.type}
                  </span>
                  <StatusBadge status={m.status} variant={MEETING_STATUS_COLORS[m.status] as any} />
                  {expanded === m.id
                    ? <ChevronUp className="w-4 h-4 text-gray-400" />
                    : <ChevronDown className="w-4 h-4 text-gray-400" />
                  }
                </div>
              </div>

              {expanded === m.id && (
                <div className="border-t border-gray-100 p-5 space-y-4">
                  {/* Agenda */}
                  {m.agenda && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Agenda</p>
                      <p className="text-sm text-gray-700 whitespace-pre-line">{m.agenda}</p>
                    </div>
                  )}

                  {/* Minutes */}
                  {m.minutes && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Minutes</p>
                      <p className="text-sm text-gray-700 whitespace-pre-line bg-gray-50 rounded-lg p-3 max-h-48 overflow-y-auto">
                        {m.minutes}
                      </p>
                    </div>
                  )}

                  {/* Resolutions */}
                  {m.resolutions?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        Resolutions ({m.resolutions.length})
                      </p>
                      <div className="space-y-1">
                        {m.resolutions.map((r: any) => (
                          <div key={r.id} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                            <span className="text-gray-700">{r.title}</span>
                            <StatusBadge status={r.status} variant="default" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 flex-wrap pt-1">
                    {m.status === 'SCHEDULED' && (
                      <button onClick={() => updateStatus(m.id, 'IN_PROGRESS')} className="btn-primary btn-sm gap-1">
                        <Users className="w-3.5 h-3.5" /> Start Meeting
                      </button>
                    )}
                    {['SCHEDULED', 'IN_PROGRESS'].includes(m.status) && (
                      <button
                        onClick={() => setEditMinutes({ id: m.id, text: m.minutes ?? '' })}
                        className="btn-secondary btn-sm gap-1"
                      >
                        <FileText className="w-3.5 h-3.5" /> {m.minutes ? 'Edit Minutes' : 'Add Minutes'}
                      </button>
                    )}
                    {m.status === 'SCHEDULED' && (
                      <button onClick={() => updateStatus(m.id, 'CANCELLED')} className="btn-ghost btn-sm text-red-600">
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
