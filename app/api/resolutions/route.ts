import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { z } from 'zod'
import { authOptions, isOfficer } from '@/lib/auth'
import { db } from '@/lib/db'

const createSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(5000),
  type: z.enum(['POLICY_CHANGE', 'LOAN_APPROVAL', 'MEMBER_ADMISSION', 'MEMBER_SUSPENSION', 'INVESTMENT', 'BYLAW_AMENDMENT', 'OTHER']).default('OTHER'),
  quorumPercent: z.number().min(0).max(100).default(50),
  passingPercent: z.number().min(0).max(100).default(50),
  opensAt: z.string().datetime().optional(),
  closesAt: z.string().datetime().optional(),
  meetingId: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')

    const resolutions = await db.resolution.findMany({
      where: { chamaId: session.user.chamaId, ...(status ? { status: status as any } : {}) },
      include: {
        votes: { select: { vote: true, memberId: true } },
        _count: { select: { votes: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Attach current user's vote
    const enriched = resolutions.map(r => ({
      ...r,
      myVote: r.votes.find(v => v.memberId === session.user.id)?.vote ?? null,
    }))

    return NextResponse.json({ success: true, data: enriched })
  } catch (error) {
    console.error('Get resolutions error:', error)
    return NextResponse.json({ error: 'Failed to fetch resolutions' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isOfficer(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
    }

    const totalEligible = await db.member.count({
      where: { chamaId: session.user.chamaId, status: 'ACTIVE' },
    })

    const resolution = await db.resolution.create({
      data: {
        ...parsed.data,
        opensAt: parsed.data.opensAt ? new Date(parsed.data.opensAt) : null,
        closesAt: parsed.data.closesAt ? new Date(parsed.data.closesAt) : null,
        totalEligible,
        chamaId: session.user.chamaId,
      },
    })

    return NextResponse.json({ success: true, data: resolution }, { status: 201 })
  } catch (error) {
    console.error('Create resolution error:', error)
    return NextResponse.json({ error: 'Failed to create resolution' }, { status: 500 })
  }
}
