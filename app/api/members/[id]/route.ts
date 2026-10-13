import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { z } from 'zod'
import { authOptions, isOfficer } from '@/lib/auth'
import { db } from '@/lib/db'

const updateSchema = z.object({
  role: z.enum(['MEMBER', 'TREASURER', 'SECRETARY', 'CHAIRPERSON']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'LEFT']).optional(),
  phone: z.string().optional(),
  nationalId: z.string().optional(),
  notifySMS: z.boolean().optional(),
  notifyEmail: z.boolean().optional(),
})

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Members can view their own profile; officers can view any
    if (params.id !== session.user.id && !isOfficer(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const member = await db.member.findFirst({
      where: { id: params.id, chamaId: session.user.chamaId },
      include: {
        contributions: {
          orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
          take: 24,
        },
        loans: {
          include: { repayments: { orderBy: { createdAt: 'desc' } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

    // Never expose passwordHash
    const { passwordHash: _, ...safe } = member
    return NextResponse.json({ success: true, data: safe })
  } catch (error) {
    console.error('Get member error:', error)
    return NextResponse.json({ error: 'Failed to fetch member' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isOfficer(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
    }

    const member = await db.member.update({
      where: { id: params.id, chamaId: session.user.chamaId },
      data: parsed.data,
      select: { id: true, firstName: true, lastName: true, role: true, status: true },
    })

    await db.auditLog.create({
      data: {
        action: 'MEMBER_UPDATED',
        entityType: 'Member',
        entityId: member.id,
        chamaId: session.user.chamaId,
        memberId: session.user.id,
        details: parsed.data,
      },
    })

    return NextResponse.json({ success: true, data: member })
  } catch (error) {
    console.error('Update member error:', error)
    return NextResponse.json({ error: 'Failed to update member' }, { status: 500 })
  }
}
