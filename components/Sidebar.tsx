'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import {
  LayoutDashboard, Wallet, CreditCard, Users, CalendarDays,
  Vote, FileText, Settings, LogOut, Shield, ChevronRight,
  BarChart3, Receipt,
} from 'lucide-react'
import { cn, getInitials, isOfficer, isTreasurer } from '@/lib/utils'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  officerOnly?: boolean
  treasurerOnly?: boolean
}

const MEMBER_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
  { href: '/contributions', label: 'My Contributions', icon: <Wallet className="w-4 h-4" /> },
  { href: '/loans', label: 'My Loans', icon: <CreditCard className="w-4 h-4" /> },
  { href: '/profile', label: 'My Profile', icon: <Settings className="w-4 h-4" /> },
]

const ADMIN_NAV: NavItem[] = [
  { href: '/admin/contributions', label: 'Contributions', icon: <Receipt className="w-4 h-4" />, officerOnly: true },
  { href: '/admin/loans', label: 'Loan Management', icon: <BarChart3 className="w-4 h-4" />, officerOnly: true },
  { href: '/admin/members', label: 'Members', icon: <Users className="w-4 h-4" />, officerOnly: true },
  { href: '/admin/meetings', label: 'Meetings', icon: <CalendarDays className="w-4 h-4" />, officerOnly: true },
  { href: '/admin/resolutions', label: 'Resolutions', icon: <Vote className="w-4 h-4" />, officerOnly: true },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const role = session?.user?.role ?? ''
  const showAdmin = isOfficer(role)

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col flex-shrink-0 h-full overflow-y-auto">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900 leading-tight">ChamaVault</p>
            <p className="text-xs text-gray-400 truncate max-w-[130px]">{session?.user?.chamaName}</p>
          </div>
        </div>
      </div>

      {/* Member nav */}
      <nav className="flex-1 px-3 py-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-3 mb-2">Member</p>
        <ul className="space-y-0.5 mb-6">
          {MEMBER_NAV.map(item => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'nav-item',
                  pathname === item.href && 'nav-item-active'
                )}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>

        {/* Admin nav */}
        {showAdmin && (
          <>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-3 mb-2">
              Admin
            </p>
            <ul className="space-y-0.5">
              {ADMIN_NAV.map(item => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      'nav-item',
                      pathname.startsWith(item.href) && 'nav-item-active'
                    )}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </nav>

      {/* User footer */}
      <div className="px-3 py-4 border-t border-gray-100">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center text-xs font-bold text-brand-700 flex-shrink-0">
            {session?.user?.name
              ? getInitials(session.user.name.split(' ')[0], session.user.name.split(' ')[1] ?? '')
              : '?'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{session?.user?.name}</p>
            <p className="text-xs text-gray-400 capitalize truncate">
              {role.toLowerCase().replace('_', ' ')}
            </p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="nav-item w-full text-red-500 hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  )
}
