import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { z } from 'zod'
import { authOptions, isOfficer } from '@/lib/auth'
import { db } from '@/lib/db'

const updateSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  county: z.string().optional(),
  town: z.string().nullable().optional(),
  monthlyContribution: z.number().positive().optional(),
  shareValue: z.number().positive().optional(),
  registrationFee: z.number().min(0).optional(),
  interestRate: z.number().min(0).max(100).optional(),
  maxLoanMultiple: z.number().positive().optional(),
  loanRepaymentMonths: z.number().int().positive().optional(),
  quorumPercent: z.number().min(0).max(100).optional(),
  mpesaPaybill: z.string().nullable().optional(),
  mpesaAccountPrefix: z.string().nullable().optional(),
  meetingDay: z.string().nullable().optional(),
  meetingVenue: z.string().nullable().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const chama = await db.chama.findUnique({
      where: { id: session.user.chamaId },
      include: { _count: { select: { members: true, loans: true } } },
    })
    if (!chama) return NextResponse.json({ error: 'Chama not found' }, { status: 404 })

    return NextResponse.json({ success: true, data: chama })
  } catch (error) {
    console.error('Get chama error:', error)
    return NextResponse.json({ error: 'Failed to fetch chama' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isOfficer(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
    }

    const chama = await db.chama.update({
      where: { id: session.user.chamaId },
      data: parsed.data,
    })

    await db.auditLog.create({
      data: {
        action: 'CHAMA_SETTINGS_UPDATED',
        entityType: 'Chama',
        entityId: chama.id,
        chamaId: chama.id,
        memberId: session.user.id,
        details: parsed.data,
      },
    })

    return NextResponse.json({ success: true, data: chama })
  } catch (error) {
    console.error('Update chama error:', error)
    return NextResponse.json({ error: 'Failed to update chama' }, { status: 500 })
  }
}
