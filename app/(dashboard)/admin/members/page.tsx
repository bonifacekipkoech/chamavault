'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { Users, Search, Loader2, MoreVertical, UserCheck, UserX, Shield } from 'lucide-react'
import { StatusBadge } from '@/components/StatusBadge'
import { formatKES, formatDate, memberStatusVariant, getInitials, isOfficer } from '@/lib/utils'
import { cn } from '@/lib/utils'

export default function AdminMembersPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [actionMember, setActionMember] = useState<any>(null)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if (session && !isOfficer(session.user.role)) router.push('/dashboard')
  }, [session])

  const load = () => {
    axios.get('/api/members').then(r => {
      setMembers(r.data.data)
      setLoading(false)
    })
  }

  useEffect(() => { load() }, [])

  const filtered = members.filter(m =>
    search === '' ||
    `${m.firstName} ${m.lastName} ${m.email} ${m.phone}`.toLowerCase().includes(search.toLowerCase())
  )

  const updateMember = async (id: string, data: any) => {
    setUpdating(true)
    await axios.patch(`/api/members/${id}`, data)
    setUpdating(false)
    setActionMember(null)
    load()
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-brand-600" /></div>

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Member Management</h1>
          <p className="page-subtitle">{members.length} total members</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search members…"
          className="input pl-9"
        />
      </div>

      {/* Members table */}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Member</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Contributed</th>
              <th>Arrears</th>
              <th>Joined</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m: any) => (
              <tr key={m.id}>
                <td>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center text-xs font-bold text-brand-700 flex-shrink-0">
                      {getInitials(m.firstName, m.lastName)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{m.firstName} {m.lastName}</p>
                      <p className="text-xs text-gray-500">{m.email}</p>
                    </div>
                  </div>
                </td>
                <td className="text-gray-600">{m.phone}</td>
                <td>
                  <span className={cn(
                    'text-xs font-medium px-2 py-0.5 rounded-full',
                    m.role === 'CHAIRPERSON' ? 'bg-purple-100 text-purple-700' :
                    m.role === 'TREASURER' ? 'bg-blue-100 text-blue-700' :
                    m.role === 'SECRETARY' ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-100 text-gray-600'
                  )}>
                    {m.role.charAt(0) + m.role.slice(1).toLowerCase()}
                  </span>
                </td>
                <td className="text-green-700 font-medium">{formatKES(m.totalContributed)}</td>
                <td className={m.outstandingBalance > 0 ? 'text-red-600 font-medium' : 'text-gray-400'}>
                  {formatKES(m.outstandingBalance)}
                </td>
                <td className="text-gray-500">{formatDate(m.joinDate)}</td>
                <td><StatusBadge status={m.status} variant={memberStatusVariant(m.status)} /></td>
                <td>
                  <div className="relative">
                    <button
                      onClick={() => setActionMember(actionMember?.id === m.id ? null : m)}
                      className="btn-ghost btn-sm p-1"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {actionMember?.id === m.id && (
                      <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-xl shadow-lg z-10 w-48 py-1">
                        {['MEMBER', 'TREASURER', 'SECRETARY', 'CHAIRPERSON'].map(role => (
                          <button
                            key={role}
                            onClick={() => updateMember(m.id, { role })}
                            disabled={updating}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                          >
                            <Shield className="w-3.5 h-3.5 text-gray-400" />
                            Set as {role.charAt(0) + role.slice(1).toLowerCase()}
                          </button>
                        ))}
                        <div className="border-t border-gray-100 my-1" />
                        {m.status === 'ACTIVE' ? (
                          <button onClick={() => updateMember(m.id, { status: 'SUSPENDED' })} disabled={updating} className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-600 flex items-center gap-2">
                            <UserX className="w-3.5 h-3.5" /> Suspend
                          </button>
                        ) : (
                          <button onClick={() => updateMember(m.id, { status: 'ACTIVE' })} disabled={updating} className="w-full text-left px-4 py-2 text-sm hover:bg-green-50 text-green-600 flex items-center gap-2">
                            <UserCheck className="w-3.5 h-3.5" /> Reactivate
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
