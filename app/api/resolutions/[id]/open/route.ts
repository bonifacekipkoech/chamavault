import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions, isOfficer } from '@/lib/auth'
import { db } from '@/lib/db'

// POST /api/resolutions/[id]/open — open a draft resolution for voting
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isOfficer(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const resolution = await db.resolution.update({
      where: { id: params.id, chamaId: session.user.chamaId, status: 'DRAFT' },
      data: { status: 'OPEN', opensAt: new Date() },
    })

    return NextResponse.json({ success: true, data: resolution })
  } catch (error) {
    console.error('Open resolution error:', error)
    return NextResponse.json({ error: 'Failed to open resolution' }, { status: 500 })
  }
}
