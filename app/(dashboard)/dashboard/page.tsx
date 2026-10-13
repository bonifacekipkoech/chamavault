'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import axios from 'axios'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  Wallet, Users, TrendingUp, AlertTriangle, Calendar,
  CheckCircle2, Clock, ArrowUpRight,
} from 'lucide-react'
import { StatCard } from '@/components/StatCard'
import { StatusBadge } from '@/components/StatusBadge'
import { formatKES, formatDate, timeAgo, getMonthName } from '@/lib/utils'

export default function DashboardPage() {
  const { data: session } = useSession()
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get('/api/analytics/dashboard').then(r => {
      setStats(r.data.data)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-32 rounded-xl" />)}
        </div>
        <div className="skeleton h-72 rounded-xl" />
      </div>
    )
  }

  const collectionColor = stats.collectionRate >= 80 ? '#16a34a' : stats.collectionRate >= 50 ? '#d97706' : '#dc2626'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Good morning, {session?.user?.name?.split(' ')[0]} 👋</h1>
          <p className="page-subtitle">{session?.user?.chamaName} · Overview</p>
        </div>
        {stats.upcomingMeeting && (
          <div className="flex items-center gap-2 bg-brand-50 border border-brand-200 rounded-lg px-4 py-2 text-sm">
            <Calendar className="w-4 h-4 text-brand-600" />
            <span className="text-brand-700 font-medium">
              Next meeting: {formatDate(stats.upcomingMeeting.scheduledAt)}
            </span>
          </div>
        )}
      </div>

      {/* Treasury cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-6 border-l-4 border-l-brand-500">
          <p className="text-sm text-gray-500 mb-1">Treasury Balance</p>
          <p className="text-2xl font-bold text-gray-900">{formatKES(stats.treasuryBalance)}</p>
          <p className="text-xs text-gray-400 mt-1">Available for operations & loans</p>
        </div>
        <div className="card p-6 border-l-4 border-l-blue-500">
          <p className="text-sm text-gray-500 mb-1">Active Loan Book</p>
          <p className="text-2xl font-bold text-gray-900">{formatKES(stats.loanBookBalance)}</p>
          <p className="text-xs text-gray-400 mt-1">{stats.activeLoans} active loan{stats.activeLoans !== 1 ? 's' : ''}</p>
        </div>
        <div className="card p-6 border-l-4 border-l-purple-500">
          <p className="text-sm text-gray-500 mb-1">Welfare Fund</p>
          <p className="text-2xl font-bold text-gray-900">{formatKES(stats.welfareBalance)}</p>
          <p className="text-xs text-gray-400 mt-1">Member welfare reserve</p>
        </div>
      </div>

      {/* KPI stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Members"
          value={stats.activeMembers}
          subtitle={`of ${stats.totalMembers} total`}
          icon={<Users className="w-5 h-5" />}
          color="green"
        />
        <StatCard
          title="This Month Collection"
          value={formatKES(stats.totalContributedThisMonth)}
          subtitle={`of ${formatKES(stats.expectedThisMonth)} expected`}
          icon={<Wallet className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title="Collection Rate"
          value={`${stats.collectionRate}%`}
          subtitle="This month"
          icon={<TrendingUp className="w-5 h-5" />}
          color={stats.collectionRate >= 80 ? 'green' : stats.collectionRate >= 50 ? 'yellow' : 'red'}
        />
        <StatCard
          title="Pending Loans"
          value={stats.pendingLoans}
          subtitle="Awaiting approval"
          icon={<Clock className="w-5 h-5" />}
          color={stats.pendingLoans > 0 ? 'yellow' : 'green'}
        />
      </div>

      {/* Alerts */}
      {(stats.overdueContributions > 0 || stats.pendingLoans > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {stats.overdueContributions > 0 && (
            <div className="alert-warning">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>
                <strong>{stats.overdueContributions}</strong> member{stats.overdueContributions !== 1 ? 's have' : ' has'} overdue contributions
              </span>
            </div>
          )}
          {stats.pendingLoans > 0 && (
            <div className="alert-info">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span>
                <strong>{stats.pendingLoans}</strong> loan application{stats.pendingLoans !== 1 ? 's' : ''} awaiting approval
              </span>
            </div>
          )}
        </div>
      )}

      {/* Monthly collection chart */}
      {stats.monthlyTrend?.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="text-base font-semibold text-gray-900">Monthly Collection Trend</h2>
            <span className="text-xs text-gray-400">Last 12 months</span>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={stats.monthlyTrend} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="collected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip
                  formatter={(v: number) => formatKES(v)}
                  contentStyle={{ borderRadius: 8, fontSize: 12 }}
                />
                <Area type="monotone" dataKey="expected" name="Expected" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="4 4" fill="url(#expected)" />
                <Area type="monotone" dataKey="collected" name="Collected" stroke="#16a34a" strokeWidth={2} fill="url(#collected)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Recent activity */}
      {stats.recentActivity?.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="text-base font-semibold text-gray-900">Recent Activity</h2>
          </div>
          <ul className="divide-y divide-gray-100">
            {stats.recentActivity.map((log: any) => (
              <li key={log.id} className="px-6 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-brand-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {log.action.replace(/_/g, ' ')}
                    </p>
                    {log.member && (
                      <p className="text-xs text-gray-500">
                        {log.member.firstName} {log.member.lastName}
                      </p>
                    )}
                  </div>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">{timeAgo(log.createdAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
