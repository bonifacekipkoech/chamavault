import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { z } from 'zod'
import { authOptions, isOfficer } from '@/lib/auth'
import { db } from '@/lib/db'

const createSchema = z.object({
  title: z.string().min(3).max(200),
  type: z.enum(['MONTHLY', 'AGM', 'SPECIAL', 'EMERGENCY']).default('MONTHLY'),
  scheduledAt: z.string().datetime(),
  venue: z.string().max(200).optional(),
  agenda: z.string().max(5000).optional(),
})

const updateSchema = z.object({
  status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  minutes: z.string().max(20000).optional(),
  attendees: z.array(z.string()).optional(),
  quorumMet: z.boolean().optional(),
  venue: z.string().max(200).optional(),
  agenda: z.string().max(5000).optional(),
})

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const meetings = await db.meeting.findMany({
      where: { chamaId: session.user.chamaId },
      include: {
        resolutions: { select: { id: true, title: true, status: true } },
        _count: { select: { resolutions: true } },
      },
      orderBy: { scheduledAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: meetings })
  } catch (error) {
    console.error('Get meetings error:', error)
    return NextResponse.json({ error: 'Failed to fetch meetings' }, { status: 500 })
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

    const meeting = await db.meeting.create({
      data: {
        ...parsed.data,
        scheduledAt: new Date(parsed.data.scheduledAt),
        chamaId: session.user.chamaId,
        recordedById: session.user.id,
      },
    })

    return NextResponse.json({ success: true, data: meeting }, { status: 201 })
  } catch (error) {
    console.error('Create meeting error:', error)
    return NextResponse.json({ error: 'Failed to create meeting' }, { status: 500 })
  }
}
