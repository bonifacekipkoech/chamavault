import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const chamaId = session.user.chamaId
    const now = new Date()
    const month = now.getMonth() + 1
    const year = now.getFullYear()

    const [
      chama,
      totalMembers,
      activeMembers,
      monthContribs,
      pendingLoans,
      activeLoans,
      overdueContribs,
      upcomingMeeting,
      recentActivity,
      monthlyTrend,
    ] = await Promise.all([
      db.chama.findUnique({ where: { id: chamaId } }),
      db.member.count({ where: { chamaId } }),
      db.member.count({ where: { chamaId, status: 'ACTIVE' } }),
      db.contribution.aggregate({
        where: { chamaId, periodMonth: month, periodYear: year },
        _sum: { paidAmount: true, expectedAmount: true },
        _count: { _all: true },
      }),
      db.loan.count({ where: { chamaId, status: 'PENDING_APPROVAL' } }),
      db.loan.count({ where: { chamaId, status: { in: ['ACTIVE', 'DISBURSED'] } } }),
      db.contribution.count({ where: { chamaId, status: 'LATE' } }),
      db.meeting.findFirst({
        where: { chamaId, scheduledAt: { gte: now }, status: 'SCHEDULED' },
        orderBy: { scheduledAt: 'asc' },
        select: { id: true, title: true, scheduledAt: true, venue: true },
      }),
      db.auditLog.findMany({
        where: { chamaId },
        include: { member: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      db.$queryRaw<Array<{ month: string; collected: number; expected: number }>>`
        SELECT
          TO_CHAR(TO_DATE(CONCAT("periodYear"::text, '-', LPAD("periodMonth"::text, 2, '0'), '-01'), 'YYYY-MM-DD'), 'Mon YYYY') AS month,
          SUM("paidAmount")::float AS collected,
          SUM("expectedAmount")::float AS expected
        FROM "Contribution"
        WHERE "chamaId" = ${chamaId}
          AND ("periodYear" > ${year - 1} OR ("periodYear" = ${year - 1} AND "periodMonth" >= ${month}))
          AND ("periodYear" < ${year} OR ("periodYear" = ${year} AND "periodMonth" <= ${month}))
        GROUP BY "periodYear", "periodMonth"
        ORDER BY "periodYear" ASC, "periodMonth" ASC
        LIMIT 12
      `,
    ])

    const totalExpected = monthContribs._sum.expectedAmount ?? 0
    const totalCollected = monthContribs._sum.paidAmount ?? 0
    const collectionRate = totalExpected > 0
      ? Math.round((totalCollected / totalExpected) * 100)
      : 0

    return NextResponse.json({
      success: true,
      data: {
        treasuryBalance: chama?.treasuryBalance ?? 0,
        welfareBalance: chama?.welfareBalance ?? 0,
        loanBookBalance: chama?.loanBookBalance ?? 0,
        totalMembers,
        activeMembers,
        totalContributedThisMonth: totalCollected,
        expectedThisMonth: totalExpected,
        collectionRate,
        pendingLoans,
        activeLoans,
        overdueContributions: overdueContribs,
        upcomingMeeting,
        recentActivity,
        monthlyTrend,
      },
    })
  } catch (error) {
    console.error('Dashboard analytics error:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}
