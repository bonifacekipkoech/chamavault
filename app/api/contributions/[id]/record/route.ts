import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { z } from 'zod'
import { authOptions, isTreasurer } from '@/lib/auth'
import { db } from '@/lib/db'

const schema = z.object({
  paidAmount: z.number().positive(),
  mpesaRef: z.string().optional(),
  mpesaPhone: z.string().optional(),
  paidAt: z.string().datetime().optional(),
})

// POST /api/contributions/[id]/record — manually record a payment (treasurer)
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

    const contribution = await db.contribution.findFirst({
      where: { id: params.id, chamaId: session.user.chamaId },
      include: { member: true },
    })
    if (!contribution) return NextResponse.json({ error: 'Contribution not found' }, { status: 404 })

    const { paidAmount, mpesaRef, mpesaPhone, paidAt } = parsed.data
    const newStatus = paidAmount >= contribution.expectedAmount ? 'PAID' : 'PARTIAL'

    const updated = await db.$transaction(async tx => {
      const c = await tx.contribution.update({
        where: { id: params.id },
        data: {
          paidAmount,
          status: newStatus,
          mpesaRef,
          mpesaPhone,
          paidAt: paidAt ? new Date(paidAt) : new Date(),
        },
      })

      // Update member's totalContributed
      await tx.member.update({
        where: { id: contribution.memberId },
        data: { totalContributed: { increment: paidAmount } },
      })

      // Update chama treasury balance
      await tx.chama.update({
        where: { id: session.user.chamaId },
        data: { treasuryBalance: { increment: paidAmount } },
      })

      await tx.auditLog.create({
        data: {
          action: 'CONTRIBUTION_RECORDED',
          entityType: 'Contribution',
          entityId: c.id,
          chamaId: session.user.chamaId,
          memberId: session.user.id,
          details: { paidAmount, mpesaRef, memberId: contribution.memberId },
        },
      })

      return c
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Record contribution error:', error)
    return NextResponse.json({ error: 'Failed to record contribution' }, { status: 500 })
  }
}
