import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions, isOfficer } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isOfficer(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const resolution = await db.resolution.findFirst({
      where: { id: params.id, chamaId: session.user.chamaId, status: 'OPEN' },
    })
    if (!resolution) return NextResponse.json({ error: 'Resolution not found' }, { status: 404 })

    const totalVotes = resolution.votesFor + resolution.votesAgainst + resolution.abstentions
    const quorumMet = resolution.totalEligible > 0
      ? (totalVotes / resolution.totalEligible) * 100 >= resolution.quorumPercent
      : false

    let status: 'PASSED' | 'REJECTED' | 'TIED' = 'REJECTED'
    let passed = false

    if (quorumMet && totalVotes > 0) {
      const forPercent = (resolution.votesFor / totalVotes) * 100
      if (forPercent > resolution.passingPercent) { status = 'PASSED'; passed = true }
      else if (forPercent === resolution.passingPercent) status = 'TIED'
      else status = 'REJECTED'
    }

    const updated = await db.resolution.update({
      where: { id: params.id },
      data: { status, passed, closesAt: new Date() },
    })

    await db.auditLog.create({
      data: {
        action: `RESOLUTION_${status}`,
        entityType: 'Resolution',
        entityId: params.id,
        chamaId: session.user.chamaId,
        memberId: session.user.id,
        details: { votesFor: resolution.votesFor, votesAgainst: resolution.votesAgainst, quorumMet },
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Close resolution error:', error)
    return NextResponse.json({ error: 'Failed to close resolution' }, { status: 500 })
  }
}
