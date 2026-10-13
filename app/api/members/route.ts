import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions, isOfficer } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/members — list all members in the chama
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')

    const members = await db.member.findMany({
      where: {
        chamaId: session.user.chamaId,
        ...(status ? { status: status as any } : {}),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        totalContributed: true,
        totalShares: true,
        outstandingBalance: true,
        joinDate: true,
        avatarUrl: true,
        _count: { select: { loans: true, contributions: true } },
      },
      orderBy: [{ status: 'asc' }, { firstName: 'asc' }],
    })

    return NextResponse.json({ success: true, data: members })
  } catch (error) {
    console.error('Get members error:', error)
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 })
  }
}
