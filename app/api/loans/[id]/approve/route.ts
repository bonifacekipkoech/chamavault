import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions, isTreasurer } from '@/lib/auth'
import { db } from '@/lib/db'

// POST /api/loans/[id]/approve
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isTreasurer(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const loan = await db.loan.findFirst({
      where: { id: params.id, chamaId: session.user.chamaId, status: 'PENDING_APPROVAL' },
    })
    if (!loan) return NextResponse.json({ error: 'Loan not found or already processed' }, { status: 404 })

    // Check treasury has enough balance
    const chama = await db.chama.findUnique({ where: { id: session.user.chamaId } })
    if (chama && chama.treasuryBalance < loan.principalAmount) {
      return NextResponse.json(
        { error: 'Insufficient treasury balance to approve this loan' },
        { status: 400 }
      )
    }

    const updated = await db.loan.update({
      where: { id: params.id },
      data: { status: 'APPROVED', approvedById: session.user.id, approvedAt: new Date() },
    })

    await db.auditLog.create({
      data: {
        action: 'LOAN_APPROVED',
        entityType: 'Loan',
        entityId: loan.id,
        chamaId: session.user.chamaId,
        memberId: session.user.id,
        details: { amount: loan.principalAmount },
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Approve loan error:', error)
    return NextResponse.json({ error: 'Failed to approve loan' }, { status: 500 })
  }
}
