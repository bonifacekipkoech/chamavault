import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { z } from 'zod'
import { authOptions, isTreasurer } from '@/lib/auth'
import { db } from '@/lib/db'

const schema = z.object({
  amount: z.number().positive(),
  mpesaRef: z.string().optional(),
  mpesaPhone: z.string().optional(),
  notes: z.string().max(200).optional(),
})

// POST /api/loans/[id]/repay — record a loan repayment
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isTreasurer(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
    }

    const loan = await db.loan.findFirst({
      where: { id: params.id, chamaId: session.user.chamaId, status: { in: ['DISBURSED', 'ACTIVE'] } },
    })
    if (!loan) return NextResponse.json({ error: 'Loan not found or not active' }, { status: 404 })

    const { amount, mpesaRef, mpesaPhone, notes } = parsed.data
    const newBalance = Math.max(0, loan.outstandingBalance - amount)
    const isFullyRepaid = newBalance === 0

    // Split payment into principal and interest proportionally
    const principalRatio = loan.principalAmount / loan.totalRepayable
    const principal = Math.round(amount * principalRatio * 100) / 100
    const interest = amount - principal

    await db.$transaction(async tx => {
      await tx.loanRepayment.create({
        data: {
          loanId: loan.id,
          amount,
          principal,
          interest,
          mpesaRef,
          mpesaPhone,
          notes,
        },
      })

      await tx.loan.update({
        where: { id: loan.id },
        data: {
          amountRepaid: { increment: amount },
          outstandingBalance: newBalance,
          status: isFullyRepaid ? 'FULLY_REPAID' : 'ACTIVE',
          fullyRepaidAt: isFullyRepaid ? new Date() : null,
        },
      })

      // Return money to treasury, reduce loan book
      await tx.chama.update({
        where: { id: session.user.chamaId },
        data: {
          treasuryBalance: { increment: amount },
          loanBookBalance: { decrement: Math.min(amount, loan.outstandingBalance) },
        },
      })

      await tx.auditLog.create({
        data: {
          action: isFullyRepaid ? 'LOAN_FULLY_REPAID' : 'LOAN_REPAYMENT_RECORDED',
          entityType: 'Loan',
          entityId: loan.id,
          chamaId: session.user.chamaId,
          memberId: session.user.id,
          details: { amount, newBalance, mpesaRef },
        },
      })
    })

    return NextResponse.json({ success: true, data: { newBalance, fullyRepaid: isFullyRepaid } })
  } catch (error) {
    console.error('Record repayment error:', error)
    return NextResponse.json({ error: 'Failed to record repayment' }, { status: 500 })
  }
}
