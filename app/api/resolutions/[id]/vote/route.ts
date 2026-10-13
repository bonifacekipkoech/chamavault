import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

const schema = z.object({ vote: z.enum(['FOR', 'AGAINST', 'ABSTAIN']) })

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid vote' }, { status: 400 })

    const resolution = await db.resolution.findFirst({
      where: { id: params.id, chamaId: session.user.chamaId, status: 'OPEN' },
    })
    if (!resolution) return NextResponse.json({ error: 'Resolution not open for voting' }, { status: 404 })

    const now = new Date()
    if (resolution.closesAt && now > resolution.closesAt) {
      return NextResponse.json({ error: 'Voting period has ended' }, { status: 400 })
    }

    const existing = await db.resolutionVote.findUnique({
      where: { resolutionId_memberId: { resolutionId: params.id, memberId: session.user.id } },
    })
    if (existing) return NextResponse.json({ error: 'You have already voted on this resolution' }, { status: 409 })

    // Cast vote + update tallies in transaction
    await db.$transaction([
      db.resolutionVote.create({
        data: { resolutionId: params.id, memberId: session.user.id, vote: parsed.data.vote },
      }),
      db.resolution.update({
        where: { id: params.id },
        data: {
          votesFor:     parsed.data.vote === 'FOR'     ? { increment: 1 } : undefined,
          votesAgainst: parsed.data.vote === 'AGAINST' ? { increment: 1 } : undefined,
          abstentions:  parsed.data.vote === 'ABSTAIN' ? { increment: 1 } : undefined,
        },
      }),
    ])

    await db.auditLog.create({
      data: {
        action: 'RESOLUTION_VOTE_CAST',
        entityType: 'Resolution',
        entityId: params.id,
        chamaId: session.user.chamaId,
        memberId: session.user.id,
        details: { vote: parsed.data.vote },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error?.code === 'P2002') return NextResponse.json({ error: 'Already voted' }, { status: 409 })
    console.error('Vote error:', error)
    return NextResponse.json({ error: 'Failed to cast vote' }, { status: 500 })
  }
}
