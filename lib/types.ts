import type { DefaultSession } from 'next-auth'

// ─── NextAuth Extensions ──────────────────────────────────────────────────────

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: string
      chamaId: string
      chamaName: string
      phone: string
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: string
    chamaId: string
    chamaName: string
    phone: string
  }
}

// ─── Dashboard Stats ───────────────────────────────────────────────────────────

export interface DashboardStats {
  treasuryBalance: number
  welfareBalance: number
  loanBookBalance: number
  totalMembers: number
  activeMembers: number
  totalContributedThisMonth: number
  expectedThisMonth: number
  collectionRate: number
  pendingLoans: number
  activeLoans: number
  overdueContributions: number
  upcomingMeeting: {
    id: string
    title: string
    scheduledAt: string
    venue: string | null
  } | null
}

// ─── Member Financial Summary ─────────────────────────────────────────────────

export interface MemberFinancialSummary {
  totalContributed: number
  totalShares: number
  outstandingBalance: number
  activeLoanAmount: number
  activeLoanId: string | null
  maxLoanEligible: number
  contributionHistory: Array<{
    month: number
    year: number
    status: string
    paidAmount: number
    expectedAmount: number
  }>
}

// ─── API Response ──────────────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true
  data: T
}

export interface ApiError {
  success: false
  error: string
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError
