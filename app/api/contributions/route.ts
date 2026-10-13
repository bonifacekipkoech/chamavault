import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { z } from 'zod'
import { authOptions, isTreasurer, isOfficer } from '@/lib/auth'
import { db } from '@/lib/db'
import { currentPeriod } from '@/lib/utils'

const createSchema = z.object({
  memberId: z.string(),
  type: z.enum(['MONTHLY', 'SHARES', 'REGISTRATION_FEE', 'FINE', 'SPECIAL_LEVY', 'WELFARE', 'OTHER']).default('MONTHLY'),
  expectedAmount: z.number().positive(),
  periodMonth: z.number().int().min(1).max(12),
  periodYear: z.number().int().min(2000).max(2100),
  dueDate: z.string().datetime(),
  description: z.string().optional(),
})

const bulkGenerateSchema = z.object({
  type: z.enum(['MONTHLY', 'SPECIAL_LEVY', 'WELFARE']).default('MONTHLY'),
  periodMonth: z.number().int().min(1).max(12),
  periodYear: z.number().int(),
  expectedAmount: z.number().positive().optional(), // override chama default
  dueDate: z.string().datetime(),
  description: z.string().optional(),
})

// GET /api/contributions
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const memberId = searchParams.get('memberId')
    const status = searchParams.get('status')
    const month = searchParams.get('month')
    const year = searchParams.get('year')

    const where: any = { chamaId: session.user.chamaId }

    // Regular members only see their own contributions
    if (!isOfficer(session.user.role)) {
      where.memberId = session.user.id
    } else if (memberId) {
      where.memberId = memberId
    }

    if (status) where.status = status
    if (month) where.periodMonth = parseInt(month)
    if (year) where.periodYear = parseInt(year)

    const contributions = await db.contribution.findMany({
      where,
      include: {
        member: { select: { firstName: true, lastName: true, phone: true } },
      },
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }, { createdAt: 'desc' }],
    })

    // Summary
    const summary = {
      totalExpected: contributions.reduce((s, c) => s + c.expectedAmount, 0),
      totalPaid: contributions.filter(c => c.status === 'PAID').reduce((s, c) => s + c.paidAmount, 0),
      totalPending: contributions.filter(c => c.status === 'PENDING').reduce((s, c) => s + c.expectedAmount, 0),
      totalLate: contributions.filter(c => c.status === 'LATE').reduce((s, c) => s + c.expectedAmount, 0),
    }

    return NextResponse.json({ success: true, data: contributions, summary })
  } catch (error) {
    console.error('Get contributions error:', error)
    return NextResponse.json({ error: 'Failed to fetch contributions' }, { status: 500 })
  }
}

// POST /api/contributions — create single or bulk generate
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isTreasurer(session.user.role) && !isOfficer(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()

    // Bulk generate for all active members
    if (body.bulk) {
      const parsed = bulkGenerateSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
      }

      const chama = await db.chama.findUnique({ where: { id: session.user.chamaId } })
      const activeMembers = await db.member.findMany({
        where: { chamaId: session.user.chamaId, status: 'ACTIVE' },
        select: { id: true },
      })

      const amount = parsed.data.expectedAmount ?? chama?.monthlyContribution ?? 0

      const created = await db.contribution.createMany({
        data: activeMembers.map(m => ({
          memberId: m.id,
          chamaId: session.user.chamaId,
          type: parsed.data.type,
          expectedAmount: amount,
          periodMonth: parsed.data.periodMonth,
          periodYear: parsed.data.periodYear,
          dueDate: new Date(parsed.data.dueDate),
          description: parsed.data.description,
        })),
        skipDuplicates: true,
      })

      await db.auditLog.create({
        data: {
          action: 'CONTRIBUTIONS_BULK_GENERATED',
          entityType: 'Contribution',
          entityId: session.user.chamaId,
          chamaId: session.user.chamaId,
          memberId: session.user.id,
          details: { count: created.count, period: `${parsed.data.periodMonth}/${parsed.data.periodYear}` },
        },
      })

      return NextResponse.json({ success: true, data: { count: created.count } }, { status: 201 })
    }

    // Single contribution
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
    }

    const contribution = await db.contribution.create({
      data: {
        ...parsed.data,
        dueDate: new Date(parsed.data.dueDate),
        chamaId: session.user.chamaId,
      },
    })

    return NextResponse.json({ success: true, data: contribution }, { status: 201 })
  } catch (error) {
    console.error('Create contribution error:', error)
    return NextResponse.json({ error: 'Failed to create contribution' }, { status: 500 })
  }
}
