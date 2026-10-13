import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { z } from 'zod'
import { authOptions, isTreasurer } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isTreasurer(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { reason } = await req.json()

    const updated = await db.loan.update({
      where: { id: params.id, chamaId: session.user.chamaId, status: 'PENDING_APPROVAL' },
      data: { status: 'REJECTED' },
    })

    await db.auditLog.create({
      data: {
        action: 'LOAN_REJECTED',
        entityType: 'Loan',
        entityId: params.id,
        chamaId: session.user.chamaId,
        memberId: session.user.id,
        details: { reason },
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Reject loan error:', error)
    return NextResponse.json({ error: 'Failed to reject loan' }, { status: 500 })
  }
}
