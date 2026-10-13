import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions, isTreasurer } from '@/lib/auth'
import { db } from '@/lib/db'
import { disburseLoan } from '@/lib/mpesa'

// POST /api/loans/[id]/disburse — send money to member via M-Pesa B2C
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isTreasurer(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const loan = await db.loan.findFirst({
      where: { id: params.id, chamaId: session.user.chamaId, status: 'APPROVED' },
      include: { member: true },
    })
    if (!loan) return NextResponse.json({ error: 'Loan not approved or not found' }, { status: 404 })

    // Initiate M-Pesa B2C disbursement
    const result = await disburseLoan({
      phone: loan.member.phone,
      amount: loan.principalAmount,
      occasion: `Loan: ${loan.purpose.slice(0, 50)}`,
      remarks: `ChamaVault Loan Disbursement`,
    })

    // Update loan and treasury
    await db.$transaction(async tx => {
      await tx.loan.update({
        where: { id: params.id },
        data: {
          status: 'DISBURSED',
          disbursedAt: new Date(),
          disbursementRef: result.ConversationID ?? null,
          disbursementPhone: loan.member.phone,
          expectedEndDate: new Date(
            Date.now() + loan.repaymentMonths * 30 * 24 * 60 * 60 * 1000
          ),
        },
      })

      // Deduct from treasury, add to loan book
      await tx.chama.update({
        where: { id: session.user.chamaId },
        data: {
          treasuryBalance: { decrement: loan.principalAmount },
          loanBookBalance: { increment: loan.outstandingBalance },
        },
      })
    })

    await db.auditLog.create({
      data: {
        action: 'LOAN_DISBURSED',
        entityType: 'Loan',
        entityId: loan.id,
        chamaId: session.user.chamaId,
        memberId: session.user.id,
        details: { amount: loan.principalAmount, phone: loan.member.phone },
      },
    })

    return NextResponse.json({ success: true, data: { disbursed: true } })
  } catch (error) {
    console.error('Disburse loan error:', error)
    return NextResponse.json({ error: 'Failed to disburse loan' }, { status: 500 })
  }
}
