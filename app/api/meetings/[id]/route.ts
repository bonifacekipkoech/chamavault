import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { z } from 'zod'
import { authOptions, isOfficer } from '@/lib/auth'
import { db } from '@/lib/db'

const updateSchema = z.object({
  status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  minutes: z.string().max(20000).optional(),
  attendees: z.array(z.string()).optional(),
  quorumMet: z.boolean().optional(),
  venue: z.string().max(200).optional(),
  agenda: z.string().max(5000).optional(),
})

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const meeting = await db.meeting.findFirst({
      where: { id: params.id, chamaId: session.user.chamaId },
      include: {
        resolutions: {
          include: {
            votes: { include: { member: { select: { firstName: true, lastName: true } } } },
          },
        },
      },
    })
    if (!meeting) return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })

    return NextResponse.json({ success: true, data: meeting })
  } catch (error) {
    console.error('Get meeting error:', error)
    return NextResponse.json({ error: 'Failed to fetch meeting' }, { status: 500 })
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

    const meeting = await db.meeting.update({
      where: { id: params.id, chamaId: session.user.chamaId },
      data: parsed.data,
    })

    return NextResponse.json({ success: true, data: meeting })
  } catch (error) {
    console.error('Update meeting error:', error)
    return NextResponse.json({ error: 'Failed to update meeting' }, { status: 500 })
  }
}
