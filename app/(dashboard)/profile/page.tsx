'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import axios from 'axios'
import { Loader2, User, CheckCircle2 } from 'lucide-react'
import { formatKES, formatDate, getInitials } from '@/lib/utils'
import { cn } from '@/lib/utils'

const schema = z.object({
  notifySMS: z.boolean(),
  notifyEmail: z.boolean(),
})

export default function ProfilePage() {
  const { data: session } = useSession()
  const [member, setMember] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (!session?.user?.id) return
    axios.get(`/api/members/${session.user.id}`).then(r => {
      setMember(r.data.data)
      reset({ notifySMS: r.data.data.notifySMS, notifyEmail: r.data.data.notifyEmail })
      setLoading(false)
    })
  }, [session])

  const onSave = async (data: any) => {
    await axios.patch(`/api/members/${session?.user?.id}`, data)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-brand-600" /></div>

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Profile</h1>
          <p className="page-subtitle">Your member information and settings</p>
        </div>
      </div>

      {/* Profile card */}
      <div className="card p-6">
        <div className="flex items-center gap-5 mb-6">
          <div className="w-16 h-16 bg-brand-600 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
            {getInitials(member.firstName, member.lastName)}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{member.firstName} {member.lastName}</h2>
            <p className="text-sm text-gray-500 capitalize">{member.role.toLowerCase().replace('_', ' ')}</p>
            <p className="text-xs text-gray-400">Member since {formatDate(member.joinDate)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Email</p>
            <p className="font-medium">{member.email}</p>
          </div>
          <div>
            <p className="text-gray-500">M-Pesa Phone</p>
            <p className="font-medium">{member.phone}</p>
          </div>
          {member.nationalId && (
            <div>
              <p className="text-gray-500">National ID</p>
              <p className="font-medium">{member.nationalId}</p>
            </div>
          )}
          <div>
            <p className="text-gray-500">Chama</p>
            <p className="font-medium">{session?.user?.chamaName}</p>
          </div>
        </div>
      </div>

      {/* Financial summary */}
      <div className="card p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Financial Standing</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-xl">
            <p className="text-2xl font-bold text-green-700">{formatKES(member.totalContributed)}</p>
            <p className="text-xs text-gray-500 mt-1">Total Contributed</p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-xl">
            <p className="text-2xl font-bold text-blue-700">{member.totalShares}</p>
            <p className="text-xs text-gray-500 mt-1">Shares Held</p>
          </div>
          <div className={cn('text-center p-4 rounded-xl', member.outstandingBalance > 0 ? 'bg-red-50' : 'bg-gray-50')}>
            <p className={cn('text-2xl font-bold', member.outstandingBalance > 0 ? 'text-red-600' : 'text-gray-600')}>
              {formatKES(member.outstandingBalance)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Arrears</p>
          </div>
        </div>
      </div>

      {/* Notification settings */}
      <div className="card p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Notification Preferences</h3>
        {saved && (
          <div className="alert-success mb-4">
            <CheckCircle2 className="w-4 h-4" />
            Settings saved successfully
          </div>
        )}
        <form onSubmit={handleSubmit(onSave)} className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input {...register('notifySMS')} type="checkbox" className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500" />
            <div>
              <p className="font-medium text-sm">SMS Notifications</p>
              <p className="text-xs text-gray-500">Receive payment reminders and alerts via SMS</p>
            </div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input {...register('notifyEmail')} type="checkbox" className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500" />
            <div>
              <p className="font-medium text-sm">Email Notifications</p>
              <p className="text-xs text-gray-500">Receive meeting notices and reports by email</p>
            </div>
          </label>
          <button type="submit" disabled={isSubmitting} className="btn-primary mt-2">
            {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : 'Save Settings'}
          </button>
        </form>
      </div>
    </div>
  )
}
