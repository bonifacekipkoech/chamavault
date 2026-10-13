import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── KES Currency Formatting ──────────────────────────────────────────────────

export function formatKES(amount: number): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatKESCompact(amount: number): string {
  if (amount >= 1_000_000) return `KES ${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `KES ${(amount / 1_000).toFixed(1)}K`
  return formatKES(amount)
}

// ─── Date Formatting ──────────────────────────────────────────────────────────

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function timeAgo(date: Date | string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return days < 30 ? `${days}d ago` : formatDate(date)
}

export function getMonthName(month: number): string {
  return new Date(2024, month - 1, 1).toLocaleString('en-KE', { month: 'long' })
}

export function currentPeriod(): { month: number; year: number } {
  const now = new Date()
  return { month: now.getMonth() + 1, year: now.getFullYear() }
}

// ─── Loan Calculations ────────────────────────────────────────────────────────

/**
 * Calculate total repayable for a loan.
 * Simple interest: Total = P + (P × r × t)
 * where r = monthly rate, t = months
 */
export function calculateLoanRepayable(
  principal: number,
  monthlyRate: number,
  months: number
): { totalInterest: number; totalRepayable: number; monthlyInstalment: number } {
  const totalInterest = (principal * (monthlyRate / 100) * months)
  const totalRepayable = principal + totalInterest
  const monthlyInstalment = totalRepayable / months
  return {
    totalInterest: Math.round(totalInterest * 100) / 100,
    totalRepayable: Math.round(totalRepayable * 100) / 100,
    monthlyInstalment: Math.round(monthlyInstalment * 100) / 100,
  }
}

/**
 * Max loan a member can borrow based on their total contributions.
 */
export function maxLoanAmount(totalContributed: number, multiple: number): number {
  return totalContributed * multiple
}

// ─── Badge variant helpers ─────────────────────────────────────────────────────

export type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'default'

export function contributionStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case 'PAID':    return 'success'
    case 'PENDING': return 'warning'
    case 'LATE':    return 'error'
    case 'PARTIAL': return 'warning'
    case 'WAIVED':  return 'default'
    default:        return 'default'
  }
}

export function loanStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case 'PENDING_APPROVAL': return 'warning'
    case 'APPROVED':         return 'info'
    case 'DISBURSED':        return 'info'
    case 'ACTIVE':           return 'success'
    case 'FULLY_REPAID':     return 'success'
    case 'DEFAULTED':        return 'error'
    case 'REJECTED':         return 'error'
    default:                 return 'default'
  }
}

export function memberStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case 'ACTIVE':    return 'success'
    case 'INACTIVE':  return 'default'
    case 'SUSPENDED': return 'error'
    case 'LEFT':      return 'default'
    default:          return 'default'
  }
}

export function resolutionStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case 'PASSED':    return 'success'
    case 'REJECTED':  return 'error'
    case 'OPEN':      return 'info'
    case 'DRAFT':     return 'default'
    case 'TIED':      return 'warning'
    case 'CANCELLED': return 'default'
    default:          return 'default'
  }
}

// ─── Misc ──────────────────────────────────────────────────────────────────────

export function pluralize(n: number, singular: string, plural?: string): string {
  return `${n} ${n === 1 ? singular : (plural ?? singular + 's')}`
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase()
}

export function formatPercent(value: number, total: number): string {
  if (total === 0) return '0%'
  return `${Math.round((value / total) * 100)}%`
}

/** Generate a unique M-Pesa account reference for a contribution */
export function contributionRef(chamaId: string, memberId: string, month: number, year: number): string {
  return `CV-${chamaId.slice(-4).toUpperCase()}-${month}${year}`
}

// ─── Role helpers (mirrored from lib/auth.ts for client-side use) ─────────────

export const isTreasurer = (role?: string) =>
  role === 'TREASURER' || role === 'ADMIN'

export const isOfficer = (role?: string) =>
  ['TREASURER', 'SECRETARY', 'CHAIRPERSON', 'ADMIN'].includes(role ?? '')
